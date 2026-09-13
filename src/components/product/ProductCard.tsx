import { Link } from 'react-router-dom'
import { ShoppingCart, Truck, Wallet } from 'lucide-react'
import type { Product } from '@/types/catalog'
import { ProductImage } from './ProductImage'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { Badge } from '@/components/ui/Badge'
import { useCart } from '@/store/cart'
import { discountPercent, formatCompact, formatDayRange } from '@/lib/format'
import { cn } from '@/lib/cn'

export function ProductCard({
  product,
  compact = false,
  className,
}: {
  product: Product
  compact?: boolean
  className?: string
}) {
  const { add } = useCart()
  const off = discountPercent(product.priceKobo, product.compareAtKobo)
  const lowStock = product.stock > 0 && product.stock <= 15
  const hasOptions = product.variants.length > 0

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-md bg-white shadow-card transition-shadow hover:shadow-lift',
        className,
      )}
    >
      <Link to={`/product/${product.slug}`} className="relative block">
        <span className="block aspect-square overflow-hidden">
          <ProductImage
            imageKey={product.imageKey}
            imageUrl={product.imageUrl}
            alt={product.name}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </span>
        {off > 0 && (
          <span className="absolute left-0 top-2 rounded-r bg-flash px-2 py-1 text-xs font-bold text-white tabular">
            -{off}%
          </span>
        )}
        {product.tags.includes('bestseller') && (
          <span className="absolute right-2 top-2">
            <Badge tone="gold">Bestseller</Badge>
          </span>
        )}
        {product.tags.includes('new') && !product.tags.includes('bestseller') && (
          <span className="absolute right-2 top-2">
            <Badge tone="navy">New</Badge>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={`/product/${product.slug}`} className="min-h-[2.5rem]">
          <h3 className="line-clamp-2-safe text-sm leading-snug text-ink group-hover:text-navy-700">
            {product.name}
          </h3>
        </Link>

        <Price kobo={product.priceKobo} compareAtKobo={product.compareAtKobo} />

        {!compact && (
          <>
            <Rating value={product.rating} count={product.reviewCount} />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted">
              <span className="inline-flex items-center gap-1">
                <Truck size={12} />
                {formatDayRange(product.deliveryDaysMin, product.deliveryDaysMax)} days
              </span>
              {product.payOnDelivery && (
                <span className="inline-flex items-center gap-1">
                  <Wallet size={12} />
                  Pay on delivery
                </span>
              )}
            </div>

            {lowStock ? (
              <p className="text-[0.7rem] font-semibold text-flash-dark">
                Only {product.stock} left at this price
              </p>
            ) : (
              <p className="text-[0.7rem] text-muted tabular">
                {formatCompact(product.unitsSold)} sold this season
              </p>
            )}
          </>
        )}

        <div className="mt-auto pt-2">
          {hasOptions ? (
            <Link
              to={`/product/${product.slug}`}
              className="flex h-9 w-full items-center justify-center rounded-md border border-navy-700 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-50"
            >
              Choose {product.variants[0].optionName.toLowerCase()}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => add(product)}
              disabled={product.stock <= 0}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-navy-700 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-40"
            >
              <ShoppingCart size={15} />
              {product.stock > 0 ? 'Add to cart' : 'Out of stock'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md bg-white shadow-card">
      <div className="aspect-square animate-pulse bg-canvas" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-full animate-pulse rounded bg-canvas" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-canvas" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-canvas" />
        <div className="h-9 w-full animate-pulse rounded bg-canvas" />
      </div>
    </div>
  )
}
