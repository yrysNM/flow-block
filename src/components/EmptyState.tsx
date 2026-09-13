import type { ReactNode } from 'react'
import { ShieldOff } from 'lucide-react'

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card/60 px-4 py-8 text-center">
      <ShieldOff className="mb-3 size-8 text-muted" />
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-[260px] text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
