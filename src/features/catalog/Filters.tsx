import { SlidersHorizontal } from 'lucide-react'
import type { ProductQuery, ProductTag } from '@/types/catalog'
import { formatNaira, naira } from '@/lib/format'
import { cn } from '@/lib/cn'

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under ₦5,000', max: naira(5000) },
  { label: '₦5,000 – ₦10,000', min: naira(5000), max: naira(10000) },
  { label: '₦10,000 – ₦20,000', min: naira(10000), max: naira(20000) },
  { label: '₦20,000 – ₦50,000', min: naira(20000), max: naira(50000) },
  { label: 'Over ₦50,000', min: naira(50000) },
]

const TAGS: { label: string; tag: ProductTag }[] = [
  { label: 'Bestsellers', tag: 'bestseller' },
  { label: 'New arrivals', tag: 'new' },
  { label: 'Bulk discount', tag: 'bulk-discount' },
  { label: 'Official store', tag: 'official-store' },
]

export function Filters({
  query,
  onChange,
  className,
}: {
  query: ProductQuery
  onChange: (next: ProductQuery) => void
  className?: string
}) {
  const activeBand = PRICE_BANDS.findIndex(
    (b) => b.min === query.minPriceKobo && b.max === query.maxPriceKobo,
  )

  const section = 'border-b border-hairline px-4 py-4 last:border-0'
  const heading = 'mb-2.5 text-xs font-bold uppercase tracking-wide text-ink'
  const row = 'flex cursor-pointer items-center gap-2 py-1 text-sm text-muted hover:text-ink'

  return (
    <aside className={cn('overflow-hidden rounded-md bg-white shadow-card', className)}>
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <SlidersHorizontal size={15} className="text-navy-600" />
        <h2 className="text-sm font-bold">Filters</h2>
        <button
          type="button"
          className="ml-auto text-xs font-semibold text-navy-600 hover:underline"
          onClick={() =>
            onChange({ categorySlug: query.categorySlug, search: query.search, sort: query.sort })
          }
        >
          Clear
        </button>
      </div>

      <div className={section}>
        <h3 className={heading}>Price</h3>
        {PRICE_BANDS.map((band, i) => (
          <label key={band.label} className={row}>
            <input
              type="radio"
              name="price"
              checked={activeBand === i}
              onChange={() =>
                onChange({ ...query, minPriceKobo: band.min, maxPriceKobo: band.max, page: 1 })
              }
              className="accent-navy-700"
            />
            {band.label}
          </label>
        ))}
      </div>

      <div className={section}>
        <h3 className={heading}>Collections</h3>
        {TAGS.map(({ label, tag }) => {
          const checked = query.tags?.includes(tag) ?? false
          return (
            <label key={tag} className={row}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const current = query.tags ?? []
                  onChange({
                    ...query,
                    tags: checked ? current.filter((t) => t !== tag) : [...current, tag],
                    page: 1,
                  })
                }}
                className="accent-navy-700"
              />
              {label}
            </label>
          )
        })}
      </div>

      <div className={section}>
        <h3 className={heading}>Rating</h3>
        {[4.5, 4, 3.5].map((r) => (
          <label key={r} className={row}>
            <input
              type="radio"
              name="rating"
              checked={query.minRating === r}
              onChange={() => onChange({ ...query, minRating: r, page: 1 })}
              className="accent-navy-700"
            />
            {r} stars &amp; up
          </label>
        ))}
      </div>

      <div className={section}>
        <h3 className={heading}>Delivery &amp; payment</h3>
        <label className={row}>
          <input
            type="checkbox"
            checked={query.payOnDeliveryOnly ?? false}
            onChange={() => onChange({ ...query, payOnDeliveryOnly: !query.payOnDeliveryOnly, page: 1 })}
            className="accent-navy-700"
          />
          Pay on delivery
        </label>
        <label className={row}>
          <input
            type="checkbox"
            checked={query.inStockOnly ?? false}
            onChange={() => onChange({ ...query, inStockOnly: !query.inStockOnly, page: 1 })}
            className="accent-navy-700"
          />
          In stock only
        </label>
      </div>

      <div className="bg-navy-50 px-4 py-3 text-xs text-navy-800">
        Free delivery on orders over {formatNaira(3_000_000)}.
      </div>
    </aside>
  )
}
