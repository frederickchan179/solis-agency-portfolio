// Values list hover reveal: a photo card follows the pointer and shows the hovered value's photo (fine pointers only)
import { clamp, damp, type Vec2 } from '@/scripts/math'

// How quickly the card catches up with the pointer (per second)
const FOLLOW_RATE = 10
// The card tilts toward the direction it is moving, in degrees per pixel it lags behind
const TILT_PER_PIXEL = 0.06
const MAX_TILT = 6
const CURSOR_GAP = 24
const EDGE_GAP = 16
// Keeps the card below the fixed header
const TOP_GAP = 96
const SETTLED_DISTANCE = 0.3
const MAX_FRAME_TIME = 0.05

export function initValuePhotos() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const list = document.getElementById('value-list')
  const card = document.getElementById('value-photo')

  if (!list || !card) return

  const photos = [...card.querySelectorAll('img')]
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let pointer: Vec2 = [0, 0]
  let position: Vec2 = [0, 0]
  let isVisible = false
  let activeIndex = -1
  let frame = 0
  let lastFrameAt = 0

  // The photos load only once the list is near, and never on touch screens (this function returns early there)
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      photos.forEach((photo) => {
        photo.srcset = photo.dataset.srcset ?? ''
        photo.src = photo.dataset.src ?? ''
      })
      card.classList.add('is-ready')
      observer.disconnect()
    },
    { rootMargin: '50% 0px' }
  ).observe(list)

  // Above and to the right of the pointer, so it covers the row already read rather than the hovered one;
  // flips to the left near the right edge
  const targetPosition = (): Vec2 => {
    const width = card.offsetWidth
    const height = card.offsetHeight
    const fitsRight = pointer[0] + CURSOR_GAP + width <= innerWidth - EDGE_GAP
    const x = fitsRight ? pointer[0] + CURSOR_GAP : pointer[0] - CURSOR_GAP - width

    return [x, clamp(pointer[1] - CURSOR_GAP - height, TOP_GAP, innerHeight - EDGE_GAP - height)]
  }

  const render = (now: number) => {
    const dt = Math.min(MAX_FRAME_TIME, (now - (lastFrameAt || now - 16)) / 1000)
    const catchUp = reducedMotion ? 1 : damp(FOLLOW_RATE, dt)
    const target = targetPosition()
    const lag: Vec2 = [target[0] - position[0], target[1] - position[1]]

    lastFrameAt = now
    position = [position[0] + lag[0] * catchUp, position[1] + lag[1] * catchUp]
    card.style.translate = `${position[0]}px ${position[1]}px`
    card.style.rotate = `${reducedMotion ? 0 : clamp(lag[0] * TILT_PER_PIXEL, -MAX_TILT, MAX_TILT)}deg`

    if (Math.abs(lag[0]) + Math.abs(lag[1]) > SETTLED_DISTANCE) {
      frame = requestAnimationFrame(render)
    } else {
      frame = 0
      lastFrameAt = 0
    }
  }

  const show = (index: number) => {
    if (index !== activeIndex) {
      photos.forEach((photo, photoIndex) => photo.classList.toggle('is-active', photoIndex === index))
      activeIndex = index
    }
    if (!isVisible) {
      // Appear at the pointer instead of flying in from where the card was last hidden
      position = targetPosition()
      card.style.translate = `${position[0]}px ${position[1]}px`
      card.classList.add('is-visible')
      isVisible = true
    }
  }

  const hide = () => {
    card.classList.remove('is-visible')
    isVisible = false
  }

  const updateFromElement = (element: Element | null) => {
    const row = element?.closest<HTMLElement>('.value')

    if (row && list.contains(row)) {
      show(Number(row.dataset.photoIndex))
    } else {
      hide()
    }
    if (isVisible && !frame) frame = requestAnimationFrame(render)
  }

  list.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return
      pointer = [event.clientX, event.clientY]
      updateFromElement(event.target instanceof Element ? event.target : null)
    },
    { passive: true }
  )
  list.addEventListener('pointerleave', hide)
  // Scrolling moves the rows under a still pointer without any pointer event
  addEventListener(
    'scroll',
    () => {
      if (isVisible) updateFromElement(document.elementFromPoint(pointer[0], pointer[1]))
    },
    { passive: true }
  )
}
