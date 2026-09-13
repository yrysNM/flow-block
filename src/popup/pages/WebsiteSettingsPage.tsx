import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { createUnlockRequest } from '../../shared/storage'
import { displayName, formatDuration } from '../../shared/time-utils'
import type { WebsiteRule } from '../../shared/types'
import { requiresTrustedUnlock } from '../../shared/unlock'

export function WebsiteSettingsPage({
  rule,
  usedSeconds,
  onBack,
  onChange,
  onResetUsage,
  onDelete,
}: {
  rule: WebsiteRule
  usedSeconds: number
  onBack: () => void
  onChange: (patch: Partial<Pick<WebsiteRule, 'enabled' | 'blocking' | 'timeLimit'>>) => void
  onResetUsage: () => void
  onDelete: () => void
}) {
  const [limit, setLimit] = useState(String(rule.timeLimit.dailyLimitMinutes))
  const [shareNote, setShareNote] = useState('')
  const [shareError, setShareError] = useState('')
  const locked = requiresTrustedUnlock(rule)

  async function shareUnlock() {
    setShareError('')
    try {
      const created = await createUnlockRequest(rule.id)
      await navigator.clipboard.writeText(created.url)
      setShareNote('Unlock link copied. A trusted person opens it and taps Accept or Denied.')
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Could not create a share link')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 pb-3 pt-4">
        <button className="text-xs font-medium text-muted" onClick={onBack} type="button">
          ← Back
        </button>
        <h1 className="font-display text-2xl tracking-tight">{displayName(rule.domain)}</h1>
        <p className="text-sm text-muted">{rule.domain}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <label className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-3">
          <span>
            <span className="block text-sm font-medium">Enable protection</span>
            <span className="text-xs text-muted">Turn blocking and limits on or off</span>
          </span>
          <Switch
            checked={rule.enabled}
            disabled={locked}
            onCheckedChange={(enabled: boolean) => onChange({ enabled })}
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-3">
          <span>
            <span className="block text-sm font-medium">Block website completely</span>
            <span className="text-xs text-muted">Redirect away as soon as it loads</span>
          </span>
          <Switch
            checked={rule.blocking.enabled}
            disabled={locked && rule.blocking.enabled}
            onCheckedChange={(enabled: boolean) => onChange({ blocking: { enabled } })}
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-3">
          <span>
            <span className="block text-sm font-medium">Enable daily limit</span>
            <span className="text-xs text-muted">Count active time and block at the cap</span>
          </span>
          <Switch
            checked={rule.timeLimit.enabled}
            onCheckedChange={(enabled: boolean) =>
              onChange({ timeLimit: { ...rule.timeLimit, enabled } })
            }
          />
        </label>

        {locked && (
          <div className="rounded-2xl border border-line bg-accent-soft px-3 py-3 text-sm">
            <p className="font-medium text-ink">You cannot unlock this site yourself.</p>
            <p className="mt-1 text-ink-soft">
              Share a link with a friend or trusted person. They open it and tap Accept or Denied.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => void shareUnlock()}>
              Copy unlock link
            </Button>
            {shareNote ? <p className="mt-2 text-xs text-good">{shareNote}</p> : null}
            {shareError ? <p className="mt-2 text-xs text-danger">{shareError}</p> : null}
          </div>
        )}

        {rule.timeLimit.enabled && (
          <div className="space-y-1.5">
            <Label htmlFor="daily-limit">Daily limit</Label>
            <div className="flex items-center gap-2">
              <Input
                id="daily-limit"
                type="number"
                min={1}
                max={1440}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                onBlur={() => {
                  const dailyLimitMinutes = Math.max(1, Number(limit) || 1)
                  setLimit(String(dailyLimitMinutes))
                  onChange({
                    timeLimit: { ...rule.timeLimit, dailyLimitMinutes },
                  })
                }}
              />
              <span className="text-sm text-muted">minutes</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-card px-3 py-3">
          <p className="text-sm font-medium">Today's usage</p>
          <p className="mt-1 text-lg text-ink">{formatDuration(usedSeconds)}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={locked}
            onClick={onResetUsage}
          >
            Reset today's usage
          </Button>
        </div>

        <Button variant="danger" className="w-full" disabled={locked} onClick={onDelete}>
          Delete Website
        </Button>
      </div>
    </div>
  )
}
