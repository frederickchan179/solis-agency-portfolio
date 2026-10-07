// Breathing room between a row taller than the screen and the header above it
const VIEW_MARGIN = 16

// Safety stop for the glide, a little longer than the panel's 0.6s transition
const GLIDE_TIMEOUT = 1000

function setOpen(accordion: Element, isOpen: boolean) {
  accordion.classList.toggle('is-open', isOpen)
  accordion.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', String(isOpen))
}

// Where the top of the opened row should land: centred in the space below the header, or just below the header when
// the row is taller than the screen
function revealTop(accordion: Element, trigger: HTMLElement) {
  const rowHeight = trigger.offsetHeight + (accordion.querySelector('.accordion-inner')?.scrollHeight ?? 0)
  const headerBottom = document.getElementById('site-header')?.getBoundingClientRect().bottom ?? 0
  const centredTop = headerBottom + (window.innerHeight - headerBottom - rowHeight) / 2

  return Math.max(headerBottom + VIEW_MARGIN, centredTop)
}

// Centres the opened row with one native smooth scroll. The panel grows below the trigger, so nothing else moves the
// row while the browser scrolls.
function revealRow(accordion: Element, trigger: HTMLElement) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollBy({
    top: trigger.getBoundingClientRect().top - revealTop(accordion, trigger),
    behavior: reducedMotion ? 'instant' : 'smooth'
  })
}

// Touch screens and reduced motion: a row closing above the tapped one shuts at once, and the page scrolls by the height it lost in the
// same frame, so the tapped row stays under the finger. Correcting the scroll on every frame instead renders a frame
// late on iOS Safari, so the page shakes.
function snapRowAbove(openRow: Element, accordion: Element, trigger: HTMLElement) {
  const topBefore = trigger.getBoundingClientRect().top

  openRow.classList.add('is-snapping')
  setOpen(openRow, false)
  window.scrollBy({ top: trigger.getBoundingClientRect().top - topBefore, behavior: 'instant' })
  openRow.classList.remove('is-snapping')
  setOpen(accordion, true)
  revealRow(accordion, trigger)
}

// Mouse: the row above animates shut while the page scrolls on every frame, so the tapped row glides to its place
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

function canGlide() {
  return (
    matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches
  )
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
        } else if (canGlide()) {
          glideRowAbove(openRowAbove, accordion, button)
        } else {
          snapRowAbove(openRowAbove, accordion, button)
        }

        return
      }

      setOpen(accordion, false)
    })
  )
}
