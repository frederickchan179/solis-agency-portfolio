// Footer logotype: the "o" is a planet and the i-dot its sun (brand rule: the lit half always faces the sun).
// The pointer pulls the sun round the planet; the planet turns with it so its lit half keeps facing the sun.
import { DOT_CENTER, LOGO_WIDTH, O_CENTER } from '@/data/logo'
import { clamp, TAU, wrapAngle } from '@/scripts/math'

const REST_ANGLE = Math.atan2(DOT_CENTER[1] - O_CENTER[1], DOT_CENTER[0] - O_CENTER[0])
const ORBIT_RADIUS = Math.hypot(DOT_CENTER[0] - O_CENTER[0], DOT_CENTER[1] - O_CENTER[1])
// Keep the sun on the upper arc so it never hides behind the letters (angles are clockwise, y points down)
const MIN_ANGLE = -Math.PI * 0.92
const MAX_ANGLE = -0.15
const EASING = 0.12
const SETTLED = 0.002

export function initFooterPlanet() {
  const footer = document.getElementById('site-footer') as HTMLElement
  const logo = document.getElementById('footer-logo') as unknown as SVGSVGElement
  const planet = document.getElementById('footer-planet') as unknown as SVGGElement
  const sun = document.getElementById('footer-sun') as unknown as SVGCircleElement
  let angle = REST_ANGLE
  let targetAngle = REST_ANGLE
  let frame = 0

  const render = () => {
    const remaining = wrapAngle(targetAngle - angle)

    angle += remaining * EASING
    const degrees = ((angle - REST_ANGLE) * 180) / Math.PI

    sun.setAttribute('cx', (O_CENTER[0] + Math.cos(angle) * ORBIT_RADIUS).toFixed(2))
    sun.setAttribute('cy', (O_CENTER[1] + Math.sin(angle) * ORBIT_RADIUS).toFixed(2))
    planet.setAttribute('transform', `rotate(${degrees.toFixed(2)} ${O_CENTER[0]} ${O_CENTER[1]})`)
    frame = Math.abs(remaining) > SETTLED ? requestAnimationFrame(render) : 0
  }

  const moveSunToward = (pointerAngle: number) => {
    // atan2 gives -PI..PI; shift the lower-left quadrant so the clamp keeps the sun on the nearer end of the arc
    const unwrapped = pointerAngle > Math.PI / 2 ? pointerAngle - TAU : pointerAngle

    targetAngle = clamp(unwrapped, MIN_ANGLE, MAX_ANGLE)
    if (!frame) frame = requestAnimationFrame(render)
  }

  footer.addEventListener('pointermove', (event) => {
    const bounds = logo.getBoundingClientRect()
    const unitsPerPixel = LOGO_WIDTH / bounds.width
    const x = (event.clientX - bounds.left) * unitsPerPixel
    const y = (event.clientY - bounds.top) * unitsPerPixel

    moveSunToward(Math.atan2(y - O_CENTER[1], x - O_CENTER[0]))
  })
  footer.addEventListener('pointerleave', () => moveSunToward(REST_ANGLE))
}
