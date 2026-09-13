import { Settings2, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Switch } from './ui/switch'
import { ruleStatusLabel } from '../shared/blocking'
import { displayName, formatCompact, usageRatio } from '../shared/time-utils'
import type { WebsiteRule } from '../shared/types'
import { requiresTrustedUnlock } from '../shared/unlock'
import { cn } from '../shared/cn'

export function WebsiteCard({
  rule,
  usedSeconds,
  onToggle,
  onSettings,
  onDelete,
  compact = false,
}: {
  rule: WebsiteRule
  usedSeconds: number
  onToggle: (enabled: boolean) => void
  onSettings: () => void
  onDelete: () => void
  compact?: boolean
}) {
  const limited = rule.timeLimit.enabled && !rule.blocking.enabled
  const limitSeconds = rule.timeLimit.dailyLimitMinutes * 60
  const ratio = limited ? usageRatio(usedSeconds, rule.timeLimit.dailyLimitMinutes) : 0
  const status = ruleStatusLabel({
    ...rule,
    usage: { ...rule.usage, usedTodaySeconds: usedSeconds },
  })
  const blocked = status === 'Blocked' || status === 'Limit reached'
  const locked = requiresTrustedUnlock({
    ...rule,
    usage: { ...rule.usage, usedTodaySeconds: usedSeconds },
  })

  return (
    <article className="rounded-2xl border border-line bg-card p-3 shadow-[0_1px_0_rgba(28,23,18,0.04)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-ink">{displayName(rule.domain)}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                blocked
                  ? 'bg-accent-soft text-danger'
                  : rule.enabled
                    ? 'bg-paper-2 text-ink-soft'
                    : 'bg-paper-2 text-muted',
              )}
            >
              {status}
            </span>
          </div>
          <p className="truncate text-xs text-muted">{rule.domain}</p>
        </div>
        <Switch
          checked={rule.enabled}
          disabled={locked}
          onCheckedChange={onToggle}
        />
      </div>

      <div className="mt-3">
        {rule.blocking.enabled ? (
          <p className="text-sm text-ink-soft">Blocked completely</p>
        ) : limited ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">
                {formatCompact(usedSeconds)} / {formatCompact(limitSeconds)}
              </span>
              <span className="text-xs text-muted">
                Time limit: {rule.timeLimit.dailyLimitMinutes} min
              </span>
            </div>
            <Progress value={ratio * 100} />
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            Used today: {formatCompact(usedSeconds)}
          </p>
        )}
      </div>

      {!compact && (
        <div className="mt-3 flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Website settings">
            <Settings2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={locked}
            aria-label={locked ? 'Ask a trusted person to unlock before deleting' : 'Delete website'}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </article>
  )
}
