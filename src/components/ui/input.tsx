import type { InputHTMLAttributes } from 'react'
import { cn } from '../../shared/cn'

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent/50',
        className,
      )}
      {...props}
    />
  )
}
