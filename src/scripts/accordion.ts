// Breathing room between a row taller than the screen and the header above it
const VIEW_MARGIN = 16

// Safety stop for the glide, a little longer than the panel's 0.6s transition
const GLIDE_TIMEOUT = 1000

function setOpen(accordion: Element, isOpen: boolean) {
  accordion.classList.toggle('is-open', isOpen)
  accordion.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', String(isOpen))
}

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const isMouse = () => matchMedia('(hover: hover) and (pointer: fine)').matches

const headerBottom = () => document.getElementById('site-header')?.getBoundingClientRect().bottom ?? 0

// Where the top of the opened row should land: centred in the space below the header, or just below the header when
// the row is taller than the screen
function revealTop(accordion: Element, trigger: HTMLElement) {
  const rowHeight = trigger.offsetHeight + (accordion.querySelector('.accordion-inner')?.scrollHeight ?? 0)
  const belowHeader = headerBottom()
  const centredTop = belowHeader + (window.innerHeight - belowHeader - rowHeight) / 2

  return Math.max(belowHeader + VIEW_MARGIN, centredTop)
}

// Centres the opened row with one native smooth scroll. The panel grows below the trigger, so nothing else moves the
// row while the browser scrolls.
function revealRow(accordion: Element, trigger: HTMLElement) {
  window.scrollBy({
    top: trigger.getBoundingClientRect().top - revealTop(accordion, trigger),
    behavior: prefersReducedMotion() ? 'instant' : 'smooth'
  })
}

// Reduced motion, and touch when sliding would carry the tapped row under the header: a row closing above it shuts at
// once, and the page scrolls by the height it lost in the same frame, so the tapped row stays under the finger
function snapRowAbove(openRow: Element, accordion: Element, trigger: HTMLElement) {
  const topBefore = trigger.getBoundingClientRect().top

  openRow.classList.add('is-snapping')
  setOpen(openRow, false)
  window.scrollBy({ top: trigger.getBoundingClientRect().top - topBefore, behavior: 'instant' })
  openRow.classList.remove('is-snapping')
  setOpen(accordion, true)
  revealRow(accordion, trigger)
}

// Mouse: the row above animates shut while the page scrolls on every frame, so the clicked row glides to its place
// instead of jumping with the height lost above. The closing panel's own eased height paces the glide.
function glideRowAbove(openRow: Element, accordion: Element, trigger: HTMLElement) {
  const closingPanel = openRow.querySelector<HTMLElement>('.accordion-panel')

  // A row clicked on the frame it started opening has no height to glide over
  if (!closingPanel?.offsetHeight) {
    snapRowAbove(openRow, accordion, trigger)

    return
  }

  const startHeight = closingPanel.offsetHeight
  const startTop = trigger.getBoundingClientRect().top

  setOpen(openRow, false)
  setOpen(accordion, true)

  const endTop = revealTop(accordion, trigger)
  const startedAt = performance.now()
  let frame = 0

  // A wheel, key or click from the visitor wins over the glide
  const stop = () => {
    cancelAnimationFrame(frame)
    removeEventListener('wheel', stop)
    removeEventListener('keydown', stop)
    removeEventListener('pointerdown', stop)
  }

  const follow = () => {
    const progress = 1 - closingPanel.getBoundingClientRect().height / startHeight
    const targetTop = startTop + (endTop - startTop) * progress

    window.scrollBy({ top: trigger.getBoundingClientRect().top - targetTop, behavior: 'instant' })
    if (progress < 1 && performance.now() - startedAt < GLIDE_TIMEOUT) frame = requestAnimationFrame(follow)
    else stop()
  }

  addEventListener('wheel', stop, { passive: true })
  addEventListener('keydown', stop)
  addEventListener('pointerdown', stop)
  frame = requestAnimationFrame(follow)
}

// Touch: the row above animates shut and the tapped row slides up with it, while one native smooth scroll, if needed,
// carries it the rest of the way. Correcting the scroll on every frame (the glide) renders a frame late on iOS
// Safari, so the page shakes.
function slideRowAbove(openRow: Element, accordion: Element, trigger: HTMLElement) {
  const closingHeight = openRow.querySelector<HTMLElement>('.accordion-panel')?.offsetHeight ?? 0
  const topAfterClose = trigger.getBoundingClientRect().top - closingHeight

  if (topAfterClose < headerBottom() + VIEW_MARGIN) {
    snapRowAbove(openRow, accordion, trigger)

    return
  }

  setOpen(openRow, false)
  setOpen(accordion, true)
  // Only ever moves the row further up: pulling it back down while the row above shrinks would make it bounce
  window.scrollBy({ top: Math.max(0, topAfterClose - revealTop(accordion, trigger)), behavior: 'smooth' })
}

// Services and open positions: one row per list is open at a time
export function initAccordions() {
  document.querySelectorAll<HTMLButtonElement>('.accordion-trigger').forEach((button) =>
    button.addEventListener('click', () => {
      const accordion = button.closest('.accordion')

      if (!accordion) return

      const isOpen = !accordion.classList.contains('is-open')

      if (isOpen) {
        let openRowAbove: Element | undefined

        accordion.parentElement?.querySelectorAll(':scope > .accordion.is-open').forEach((openRow) => {
          const isAbove = openRow.compareDocumentPosition(accordion) & Node.DOCUMENT_POSITION_FOLLOWING

          if (isAbove) openRowAbove = openRow
          else setOpen(openRow, false)
        })

        if (!openRowAbove) {
          setOpen(accordion, true)
          revealRow(accordion, button)
        } else if (prefersReducedMotion()) {
          snapRowAbove(openRowAbove, accordion, button)
        } else if (isMouse()) {
          glideRowAbove(openRowAbove, accordion, button)
        } else {
          slideRowAbove(openRowAbove, accordion, button)
        }

        return
      }

      setOpen(accordion, false)
    })
  )
}
