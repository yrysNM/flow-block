import type { LiveSettingsResponse, RuntimeMessage } from './types'

export async function sendRuntimeMessage<T>(
  message: RuntimeMessage,
): Promise<T | undefined> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return undefined
  }
  try {
    return (await chrome.runtime.sendMessage(message)) as T
  } catch {
    return undefined
  }
}

export async function fetchLiveSettings(): Promise<LiveSettingsResponse | undefined> {
  return sendRuntimeMessage<LiveSettingsResponse>({ type: 'GET_LIVE_SETTINGS' })
}

export async function requestSessionFlush(): Promise<void> {
  await sendRuntimeMessage({ type: 'FLUSH_SESSION' })
}

export async function requestEvaluate(): Promise<void> {
  await sendRuntimeMessage({ type: 'EVALUATE_ACTIVE_TAB' })
}

export function openOptionsPage(hash?: string): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.openOptionsPage) {
    window.open(`/src/options/index.html${hash ?? ''}`, '_blank')
    return
  }

  if (hash) {
    void sendRuntimeMessage({ type: 'OPEN_OPTIONS', hash })
    return
  }
  void chrome.runtime.openOptionsPage()
}
