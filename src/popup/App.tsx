import { useMemo, useState } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingState } from '../components/LoadingState'
import {
  addWebsite,
  deleteWebsite,
  updateWebsite,
} from '../shared/storage'
import { requestEvaluate } from '../shared/messages'
import { useSettings } from '../shared/use-settings'
import { useTheme } from '../shared/theme'
import { AddWebsitePage } from './pages/AddWebsitePage'
import { HomePage } from './pages/HomePage'
import { WebsiteSettingsPage } from './pages/WebsiteSettingsPage'

type View = 'home' | 'add' | 'settings'

export function App() {
  const { settings, liveUsageById, loading, error, refresh } = useSettings()
  const [view, setView] = useState<View>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useTheme(settings)

  const selected = useMemo(
    () => settings?.websites.find((rule) => rule.id === selectedId) ?? null,
    [settings, selectedId],
  )

  if (loading && !settings) {
    return <LoadingState label="Loading your rules…" />
  }

  if (!settings) {
    return (
      <div className="p-4">
        <ErrorBanner message={error ?? 'Could not load extension settings'} onRetry={() => void refresh()} />
      </div>
    )
  }

  if (view === 'add') {
    return (
      <AddWebsitePage
        websites={settings.websites}
        onCancel={() => setView('home')}
        onSubmit={async (input) => {
          await addWebsite(input)
          await requestEvaluate()
          await refresh()
          setView('home')
        }}
      />
    )
  }

  if (view === 'settings' && selected) {
    return (
      <>
        {actionError ? (
          <div className="px-4 pt-3">
            <ErrorBanner message={actionError} />
          </div>
        ) : null}
        <WebsiteSettingsPage
        key={selected.id}
        rule={selected}
        usedSeconds={liveUsageById[selected.id] ?? selected.usage.usedTodaySeconds}
        onBack={() => {
          setSelectedId(null)
          setView('home')
        }}
        onChange={(patch) => {
          void updateWebsite(selected.id, patch)
            .then(async () => {
              setActionError(null)
              await requestEvaluate()
              await refresh()
            })
            .catch((err: unknown) => {
              setActionError(err instanceof Error ? err.message : 'Could not update website')
            })
        }}
        onResetUsage={() => {
          void updateWebsite(selected.id, {
            usage: {
              ...selected.usage,
              usedTodaySeconds: 0,
              lastUpdated: new Date().toISOString(),
              notified80: false,
              notified100: false,
            },
          })
            .then(async () => {
              setActionError(null)
              await requestEvaluate()
              await refresh()
            })
            .catch((err: unknown) => {
              setActionError(err instanceof Error ? err.message : 'Could not reset usage')
            })
        }}
        onDelete={() => {
          void deleteWebsite(selected.id)
            .then(async () => {
              setActionError(null)
              await requestEvaluate()
              await refresh()
              setSelectedId(null)
              setView('home')
            })
            .catch((err: unknown) => {
              setActionError(err instanceof Error ? err.message : 'Could not delete website')
            })
        }}
      />
      </>
    )
  }

  return (
    <>
      {actionError ? (
        <div className="px-4 pt-3">
          <ErrorBanner message={actionError} />
        </div>
      ) : null}
    <HomePage
      websites={settings.websites}
      liveUsageById={liveUsageById}
      onAdd={() => setView('add')}
      onToggle={(id, enabled) => {
        void updateWebsite(id, { enabled })
          .then(async () => {
            setActionError(null)
            await requestEvaluate()
            await refresh()
          })
          .catch((err: unknown) => {
            setActionError(err instanceof Error ? err.message : 'Could not update website')
          })
      }}
      onSettings={(id) => {
        setSelectedId(id)
        setView('settings')
      }}
      onDelete={(id) => {
        void deleteWebsite(id)
          .then(async () => {
            setActionError(null)
            await requestEvaluate()
            await refresh()
          })
          .catch((err: unknown) => {
            setActionError(err instanceof Error ? err.message : 'Could not delete website')
          })
      }}
    />
    </>
  )
}
