import { useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import {
  applyImport,
  createExportPayload,
  parseImportPayload,
} from '../../shared/import-export'
import { saveSettings } from '../../shared/storage'
import type { ExtensionSettings, ThemePreference } from '../../shared/types'

export function SettingsPanel({
  settings,
  onChange,
  onResetDaily,
  onResetAll,
  onImported,
  onSave,
}: {
  settings: ExtensionSettings
  onChange: (patch: Partial<ExtensionSettings>) => void
  onResetDaily: () => Promise<void>
  onResetAll: () => Promise<void>
  onImported: () => Promise<void>
  onSave: (settings: ExtensionSettings) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function exportSettings() {
    const payload = createExportPayload(settings)
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'website-blocker-backup.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Backup downloaded.')
  }

  async function importSettings(file: File) {
    setError(null)
    setMessage(null)
    try {
      const text = await file.text()
      const payload = parseImportPayload(JSON.parse(text) as unknown)
      const next = applyImport(settings, payload)
      await saveSettings(next)
      await onSave(next)
      await onImported()
      setMessage(`Imported ${payload.websites.length} website rule(s).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import backup')
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Control tracking, notifications, and backups. This extension only limits browsing inside
          the browser — it is not system-level parental control.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <SettingRow
          title="Enable protection"
          description="Master switch for blocking and time limits"
          checked={settings.globalEnabled}
          onCheckedChange={(globalEnabled) => onChange({ globalEnabled })}
        />
        <SettingRow
          title="Enable time tracking"
          description="Count active time only when a matching tab is focused"
          checked={settings.trackingEnabled}
          onCheckedChange={(trackingEnabled) => onChange({ trackingEnabled })}
        />
      </div>

      <div className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <h3 className="font-medium">Notifications</h3>
        <SettingRow
          title="80% of daily limit"
          description="Warn when a site is close to its cap"
          checked={settings.notifications.at80Percent}
          onCheckedChange={(at80Percent) =>
            onChange({ notifications: { ...settings.notifications, at80Percent } })
          }
        />
        <SettingRow
          title="Limit reached"
          description="Notify when a daily limit is used up"
          checked={settings.notifications.atLimit}
          onCheckedChange={(atLimit) =>
            onChange({ notifications: { ...settings.notifications, atLimit } })
          }
        />
      </div>

      <div className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <h3 className="font-medium">Appearance</h3>
        <div className="flex flex-wrap gap-2">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((theme) => (
            <button
              key={theme}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                settings.theme === theme ? 'bg-accent text-white dark:text-ink' : 'bg-paper-2'
              }`}
              onClick={() => onChange({ theme })}
              type="button"
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <h3 className="font-medium">Data</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void onResetDaily()}>
            Reset daily usage
          </Button>
          <Button variant="secondary" onClick={() => void onResetAll()}>
            Reset all statistics
          </Button>
          <Button variant="outline" onClick={exportSettings}>
            Export settings
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import settings
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importSettings(file)
              event.target.value = ''
            }}
          />
        </div>
        {message ? <p className="text-sm text-good">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </section>
  )
}

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <Label>{title}</Label>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}
