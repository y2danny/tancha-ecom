import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check, ChevronRight, MessageCircle, RotateCcw, ShieldCheck, ShoppingCart, Truck, Wallet,
} from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { useSeo, useProductJsonLd } from '@/lib/seo'
import { useCart } from '@/store/cart'
import { ProductImage } from '@/components/product/ProductImage'
import { ProductRail } from '@/components/product/ProductGrid'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { formatCompact, formatDate, formatNaira, toWhatsAppNumber } from '@/lib/format'
import { site } from '@/config/site'
import { categoryById } from '@/data/mock/categories'
import type { Product, ProductVariant } from '@/types/catalog'

function DeliveryPanel({ product }: { product: Product }) {
  return (
    <div className="divide-y divide-hairline rounded-md bg-white shadow-card">
      <div className="flex gap-3 p-4">
        <Truck className="mt-0.5 shrink-0 text-navy-600" size={19} />
        <div className="text-sm">
          <p className="font-bold">Delivery in {product.deliveryDaysMin}–{product.deliveryDaysMax} working days</p>
          <p className="mt-0.5 text-muted">
            Free over {formatNaira(site.freeDeliveryThresholdKobo)}. Otherwise {formatNaira(150_000)} flat, nationwide.
          </p>
        </div>
      </div>
      {product.payOnDelivery && (
        <div className="flex gap-3 p-4">
          <Wallet className="mt-0.5 shrink-0 text-navy-600" size={19} />
          <div className="text-sm">
            <p className="font-bold">Pay on delivery available</p>
            <p className="mt-0.5 text-muted">
              Lagos, Abuja and Port Harcourt. Check the item before you hand over cash.
            </p>
          </div>
        </div>
      )}
      <div className="flex gap-3 p-4">
        <RotateCcw className="mt-0.5 shrink-0 text-navy-600" size={19} />
        <div className="text-sm">
          <p className="font-bold">7-day returns</p>
          <p className="mt-0.5 text-muted">Wrong size or damaged in transit — we collect it.</p>
        </div>
      </div>
      <div className="flex gap-3 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-navy-600" size={19} />
        <div className="text-sm">
          <p className="font-bold">Sourced direct</p>
          <p className="mt-0.5 text-muted">
            {product.brand === 'Tancha' ? 'Produced for us at the factory.' : `Through the authorised ${product.brand} distributor.`}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { add } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [added, setAdded] = useState(false)
  // null = "showing the main photo" — avoids needing the product loaded yet
  // to pick a starting value, and resets cleanly on navigation below.
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const { data: product, loading } = useAsync(
    () => db.catalog.getProduct(slug ?? ''),
    [slug],
    null as Product | null,
  )

  const { data: reviews } = useAsync(
    () => (product ? db.catalog.listReviews(product.id) : Promise.resolve([])),
    [product?.id],
    [],
  )
  const { data: related } = useAsync(
    () => (product ? db.catalog.relatedProducts(product, 10) : Promise.resolve([])),
    [product?.id],
    [],
  )

  useSeo({ title: product?.name, description: product?.hook })
  useProductJsonLd(product)

  useEffect(() => {
    setVariant(null)
    setQuantity(1)
    setAdded(false)
    setActiveImage(null)
    window.scrollTo({ top: 0 })
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_300px]">
          <div className="aspect-square animate-pulse rounded-md bg-white" />
          <div className="space-y-3">
            <div className="h-7 w-3/4 animate-pulse rounded bg-white" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-white" />
            <div className="h-24 w-full animate-pulse rounded bg-white" />
          </div>
          <div className="h-64 animate-pulse rounded-md bg-white" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold">We could not find that product.</h1>
        <p className="mt-2 text-sm text-muted">It may have sold out or been renamed.</p>
        <Link to="/" className="mt-5 inline-block font-semibold text-navy-600 hover:underline">
          Back to homepage
        </Link>
      </div>
    )
  }

  const category = categoryById.get(product.categoryId)
  const images = [product.imageUrl, ...product.gallery].filter((u): u is string => Boolean(u))
  const mainImage = activeImage ?? images[0]
  const activePrice = variant?.priceKobo ?? product.priceKobo
  const activeStock = variant?.stock ?? product.stock
  const needsVariant = product.variants.length > 0 && !variant

  const handleAdd = () => {
    if (needsVariant) return
    add(product, variant, quantity)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
        <Link to="/" className="hover:text-navy-700">Home</Link>
        <ChevronRight size={13} />
        {category && (
          <>
            <Link to={`/c/${category.slug}`} className="hover:text-navy-700">{category.name}</Link>
            <ChevronRight size={13} />
          </>
        )}
        <span className="truncate font-semibold text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-md bg-white p-4 shadow-card">
          <span className="block aspect-square overflow-hidden rounded">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <ProductImage imageKey={product.imageKey} alt={product.name} />
            )}
          </span>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(src)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={src === mainImage}
                  className="block aspect-square overflow-hidden rounded ring-1 ring-hairline"
                  style={{ opacity: src === mainImage ? 1 : 0.55 }}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-md bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.tags.includes('bestseller') && <Badge tone="gold">Bestseller</Badge>}
              {product.tags.includes('new') && <Badge tone="navy">New</Badge>}
              {product.tags.includes('bulk-discount') && <Badge tone="green">Bulk discount</Badge>}
              <span className="text-xs text-muted">Brand: <strong className="text-ink">{product.brand}</strong></span>
            </div>

            <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              {product.name}
            </h1>
            <p className="mt-1.5 text-sm italic text-muted">{product.hook}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Rating value={product.rating} count={product.reviewCount} size={15} />
              <span className="text-xs text-muted tabular">
                {formatCompact(product.unitsSold)} sold
              </span>
            </div>

            <div className="mt-4 border-t border-hairline pt-4">
              <Price kobo={activePrice} compareAtKobo={product.compareAtKobo} size="lg" />
              {activeStock <= 15 && activeStock > 0 && (
                <p className="mt-1.5 text-sm font-semibold text-flash-dark">
                  Only {activeStock} left at this price
                </p>
              )}
            </div>

            {product.variants.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">
                  {product.variants[0].optionName}
                  {needsVariant && <span className="ml-2 text-xs font-normal text-flash-dark">Please select</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariant(v)}
                      disabled={v.stock <= 0}
                      className={
                        v.id === variant?.id
                          ? 'rounded-md border-2 border-navy-700 bg-navy-50 px-3.5 py-2 text-sm font-bold text-navy-800'
                          : 'rounded-md border border-hairline px-3.5 py-2 text-sm font-medium hover:border-navy-400 disabled:opacity-35'
                      }
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="mt-5 space-y-2 border-t border-hairline pt-4">
              {product.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm leading-relaxed">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t border-hairline pt-4 text-sm leading-relaxed text-muted">
              {product.description}
            </p>
          </div>

          <div className="rounded-md bg-white p-4 shadow-card sm:p-5">
            <SectionHeader
              title={`What buyers said (${product.reviewCount})`}
              right={<Rating value={product.rating} size={15} />}
            />
            <div className="divide-y divide-hairline">
              {reviews.map((r) => (
                <div key={r.id} className="py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={r.rating} />
                    <span className="text-sm font-semibold">{r.author}</span>
                    <span className="text-xs text-muted">· {r.city}</span>
                    {r.verifiedPurchase && <Badge tone="green">Verified</Badge>}
                    <span className="ml-auto text-xs text-muted">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-44 lg:self-start">
          <div className="rounded-md bg-white p-4 shadow-card">
            <Price kobo={activePrice} compareAtKobo={product.compareAtKobo} size="md" />

            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-muted">Quantity</span>
              <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, activeStock)} />
            </div>

            <div className="mt-4 space-y-2">
              <Button
                className="w-full"
                onClick={handleAdd}
                disabled={activeStock <= 0 || needsVariant}
              >
                {added ? <Check size={16} /> : <ShoppingCart size={16} />}
                {added ? 'Added to cart' : activeStock <= 0 ? 'Out of stock' : 'Add to cart'}
              </Button>
              <Button
                variant="deal"
                className="w-full"
                disabled={activeStock <= 0 || needsVariant}
                onClick={() => {
                  handleAdd()
                  navigate('/cart')
                }}
              >
                Buy now
              </Button>
              <a
                href={`https://wa.me/${toWhatsAppNumber(site.supportWhatsApp)}?text=${encodeURIComponent(
                  `Hi Tancha, I have a question about: ${product.name}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-600 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle size={16} />
                Ask on WhatsApp
              </a>
            </div>
          </div>

          <DeliveryPanel product={product} />
        </div>
      </div>

      <section className="mt-4 rounded-md bg-white shadow-card">
        <SectionHeader kicker="Bought together" title="Others also picked up" />
        <ProductRail products={related} />
      </section>
    </div>
  )
}
