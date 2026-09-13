import { displayName, formatDuration } from '../../shared/time-utils'
import type { ExtensionSettings } from '../../shared/types'

export function OverviewPanel({
  settings,
  liveUsageById,
}: {
  settings: ExtensionSettings
  liveUsageById: Record<string, number>
}) {
  const blocked = settings.websites.filter((rule) => rule.enabled && rule.blocking.enabled).length
  const limited = settings.websites.filter((rule) => rule.enabled && rule.timeLimit.enabled).length
  const totalSeconds = settings.websites.reduce(
    (sum, rule) => sum + (liveUsageById[rule.id] ?? rule.usage.usedTodaySeconds),
    0,
  )
  const mostUsed = [...settings.websites].sort(
    (a, b) =>
      (liveUsageById[b.id] ?? b.usage.usedTodaySeconds) -
      (liveUsageById[a.id] ?? a.usage.usedTodaySeconds),
  )[0]

  const cards = [
    { label: 'Websites', value: String(settings.websites.length) },
    { label: 'Blocked completely', value: String(blocked) },
    { label: 'With time limits', value: String(limited) },
    { label: "Today's browsing", value: formatDuration(totalSeconds) },
  ]

  return (
    <section>
      <h2 className="font-display text-3xl tracking-tight">Overview</h2>
      <p className="mt-1 text-sm text-muted">
        A snapshot of today's protection and the time you've spent on watched sites.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-2 font-display text-3xl">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-3xl border border-line bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Most-used website</p>
        <p className="mt-2 font-display text-2xl">
          {mostUsed && (liveUsageById[mostUsed.id] ?? mostUsed.usage.usedTodaySeconds) > 0
            ? displayName(mostUsed.domain)
            : 'No usage yet today'}
        </p>
        {mostUsed && (
          <p className="mt-1 text-sm text-muted">
            {formatDuration(liveUsageById[mostUsed.id] ?? mostUsed.usage.usedTodaySeconds)}
          </p>
        )}
      </div>
      {!settings.globalEnabled && (
        <p className="mt-4 rounded-2xl border border-warn/30 bg-accent-soft px-4 py-3 text-sm">
          Protection is paused in Settings. Sites will load normally until you turn it back on.
        </p>
      )}
    </section>
  )
}
