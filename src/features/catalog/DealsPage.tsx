import { Zap } from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Countdown } from '@/components/ui/Countdown'
import type { Product } from '@/types/catalog'

export function DealsPage() {
  const { data: deals, loading } = useAsync(() => db.deals.listActiveDeals(), [], [])
  const ids = deals.flatMap((d) => d.productIds)
  const { data: products } = useAsync(() => db.catalog.getProductsByIds(ids), [ids.join(',')], [])
  const byId = new Map(products.map((p) => [p.id, p]))

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 sm:px-4">
      <header className="rounded-md bg-gradient-to-r from-flash to-flash-dark px-5 py-6 text-white shadow-card sm:px-7 sm:py-8">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <Zap className="fill-white" size={26} />
          Today&apos;s deals
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          Rotating back-to-school offers. When the timer runs out the price goes back up — that is
          not a scarcity trick, it is how we clear producer batches.
        </p>
      </header>

      {deals.map((deal) => (
        <section key={deal.id} id={deal.id} className="rounded-md bg-white p-3 shadow-card sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{deal.title}</h2>
              <p className="text-sm text-muted">{deal.subtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Ends in</span>
              <Countdown endsAt={deal.endsAt} />
            </div>
          </div>
          <ProductGrid
            loading={loading || products.length === 0}
            skeletonCount={6}
            products={deal.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))}
          />
        </section>
      ))}
    </div>
  )
}
