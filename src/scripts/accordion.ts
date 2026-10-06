// Breathing room between a row taller than the screen and the header above it
const VIEW_MARGIN = 16

function setOpen(accordion: Element, isOpen: boolean) {
  accordion.classList.toggle('is-open', isOpen)
  accordion.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', String(isOpen))
}

// A row closing above the tapped one shuts at once, and the page scrolls by the height it lost in the same frame, so
// the tapped row stays under the finger. Animating it instead means correcting the scroll on every frame, which iOS
// Safari renders a frame late, so the page shakes.
function closeRowAbove(openRow: Element, trigger: HTMLElement) {
  const topBefore = trigger.getBoundingClientRect().top

  openRow.classList.add('is-snapping')
  setOpen(openRow, false)
  window.scrollBy({ top: trigger.getBoundingClientRect().top - topBefore, behavior: 'instant' })
  openRow.classList.remove('is-snapping')
}

// Centres the opened row in the space below the header with one native smooth scroll. The panel grows below the
// trigger, so nothing else moves the row while the browser scrolls.
function revealRow(accordion: Element, trigger: HTMLElement) {
  const rowHeight = trigger.offsetHeight + (accordion.querySelector('.accordion-inner')?.scrollHeight ?? 0)
  const headerBottom = document.getElementById('site-header')?.getBoundingClientRect().bottom ?? 0
  const centredTop = headerBottom + (window.innerHeight - headerBottom - rowHeight) / 2
  // A row taller than the screen starts just below the header
  const targetTop = Math.max(headerBottom + VIEW_MARGIN, centredTop)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollBy({
    top: trigger.getBoundingClientRect().top - targetTop,
    behavior: reducedMotion ? 'instant' : 'smooth'
  })
}

// Services and open positions: one row per list is open at a time
export function initAccordions() {
  document.querySelectorAll<HTMLButtonElement>('.accordion-trigger').forEach((button) =>
    button.addEventListener('click', () => {
      const accordion = button.closest('.accordion')

      if (!accordion) return

      const isOpen = !accordion.classList.contains('is-open')

      if (isOpen) {
        accordion.parentElement?.querySelectorAll(':scope > .accordion.is-open').forEach((openRow) => {
          const isAbove = openRow.compareDocumentPosition(accordion) & Node.DOCUMENT_POSITION_FOLLOWING

          if (isAbove) closeRowAbove(openRow, button)
          else setOpen(openRow, false)
        })
        setOpen(accordion, true)
        revealRow(accordion, button)

        return
      }

      setOpen(accordion, false)
    })
  )
}
