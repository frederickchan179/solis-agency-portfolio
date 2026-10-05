import { DOT_CENTER, DOT_RADIUS, LOGO_HEIGHT, LOGO_LETTERS, LOGO_WIDTH, O_CENTER, O_RADIUS } from '@/data/logo'
import { clamp, GOLDEN_ANGLE, normalize, type Orbit, perspective, TAU, type Vec2, type Vec3 } from '@/scripts/math'
import { isLand } from '@/scripts/stage/land-mask'

// Builds every particle of the stage: the 3D logotype sampled from the official letter paths, the planet ("o") and sun
// (i-dot) as spheres, the brand constellation, and the dashed orbit paths. All positions are in stage coordinates.

// Matches the aKind thresholds in the vertex shader
export const PARTICLE_KIND = { letter: 0, planet: 1, sun: 2, ringA: 3, ringB: 4, star: 5, orbitPath: 6 }
// Added to a ring kind for a bowl point that stays on its letter (the stem side) and only shows once the ring has left
const RING_COPY = 0.5

export const MOBILE_BREAKPOINT = 720
export const MAX_CONTENT_WIDTH = 1712 // global.css --maxw plus gutters

// Logo geometry, in logo units. On phones "lab" stacks under "solis", centred.
const SOLIS_WIDTH = 69.1
const LAB_START_X = 84.45
const LAB_WIDTH = LOGO_WIDTH - LAB_START_X
const STACKED_LINE_GAP = 36
const SOLIS_LETTERS = { from: 0, to: 4 }
const LAB_LETTERS = { from: 4, to: 7 }

// Key animation: the bowls of "a" and "b" leave as rings. Points in the annulus between the two radii (and below
// BOWL_MIN_Y) belong to the bowl; the stem edge splits what leaves from what stays on the letter.
const BOWL_A_CENTER: Vec2 = [103.23, 20.19]
const BOWL_B_CENTER: Vec2 = [129.42, 20.19]
const BOWL_INNER_RADIUS = 6.2
const BOWL_OUTER_RADIUS = 10.7
const BOWL_MIN_Y = 4
const STEM_A_X = 109.77
const STEM_B_X = 123

type Layout = ReturnType<typeof computeLayout>

interface Raster {
  sharpAlpha: Uint8ClampedArray
  blurredAlpha: Uint8ClampedArray
}

type ParticleList = ReturnType<typeof createParticleList>

// Brand constellation (bentographics hero and business card): viewport position as fractions, size relative to the
// i-dot, depth
const STARS = {
  desktop: [
    { x: 0.905, y: 0.17, size: 0.42, z: -260 },
    { x: 0.075, y: 0.235, size: 0.42, z: -300 },
    { x: 0.535, y: 0.63, size: 0.42, z: 140 },
    { x: 0.505, y: 0.68, size: 1, z: 220 }
  ],
  phone: [
    { x: 0.88, y: 0.135, size: 0.42, z: -260 },
    { x: 0.06, y: 0.43, size: 0.42, z: -300 },
    { x: 0.93, y: 0.405, size: 0.42, z: 140 },
    { x: 0.9, y: 0.535, size: 1, z: 220 }
  ]
}

// Target number of letter points: more on bigger screens
const letterPointTarget = (layout: Layout) => (layout.isMobile ? 24000 : layout.viewportWidth > 1600 ? 76000 : 60000)

// Where the logotype sits on screen and at what scale
function computeLayout(viewportWidth: number, viewportHeight: number) {
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const labOffset = isMobile
    ? { dx: (SOLIS_WIDTH - LAB_WIDTH) / 2 - LAB_START_X, dy: STACKED_LINE_GAP }
    : { dx: 0, dy: 0 }
  const letterGroups = isMobile
    ? [
        { ...SOLIS_LETTERS, dx: 0, dy: 0 },
        { ...LAB_LETTERS, ...labOffset }
      ]
    : [{ from: SOLIS_LETTERS.from, to: LAB_LETTERS.to, dx: 0, dy: 0 }]
  const logoWidth = isMobile ? SOLIS_WIDTH : LOGO_WIDTH
  const logoHeight = isMobile ? LOGO_HEIGHT + STACKED_LINE_GAP : LOGO_HEIGHT
  const contentWidth = Math.min(viewportWidth, MAX_CONTENT_WIDTH)
  const scale = Math.min(
    (contentWidth * (isMobile ? 0.8 : 0.86)) / logoWidth,
    (viewportHeight * (isMobile ? 0.36 : 0.3)) / logoHeight
  )
  const padding = Math.ceil(scale * 6)

  return {
    isMobile,
    viewportWidth,
    viewportHeight,
    contentWidth,
    cameraDistance: Math.max(1500, viewportWidth * 1.25),
    scale,
    padding,
    logoWidth,
    labOffset,
    letterGroups,
    // the logotype is rasterised into a full-width band this tall
    bandHeight: Math.ceil(logoHeight * scale + padding * 2),
    // band position of logo unit (0, 0)
    offsetX: (viewportWidth - logoWidth * scale) / 2,
    offsetY: padding,
    // height of the logotype centre above the viewport centre; also the tilt axis
    pivotY: viewportHeight * (isMobile ? 0.15 : 0.11)
  }
}

