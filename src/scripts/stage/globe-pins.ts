import { clamp, type Vec2, type Vec3 } from '@/scripts/math'

// Client markets on the What We Do globe: a pin per market and an arc from the studio to each. Pins and arcs turn with
// the same rotation as the globe in the shader.

const DEGREES = Math.PI / 180
// Matches the shader's rotateX(..., .38) on the globe
const GLOBE_PITCH = 0.38
// Matches GLOBE_FOCAL in the shader
const FOCAL_LENGTH = 2400
// Where the studio faces when the visitor reaches the section: a little left of centre, toward the copy
const STUDIO_FACING = -0.3
// Gap from a pin's centre to its label, and the margin a label keeps from the screen edge before it flips sides
const LABEL_OFFSET = 14
const EDGE_MARGIN = 16
// Pins fade out over this distance as they drift past the edge of the screen, where the globe is cut off
const EDGE_FADE = 48
// Radius of a pin's dot, which other pins' labels keep clear of
const DOT_RADIUS = 4
// Height of an arc's middle above the globe per radian between its ends, capped so the long arcs (to the US and the
// UK) stay close to the globe, and points sampled along each arc
const ARC_LIFT = 0.18
const ARC_MAX_LIFT = 0.16
const ARC_SAMPLES = 48
// Matches the media query in Stage.astro that shows the layer; below it the globe sits behind the copy
const PINS_MEDIA = '(min-width: 960px)'

interface Pin {
  element: HTMLElement
  label: HTMLElement | null
  labelWidth: number // measured on first show: the layer is hidden on phones, and measuring early forces a layout
  labelHeight: number
  prefersLeft: boolean
  isStudio: boolean
  normal: Vec3 // unrotated position on the unit globe
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

const overlaps = (first: Box, second: Box) =>
  first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top

interface Arc {
  paths: SVGPathElement[] // the line and its travelling pulse share one shape
  points: Vec3[] // unrotated, lifted off the globe
}

export interface GlobeView {
  center: Vec2
  radius: number
  spin: number
  visibility: number // 0..1, how much the globe stage shows
}

const toNormal = (element: Element): Vec3 => {
  const longitude = Number(element.getAttribute('data-longitude')) * DEGREES
  const latitude = Number(element.getAttribute('data-latitude')) * DEGREES

  return [Math.sin(longitude) * Math.cos(latitude), Math.sin(latitude), Math.cos(longitude) * Math.cos(latitude)]
}

// Points along the great circle from one place to another, rising off the globe toward the middle
function arcPoints(from: Vec3, to: Vec3): Vec3[] {
  const angle = Math.acos(clamp(from[0] * to[0] + from[1] * to[1] + from[2] * to[2], -1, 1))
  const points: Vec3[] = []

  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const progress = i / ARC_SAMPLES
    const fromWeight = Math.sin((1 - progress) * angle) / Math.sin(angle)
    const toWeight = Math.sin(progress * angle) / Math.sin(angle)
    const height = 1 + Math.min(ARC_LIFT * angle, ARC_MAX_LIFT) * Math.sin(Math.PI * progress)

    points.push([
      (from[0] * fromWeight + to[0] * toWeight) * height,
      (from[1] * fromWeight + to[1] * toWeight) * height,
      (from[2] * fromWeight + to[2] * toWeight) * height
    ])
  }

  return points
}

