import { useMemo, useState } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingState } from '../components/LoadingState'
import { requestEvaluate } from '../shared/messages'
import {
  addWebsite,
  deleteWebsite,
  getSettings,
  mutateSettings,
  resetDailyUsage,
  saveSettings,
  updateWebsite,
} from '../shared/storage'
import { useTheme } from '../shared/theme'
import { useSettings } from '../shared/use-settings'
import { OverviewPanel } from './components/OverviewPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { StatisticsPanel } from './components/StatisticsPanel'
import { WebsitesPanel } from './components/WebsitesPanel'
import { WebsiteSettingsPage } from '../popup/pages/WebsiteSettingsPage'
import { AddWebsitePage } from '../popup/pages/AddWebsitePage'

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'websites', label: 'Websites' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'settings', label: 'Settings' },
] as const

type Section = (typeof NAV)[number]['id']

function initialSection(): Section {
  const hash = window.location.hash.replace('#', '')
  if (NAV.some((item) => item.id === hash)) return hash as Section
  return 'overview'
}

export function App() {
  const { settings, liveUsageById, loading, error, refresh } = useSettings()
  const [section, setSection] = useState<Section>(initialSection)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useTheme(settings)

  const selected = useMemo(
    () => settings?.websites.find((rule) => rule.id === selectedId) ?? null,
    [settings, selectedId],
  )

  if (loading && !settings) return <LoadingState label="Loading dashboard…" />
  if (!settings) {
    return (
      <div className="p-8">
        <ErrorBanner message={error ?? 'Could not load settings'} onRetry={() => void refresh()} />
      </div>
    )
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-card px-5 py-6 md:border-b-0 md:border-r">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Dashboard
        </p>
        <h1 className="font-display text-3xl tracking-tight">Website Blocker</h1>
        <nav className="mt-6 flex gap-2 overflow-x-auto md:flex-col">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`rounded-xl px-3 py-2 text-left text-sm ${
                section === item.id
                  ? 'bg-accent-soft text-accent-2'
                  : 'text-ink-soft hover:bg-paper-2'
              }`}
              onClick={() => {
                setSection(item.id)
                setAdding(false)
                setSelectedId(null)
                window.location.hash = item.id
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          {adding ? (
            <div className="mx-auto max-w-md rounded-3xl border border-line bg-card">
              <AddWebsitePage
                websites={settings.websites}
                onCancel={() => setAdding(false)}
                onSubmit={async (input) => {
                  await addWebsite(input)
                  await requestEvaluate()
                  await refresh()
                  setAdding(false)
                  setSection('websites')
                }}
              />
            </div>
          ) : selected ? (
            <div className="mx-auto max-w-md rounded-3xl border border-line bg-card">
              <WebsiteSettingsPage
                key={selected.id}
                rule={selected}
                usedSeconds={liveUsageById[selected.id] ?? selected.usage.usedTodaySeconds}
                onBack={() => setSelectedId(null)}
                onChange={(patch) => {
                  void updateWebsite(selected.id, patch)
                    .then(async () => {
                      await requestEvaluate()
                      await refresh()
                    })
                    .catch((err: unknown) => {
                      window.alert(err instanceof Error ? err.message : 'Could not update website')
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
                      await requestEvaluate()
                      await refresh()
                    })
                    .catch((err: unknown) => {
                      window.alert(err instanceof Error ? err.message : 'Could not reset usage')
                    })
                }}
                onDelete={() => {
                  void deleteWebsite(selected.id)
                    .then(async () => {
                      await requestEvaluate()
                      await refresh()
                      setSelectedId(null)
                    })
                    .catch((err: unknown) => {
                      window.alert(err instanceof Error ? err.message : 'Could not delete website')
                    })
                }}
              />
            </div>
          ) : (
            <>
              {section === 'overview' && (
                <OverviewPanel settings={settings} liveUsageById={liveUsageById} />
              )}
              {section === 'websites' && (
                <WebsitesPanel
                  settings={settings}
                  liveUsageById={liveUsageById}
                  onAdd={() => setAdding(true)}
                  onToggle={(id, enabled) => {
                    void updateWebsite(id, { enabled })
                      .then(async () => {
                        await requestEvaluate()
                        await refresh()
                      })
                      .catch((err: unknown) => {
                        window.alert(err instanceof Error ? err.message : 'Could not update website')
                      })
                  }}
                  onSettings={setSelectedId}
                  onDelete={(id) => {
                    void deleteWebsite(id)
                      .then(async () => {
                        await requestEvaluate()
                        await refresh()
                      })
                      .catch((err: unknown) => {
                        window.alert(err instanceof Error ? err.message : 'Could not delete website')
                      })
                  }}
                />
              )}
              {section === 'statistics' && (
                <StatisticsPanel settings={settings} liveUsageById={liveUsageById} />
              )}
              {section === 'settings' && (
                <SettingsPanel
                  settings={settings}
                  onChange={(patch) => {
                    void mutateSettings((current) => ({ ...current, ...patch })).then(async () => {
                      await requestEvaluate()
                      await refresh()
                    })
                  }}
                  onResetDaily={async () => {
                    await resetDailyUsage()
                    await requestEvaluate()
                    await refresh()
                  }}
                  onResetAll={async () => {
                    await resetDailyUsage()
                    await requestEvaluate()
                    await refresh()
                  }}
                  onImported={async () => {
                    await getSettings()
                    await requestEvaluate()
                    await refresh()
                  }}
                  onSave={async (next) => {
                    await saveSettings(next)
                    await requestEvaluate()
                    await refresh()
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
