import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Rating({
  value,
  count,
  size = 12,
  className,
}: {
  value: number
  count?: number
  size?: number
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className={cn(
              i <= Math.round(value) ? 'fill-gold-400 text-gold-400' : 'fill-hairline text-hairline',
            )}
          />
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-muted tabular">({count})</span>}
    </span>
  )
}