export function initGlobePins() {
  const layer = document.getElementById('globe-pins')
  const studioPin = layer?.querySelector('[data-studio]')
  const studioNormal = studioPin ? toNormal(studioPin) : null
  const pinsShown = matchMedia(PINS_MEDIA)
  const pins: Pin[] = [...(layer?.querySelectorAll<HTMLElement>('.globe-pin') ?? [])].map((element) => ({
    element,
    label: element.querySelector<HTMLElement>('.globe-pin-label'),
    labelWidth: 0,
    labelHeight: 0,
    prefersLeft: element.dataset.labelSide === 'left',
    isStudio: element.hasAttribute('data-studio'),
    normal: toNormal(element)
  }))
  const arcs: Arc[] = [...(layer?.querySelectorAll<SVGGElement>('.globe-arc') ?? [])].map((group) => ({
    paths: [...group.querySelectorAll('path')],
    points: studioNormal ? arcPoints(studioNormal, toNormal(group)) : []
  }))
  let wasShown = false

  function update({ center, radius, spin, visibility }: GlobeView, viewportWidth: number, viewportHeight: number) {
    const shown = visibility > 0.01 && pinsShown.matches

    if (!layer || (!shown && !wasShown)) return
    wasShown = shown
    layer.style.opacity = shown ? visibility.toFixed(3) : '0'
    if (!shown) return

    if (pins[0] && !pins[0].labelWidth) {
      pins.forEach((pin) => {
        pin.labelWidth = pin.label?.offsetWidth ?? 0
        pin.labelHeight = pin.label?.offsetHeight ?? 0
      })
    }

    const yawCos = Math.cos(spin)
    const yawSin = Math.sin(spin)
    const pitchCos = Math.cos(GLOBE_PITCH)
    const pitchSin = Math.sin(GLOBE_PITCH)

    // Same as the shader: rotateY by the spin, then rotateX by the pitch, then perspective
    const project = ([x, y, z]: Vec3) => {
      const turnedX = yawCos * x + yawSin * z
      const turnedZ = -yawSin * x + yawCos * z
      const pitchedY = pitchCos * y - pitchSin * turnedZ
      const pitchedZ = pitchSin * y + pitchCos * turnedZ
      const scale = FOCAL_LENGTH / Math.max(FOCAL_LENGTH - pitchedZ * radius, 60)

      return {
        x: viewportWidth / 2 + (turnedX * radius + center[0]) * scale,
        y: viewportHeight / 2 - (pitchedY * radius + center[1]) * scale,
        scale,
        depth: pitchedZ,
        hidden: pitchedZ < 0 && turnedX * turnedX + pitchedY * pitchedY < 1 // behind the globe
      }
    }

    const placed = pins.map((pin) => {
      const { x, y, scale, depth } = project(pin.normal)
      // Pins fade out as they turn toward the rim, vanish on the far side and fade past the edge of the screen
      const visibility = clamp((depth - 0.02) / 0.25) * clamp((viewportWidth - EDGE_MARGIN - x) / EDGE_FADE)
      const pinScale = scale * (0.8 + 0.2 * clamp((depth - 0.02) / 0.25))
      const labelReach = (LABEL_OFFSET + pin.labelWidth) * pinScale
      const labelLeft = pin.prefersLeft ? x - labelReach >= EDGE_MARGIN : x + labelReach > viewportWidth - EDGE_MARGIN
      const labelStart = x + (labelLeft ? -labelReach : LABEL_OFFSET * pinScale)
      const halfLabelHeight = (pin.labelHeight / 2) * pinScale
      const dotRadius = DOT_RADIUS * pinScale

      pin.element.style.opacity = visibility.toFixed(3)
      pin.element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${pinScale.toFixed(3)})`
      pin.element.classList.toggle('has-label-left', labelLeft)

      return {
        pin,
        visibility,
        dot: { left: x - dotRadius, right: x + dotRadius, top: y - dotRadius, bottom: y + dotRadius },
        label: {
          left: labelStart,
          right: labelStart + (labelReach - LABEL_OFFSET * pinScale),
          top: y - halfLabelHeight,
          bottom: y + halfLabelHeight
        }
      }
    })

    // Where labels collide, the studio's and then the more visible pin's label stays and the other one hides
    const ranked = placed
      .filter((entry) => entry.visibility > 0.05)
      .sort(
        (first, second) =>
          Number(second.pin.isStudio) - Number(first.pin.isStudio) || second.visibility - first.visibility
      )
    const kept: typeof ranked = []

    for (const entry of placed) entry.pin.element.classList.remove('is-label-hidden')
    for (const entry of ranked) {
      const collides = kept.some(
        (other) =>
          overlaps(entry.label, other.label) || overlaps(entry.label, other.dot) || overlaps(other.label, entry.dot)
      )

      if (collides) entry.pin.element.classList.add('is-label-hidden')
      else kept.push(entry)
    }

    // Each arc breaks where it passes behind the globe
    for (const { paths, points } of arcs) {
      let shape = ''
      let drawing = false

      for (const point of points) {
        const { x, y, hidden } = project(point)

        if (hidden) {
          drawing = false
          continue
        }
        shape += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
        drawing = true
      }
      paths.forEach((path) => path.setAttribute('d', shape))
    }
  }

  return {
    // Globe turn that puts the studio at STUDIO_FACING
    studioSpin: STUDIO_FACING - Math.atan2(studioNormal?.[0] ?? 0, studioNormal?.[2] ?? 1),
    update
  }
}
