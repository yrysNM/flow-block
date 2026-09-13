import { displayName, formatDuration } from '../../shared/time-utils'
import type { ExtensionSettings } from '../../shared/types'

export function StatisticsPanel({
  settings,
  liveUsageById,
}: {
  settings: ExtensionSettings
  liveUsageById: Record<string, number>
}) {
  const rows = [...settings.websites]
    .map((rule) => ({
      rule,
      used: liveUsageById[rule.id] ?? rule.usage.usedTodaySeconds,
    }))
    .sort((a, b) => b.used - a.used)
  const max = Math.max(1, ...rows.map((row) => row.used))

  return (
    <section>
      <h2 className="font-display text-3xl tracking-tight">Statistics</h2>
      <p className="mt-1 text-sm text-muted">Active time counted today on each configured website.</p>
      <div className="mt-6 rounded-3xl border border-line bg-card p-5">
        <h3 className="text-sm font-semibold">Today's Usage</h3>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Add websites to see usage here.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {rows.map(({ rule, used }) => (
              <li key={rule.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{displayName(rule.domain)}</span>
                  <span className="text-ink-soft">{formatDuration(used)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(used > 0 ? 4 : 0, (used / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
