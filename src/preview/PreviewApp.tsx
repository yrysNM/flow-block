import { useEffect, useState } from 'react'
import { App as PopupApp } from '../popup/App'
import { App as OptionsApp } from '../options/App'
import { BlockedPage } from '../blocked/BlockedPage'
import { UnlockPage } from '../unlock/UnlockPage'

const views = [
  { id: 'popup', label: 'Popup' },
  { id: 'options', label: 'Dashboard' },
  { id: 'blocked', label: 'Blocked page' },
  { id: 'unlock', label: 'Unlock request' },
] as const

type View = (typeof views)[number]['id']

export function PreviewApp() {
  const [view, setView] = useState<View>('popup')

  useEffect(() => {
    const onOpen = () => setView('options')
    window.addEventListener('preview:open-options', onOpen)
    return () => window.removeEventListener('preview:open-options', onOpen)
  }, [])

  useEffect(() => {
    if (view === 'blocked') {
      const url = new URL(window.location.href)
      url.searchParams.set('domain', 'youtube.com')
      url.searchParams.set('reason', 'limit')
      url.searchParams.set('limit', '60')
      url.searchParams.set('used', String(60 * 60))
      window.history.replaceState({}, '', url)
    }
    if (view === 'unlock') {
      const url = new URL(window.location.href)
      url.searchParams.set('token', 'preview-unlock-token')
      window.history.replaceState({}, '', url)
    }
  }, [view])

  return (
    <div className="min-h-screen bg-[#d9cfc0] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            UI preview
          </p>
          <h1 className="font-display text-4xl tracking-tight">Website Blocker</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            This gallery shows the extension popup, dashboard, blocked page, and trusted-person
            unlock request with sample data. Load the built extension in Chrome to use real
            blocking and time tracking.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {views.map((item) => (
              <button
                key={item.id}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  view === item.id ? 'bg-accent text-white' : 'bg-card text-ink'
                }`}
                onClick={() => setView(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {view === 'popup' && (
          <div className="overflow-hidden rounded-[28px] border border-line bg-paper shadow-xl">
            <div className="h-[580px] w-[380px] max-w-full overflow-hidden">
              <PopupApp />
            </div>
          </div>
        )}
        {view === 'options' && (
          <div className="overflow-hidden rounded-[28px] border border-line bg-paper shadow-xl">
            <OptionsApp />
          </div>
        )}
        {view === 'blocked' && (
          <div className="overflow-hidden rounded-[28px] border border-line bg-paper shadow-xl">
            <BlockedPage />
          </div>
        )}
        {view === 'unlock' && (
          <div className="overflow-hidden rounded-[28px] border border-line bg-paper shadow-xl">
            <UnlockPage />
          </div>
        )}
      </div>
    </div>
  )
}
