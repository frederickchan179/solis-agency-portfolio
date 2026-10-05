// Custom cursor: the i-dot sun with a trailing orbit ring (fine pointers only)
import type { Vec2 } from '@/scripts/math'

// Over these yellow or light fills the dot turns navy so it never disappears
const LIGHT_FILL_SELECTOR =
  '.button,.marquee,.copy-button,.accordion.is-open .accordion-icon,.video-play,.skip-link,.toast'
const INTERACTIVE_SELECTOR = '[data-cursor],a,button,summary,label'
const AIM_AREA_SELECTOR = '#site-footer'
// How quickly the ring catches up with the dot (per second)
const TRAIL_RATE = 16
const SETTLED_DISTANCE = 0.3
const MAX_FRAME_TIME = 0.05

let setOrbitMark: (isOverLogo: boolean) => void = () => {}

// The hero stage turns the cursor into an orbit while it hovers the logotype
export const showCursorOrbit = (isOverLogo: boolean) => setOrbitMark(isOverLogo)

export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(forced-colors: active)').matches) return

  const cursor = document.createElement('div')
  const dot = document.createElement('i')
  const ring = document.createElement('i')

  cursor.className = 'cursor'
  cursor.setAttribute('aria-hidden', 'true')
  dot.className = 'cursor-dot'
  ring.className = 'cursor-ring'
  cursor.append(ring, dot)
  document.body.append(cursor)
  document.documentElement.classList.add('has-custom-cursor')

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let dotPosition: Vec2 = [-99, -99]
  let ringPosition: Vec2 = [-99, -99]
  let isOrbit = false
  let frame = 0
  let lastFrameAt = 0

  const render = (now: number) => {
    const dt = Math.min(MAX_FRAME_TIME, (now - (lastFrameAt || now - 16)) / 1000)
    // Same trail at any frame rate
    const catchUp = reducedMotion ? 1 : 1 - Math.exp(-dt * TRAIL_RATE)

    lastFrameAt = now
    ringPosition = [
      ringPosition[0] + (dotPosition[0] - ringPosition[0]) * catchUp,
      ringPosition[1] + (dotPosition[1] - ringPosition[1]) * catchUp
    ]
    dot.style.translate = `${dotPosition[0]}px ${dotPosition[1]}px`
    ring.style.translate = `${ringPosition[0]}px ${ringPosition[1]}px`

    const distance = Math.abs(dotPosition[0] - ringPosition[0]) + Math.abs(dotPosition[1] - ringPosition[1])

    if (distance > SETTLED_DISTANCE) {
      frame = requestAnimationFrame(render)
    } else {
      frame = 0
      lastFrameAt = 0
    }
  }

  // link: over a control; label: a control with its own word (data-cursor); orbit: over the hero logotype;
  // aim: over the footer mini-game
  const stateFor = (target: Element, interactive: HTMLElement | null) => {
    if (interactive) return interactive.dataset.cursor ? 'label' : 'link'
    if (isOrbit) return 'orbit'
    if (target.closest(AIM_AREA_SELECTOR)) return 'aim'

    return ''
  }

  const isControlState = () => cursor.dataset.state === 'link' || cursor.dataset.state === 'label'

  addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return
      dotPosition = [event.clientX, event.clientY]
      if (!cursor.classList.contains('is-visible')) {
        ringPosition = [...dotPosition]
        cursor.classList.add('is-visible')
      }
      if (!frame) frame = requestAnimationFrame(render)

      // The target can be the document itself, which has no closest()
      if (!(event.target instanceof Element)) return
      const interactive = event.target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
      const state = stateFor(event.target, interactive)

      if (cursor.dataset.state !== state) {
        cursor.dataset.state = state
        ring.textContent = (state === 'label' && interactive?.dataset.cursor) || ''
      }
      cursor.classList.toggle('on-light', !!event.target.closest(LIGHT_FILL_SELECTOR))
    },
    { passive: true }
  )
  addEventListener('pointerdown', () => cursor.classList.add('is-pressed'))
  addEventListener('pointerup', () => cursor.classList.remove('is-pressed'))
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'))

  setOrbitMark = (isOverLogo: boolean) => {
    isOrbit = isOverLogo
    if (!isControlState()) cursor.dataset.state = isOverLogo ? 'orbit' : ''
  }
}
