import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/EmptyState'
import { WebsiteCard } from '../../components/WebsiteCard'
import { displayName, formatCompact } from '../../shared/time-utils'
import type { WebsiteRule } from '../../shared/types'
import { openOptionsPage } from '../../shared/messages'

export function HomePage({
  websites,
  liveUsageById,
  onAdd,
  onToggle,
  onSettings,
  onDelete,
}: {
  websites: WebsiteRule[]
  liveUsageById: Record<string, number>
  onAdd: () => void
  onToggle: (id: string, enabled: boolean) => void
  onSettings: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Focus
          </p>
          <h1 className="font-display text-2xl tracking-tight text-ink">Website Blocker</h1>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add Website
        </Button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Today's Usage
          </h2>
          {websites.length === 0 ? (
            <EmptyState
              title="No websites yet"
              body="Add a distracting site to start blocking it or limiting daily time."
              action={
                <Button size="sm" onClick={onAdd}>
                  Add your first website
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {websites.map((rule) => {
                const used = liveUsageById[rule.id] ?? rule.usage.usedTodaySeconds
                const limited = rule.timeLimit.enabled && !rule.blocking.enabled
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{displayName(rule.domain)}</span>
                    <span className="text-ink-soft">
                      {rule.blocking.enabled && rule.enabled
                        ? 'Blocked'
                        : limited
                          ? `${formatCompact(used)} / ${formatCompact(rule.timeLimit.dailyLimitMinutes * 60)}`
                          : formatCompact(used)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {websites.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Blocked Websites
            </h2>
            <div className="space-y-2">
              {websites.map((rule) => (
                <WebsiteCard
                  key={rule.id}
                  rule={rule}
                  usedSeconds={liveUsageById[rule.id] ?? rule.usage.usedTodaySeconds}
                  onToggle={(enabled) => onToggle(rule.id, enabled)}
                  onSettings={() => onSettings(rule.id)}
                  onDelete={() => setPendingDelete(rule.id)}
                />
              ))}
            </div>
          </section>
        )}

      {pendingDelete && (
          <div className="rounded-2xl border border-line bg-card p-3">
            <p className="text-sm text-ink">Delete this website rule?</p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(pendingDelete)
                  setPendingDelete(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-line px-4 py-3">
        <button
          className="text-xs font-medium text-muted hover:text-ink"
          onClick={() => openOptionsPage()}
          type="button"
        >
          Open dashboard
        </button>
      </footer>
    </div>
  )
}
