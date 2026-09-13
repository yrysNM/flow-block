import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/EmptyState'
import { WebsiteCard } from '../../components/WebsiteCard'
import type { ExtensionSettings } from '../../shared/types'

export function WebsitesPanel({
  settings,
  liveUsageById,
  onAdd,
  onToggle,
  onSettings,
  onDelete,
}: {
  settings: ExtensionSettings
  liveUsageById: Record<string, number>
  onAdd: () => void
  onToggle: (id: string, enabled: boolean) => void
  onSettings: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Websites</h2>
          <p className="mt-1 text-sm text-muted">Manage blocking and daily limits for each domain.</p>
        </div>
        <Button onClick={onAdd}>Add Website</Button>
      </div>
      <div className="mt-6 space-y-3">
        {settings.websites.length === 0 ? (
          <EmptyState
            title="Nothing to protect yet"
            body="Add YouTube, Reddit, or any other site you want to keep in check."
            action={<Button onClick={onAdd}>Add Website</Button>}
          />
        ) : (
          settings.websites.map((rule) => (
            <WebsiteCard
              key={rule.id}
              rule={rule}
              usedSeconds={liveUsageById[rule.id] ?? rule.usage.usedTodaySeconds}
              onToggle={(enabled) => onToggle(rule.id, enabled)}
              onSettings={() => onSettings(rule.id)}
              onDelete={() => onDelete(rule.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}
