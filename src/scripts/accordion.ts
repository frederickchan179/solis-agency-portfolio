// Matches the .accordion-panel transition in AccordionItem.astro
const PANEL_TRANSITION_MS = 600
// Breathing room between a row taller than the screen and the header above it
const VIEW_MARGIN = 16

function setOpen(accordion: Element, isOpen: boolean) {
  accordion.classList.toggle('is-open', isOpen)
  accordion.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', String(isOpen))
}

// Centres the opened row in the space below the header. It runs with the panel transition so the rows closing above
// and the panel growing below never pull the row out of view.
function revealRow(accordion: Element, trigger: HTMLElement) {
  const startTop = trigger.getBoundingClientRect().top
  const rowHeight = trigger.offsetHeight + (accordion.querySelector('.accordion-inner')?.scrollHeight ?? 0)
  const headerBottom = document.getElementById('site-header')?.getBoundingClientRect().bottom ?? 0
  const centredTop = headerBottom + (window.innerHeight - headerBottom - rowHeight) / 2
  // A row taller than the screen starts just below the header
  const targetTop = Math.max(headerBottom + VIEW_MARGIN, centredTop)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const startTime = performance.now()
  let isCancelled = false

  // The visitor scrolling by hand takes over
  const cancel = () => (isCancelled = true)

  window.addEventListener('wheel', cancel, { once: true, passive: true })
  window.addEventListener('touchstart', cancel, { once: true, passive: true })

  const follow = (now: number) => {
    if (isCancelled) return

    const progress = reducedMotion ? 1 : Math.min((now - startTime) / PANEL_TRANSITION_MS, 1)
    // Ease out, close to --ease
    const desiredTop = startTop + (targetTop - startTop) * (1 - (1 - progress) ** 4)
    const drift = trigger.getBoundingClientRect().top - desiredTop

    if (Math.abs(drift) >= 0.5) window.scrollBy({ top: drift, behavior: 'instant' })

    // Keeps following a little past the end, as the panel transitions start a frame or two after the click
    if (now - startTime < PANEL_TRANSITION_MS + 150) {
      requestAnimationFrame(follow)
    } else {
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
    }
  }

  requestAnimationFrame(follow)
}

// Services and open positions: one row per list is open at a time
export function initAccordions() {
  document.querySelectorAll<HTMLButtonElement>('.accordion-trigger').forEach((button) =>
    button.addEventListener('click', () => {
      const accordion = button.closest('.accordion')

      if (!accordion) return

      const isOpen = !accordion.classList.contains('is-open')

      if (isOpen) {
        accordion.parentElement
          ?.querySelectorAll(':scope > .accordion.is-open')
          .forEach((openRow) => setOpen(openRow, false))
        revealRow(accordion, button)
      }

      setOpen(accordion, isOpen)
    })
  )
}