const bandToStage = (layout: Layout, x: number, y: number): Vec2 => [
  x - layout.viewportWidth / 2,
  layout.pivotY + layout.bandHeight / 2 - y
]

const logoToStage = (layout: Layout, [u, v]: Vec2) =>
  bandToStage(layout, layout.offsetX + u * layout.scale, layout.offsetY + v * layout.scale)

// Draws the letters into the band. Returns the alpha of the sharp drawing (which pixels are inside a letter) and of a
// blurred copy (its gradient gives each point a normal, so the letter edges read as bevelled).
function rasterizeLogo(layout: Layout): Raster {
  const { viewportWidth: width, bandHeight: height, scale } = layout
  const sharp = document.createElement('canvas')
  const sharpContext = sharp.getContext('2d') as CanvasRenderingContext2D
  const paths = LOGO_LETTERS.map((letterPath) => new Path2D(letterPath))

  sharp.width = width
  sharp.height = height
  sharpContext.fillStyle = '#fff'
  for (const group of layout.letterGroups) {
    sharpContext.setTransform(scale, 0, 0, scale, layout.offsetX + group.dx * scale, layout.offsetY + group.dy * scale)
    for (let i = group.from; i < group.to; i++) sharpContext.fill(paths[i])
  }

  const blurred = document.createElement('canvas')
  const blurredContext = blurred.getContext('2d') as CanvasRenderingContext2D

  blurred.width = width
  blurred.height = height
  blurredContext.filter = `blur(${Math.max(2, scale * 0.9)}px)`
  blurredContext.drawImage(sharp, 0, 0)

  return {
    sharpAlpha: sharpContext.getImageData(0, 0, width, height).data,
    blurredAlpha: blurredContext.getImageData(0, 0, width, height).data
  }
}

// Pixel spacing between letter points that lands near the target count for the filled area
function letterPointSpacing(layout: Layout, sharpAlpha: Uint8ClampedArray) {
  let filledSamples = 0

  for (let i = 3; i < sharpAlpha.length; i += 16) if (sharpAlpha[i] > 128) filledSamples++ // every 4th pixel

  return Math.max(1.1, Math.sqrt((filledSamples * 4) / letterPointTarget(layout)))
}

const isInBowl = (logoX: number, logoY: number, center: Vec2) => {
  const distance = Math.hypot(logoX - center[0], logoY - center[1])

  return distance > BOWL_INNER_RADIUS && distance < BOWL_OUTER_RADIUS && logoY > BOWL_MIN_Y
}

// Kinds for a letter point at (logoX, logoY) in "lab" logo units: one plain letter point, a ring point, or (on the stem side
// of a bowl) a letter point plus a ring copy
function letterPointKinds(logoX: number, logoY: number) {
  const { letter, ringA, ringB } = PARTICLE_KIND

  if (isInBowl(logoX, logoY, BOWL_A_CENTER)) return logoX < STEM_A_X ? [ringA] : [letter, ringA + RING_COPY]
  if (isInBowl(logoX, logoY, BOWL_B_CENTER)) return logoX > STEM_B_X ? [ringB] : [letter, ringB + RING_COPY]

  return [letter]
}

function createParticleList() {
  const positions: number[] = []
  const normals: number[] = []
  const kinds: number[] = []

  return {
    positions,
    normals,
    kinds,
    // Called once per particle (100k+ on desktop), so it pushes plain values instead of spreading
    add(position: Vec3, normal: Vec3, kind: number) {
      positions.push(position[0], position[1], position[2])
      normals.push(normal[0], normal[1], normal[2])
      kinds.push(kind)
    }
  }
}

