// Footer mini-game: a click or tap fires the sun from the i-dot. It lobs over the logotype and lands on the click point;
// a letter it hits blasts, gets knocked and lights up. Light all seven and the logotype cheers, then resets.
// The sun regrows on the i-dot, and a click during the regrow fires it early.
import { DOT_RADIUS, LOGO_WIDTH, O_CENTER } from '@/data/logo'
import { TAU, type Vec2 } from '@/scripts/math'

const SUN_RGB = '254,195,33'
const DAY_RGB = '243,246,251'
const MAX_DPR = 2
const MAX_FRAME_TIME = 0.05

// A click this close to a letter (in logo units) still counts as a hit
const HIT_TOLERANCE = 1.6
const HIT_PROBES: Vec2[] = [
  [0, 0],
  [HIT_TOLERANCE, 0],
  [-HIT_TOLERANCE, 0],
  [0, HIT_TOLERANCE],
  [0, -HIT_TOLERANCE]
]

const SHOT = { arcLift: 40, arcLiftPerDistance: 0.25, minDuration: 0.28, maxDuration: 0.6, pixelsPerSecond: 2400 }
const TRAIL_LENGTH = 10
const REGROW_DURATION = 0.45
const SPARK = { friction: 0.94, gravity: 120 }
const SHOCKWAVE_DURATION = 0.5
const KNOCK_DURATION = 700

const BLAST = {
  miss: { sparks: 16, speed: 140, waveRadius: 5 },
  hit: { sparks: 34, speed: 140, waveRadius: 5 },
  celebration: { sparks: 70, speed: 260, waveRadius: 9 }
}

const CELEBRATION = { delay: 450, letterStagger: 70, resetAfter: 1600 }

type Blast = (typeof BLAST)[keyof typeof BLAST]

interface Shot {
  start: Vec2
  control: Vec2
  end: Vec2
  progress: number // 0..1 along the arc
  duration: number // s
  radius: number
  target: SVGPathElement | null // the letter it will hit
  trail: Vec2[]
}

interface Spark {
  x: number
  y: number
  velocityX: number
  velocityY: number
  life: number // 1 down to 0
  duration: number // s
  radius: number
  rgb: string
}

interface Shockwave {
  x: number
  y: number
  progress: number // 0..1
  radius: number
}

// Ease out back: overshoots a little so the new sun pops in
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2

const quadraticBezier = (start: number, control: number, end: number, t: number) =>
  (1 - t) ** 2 * start + 2 * (1 - t) * t * control + t ** 2 * end

