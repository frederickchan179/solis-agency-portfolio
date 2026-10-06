import { showCursorOrbit } from '@/scripts/cursor'
import {
  clamp,
  damp,
  orbitAngleToward,
  perspective,
  pointOnOrbit,
  smoothstep,
  TAU,
  tiltPoint,
  type Vec2,
  type Vec3,
  wrapAngle
} from '@/scripts/math'
import { initGlobePins } from '@/scripts/stage/globe-pins'
import { buildScene, MAX_CONTENT_WIDTH, MOBILE_BREAKPOINT, type Scene } from '@/scripts/stage/scene'
import {
  ATTRIBUTE_NAMES,
  type AttributeName,
  FRAGMENT_SHADER,
  UNIFORM_NAMES,
  VERTEX_SHADER
} from '@/scripts/stage/shaders'
import { createProgram, getAttributeLocations, getUniformLocations, uploadAttribute } from '@/scripts/stage/webgl'

// Particle stage: the WebGL hero. Scrolling morphs the logotype into a globe and then a wave field. The sun (i-dot)
// orbits the planet ("o"); a moving pointer steers it and pushes points aside. A click on the logotype toggles the key
// animation, where the bowls of "a" and "b" dock round the planet as rings.

const MAX_DPR = 1.5
// Adaptive resolution: if frames after the intro average slower than this, render at 1x from then on
const SLOW_FRAME = { sampleSize: 90, averageMs: 1000 / 45 }
const INTRO_DURATION = 1600 // ms
const SUN_INTRO = { delay: 300, duration: 3000 } // ms: the sun's first orbit, slower than the particles settling
const STEER_TIMEOUT = 2200 // ms the sun keeps following the pointer after it stops moving
const SUN_ORBIT_SPEED = 0.4 // rad/s on its own
const SUN_STEER_SPEED = 4 // rad/s cap, so crossing the planet glides instead of jumping
const RING_PROGRESS_END = 1.25 // "a" runs 0..1, "b" follows 0.25 later
const RING_LOOP = { start: 4, period: 18, on: 9 } // s: automatic key animation until the visitor clicks
const GLOBE_DRIFT = 0.07 // rad/s the globe turns on its own
const GLOBE_SCROLL_TURN = 0.0005 // rad per px scrolled
const BACKGROUND: Vec3 = [0, 0.055, 0.12] // page navy

interface Globe {
  isMobile: boolean
  center: Vec2
  radius: number
}

// Scroll stage blend: logotype, globe and wave field, summing to 1
interface StageWeights {
  logo: number
  globe: number
  field: number
}

interface FrameState {
  sunPosition: Vec3
  globeSpin: number
  scrollTop: number
  layerScroll: number
  weights: StageWeights
  globe: Globe
  brightness: number
  transition: number
}