// Jittered grid over the letters, extruded in depth
function addLetters(particles: ParticleList, layout: Layout, raster: Raster, spacing: number, extrusion: number) {
  const { viewportWidth: width, bandHeight: height, scale, offsetX, offsetY, labOffset } = layout
  const blurredAlphaAt = (x: number, y: number) =>
    raster.blurredAlpha[(clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4 + 3]
  // most points sit on the front and back faces, the rest fill the side walls
  const randomDepth = () => {
    const roll = Math.random()

    if (roll < 0.45) return extrusion / 2
    if (roll < 0.7) return -extrusion / 2

    return (Math.random() - 0.5) * extrusion
  }

  for (let rowY = 0; rowY < height; rowY += spacing)
    for (let columnX = 0; columnX < width; columnX += spacing) {
      const x = Math.round(columnX + (Math.random() - 0.5) * spacing)
      const y = Math.round(rowY + (Math.random() - 0.5) * spacing)

      if (x < 0 || y < 0 || x >= width || y >= height) continue
      if (raster.sharpAlpha[(y * width + x) * 4 + 3] < 128) continue

      const gradientX = (blurredAlphaAt(x + 2, y) - blurredAlphaAt(x - 2, y)) / 255
      const gradientY = (blurredAlphaAt(x, y + 2) - blurredAlphaAt(x, y - 2)) / 255
      const normal = normalize([-gradientX * 2.4, gradientY * 2.4, 1])
      const position: Vec3 = [...bandToStage(layout, x, y), randomDepth()]
      const logoX = (x - offsetX) / scale - labOffset.dx
      const logoY = (y - offsetY) / scale - labOffset.dy

      for (const kind of letterPointKinds(logoX, logoY)) particles.add(position, normal, kind)
    }
}

// Fibonacci sphere with about the same point density as the letters. Stars pass a phase instead of real normals.
function addSphere(
  particles: ParticleList,
  center: Vec3,
  radius: number,
  kind: number,
  spacing: number,
  starPhase?: number
) {
  const count = Math.max(24, Math.round((2 * Math.PI * radius * radius) / (spacing * spacing)))

  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2
    const ringRadius = Math.sqrt(1 - y * y)
    const x = Math.cos(GOLDEN_ANGLE * i) * ringRadius
    const z = Math.sin(GOLDEN_ANGLE * i) * ringRadius
    const normal: Vec3 = starPhase === undefined ? [x, y, z] : [starPhase, 0, 0]

    particles.add([center[0] + x * radius, center[1] + y * radius, center[2] + z * radius], normal, kind)
  }
}

function addStars(particles: ParticleList, layout: Layout, dotRadius: number, spacing: number) {
  const stars = layout.isMobile ? STARS.phone : STARS.desktop

  stars.forEach((star, index) => {
    // divided by the perspective scale so each star sits on its spot at rest, then shows parallax as the scene sways
    const depthScale = perspective(star.z, layout.cameraDistance)
    const center: Vec3 = [
      ((star.x - 0.5) * layout.contentWidth) / depthScale,
      ((0.5 - star.y) * layout.viewportHeight) / depthScale,
      star.z
    ]

    addSphere(particles, center, (star.size * dotRadius) / depthScale, PARTICLE_KIND.star, spacing, index * 1.7)
  })
}

// The sun's orbit passes through the i-dot (logo rule), tilted toward the viewer. The ring orbits are where the "a"
// and "b" rings dock: on the same plane, wider than the planet.
function buildOrbits(planet: Vec2, dot: Vec2, planetRadius: number) {
  const toDot: Vec2 = [dot[0] - planet[0], dot[1] - planet[1]]
  const radius = Math.hypot(...toDot)
  const [dirX, dirY] = toDot.map((component) => component / radius)
  const center: Vec3 = [planet[0], planet[1], 0]
  const sunOrbit: Orbit = {
    center,
    axisU: [toDot[0], toDot[1], 0],
    axisV: [dirY * radius * 0.36, -dirX * radius * 0.36, radius * 0.93]
  }
  const eclipticU = normalize(sunOrbit.axisU)
  const eclipticV = normalize(sunOrbit.axisV)
  const ringRadii: Vec2 = [planetRadius * 1.5, planetRadius * 1.95]
  const scaled = ([x, y, z]: Vec3, factor: number): Vec3 => [x * factor, y * factor, z * factor]
  const ringOrbits = ringRadii.map((ringRadius): Orbit => ({
    center,
    axisU: scaled(eclipticU, ringRadius),
    axisV: scaled(eclipticV, ringRadius)
  }))

  return { orbits: [sunOrbit, ...ringOrbits], eclipticU, eclipticV, ringRadii }
}

