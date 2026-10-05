// Retreat video: load the Vimeo player only on request
const VIMEO_PLAYER_URL = 'https://player.vimeo.com/video/'

export function initVideo() {
  document.querySelectorAll<HTMLButtonElement>('[data-vimeo]').forEach((button) =>
    button.addEventListener('click', () => {
      const player = document.createElement('iframe')

      player.src = `${VIMEO_PLAYER_URL}${button.dataset.vimeo}?autoplay=1&dnt=1`
      player.title = button.getAttribute('aria-label') ?? ''
      player.allow = 'autoplay; fullscreen; picture-in-picture'
      player.allowFullscreen = true
      button.replaceWith(player)
      // The button that had focus is gone: hand focus to the player so keyboard users can control it
      player.focus()
    })
  )
}
