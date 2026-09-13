import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../shared/cn'

export function Label({
  className,
  ...props
}: LabelPrimitive.LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium text-ink', className)}
      {...props}
    />
  )
}
