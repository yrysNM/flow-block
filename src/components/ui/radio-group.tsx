import type { ReactNode } from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '../../shared/cn'

export function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} />
  )
}

export function RadioGroupItem({
  className,
  children,
  ...props
}: RadioGroupPrimitive.RadioGroupItemProps & { children?: ReactNode }) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border border-line bg-card p-3 text-left data-[state=checked]:border-accent data-[state=checked]:bg-accent-soft',
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-line data-[state=checked]:border-accent">
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-accent" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </RadioGroupPrimitive.Item>
  )
}