// Dashed orbit paths (14px dash, 12px gap). Each point stores its angle and orbit index; the shader places it.
function addOrbitPaths(particles: ParticleList, orbits: Orbit[]) {
  const pointGap = 2.6
  const dashLength = 14
  const dashPeriod = 26

  orbits.forEach((orbit, index) => {
    const angleStep = pointGap / Math.hypot(...orbit.axisU)

    for (let angle = 0, distance = 0; angle < TAU; angle += angleStep, distance += pointGap)
      if (distance % dashPeriod < dashLength) particles.add([angle, index, 0], [0, 0, 1], PARTICLE_KIND.orbitPath)
  })
}

// 0..count-1 in random order (Fisher-Yates: linear time and unbiased, unlike sorting with a random comparator)
function shuffledIndices(count: number) {
  const indices = Uint32Array.from({ length: count }, (_, i) => i)

  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  return indices
}

const DEGREES_PER_RADIAN = 180 / Math.PI

// Globe and wave-field positions, whether each globe point is on land, and a random seed for every point
function buildMorphTargets(count: number, viewportWidth: number, viewportHeight: number) {
  const sphere = new Float32Array(count * 3)
  const land = new Float32Array(count)
  const field = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  // shuffled, so neighbouring letter points land far apart on the globe
  const globeOrder = shuffledIndices(count)
  const columns = Math.ceil(Math.sqrt(count * 1.7))
  const rows = Math.ceil(count / columns)

  for (let i = 0; i < count; i++) {
    const slot = globeOrder[i]
    const y = 1 - (slot / (count - 1)) * 2
    const ringRadius = Math.sqrt(1 - y * y)
    const column = i % columns
    const row = Math.floor(i / columns)
    const x = Math.cos(GOLDEN_ANGLE * slot) * ringRadius
    const z = Math.sin(GOLDEN_ANGLE * slot) * ringRadius

    sphere[i * 3] = x
    sphere[i * 3 + 1] = y
    sphere[i * 3 + 2] = z
    // Longitude 0 faces the viewer (+z) before the globe turns, matching globe-pins.ts
    land[i] = isLand(Math.atan2(x, z) * DEGREES_PER_RADIAN, Math.asin(y) * DEGREES_PER_RADIAN) ? 1 : 0
    field[i * 3] = (column / columns - 0.5) * viewportWidth * 2.6 + (Math.random() - 0.5) * 6
    field[i * 3 + 1] = -viewportHeight * 0.42
    field[i * 3 + 2] = 420 - (row / rows) * 3200
    seeds[i] = Math.random()
  }

  return { sphere, land, field, seeds }
}

export type Scene = ReturnType<typeof buildScene>

export function buildScene(viewportWidth: number, viewportHeight: number) {
  const layout = computeLayout(viewportWidth, viewportHeight)
  const raster = rasterizeLogo(layout)
  const spacing = letterPointSpacing(layout, raster.sharpAlpha)
  const extrusion = 4.5 * layout.scale
  const planet = logoToStage(layout, O_CENTER)
  const dot = logoToStage(layout, DOT_CENTER)
  const planetRadius = O_RADIUS * layout.scale
  const dotRadius = DOT_RADIUS * layout.scale
  const { labOffset } = layout
  const bowlA = logoToStage(layout, [BOWL_A_CENTER[0] + labOffset.dx, BOWL_A_CENTER[1] + labOffset.dy])
  const bowlB = logoToStage(layout, [BOWL_B_CENTER[0] + labOffset.dx, BOWL_B_CENTER[1] + labOffset.dy])
  const { orbits, eclipticU, eclipticV, ringRadii } = buildOrbits(planet, dot, planetRadius)
  const particles = createParticleList()

  addLetters(particles, layout, raster, spacing, extrusion)
  addSphere(particles, [...planet, 0], planetRadius, PARTICLE_KIND.planet, spacing)
  addSphere(particles, [...dot, 0], dotRadius, PARTICLE_KIND.sun, spacing)
  addStars(particles, layout, dotRadius, spacing)
  addOrbitPaths(particles, orbits)

  const count = particles.kinds.length
  const { sphere, land, field, seeds } = buildMorphTargets(count, viewportWidth, viewportHeight)

  return {
    layout,
    count,
    extrusion,
    planet,
    planetRadius,
    dot,
    dotRadius,
    bowlA,
    bowlB,
    orbits,
    eclipticU,
    eclipticV,
    ringRadii,
    attributes: {
      aText: { data: new Float32Array(particles.positions), size: 3 },
      aNormal: { data: new Float32Array(particles.normals), size: 3 },
      aSphere: { data: sphere, size: 3 },
      aLand: { data: land, size: 1 },
      aField: { data: field, size: 3 },
      aRand: { data: seeds, size: 1 },
      aKind: { data: new Float32Array(particles.kinds), size: 1 }
    }
  }
}
