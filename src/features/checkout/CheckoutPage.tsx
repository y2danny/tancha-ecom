import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Lock, Wallet } from 'lucide-react'
import { db } from '@/data'
import { useCart } from '@/store/cart'
import { useResolvedCart } from '@/hooks/useResolvedCart'
import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/components/product/ProductImage'
import { formatNaira } from '@/lib/format'
import { site } from '@/config/site'
import type { DeliveryAddress, PaymentMethod } from '@/types/commerce'

const STATES = [
  'Lagos', 'FCT — Abuja', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Kaduna', 'Delta',
  'Anambra', 'Ogun', 'Edo', 'Akwa Ibom', 'Plateau', 'Cross River', 'Other',
]

const field =
  'h-11 w-full rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-navy-500'
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { lines: rawLines, clear } = useCart()
  const { lines, totals } = useResolvedCart()
  const [submitting, setSubmitting] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('paystack')
  const [address, setAddress] = useState<DeliveryAddress>({
    fullName: '', phone: '', altPhone: '', city: '', state: 'Lagos', street: '', landmark: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({})

  const podAvailable = site.serviceCities
    .slice(0, 3)
    .some((c) => address.state.toLowerCase().includes(c.toLowerCase().split(' ')[0]))

  const validate = () => {
    const next: typeof errors = {}
    if (address.fullName.trim().length < 3) next.fullName = 'Enter the full name'
    if (!/^(\+?234|0)[789]\d{9}$/.test(address.phone.replace(/\s/g, '')))
      next.phone = 'Enter a valid Nigerian number, e.g. 0803 123 4567'
    if (address.street.trim().length < 6) next.street = 'Street address is too short'
    if (address.city.trim().length < 2) next.city = 'Which city?'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    // In production this posts to the /checkout Edge Function, which re-prices
    // the cart server-side and returns a Paystack authorization_url.
    const order = await db.orders.placeOrder({
      lines: rawLines,
      draft: { address, paymentMethod: method },
    })
    clear()
    navigate(`/order/${order.reference}`)
  }

  if (lines.length === 0 && !submitting) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">There is nothing to check out.</h1>
        <button onClick={() => navigate('/')} className="mt-4 font-semibold text-navy-600 hover:underline">
          Back to shopping
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <h1 className="mb-3 text-xl font-bold tracking-tight sm:text-2xl">Checkout</h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <section className="rounded-md bg-white p-4 shadow-card sm:p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide">Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="fullName">Full name</label>
                <input
                  id="fullName" className={field} value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  placeholder="Chidinma Okeke"
                />
                {errors.fullName && <p className="mt-1 text-xs text-flash">{errors.fullName}</p>}
              </div>

              <div>
                <label className={label} htmlFor="phone">Phone number</label>
                <input
                  id="phone" className={field} value={address.phone} inputMode="tel"
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="0803 123 4567"
                />
                {errors.phone && <p className="mt-1 text-xs text-flash">{errors.phone}</p>}
              </div>

              <div>
                <label className={label} htmlFor="altPhone">Alternative phone <span className="font-normal normal-case">(optional)</span></label>
                <input
                  id="altPhone" className={field} value={address.altPhone}
                  onChange={(e) => setAddress({ ...address, altPhone: e.target.value })}
                  placeholder="For when the rider cannot reach you"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={label} htmlFor="street">Street address</label>
                <input
                  id="street" className={field} value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="14 Adeniyi Jones Avenue, Ikeja"
                />
                {errors.street && <p className="mt-1 text-xs text-flash">{errors.street}</p>}
              </div>

              <div>
                <label className={label} htmlFor="city">City / Area</label>
                <input
                  id="city" className={field} value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="Ikeja"
                />
                {errors.city && <p className="mt-1 text-xs text-flash">{errors.city}</p>}
              </div>

              <div>
                <label className={label} htmlFor="state">State</label>
                <select
                  id="state" className={field} value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                >
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={label} htmlFor="landmark">Nearest landmark <span className="font-normal normal-case">(optional, but it speeds things up)</span></label>
                <input
                  id="landmark" className={field} value={address.landmark}
                  onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  placeholder="Opposite the GTBank on Allen"
                />
              </div>
            </div>
          </section>

          <section className="rounded-md bg-white p-4 shadow-card sm:p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide">Payment</h2>

            <div className="space-y-3">
              <label
                className={
                  method === 'paystack'
                    ? 'flex cursor-pointer gap-3 rounded-md border-2 border-navy-700 bg-navy-50 p-4'
                    : 'flex cursor-pointer gap-3 rounded-md border border-hairline p-4 hover:border-navy-300'
                }
              >
                <input
                  type="radio" name="payment" checked={method === 'paystack'}
                  onChange={() => setMethod('paystack')} className="mt-1 accent-navy-700"
                />
                <div className="flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <CreditCard size={16} /> Pay now with Paystack
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Card, bank transfer, USSD or direct debit. Secured by Paystack — we never see
                    your card details.
                  </p>
                </div>
              </label>

              <label
                className={
                  method === 'pay_on_delivery'
                    ? 'flex cursor-pointer gap-3 rounded-md border-2 border-navy-700 bg-navy-50 p-4'
                    : 'flex cursor-pointer gap-3 rounded-md border border-hairline p-4 hover:border-navy-300'
                }
              >
                <input
                  type="radio" name="payment" checked={method === 'pay_on_delivery'}
                  onChange={() => setMethod('pay_on_delivery')} className="mt-1 accent-navy-700"
                  disabled={!podAvailable}
                />
                <div className="flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <Wallet size={16} /> Pay on delivery
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {podAvailable
                      ? 'Cash or transfer to the rider. Open the package and check it before you pay.'
                      : 'Available in Lagos, Abuja and Port Harcourt for now. We are expanding.'}
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-3 lg:sticky lg:top-44 lg:self-start">
          <div className="rounded-md bg-white p-4 shadow-card">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">
              Your order ({totals.itemCount})
            </h2>

            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div key={`${line.productId}-${line.variantId}`} className="flex gap-2.5">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded">
                    <ProductImage imageKey={line.product.imageKey} imageUrl={line.product.imageUrl} alt="" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2-safe text-xs font-medium">{line.product.name}</span>
                    <span className="text-xs text-muted tabular">
                      {line.quantity} × {formatNaira(line.unitPriceKobo)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular">
                    {formatNaira(line.lineTotalKobo)}
                  </span>
                </div>
              ))}
            </div>

            <dl className="mt-4 space-y-2 border-t border-hairline pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold tabular">{formatNaira(totals.subtotalKobo)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-semibold tabular">
                  {totals.deliveryKobo === 0 ? <span className="text-emerald-600">Free</span> : formatNaira(totals.deliveryKobo)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2.5 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold tabular">{formatNaira(totals.totalKobo)}</dd>
              </div>
            </dl>

            <Button type="submit" variant="deal" size="lg" className="mt-4 w-full" disabled={submitting}>
              <Lock size={15} />
              {submitting
                ? 'Placing order…'
                : method === 'paystack'
                  ? `Pay ${formatNaira(totals.totalKobo)}`
                  : 'Confirm order'}
            </Button>

            <p className="mt-3 text-center text-xs text-muted">
              By ordering you accept our delivery and 7-day return terms.
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}
