import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { LIMIT_PRESETS_MINUTES } from '../../shared/constants'
import { normalizeDomain } from '../../shared/domain-matcher'
import { findOverlappingRule } from '../../shared/storage'
import type { WebsiteRule } from '../../shared/types'

export function AddWebsitePage({
  websites,
  onCancel,
  onSubmit,
}: {
  websites: WebsiteRule[]
  onCancel: () => void
  onSubmit: (input: {
    domain: string
    blocking: boolean
    timeLimit: boolean
    dailyLimitMinutes: number
  }) => Promise<void>
}) {
  const [domain, setDomain] = useState('')
  const [mode, setMode] = useState<'block' | 'limit'>('limit')
  const [limit, setLimit] = useState(60)
  const [customLimit, setCustomLimit] = useState('60')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => normalizeDomain(domain), [domain])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeDomain(domain)
    if (!normalized) {
      setError('Enter a valid domain like youtube.com')
      return
    }
    const overlap = findOverlappingRule(normalized, websites)
    if (overlap) {
      setError(`A rule for ${overlap.domain} already covers this website`)
      return
    }
    const dailyLimitMinutes = Math.max(1, Number(customLimit) || limit)
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        domain: normalized,
        blocking: mode === 'block',
        timeLimit: mode === 'limit',
        dailyLimitMinutes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add website')
      setSaving(false)
    }
  }

  return (
    <form className="flex h-full flex-col" onSubmit={handleSubmit}>
      <header className="px-4 pb-3 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          New rule
        </p>
        <h1 className="font-display text-2xl tracking-tight">Add Website</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="domain">Website</Label>
          <Input
            id="domain"
            autoFocus
            placeholder="youtube.com"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          />
          <p className="text-xs text-muted">
            {preview ? `Will save as ${preview}` : 'Paste a URL or type a domain'}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Protection</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as 'block' | 'limit')}
          >
            <RadioGroupItem value="block">
              <span className="block text-sm font-medium">Block completely</span>
              <span className="block text-xs text-muted">
                Stop this site from loading at all
              </span>
            </RadioGroupItem>
            <RadioGroupItem value="limit">
              <span className="block text-sm font-medium">Limit daily usage</span>
              <span className="block text-xs text-muted">
                Allow browsing until the daily cap is reached
              </span>
            </RadioGroupItem>
          </RadioGroup>
        </div>

        {mode === 'limit' && (
          <div className="space-y-2">
            <Label htmlFor="limit">Daily limit</Label>
            <div className="flex flex-wrap gap-1.5">
              {LIMIT_PRESETS_MINUTES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    limit === preset
                      ? 'bg-accent text-white dark:text-ink'
                      : 'bg-paper-2 text-ink-soft'
                  }`}
                  onClick={() => {
                    setLimit(preset)
                    setCustomLimit(String(preset))
                  }}
                >
                  {preset >= 60 ? `${preset / 60}h` : `${preset}m`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="limit"
                type="number"
                min={1}
                max={1440}
                value={customLimit}
                onChange={(event) => {
                  setCustomLimit(event.target.value)
                  setLimit(Number(event.target.value) || 0)
                }}
              />
              <span className="text-sm text-muted">minutes</span>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <div className="flex gap-2 border-t border-line px-4 py-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Adding…' : 'Add Website'}
        </Button>
      </div>
    </form>
  )
}
