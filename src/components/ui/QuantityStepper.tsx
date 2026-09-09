import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

export function QuantityStepper({
  value,
  onChange,
  max = 99,
  className,
}: {
  value: number
  onChange: (next: number) => void
  max?: number
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center rounded-md border border-hairline bg-white', className)}>
      <button
        type="button"
        aria-label="Reduce quantity"
        className="grid h-9 w-9 place-items-center text-navy-700 disabled:opacity-30"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} />
      </button>
      <span className="w-9 text-center text-sm font-bold tabular">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        className="grid h-9 w-9 place-items-center text-navy-700 disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  )
}
