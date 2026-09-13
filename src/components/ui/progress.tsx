import { cn } from '../../shared/cn'

export function Progress({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const tone =
    clamped >= 100 ? 'bg-danger' : clamped >= 80 ? 'bg-warn' : 'bg-accent'

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-paper-2', className)}>
      <div
        className={cn('h-full rounded-full transition-[width]', tone)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
