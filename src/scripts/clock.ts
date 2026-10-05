// Hanoi local time in every [data-clock] element
const REFRESH_INTERVAL = 15000

export function initClock() {
  const clocks = document.querySelectorAll('[data-clock]')
  const tick = () => {
    try {
      const time = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(new Date())

      clocks.forEach((clock) => (clock.textContent = time))
    } catch {
      // no time zone support: keep the static clock text
    }
  }

  tick()
  setInterval(tick, REFRESH_INTERVAL)
}
