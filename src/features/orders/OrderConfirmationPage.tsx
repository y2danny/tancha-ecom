import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, MessageCircle, Package, Truck, XCircle } from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { formatDeliveryWindow, formatNaira, toWhatsAppNumber } from '@/lib/format'
import { useSeo } from '@/lib/seo'
import { site } from '@/config/site'
import { useCart } from '@/store/cart'
import { takePendingPayment } from '@/lib/pendingPayment'
import { ButtonLink } from '@/components/ui/Button'
import type { Order } from '@/types/commerce'

const POLL_MS = 3000
const MAX_POLLS = 20

/** Flutterwave's redirect usually lands here before its webhook does. Each
 *  lookup passes along what Flutterwave put on the redirect URL
 *  (`transaction_id`, `status`), and the server checks it against
 *  Flutterwave directly — so the page settles on "confirmed" or "cancelled"
 *  by itself instead of waiting on the webhook. */
function usePolledOrder(reference: string | undefined, payment: { transactionId?: string; status?: string }) {
  const { transactionId, status } = payment
  const { data, loading } = useAsync(
    () => db.orders.getOrder(reference ?? '', { transactionId, status }),
    [reference, transactionId, status],
    null as Order | null,
  )
  const [order, setOrder] = useState<Order | null>(data)

  useEffect(() => setOrder(data), [data])

  useEffect(() => {
    if (!order || order.status !== 'pending_payment') return
    let tries = 0
    const id = window.setInterval(async () => {
      tries += 1
      const fresh = await db.orders.getOrder(reference ?? '', { transactionId, status })
      if (fresh && fresh.status !== 'pending_payment') setOrder(fresh)
      if (tries >= MAX_POLLS) window.clearInterval(id)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [order, reference, transactionId, status])

  return { order, loading }
}

export function OrderConfirmationPage() {
  useSeo({ title: 'Order Confirmation', noindex: true })
  const { reference } = useParams<{ reference: string }>()
  const [searchParams] = useSearchParams()
  const { order, loading } = usePolledOrder(reference, {
    transactionId: searchParams.get('transaction_id') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  })
  const { clear } = useCart()

  // The cart was kept while the customer was off paying. Once this order is
  // settled, either it's paid (empty the cart) or it isn't (leave the cart so
  // they can try again) — in both cases stop treating it as pending.
  useEffect(() => {
    if (!order || order.status === 'pending_payment') return
    if (takePendingPayment(order.reference) && order.status !== 'cancelled') clear()
  }, [order, clear])

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-muted">Loading your order…</div>
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold">We could not find that order.</h1>
        <p className="mt-2 text-sm text-muted">
          Check the reference, or message us and we will look it up.
        </p>
        <Link to="/" className="mt-5 inline-block font-semibold text-navy-600 hover:underline">
          Back to homepage
        </Link>
      </div>
    )
  }

  const pending = order.status === 'pending_payment'
  const cancelled = order.status === 'cancelled'
  const items = order.items ?? []

  return (
    <div className="mx-auto max-w-2xl px-3 py-8 sm:px-4">
      <div className="rounded-md bg-white p-6 text-center shadow-card sm:p-8">
        {pending ? (
          <Clock className="mx-auto animate-pulse text-gold-500" size={56} />
        ) : cancelled ? (
          <XCircle className="mx-auto text-flash" size={56} />
        ) : (
          <CheckCircle2 className="mx-auto text-emerald-500" size={56} />
        )}
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          {pending
            ? 'Confirming your payment'
            : cancelled
              ? 'Payment not completed'
              : order.status === 'returned'
                ? 'Order returned'
                : 'Order confirmed'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {pending
            ? 'We are checking with Flutterwave. This page updates itself — no need to refresh.'
            : cancelled
              ? 'No money was taken and this order will not be sent. Your cart is still saved if you want to try again.'
              : order.paymentMethod === 'pay_on_delivery'
                ? 'Our rep will call to confirm before dispatch. Have the cash or transfer ready for the rider.'
                : 'Payment received. Your order is being prepared.'}
        </p>

        <div className="mt-5 inline-flex flex-col items-center rounded-md bg-navy-50 px-6 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-navy-600">Order reference</span>
          <span className="text-xl font-extrabold tracking-wider text-navy-900 tabular">{order.reference}</span>
        </div>
      </div>

      <div className="mt-3 divide-y divide-hairline rounded-md bg-white shadow-card">
        {!cancelled && (
          <div className="flex gap-3 p-4">
            <Truck className="mt-0.5 shrink-0 text-navy-600" size={19} />
            <div className="text-sm">
              <p className="font-bold">
                Arriving {formatDeliveryWindow(order.estimatedFrom, order.estimatedTo)}
              </p>
              <p className="mt-0.5 text-muted">
                {order.address.street}, {order.address.city}, {order.address.state}
              </p>
              <p className="mt-0.5 text-muted">{order.address.fullName} · {order.address.phone}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 p-4">
          <Package className="mt-0.5 shrink-0 text-navy-600" size={19} />
          <div className="w-full text-sm">
            <p className="font-bold">{order.totals.itemCount} items</p>
            {items.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {items.map((it, i) => (
                  <li key={`${it.productId}-${it.variantId}-${i}`} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-ink">{it.quantity} × {it.name}</span>
                      {it.variantLabel && <span className="block text-xs text-muted">{it.variantLabel}</span>}
                    </span>
                    <span className="shrink-0 tabular">{formatNaira(it.unitPriceKobo * it.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-3 space-y-1.5 border-t border-hairline pt-2">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular">{formatNaira(order.totals.subtotalKobo)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular">
                  {order.totals.deliveryKobo === 0 ? 'Free' : formatNaira(order.totals.deliveryKobo)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-1.5 font-bold">
                <dt>Total</dt>
                <dd className="tabular">{formatNaira(order.totals.totalKobo)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {cancelled ? (
          <ButtonLink to="/cart" variant="primary" className="flex-1">Back to cart</ButtonLink>
        ) : (
          <ButtonLink to="/" variant="primary" className="flex-1">Continue shopping</ButtonLink>
        )}
        <a
          href={`https://wa.me/${toWhatsAppNumber(site.supportWhatsApp)}?text=${encodeURIComponent(
            `Hi Tancha, about order ${order.reference}:`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-emerald-600 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          <MessageCircle size={16} />
          Message support
        </a>
      </div>
    </div>
  )
}
