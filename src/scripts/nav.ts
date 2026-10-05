// Marks the nav link of the section in the middle of the screen, so the header shows where the visitor is
export function initNav() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav-links a[href^="#"]')]
  const sections = links
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter((section): section is HTMLElement => section !== null)
  const visible = new Set<Element>()

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)))
      // The band is thin, but two sections can share it at a boundary: the later one wins
      const current = sections.filter((section) => visible.has(section)).at(-1)

      links.forEach((link) => {
        if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'true')
        else link.removeAttribute('aria-current')
      })
    },
    // A band across the middle of the screen
    { rootMargin: '-45% 0px -50% 0px' }
  )

  sections.forEach((section) => observer.observe(section))
}
