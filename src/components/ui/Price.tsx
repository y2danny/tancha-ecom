import { formatNaira, discountPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

export function Price({
  kobo,
  compareAtKobo,
  size = 'md',
  className,
}: {
  kobo: number
  compareAtKobo?: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const off = discountPercent(kobo, compareAtKobo)
  const scale = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-3xl',
  }[size]

  return (
    <span className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('font-bold tabular text-ink', scale)}>{formatNaira(kobo)}</span>
      {off > 0 && (
        <>
          <span className="text-xs text-muted line-through tabular">{formatNaira(compareAtKobo!)}</span>
          <span className="rounded bg-flash/10 px-1 text-[0.68rem] font-bold text-flash tabular">-{off}%</span>
        </>
      )}
    </span>
  )
}
