import type { Product } from '@/types/catalog'
import { ProductCard, ProductCardSkeleton } from './ProductCard'
import { cn } from '@/lib/cn'

export function ProductGrid({
  products,
  loading,
  skeletonCount = 8,
  className,
}: {
  products: Product[]
  loading?: boolean
  skeletonCount?: number
  className?: string
}) {
  const base = 'grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5'
  if (loading) {
    return (
      <div className={cn(base, className)}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  return (
    <div className={cn(base, className)}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-4 sm:gap-3">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          className="w-[160px] shrink-0 snap-start sm:w-[190px] lg:w-[210px]"
        />
      ))}
    </div>
  )
}
