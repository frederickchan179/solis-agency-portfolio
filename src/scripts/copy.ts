// Copy buttons next to each contact address, confirmed with a toast
const TOAST_DURATION = 1800

export function initCopy() {
  const toast = document.getElementById('toast') as HTMLElement
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  const showToast = (message: string) => {
    toast.textContent = message
    toast.classList.add('is-visible')
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => toast.classList.remove('is-visible'), TOAST_DURATION)
  }

  // Without clipboard access, the toast still shows the address so it can be copied by hand
  const copyText = (text = '') => {
    if (!navigator.clipboard) return showToast(text)
    navigator.clipboard.writeText(text).then(
      () => showToast(`Copied ${text}`),
      () => showToast(text)
    )
  }

  document
    .querySelectorAll<HTMLButtonElement>('[data-copy]')
    .forEach((button) => button.addEventListener('click', () => copyText(button.dataset.copy)))
}
