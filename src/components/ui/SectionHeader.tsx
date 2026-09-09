import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export function SectionHeader({
  title,
  kicker,
  to,
  linkLabel = 'See all',
  right,
}: {
  title: string
  kicker?: string
  to?: string
  linkLabel?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-hairline px-4 py-3">
      <div>
        {kicker && (
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gold-600">{kicker}</p>
        )}
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">{title}</h2>
      </div>
      {right ??
        (to && (
          <Link
            to={to}
            className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-navy-600 hover:underline"
          >
            {linkLabel}
            <ChevronRight size={15} />
          </Link>
        ))}
    </div>
  )
}
