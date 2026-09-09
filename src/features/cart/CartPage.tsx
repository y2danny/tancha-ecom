import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, Truck } from 'lucide-react'
import { useCart } from '@/store/cart'
import { useResolvedCart } from '@/hooks/useResolvedCart'
import { useSeo } from '@/lib/seo'
import { ProductImage } from '@/components/product/ProductImage'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { ButtonLink } from '@/components/ui/Button'
import { formatNaira } from '@/lib/format'

export function CartPage() {
  useSeo({ title: 'Your Cart', noindex: true })
  const { setQuantity, remove, clear } = useCart()
  const { lines, totals, loading } = useResolvedCart()

  if (!loading && lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShoppingCart className="mx-auto text-navy-200" size={56} />
        <h1 className="mt-4 text-xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted">
          The back-to-school deals end when the timer does. Worth a look before then.
        </p>
        <ButtonLink to="/" variant="deal" size="lg" className="mt-6">
          Shop back-to-school deals
        </ButtonLink>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <h1 className="mb-3 text-xl font-bold tracking-tight sm:text-2xl">
        Cart <span className="text-muted tabular">({totals.itemCount})</span>
      </h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="divide-y divide-hairline rounded-md bg-white shadow-card">
            {lines.map((line) => (
              <div key={`${line.productId}-${line.variantId}`} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <Link
                  to={`/product/${line.product.slug}`}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded sm:h-24 sm:w-24"
                >
                  <ProductImage
                    imageKey={line.product.imageKey}
                    imageUrl={line.product.imageUrl}
                    alt={line.product.name}
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${line.product.slug}`}
                    className="line-clamp-2-safe text-sm font-medium hover:text-navy-700"
                  >
                    {line.product.name}
                  </Link>
                  {line.variant && (
                    <p className="mt-0.5 text-xs text-muted">
                      {line.variant.optionName}: <strong>{line.variant.label}</strong>
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-emerald-700">
                    {line.product.stock > 0 ? 'In stock' : 'Out of stock'}
                    {line.product.payOnDelivery && ' · Pay on delivery'}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <QuantityStepper
                      value={line.quantity}
                      max={Math.max(1, line.variant?.stock ?? line.product.stock)}
                      onChange={(q) => setQuantity(line.productId, line.variantId, q)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.productId, line.variantId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-flash-dark hover:underline"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-base font-bold tabular">{formatNaira(line.lineTotalKobo)}</p>
                  {line.quantity > 1 && (
                    <p className="text-xs text-muted tabular">
                      {formatNaira(line.unitPriceKobo)} each
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between px-1">
            <Link to="/" className="text-sm font-semibold text-navy-600 hover:underline">
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={clear}
              className="text-sm font-semibold text-muted hover:text-flash-dark"
            >
              Clear cart
            </button>
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-44 lg:self-start">
          <div className="rounded-md bg-white p-4 shadow-card">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal ({totals.itemCount} items)</dt>
                <dd className="font-semibold tabular">{formatNaira(totals.subtotalKobo)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-semibold tabular">
                  {totals.deliveryKobo === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    formatNaira(totals.deliveryKobo)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2.5 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold tabular">{formatNaira(totals.totalKobo)}</dd>
              </div>
            </dl>

            {!totals.freeDeliveryUnlocked && (
              <div className="mt-3 rounded-md bg-gold-50 p-3">
                <p className="flex items-start gap-2 text-xs text-gold-800">
                  <Truck size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Add <strong className="tabular">{formatNaira(totals.koboToFreeDelivery)}</strong>{' '}
                    more and delivery is on us.
                  </span>
                </p>
              </div>
            )}

            <ButtonLink to="/checkout" variant="deal" size="lg" className="mt-4 w-full">
              Checkout
            </ButtonLink>

            <p className="mt-3 text-center text-xs text-muted">
              Card, transfer, USSD via Paystack — or pay the rider on delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