export function initStage() {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const sunGlow = document.getElementById('sun') as HTMLElement
  const siteHeader = document.getElementById('site-header') as HTMLElement
  const valuesSection = document.getElementById('values') as HTMLElement
  const careersSection = document.getElementById('careers') as HTMLElement
  const servicesSection = document.getElementById('what-we-do') as HTMLElement
  const marqueeTrack = document.getElementById('marquee-track') as HTMLElement
  const valueRows = [...document.querySelectorAll<HTMLElement>('.value')]
  const valueNumbers = valueRows.map((row) => row.querySelector('.value-number') as HTMLElement)

  const context = createContext(canvas)

  if (!context) {
    document.documentElement.classList.add('no-gl')

    return
  }

  const { gl, program } = context

  gl.useProgram(program)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.depthFunc(gl.LEQUAL)
  gl.clearColor(...BACKGROUND, 1)
  // An opaque canvas shows black until its first frame, which waits for the scene build: paint it navy right away
  gl.clear(gl.COLOR_BUFFER_BIT)

  const uniforms = getUniformLocations(gl, program, UNIFORM_NAMES)
  const attributes = getAttributeLocations(gl, program, ATTRIBUTE_NAMES)
  const buffers: Partial<Record<AttributeName, WebGLBuffer>> = {}

  const viewport = { width: 0, height: 0, canvasHeight: 0, dpr: 1 }
  const maxCanvasSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number
  let maxDpr = MAX_DPR
  const frameTiming = { count: 0, totalMs: 0 }
  // Rebuilt on resize; null until the first build
  let builtScene: Scene | null = null

  const pointer = {
    position: [0, -9999] as Vec2, // stage coordinates
    isMouse: false,
    present: 0, // 1 while the pointer is on the page
    influence: 0, // eased `present`, fades the push in and out
    speed: 0, // eased 0..1
    travel: 0, // px moved since the last frame
    lastMovedAt: -Infinity,
    overLogo: false
  }
  const rings = {
    autoOn: false, // automatic loop state
    userOn: false, // state set by clicks
    userControlled: reduceMotion, // after the first click the loop stops
    progress: 0, // 0..RING_PROGRESS_END
    visibility: 0, // eased on/off, fades the ring orbit paths
    spin: 0
  }
  const sun = { angle: 0, autoSpeed: 0, orbitGlow: 0 }
  const scroll = { lastY: scrollY, drawnY: NaN, velocity: 0 }
  let tilt: Vec2 = [0, 0]
  const globePins = initGlobePins()
  // Drift part of the globe's turn (scrolling adds the rest); set on the first build so the studio faces the visitor
  // when they reach the services
  let globeDrift = 0
  let intro = reduceMotion ? 1 : 0
  let startTime = performance.now()
  let lastFrameTime = startTime
  let frameRequest = 0

  function sizeCanvas() {
    viewport.dpr = Math.min(devicePixelRatio || 1, maxDpr, maxCanvasSize / viewport.canvasHeight)
    canvas.width = Math.round(viewport.width * viewport.dpr)
    canvas.height = Math.round(viewport.canvasHeight * viewport.dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  function build() {
    viewport.width = innerWidth
    // The canvas is two large viewports tall (Stage.astro): mobile browser bars collapsing never change its size
    viewport.canvasHeight = canvas.clientHeight || innerHeight * 2
    viewport.height = viewport.canvasHeight / 2
    sizeCanvas()

    // documentElement.clientHeight is the small viewport (bars showing), where the hero is laid out
    const scene = buildScene(
      viewport.width,
      viewport.height,
      Math.min(document.documentElement.clientHeight || viewport.height, viewport.height)
    )

    for (const name of ATTRIBUTE_NAMES) {
      const { data, size } = scene.attributes[name]

      uploadAttribute(gl, buffers, attributes[name], name, data, size)
    }
    setLayoutUniforms(scene)

    const glowSize = scene.dotRadius * 14

    sunGlow.style.width = sunGlow.style.height = `${glowSize.toFixed(0)}px`
    sunGlow.style.margin = `${(-glowSize / 2).toFixed(0)}px 0 0 ${(-glowSize / 2).toFixed(0)}px`
    builtScene = scene

    return scene
  }

  const currentScene = () => builtScene ?? build()

  function setLayoutUniforms(scene: Scene) {
    const { layout, orbits } = scene

    gl.uniform3fv(
      uniforms.uOrbitCenter,
      orbits.flatMap((orbit) => orbit.center)
    )
    gl.uniform3fv(
      uniforms.uOrbitU,
      orbits.flatMap((orbit) => orbit.axisU)
    )
    gl.uniform3fv(
      uniforms.uOrbitV,
      orbits.flatMap((orbit) => orbit.axisV)
    )
    gl.uniform1f(uniforms.uCameraDistance, layout.cameraDistance)
    gl.uniform1f(uniforms.uPivot, layout.pivotY)
    gl.uniform1f(uniforms.uExtrusion, scene.extrusion)
    gl.uniform1f(uniforms.uScale, layout.scale)
    gl.uniform3f(uniforms.uPlanet, scene.planet[0], scene.planet[1], 0)
    gl.uniform3f(uniforms.uDotRest, scene.dot[0], scene.dot[1], 0)
    gl.uniform2fv(uniforms.uBowlA, scene.bowlA)
    gl.uniform2fv(uniforms.uBowlB, scene.bowlB)
    gl.uniform3fv(uniforms.uEclipticU, scene.eclipticU)
    gl.uniform3fv(uniforms.uEclipticV, scene.eclipticV)
    gl.uniform2fv(uniforms.uRingRadius, scene.ringRadii)
  }

  const toStage = (clientX: number, clientY: number): Vec2 => [
    clientX - viewport.width / 2,
    viewport.height / 2 - clientY
  ]

  // Is a screen point over the logotype (with a little margin)?
  function isOverLogo(clientX: number, clientY: number) {
    if (!builtScene) return false
    const { layout } = builtScene
    const [x, y] = toStage(clientX, clientY + scrollY)
    const left = layout.offsetX - viewport.width / 2 - 20
    const right = left + layout.logoWidth * layout.scale + 40
    const halfHeight = layout.bandHeight / 2 - layout.padding * 0.4

    return x > left && x < right && y > layout.pivotY - halfHeight && y < layout.pivotY + halfHeight
  }

  addEventListener(
    'pointermove',
    (event) => {
      const position = toStage(event.clientX, event.clientY)

      if (pointer.isMouse) {
        const distance = Math.hypot(position[0] - pointer.position[0], position[1] - pointer.position[1])

        pointer.travel += distance
        if (distance > 0.5) pointer.lastMovedAt = performance.now()
      }
      pointer.position = position
      pointer.present = 1
      pointer.isMouse = event.pointerType === 'mouse'

      const overLogo = pointer.isMouse && isOverLogo(event.clientX, event.clientY) && scrollY < viewport.height * 0.3

      if (overLogo !== pointer.overLogo) showCursorOrbit(overLogo)
      pointer.overLogo = overLogo
    },
    { passive: true }
  )

  // A click or tap on the logotype toggles the rings and ends the automatic loop; hover never does
  addEventListener(
    'pointerdown',
    (event) => {
      if ((event.target as Element).closest?.('a,button') || !isOverLogo(event.clientX, event.clientY)) return
      const showing = rings.userControlled ? rings.userOn : rings.autoOn

      rings.userOn = !showing
      rings.userControlled = true
    },
    { passive: true }
  )

  const onPointerGone = () => {
    pointer.present = 0
    pointer.isMouse = false
    pointer.overLogo = false
    showCursorOrbit(false)
  }

  document.addEventListener('pointerleave', onPointerGone)
  addEventListener('blur', onPointerGone)

  // Centre and radius of the globe (second scroll stage)
  function globeShape(): Globe {
    const { width, height } = viewport
    const isMobile = width < MOBILE_BREAKPOINT
    const contentWidth = Math.min(width, MAX_CONTENT_WIDTH)

    return {
      isMobile,
      center: isMobile ? [0, height * 0.05] : [contentWidth * 0.24, -height * 0.02],
      radius: Math.min(contentWidth, height) * (isMobile ? 0.34 : 0.33)
    }
  }

  function updatePointer(toSphere: number) {
    pointer.speed += (Math.min(1, pointer.travel / 60) - pointer.speed) * 0.12
    pointer.travel = 0
    pointer.influence += (pointer.present * (pointer.isMouse ? 1 : 0) * (1 - toSphere) - pointer.influence) * 0.08
  }

  // Rings dock, hold and return on their own loop until the visitor clicks. "a" leaves first and "b" follows; when the
  // rings turn off the same path plays back, so the animation is never cut.
  function updateRings(time: number, dt: number, toSphere: number) {
    rings.autoOn = time > RING_LOOP.start && (time - RING_LOOP.start) % RING_LOOP.period < RING_LOOP.on
    const on = !reduceMotion && toSphere < 0.35 && (rings.userControlled ? rings.userOn : rings.autoOn)

    rings.visibility += ((on ? 1 : 0) - rings.visibility) * 0.05
    rings.progress = clamp(rings.progress + (on ? dt / 1.9 : -dt / 1.2), 0, RING_PROGRESS_END)
    if (on && rings.progress >= RING_PROGRESS_END) rings.spin += dt * 0.3
    else rings.spin = wrapAngle(rings.spin) * 0.94 // unwind to the bowl's own angle before landing
  }

  // One orbit during the intro, then the sun orbits on its own. While the pointer moves it steers the sun toward the
  // orbit point in its direction; after it rests the sun eases back into its own orbit from wherever it is.
  function updateSun(scene: Scene, dt: number, introOrbit: number, steering: boolean, scrollTop: number) {
    if (introOrbit > 0 && introOrbit < 1) {
      sun.angle = (1 - Math.cos(Math.PI * introOrbit)) * Math.PI
    } else if (steering) {
      const pointerInScene: Vec2 = [pointer.position[0], pointer.position[1] - scrollTop]
      const target = orbitAngleToward(scene.orbits[0], pointerInScene)
      const maxStep = SUN_STEER_SPEED * dt

      sun.angle += clamp(wrapAngle(target - sun.angle) * damp(5, dt), -maxStep, maxStep)
      sun.autoSpeed = 0
    } else if (!reduceMotion) {
      sun.autoSpeed += (SUN_ORBIT_SPEED - sun.autoSpeed) * damp(0.8, dt)
      sun.angle += sun.autoSpeed * dt
    }
    sun.angle = ((sun.angle % TAU) + TAU) % TAU
    sun.orbitGlow += ((steering ? 1 : 0) - sun.orbitGlow) * damp(3, dt)

    return pointOnOrbit(scene.orbits[0], sun.angle)
  }

  // Screen position of a scene point (tilted, scrolled, with perspective)
  function project(scene: Scene, point: Vec3, scrollTop: number) {
    const [x, y, z] = tiltPoint(point, tilt, scene.layout.pivotY)
    const scale = perspective(z, scene.layout.cameraDistance)

    return { x: x * scale, y: (y + scrollTop) * scale, z, scale }
  }

  // The DOM glow follows the 3D sun in the logotype stage, sits at the globe's light source in the globe stage and
  // grows over the field. It hides while the planet is in front of the sun.
  function updateSunGlow(
    scene: Scene,
    { sunPosition, scrollTop, layerScroll, weights, globe, brightness, transition }: FrameState
  ) {
    const { height, width } = viewport
    const sunOnScreen = project(scene, sunPosition, scrollTop)
    const planetOnScreen = project(scene, [scene.planet[0], scene.planet[1], 0], scrollTop)
    const planetRadius = scene.planetRadius * planetOnScreen.scale
    const sunToPlanet = Math.hypot(sunOnScreen.x - planetOnScreen.x, sunOnScreen.y - planetOnScreen.y)
    const eclipsed =
      sunOnScreen.z < planetOnScreen.z ? clamp((planetRadius * 1.1 - sunToPlanet) / (planetRadius * 0.3)) : 0
    const globeSpot = [globe.center[0] - 0.56 * globe.radius * 1.35, globe.center[1] + 0.83 * globe.radius * 1.35]
    const fieldSpot = [0, -height * 0.42 * 0.24 + 40]
    const x = sunOnScreen.x * weights.logo + globeSpot[0] * weights.globe + fieldSpot[0] * weights.field
    const y = sunOnScreen.y * weights.logo + globeSpot[1] * weights.globe + fieldSpot[1] * weights.field
    const scale =
      (sunOnScreen.scale * weights.logo + (1 - weights.logo)) * (1 + weights.field * 3.2 + weights.globe * 0.6)
    const introFade = intro < 0.6 ? clamp((intro - 0.35) * 4) : brightness

    // the glow sits in the stage layer, so it scrolls with the logotype just like the canvas
    sunGlow.style.transform = `translate(${width / 2 + x}px, ${layerScroll + height / 2 - y}px) scale(${scale})`
    sunGlow.style.opacity = String(introFade * clamp(1 - transition * 1.4) * (1 - eclipsed * weights.logo))
  }

  function drawParticles(
    scene: Scene,
    {
      time,
      scrollTop,
      layerScroll,
      weights,
      globe,
      brightness,
      transition,
      sunPosition,
      introOrbit,
      globeSpin
    }: FrameState & {
      time: number
      introOrbit: number
    }
  ) {
    // the sun orbit path shows during the intro orbit and with the rings, stays faint after the intro and brightens
    // while the pointer steers; the ring orbit paths fade as the rings dock
    const sunOrbitAlpha = Math.max(
      rings.visibility * 0.45,
      Math.sin(Math.PI * introOrbit) * 0.55,
      clamp((introOrbit - 0.9) / 0.1) * (0.42 + 0.38 * sun.orbitGlow)
    )
    const ringOrbitAlpha = rings.visibility * (0.2 + 0.45 * (1 - clamp((rings.progress - 0.9) / 0.35)))
    const globeDim = globe.isMobile ? 0.25 * weights.globe : 0

    if (weights.logo > 0.02) gl.enable(gl.DEPTH_TEST)
    else gl.disable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.uniform2f(uniforms.uResolution, viewport.width, viewport.height)
    gl.uniform1f(uniforms.uCanvasHeight, viewport.canvasHeight)
    gl.uniform1f(uniforms.uViewportOffset, (viewport.canvasHeight - viewport.height) / 2 - layerScroll)
    gl.uniform1f(uniforms.uDpr, viewport.dpr)
    gl.uniform1f(uniforms.uTime, time)
    gl.uniform1f(uniforms.uIntro, intro)
    gl.uniform1f(uniforms.uScroll, scrollTop)
    gl.uniform1f(uniforms.uToSphere, 1 - weights.logo)
    gl.uniform1f(uniforms.uToField, weights.field)
    gl.uniform1f(uniforms.uBrightness, brightness * (1 - globeDim) * (1 - 0.7 * clamp(transition * 1.3)))
    gl.uniform1f(uniforms.uScrollSpeed, reduceMotion ? 0 : Math.min(3, Math.abs(scroll.velocity)))
    gl.uniform2fv(uniforms.uMouse, pointer.position)
    gl.uniform1f(uniforms.uMouseInfluence, pointer.influence)
    gl.uniform1f(uniforms.uMouseSpeed, reduceMotion ? 0 : pointer.speed)
    gl.uniform2fv(uniforms.uTilt, tilt)
    gl.uniform3fv(uniforms.uSun, sunPosition)
    gl.uniform2f(uniforms.uRingProgress, clamp(rings.progress), clamp(rings.progress - 0.25))
    gl.uniform1f(uniforms.uRingSpin, rings.spin)
    gl.uniform2f(uniforms.uOrbitAlpha, sunOrbitAlpha, ringOrbitAlpha)
    gl.uniform2fv(uniforms.uSphereCenter, globe.center)
    gl.uniform1f(uniforms.uSphereRadius, globe.radius)
    gl.uniform1f(uniforms.uGlobeSpin, globeSpin)
    gl.drawArrays(gl.POINTS, 0, scene.count)
  }

  // Scroll-driven DOM effects: solid header, marquee skew, value number fill
  function updatePageEffects(scrollTop: number, valueTops: number[]) {
    const { height } = viewport

    siteHeader.classList.toggle('is-solid', scrollTop > height * 0.6)
    marqueeTrack.style.setProperty('--skew', `${(clamp(scroll.velocity, -3, 3) * -4).toFixed(2)}deg`)
    valueNumbers.forEach((number, i) => {
      const fill = clamp((height * 0.85 - valueTops[i]) / (height * 0.45)) * 100

      number.style.setProperty('--fill', `${fill.toFixed(0)}%`)
    })
  }

  function frame(now: number) {
    const scene = currentScene()
    const time = reduceMotion ? 4 : (now - startTime) / 1000
    const frameMs = now - lastFrameTime
    const dt = Math.min(0.05, frameMs / 1000)
    const scrollTop = scrollY

    lastFrameTime = now
    if (!reduceMotion && intro >= 1 && frameTiming.count < SLOW_FRAME.sampleSize) adaptResolution(frameMs)
    if (!reduceMotion) intro = clamp((now - startTime) / INTRO_DURATION) // time based, so slow devices match

    // reduced motion draws a still frame and redraws only after a scroll or resize
    if (reduceMotion && scrollTop === scroll.drawnY && viewport.width === innerWidth) {
      frameRequest = requestAnimationFrame(frame)

      return
    }
    scroll.drawnY = scrollTop
    scroll.velocity += ((scrollTop - scroll.lastY) / 40 - scroll.velocity) * 0.12
    scroll.lastY = scrollTop

    // read layout before any style writes
    const { height } = viewport
    const valuesTop = valuesSection.getBoundingClientRect().top
    const careersTop = careersSection.getBoundingClientRect().top
    const valueTops = valueRows.map((row) => row.getBoundingClientRect().top)

    const toSphere = smoothstep(clamp((scrollTop - height * 0.18) / (height * 0.8)))
    const toField = smoothstep(clamp(1 - valuesTop / height))
    const weights: StageWeights = { logo: 1 - toSphere, globe: toSphere * (1 - toField), field: toField }
    const transition = Math.sin(Math.PI * toSphere) * (1 - toField) + Math.sin(Math.PI * toField) // peaks between stages
    const brightness = clamp(careersTop / height + 0.3, 0.32, 1) // dims as the careers section arrives
    const globe = globeShape()
    const introOrbit = reduceMotion ? 1 : clamp((now - startTime - SUN_INTRO.delay) / SUN_INTRO.duration)
    const steering = pointer.isMouse && toSphere < 0.5 && introOrbit >= 1 && now - pointer.lastMovedAt < STEER_TIMEOUT

    updatePointer(toSphere)
    // the scene never follows the pointer; it only sways slowly so the depth always reads
    if (!reduceMotion) tilt = [Math.sin(time * 0.35) * 0.1, Math.sin(time * 0.27) * 0.05]
    updateRings(time, dt, toSphere)

    const sunPosition = updateSun(scene, dt, introOrbit, steering, scrollTop)

    // the globe only drifts while it shows, so it has not turned away by the time the visitor arrives
    if (!reduceMotion) globeDrift += GLOBE_DRIFT * dt * weights.globe

    const globeSpin = globeDrift + scrollTop * GLOBE_SCROLL_TURN
    // how far the stage layer has scrolled with the page before it sticks (Stage.astro)
    const layerScroll = Math.min(scrollTop, height)
    const frameState = { sunPosition, globeSpin, scrollTop, layerScroll, weights, globe, brightness, transition }

    updateSunGlow(scene, frameState)
    drawParticles(scene, { ...frameState, time, introOrbit })
    globePins.update(
      {
        center: globe.center,
        radius: globe.radius,
        spin: globeSpin,
        visibility: weights.globe * clamp(1 - transition * 1.6)
      },
      viewport.width,
      viewport.height
    )
    updatePageEffects(scrollTop, valueTops)

    if (!document.hidden) frameRequest = requestAnimationFrame(frame)
  }

  // Fill rate is the cost that grows with screen resolution, so a phone that cannot keep up renders at 1x. Resizing
  // clears the canvas, so this runs before the frame draws.
  function adaptResolution(frameMs: number) {
    frameTiming.count += 1
    frameTiming.totalMs += Math.min(frameMs, 100) // a single long hitch should not decide it
    if (frameTiming.count < SLOW_FRAME.sampleSize || viewport.dpr <= 1) return
    if (frameTiming.totalMs / frameTiming.count > SLOW_FRAME.averageMs) {
      maxDpr = 1
      sizeCanvas()
    }
  }

  const start = () => {
    cancelAnimationFrame(frameRequest)
    lastFrameTime = performance.now()
    frameRequest = requestAnimationFrame(frame)
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start()
  })

  // Rebuild only on a real resize (width or large viewport). Mobile browsers fire resize whenever their bars collapse
  // or expand while scrolling; resizing the canvas then would clear it and shift the whole stage.
  let resizeTimer: ReturnType<typeof setTimeout> | undefined

  addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (innerWidth !== viewport.width || canvas.clientHeight !== viewport.canvasHeight) build()
    }, 180)
  })

  // Let the first paint (LCP: the h1) happen before the particle build
  requestAnimationFrame(() =>
    setTimeout(() => {
      build()
      globeDrift = globePins.studioSpin - servicesSection.offsetTop * GLOBE_SCROLL_TURN
      startTime = performance.now()
      start()
    }, 0)
  )
}

// The WebGL context with the particle program, or null when WebGL or the shaders are unavailable
function createContext(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: true,
    powerPreference: 'high-performance'
  })

  if (!gl) return null
  try {
    return { gl, program: createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER) }
  } catch (error) {
    // eslint-disable-next-line no-console -- surface shader build errors
    console.warn(error)

    return null
  }
}
