import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/lib/seo'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Filters } from './Filters'
import { Button } from '@/components/ui/Button'
import type { ProductQuery, ProductSort } from '@/types/catalog'
import { categoryBySlug } from '@/data/mock/categories'

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'relevance', label: 'Most popular' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
  { value: 'bestselling', label: 'Best selling' },
]

export function ListingPage({ mode }: { mode: 'category' | 'search' }) {
  const { slug } = useParams<{ slug: string }>()
  const [params] = useSearchParams()
  const searchTerm = params.get('q') ?? ''
  const category = mode === 'category' && slug ? categoryBySlug.get(slug) : undefined

  const [query, setQuery] = useState<ProductQuery>({
    sort: (params.get('sort') as ProductSort) ?? 'relevance',
    perPage: 20,
    page: 1,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const effective = useMemo<ProductQuery>(
    () => ({ ...query, categorySlug: mode === 'category' ? slug : undefined, search: searchTerm || undefined }),
    [query, slug, mode, searchTerm],
  )

  const { data, loading } = useAsync(
    () => db.catalog.listProducts(effective),
    [JSON.stringify(effective)],
    { items: [], total: 0, page: 1, perPage: 20, pageCount: 1 },
  )

  const title =
    mode === 'category'
      ? (category?.name ?? 'Products')
      : searchTerm
        ? `Results for “${searchTerm}”`
        : 'All products'

  useSeo({ title, description: category ? `Shop ${category.name.toLowerCase()} — producer-direct prices, nationwide delivery.` : undefined })

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="hover:text-navy-700">Home</Link>
        <ChevronRight size={13} />
        <span className="font-semibold text-ink">{title}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Filters
          query={effective}
          onChange={setQuery}
          className={filtersOpen ? '' : 'hidden lg:block'}
        />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-white px-4 py-3 shadow-card">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
              <p className="text-xs text-muted tabular">
                {loading ? 'Loading…' : `${data.total} product${data.total === 1 ? '' : 's'}`}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="ml-auto lg:hidden"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={15} />
              Filters
            </Button>

            <label className="ml-auto hidden items-center gap-2 text-sm lg:flex">
              <span className="text-muted">Sort by</span>
              <select
                value={query.sort}
                onChange={(e) => setQuery({ ...query, sort: e.target.value as ProductSort, page: 1 })}
                className="h-9 rounded-md border border-hairline bg-white px-2.5 text-sm font-semibold outline-none focus:border-navy-500"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          {!loading && data.items.length === 0 ? (
            <div className="rounded-md bg-white px-6 py-16 text-center shadow-card">
              <p className="text-base font-bold">Nothing matched that.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                We launched with a small range on purpose. Tell our assistant what you are looking
                for and we will source it for the next batch.
              </p>
              <Link
                to="/"
                className="mt-4 inline-block text-sm font-semibold text-navy-600 hover:underline"
              >
                Back to homepage
              </Link>
            </div>
          ) : (
            <ProductGrid products={data.items} loading={loading} skeletonCount={10} />
          )}

          {data.pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setQuery({ ...query, page: p })}
                  className={
                    p === data.page
                      ? 'h-9 w-9 rounded-md bg-navy-700 text-sm font-bold text-white'
                      : 'h-9 w-9 rounded-md bg-white text-sm font-semibold shadow-card hover:bg-navy-50'
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