export function initFooterGame() {
  const footer = document.getElementById('site-footer') as HTMLElement
  const logo = document.getElementById('footer-logo') as unknown as SVGSVGElement
  const sun = document.getElementById('footer-sun') as unknown as SVGCircleElement
  const letters = [...logo.querySelectorAll<SVGPathElement>('g path')]
  const litLetters = new Set<SVGPathElement>()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  const canvas = document.createElement('canvas')

  canvas.className = 'footer-effects'
  canvas.setAttribute('aria-hidden', 'true')
  footer.prepend(canvas)

  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  let shot: Shot | null = null
  let sparks: Spark[] = []
  let shockwaves: Shockwave[] = []
  let regrowth = 1
  let frame = 0
  let lastFrameAt = 0

  // Logo geometry in footer pixels: where the logo starts and how many pixels one logo unit spans
  const measureLogo = () => {
    const footerBounds = footer.getBoundingClientRect()
    const logoBounds = logo.getBoundingClientRect()

    return {
      left: logoBounds.left - footerBounds.left,
      top: logoBounds.top - footerBounds.top,
      unit: logoBounds.width / LOGO_WIDTH
    }
  }

  const fitCanvas = () => {
    const dpr = Math.min(MAX_DPR, devicePixelRatio || 1)
    const width = Math.round(footer.clientWidth * dpr)
    const height = Math.round(footer.clientHeight * dpr)

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const fillCircle = (x: number, y: number, radius: number, color: string) => {
    context.fillStyle = color
    context.beginPath()
    context.arc(x, y, radius, 0, TAU)
    context.fill()
  }

  // Sparks and a shockwave ring at (x, y); `unit` scales them with the logo
  const spawnBlast = (x: number, y: number, unit: number, { sparks: sparkCount, speed, waveRadius }: Blast) => {
    for (let i = 0; i < sparkCount; i++) {
      const direction = Math.random() * TAU
      const sparkSpeed = (speed * (0.35 + Math.random()) * unit) / 8

      sparks.push({
        x,
        y,
        velocityX: Math.cos(direction) * sparkSpeed,
        velocityY: Math.sin(direction) * sparkSpeed,
        life: 1,
        duration: 0.45 + Math.random() * 0.45,
        radius: ((0.6 + Math.random() * 1.4) * unit) / 8,
        rgb: Math.random() < 0.7 ? SUN_RGB : DAY_RGB
      })
    }
    shockwaves.push({ x, y, progress: 0, radius: waveRadius * unit })
  }

  const startAnimation = () => {
    if (!frame) frame = requestAnimationFrame(render)
  }

  // All seven lit: a wave runs through the letters, the planet blasts, then every letter goes back to white
  const celebrate = () => {
    const { left, top, unit } = measureLogo()

    spawnBlast(left + O_CENTER[0] * unit, top + O_CENTER[1] * unit, unit, BLAST.celebration)
    startAnimation()
    if (!reducedMotion)
      letters.forEach((letter, index) =>
        letter.animate([{ transform: 'none' }, { transform: 'translateY(-4px)', offset: 0.4 }, { transform: 'none' }], {
          duration: 650,
          delay: index * CELEBRATION.letterStagger,
          easing: 'cubic-bezier(.3,1.6,.5,1)'
        })
      )
    setTimeout(() => {
      letters.forEach((letter) => letter.classList.remove('is-lit'))
      litLetters.clear()
    }, CELEBRATION.resetAfter)
  }

  // Lights the letter and knocks it along the shot's direction of travel
  const hitLetter = (letter: SVGPathElement, directionX: number, directionY: number) => {
    const wasLit = litLetters.has(letter)

    letter.classList.add('is-lit')
    litLetters.add(letter)
    if (!reducedMotion)
      letter.animate(
        [
          { transform: 'none' },
          {
            transform: `translate(${directionX * 3}px,${directionY * 3}px) rotate(${directionX * 9}deg)`,
            offset: 0.18
          },
          { transform: `translate(${-directionX}px,${-directionY}px) rotate(${-directionX * 3}deg)`, offset: 0.5 },
          { transform: 'none' }
        ],
        { duration: KNOCK_DURATION, easing: 'cubic-bezier(.2,.8,.2,1)' }
      )
    // Hitting a letter again while all seven are lit would queue a second reset that wipes the next round's letters
    if (!wasLit && litLetters.size === letters.length) setTimeout(celebrate, CELEBRATION.delay)
  }

  const land = (shot: Shot, x: number, y: number, unit: number) => {
    spawnBlast(x, y, unit, shot.target ? BLAST.hit : BLAST.miss)
    if (shot.target) {
      // Direction of travel at landing: from the arc's control point to its end
      const dx = shot.end[0] - shot.control[0]
      const dy = shot.end[1] - shot.control[1]
      const length = Math.hypot(dx, dy) || 1

      hitLetter(shot.target, dx / length, dy / length)
    }
    clearShot()
    regrowth = 0
  }

  const clearShot = () => (shot = null)

  const advanceShot = (shot: Shot, dt: number, unit: number) => {
    shot.progress = Math.min(1, shot.progress + dt / shot.duration)
    const x = quadraticBezier(shot.start[0], shot.control[0], shot.end[0], shot.progress)
    const y = quadraticBezier(shot.start[1], shot.control[1], shot.end[1], shot.progress)

    shot.trail.unshift([x, y])
    shot.trail.length = Math.min(shot.trail.length, TRAIL_LENGTH)
    shot.trail.forEach(([trailX, trailY], index) => {
      const alpha = (1 - index / TRAIL_LENGTH) * 0.35

      fillCircle(trailX, trailY, shot.radius * (1 - index / 14), `rgba(${SUN_RGB},${alpha})`)
    })
    context.shadowColor = `rgba(${SUN_RGB},.8)`
    context.shadowBlur = shot.radius * 3
    fillCircle(x, y, shot.radius, `rgb(${SUN_RGB})`)
    context.shadowBlur = 0
    if (shot.progress >= 1) land(shot, x, y, unit)
  }

  const regrowSun = (dt: number) => {
    regrowth = Math.min(1, regrowth + dt / REGROW_DURATION)
    sun.setAttribute('r', (DOT_RADIUS * easeOutBack(regrowth)).toFixed(2))
  }

  const drawSparks = (dt: number) => {
    sparks = sparks.filter((spark) => (spark.life -= dt / spark.duration) > 0)
    sparks.forEach((spark) => {
      spark.velocityX *= SPARK.friction
      spark.velocityY = spark.velocityY * SPARK.friction + SPARK.gravity * dt
      spark.x += spark.velocityX * dt
      spark.y += spark.velocityY * dt
      fillCircle(spark.x, spark.y, spark.radius * (0.4 + 0.6 * spark.life), `rgba(${spark.rgb},${spark.life})`)
    })
  }

  const drawShockwaves = (dt: number) => {
    shockwaves = shockwaves.filter((wave) => (wave.progress += dt / SHOCKWAVE_DURATION) < 1)
    shockwaves.forEach((wave) => {
      const fade = 1 - wave.progress

      context.strokeStyle = `rgba(${SUN_RGB},${fade * 0.7})`
      context.lineWidth = 2 * fade + 0.5
      context.beginPath()
      context.arc(wave.x, wave.y, wave.radius * (1 - fade ** 3), 0, TAU)
      context.stroke()
    })
  }

  function render(now: number) {
    const dt = Math.min(MAX_FRAME_TIME, lastFrameAt ? (now - lastFrameAt) / 1000 : 0.016)

    lastFrameAt = now
    fitCanvas()
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (shot) advanceShot(shot, dt, measureLogo().unit)
    else if (regrowth < 1) regrowSun(dt)
    drawSparks(dt)
    drawShockwaves(dt)

    if (shot || sparks.length || shockwaves.length || regrowth < 1) {
      frame = requestAnimationFrame(render)
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height)
      lastFrameAt = 0
      frame = 0
    }
  }

  const letterAt = (logoX: number, logoY: number) =>
    letters.find((letter) =>
      HIT_PROBES.some(([offsetX, offsetY]) => letter.isPointInFill(new DOMPoint(logoX + offsetX, logoY + offsetY)))
    ) ?? null

  const fire = (event: PointerEvent) => {
    const footerBounds = footer.getBoundingClientRect()
    const { left, top, unit } = measureLogo()
    const start: Vec2 = [left + Number(sun.getAttribute('cx')) * unit, top + Number(sun.getAttribute('cy')) * unit]
    const end: Vec2 = [event.clientX - footerBounds.left, event.clientY - footerBounds.top]
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1

    shot = {
      start,
      end,
      // Control point above both ends so the sun lobs over the letters instead of cutting through them
      control: [
        (start[0] + end[0]) / 2,
        Math.min(start[1], end[1]) - SHOT.arcLift - distance * SHOT.arcLiftPerDistance
      ],
      progress: 0,
      duration: Math.min(SHOT.maxDuration, SHOT.minDuration + distance / SHOT.pixelsPerSecond),
      radius: DOT_RADIUS * unit,
      target: letterAt((end[0] - left) / unit, (end[1] - top) / unit),
      trail: []
    }
    regrowth = 1
    sun.setAttribute('r', '0')
    startAnimation()
  }

  footer.addEventListener('pointerdown', (event) => {
    if (shot || (event.target as Element).closest('a,button')) return
    fire(event)
  })
}
