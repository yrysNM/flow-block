import { LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <LoaderCircle className="size-4 animate-spin" />
      {label}
    </div>
  )
}
