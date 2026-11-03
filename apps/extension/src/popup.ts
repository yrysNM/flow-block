interface Status {
  signedIn: boolean
  focusActive: boolean
  rules: number
  pending: number
  apiBase: string
}

const apiBaseInput = document.querySelector<HTMLInputElement>('#api-base')
const emailInput = document.querySelector<HTMLInputElement>('#email')
const passwordInput = document.querySelector<HTMLInputElement>('#password')
const form = document.querySelector<HTMLFormElement>('#sign-in')
const statusNode = document.querySelector<HTMLParagraphElement>('#status')
const errorNode = document.querySelector<HTMLParagraphElement>('#error')
const signOut = document.querySelector<HTMLButtonElement>('#sign-out')

function showStatus(status: Status): void {
  if (!statusNode || !form || !signOut) return
  if (!status.signedIn) {
    statusNode.textContent = 'Signed out. Rules you already cached stay on this browser until you sign in again.'
    form.hidden = false
    signOut.hidden = true
    return
  }
  const focus = status.focusActive ? 'Focus is on, so block rules ignore their schedule.' : 'No focus session. Rules follow their schedule.'
  const pending = status.pending === 0 ? 'No usage is waiting to send.' : `${status.pending} usage event${status.pending === 1 ? '' : 's'} waiting to send.`
  statusNode.textContent = `${focus} ${status.rules} cached rule${status.rules === 1 ? '' : 's'}. ${pending}`
  form.hidden = true
  signOut.hidden = false
}

async function refresh(): Promise<void> {
  const status = await chrome.runtime.sendMessage({ type: 'focusflow:status' }) as Status
  if (apiBaseInput && document.activeElement !== apiBaseInput) apiBaseInput.value = status.apiBase
  showStatus(status)
}

form?.addEventListener('submit', (event) => {
  event.preventDefault()
  if (!emailInput || !passwordInput || !apiBaseInput || !errorNode) return
  errorNode.textContent = ''
  void chrome.runtime.sendMessage({
    type: 'focusflow:login',
    email: emailInput.value,
    password: passwordInput.value,
    apiBase: apiBaseInput.value,
  }).then((result: { ok: boolean; message?: string }) => {
    if (!result.ok && errorNode) errorNode.textContent = result.message ?? 'Could not sign in.'
    passwordInput.value = ''
    return refresh()
  })
})

signOut?.addEventListener('click', () => {
  if (errorNode) errorNode.textContent = ''
  void chrome.runtime.sendMessage({ type: 'focusflow:logout' }).then((result: { ok: boolean; message: string }) => {
    if (!result.ok && errorNode) errorNode.textContent = result.message
    return refresh()
  })
})

void refresh()
