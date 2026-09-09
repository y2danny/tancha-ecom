import { Link } from 'react-router-dom'
import { ChevronRight, Zap } from 'lucide-react'
import type { Deal, Product } from '@/types/catalog'
import { Countdown } from '@/components/ui/Countdown'
import { ProductCard, ProductCardSkeleton } from './ProductCard'

export function DealStrip({
  deal,
  products,
  loading,
}: {
  deal: Deal
  products: Product[]
  loading?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-md bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-gradient-to-r from-navy-900 to-navy-700 px-4 py-3 text-white">
        <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight sm:text-lg">
          <Zap size={18} className="fill-gold-400 text-gold-400" />
          {deal.title}
        </h2>
        <span className="hidden text-sm text-navy-100 sm:inline">{deal.subtitle}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-navy-200 sm:inline">
            Ends in
          </span>
          <Countdown endsAt={deal.endsAt} tone="dark" />
          <Link
            to={`/deals#${deal.id}`}
            className="hidden items-center gap-0.5 text-sm font-semibold text-gold-300 hover:text-gold-200 sm:flex"
          >
            See all
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto p-3 sm:gap-3">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-[160px] shrink-0 sm:w-[190px]">
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                compact
                className="w-[160px] shrink-0 snap-start sm:w-[190px] lg:w-[210px]"
              />
            ))}
      </div>
    </section>
  )
}
