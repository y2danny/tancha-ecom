import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Clock, MessageCircle, Package, Truck } from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { formatDeliveryWindow, formatNaira, toWhatsAppNumber } from '@/lib/format'
import { useSeo } from '@/lib/seo'
import { site } from '@/config/site'
import { ButtonLink } from '@/components/ui/Button'
import type { Order } from '@/types/commerce'

/** Paystack's redirect lands here before the webhook has necessarily landed —
 *  poll briefly rather than telling the customer "confirmed" too early. */
function usePolledOrder(reference: string | undefined) {
  const { data, loading } = useAsync(() => db.orders.getOrder(reference ?? ''), [reference], null as Order | null)
  const [order, setOrder] = useState<Order | null>(data)

  useEffect(() => setOrder(data), [data])

  useEffect(() => {
    if (!order || order.status !== 'pending_payment') return
    let tries = 0
    const id = window.setInterval(async () => {
      tries += 1
      const fresh = await db.orders.getOrder(reference ?? '')
      if (fresh && fresh.status !== 'pending_payment') setOrder(fresh)
      if (tries >= 10) window.clearInterval(id)
    }, 3000)
    return () => window.clearInterval(id)
  }, [order, reference])

  return { order, loading }
}

export function OrderConfirmationPage() {
  useSeo({ title: 'Order Confirmation', noindex: true })
  const { reference } = useParams<{ reference: string }>()
  const { order, loading } = usePolledOrder(reference)

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

  return (
    <div className="mx-auto max-w-2xl px-3 py-8 sm:px-4">
      <div className="rounded-md bg-white p-6 text-center shadow-card sm:p-8">
        {pending ? (
          <Clock className="mx-auto animate-pulse text-gold-500" size={56} />
        ) : (
          <CheckCircle2 className="mx-auto text-emerald-500" size={56} />
        )}
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          {pending ? 'Waiting for payment confirmation' : 'Order confirmed'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {pending
            ? 'Paystack says you paid — we are waiting for the final confirmation from our side. This page updates itself, no need to refresh.'
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

        <div className="flex gap-3 p-4">
          <Package className="mt-0.5 shrink-0 text-navy-600" size={19} />
          <div className="w-full text-sm">
            <p className="font-bold">{order.totals.itemCount} items</p>
            <dl className="mt-2 space-y-1.5">
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
        <ButtonLink to="/" variant="primary" className="flex-1">Continue shopping</ButtonLink>
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
