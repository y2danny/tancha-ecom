import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown, Mail, MapPin, MessageCircle, Package, Phone, RefreshCw, Wallet,
} from 'lucide-react'
import { db } from '@/data'
import { formatNaira, toWhatsAppNumber } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { Order, OrderStatus } from '@/types/commerce'

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'packed', 'in_transit', 'delivered', 'cancelled', 'returned']

const LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  packed: 'Packed',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const TONE: Record<OrderStatus, 'flash' | 'gold' | 'navy' | 'green' | 'muted'> = {
  pending_payment: 'gold',
  confirmed: 'navy',
  packed: 'navy',
  in_transit: 'navy',
  delivered: 'green',
  cancelled: 'muted',
  returned: 'flash',
}

const REFRESH_MS = 30_000

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  )

const needsPaymentCheck = (o: Order) => o.paymentMethod === 'flutterwave' && o.status === 'pending_payment'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const syncing = useRef(false)

  const load = useCallback(async () => {
    try {
      const list = await db.admin.listAllOrders(filter === 'all' ? undefined : { status: filter })
      setOrders(list)
      setUpdatedAt(new Date())
      setError(null)
      return list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders')
      return null
    } finally {
      setLoading(false)
    }
  }, [filter])

  /** Ask Flutterwave about every order still awaiting payment, then reload.
   *  This is what moves paid orders to Confirmed and abandoned ones to
   *  Cancelled even if a webhook never arrived. */
  const syncPending = useCallback(
    async (list: Order[]) => {
      const pending = list.filter(needsPaymentCheck)
      if (pending.length === 0 || syncing.current) return
      syncing.current = true
      try {
        await Promise.allSettled(pending.map((o) => db.admin.syncOrderPayment(o.reference)))
        await load()
      } finally {
        syncing.current = false
      }
    },
    [load],
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const list = await load()
    if (list) await syncPending(list)
    setRefreshing(false)
  }, [load, syncPending])

  useEffect(() => {
    setLoading(true)
    refresh()
    const id = window.setInterval(refresh, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  const updateStatus = async (reference: string, status: OrderStatus) => {
    try {
      const updated = await db.admin.updateOrderStatus(reference, status)
      setOrders((prev) => prev.map((o) => (o.reference === reference ? updated : o)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order')
    }
  }

  const checkPayment = async (reference: string) => {
    await db.admin.syncOrderPayment(reference).catch(() => undefined)
    await load()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Orders</h1>
          <p className="text-xs text-muted">
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })} · refreshes every 30s` : ' '}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
            className="h-9 rounded-md border border-hairline bg-white px-3 text-sm"
          >
            <option value="all">All orders</option>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-white px-3 text-sm font-semibold hover:border-navy-300 disabled:opacity-60"
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-flash/10 px-3 py-2 text-xs font-semibold text-flash-dark">{error}</p>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-md bg-white px-4 py-8 text-center text-sm text-muted shadow-card">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="rounded-md bg-white px-4 py-8 text-center text-sm text-muted shadow-card">No orders for this filter.</p>
        ) : (
          orders.map((o) => (
            <OrderCard
              key={o.reference}
              order={o}
              open={open === o.reference}
              onToggle={() => setOpen(open === o.reference ? null : o.reference)}
              onStatus={(s) => updateStatus(o.reference, s)}
              onCheckPayment={() => checkPayment(o.reference)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order: o,
  open,
  onToggle,
  onStatus,
  onCheckPayment,
}: {
  order: Order
  open: boolean
  onToggle: () => void
  onStatus: (s: OrderStatus) => void
  onCheckPayment: () => Promise<void>
}) {
  const [checking, setChecking] = useState(false)
  const items = o.items ?? []
  const a = o.address
  const summary = items.length
    ? items.map((it) => `${it.quantity}× ${it.name}`).join(', ')
    : `${o.totals.itemCount} item${o.totals.itemCount === 1 ? '' : 's'}`

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-navy-50/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold">{a.fullName}</span>
            <Badge tone={TONE[o.status]}>{LABEL[o.status]}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{summary}</p>
          <p className="mt-0.5 text-xs text-muted">
            <span className="font-mono">{o.reference}</span> · {dateTime(o.placedAt)} ·{' '}
            {o.paymentMethod === 'pay_on_delivery' ? 'Pay on delivery' : 'Flutterwave'}
            {a.city ? ` · ${a.city}, ${a.state}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-bold tabular">{formatNaira(o.totals.totalKobo)}</span>
          <ChevronDown size={18} className={cn('text-muted transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-hairline px-4 py-4 text-sm md:grid-cols-2">
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <Package size={14} /> Items
            </h3>
            {items.length === 0 ? (
              <p className="text-muted">No item details were saved for this order.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={`${it.productId}-${it.variantId}-${i}`} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-semibold">{it.quantity} × {it.name}</span>
                      {it.variantLabel && <span className="block text-xs text-muted">{it.variantLabel}</span>}
                      <span className="block text-xs text-muted">{formatNaira(it.unitPriceKobo)} each</span>
                    </span>
                    <span className="shrink-0 tabular">{formatNaira(it.unitPriceKobo * it.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-3 space-y-1 border-t border-hairline pt-2">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular">{formatNaira(o.totals.subtotalKobo)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular">{o.totals.deliveryKobo === 0 ? 'Free' : formatNaira(o.totals.deliveryKobo)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd className="tabular">{formatNaira(o.totals.totalKobo)}</dd></div>
            </dl>
          </section>

          <div className="space-y-4">
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                <Phone size={14} /> Customer
              </h3>
              <p className="font-semibold">{a.fullName}</p>
              <p><a href={`tel:${a.phone}`} className="text-navy-600 hover:underline">{a.phone}</a></p>
              {a.altPhone && <p className="text-muted">Alt: <a href={`tel:${a.altPhone}`} className="text-navy-600 hover:underline">{a.altPhone}</a></p>}
              {a.email ? (
                <p className="flex items-center gap-1"><Mail size={13} className="text-muted" /><a href={`mailto:${a.email}`} className="break-all text-navy-600 hover:underline">{a.email}</a></p>
              ) : (
                <p className="text-xs text-muted">No email on this order</p>
              )}
              <a
                href={`https://wa.me/${toWhatsAppNumber(a.phone)}?text=${encodeURIComponent(`Hi ${a.fullName.split(' ')[0]}, this is Tancha about your order ${o.reference}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
              >
                <MessageCircle size={13} /> WhatsApp customer
              </a>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                <MapPin size={14} /> Deliver to
              </h3>
              <p>{a.street}</p>
              <p>{a.city}, {a.state}</p>
              {a.landmark && <p className="text-muted">Landmark: {a.landmark}</p>}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                <Wallet size={14} /> Payment
              </h3>
              <p>
                {o.paymentMethod === 'pay_on_delivery'
                  ? 'Pay on delivery — collect on arrival'
                  : o.paidAt
                    ? `Paid with Flutterwave · ${dateTime(o.paidAt)}`
                    : o.status === 'cancelled'
                      ? 'Flutterwave — not paid'
                      : 'Flutterwave — waiting for payment'}
              </p>
              {needsPaymentCheck(o) && (
                <button
                  type="button"
                  disabled={checking}
                  onClick={async () => {
                    setChecking(true)
                    await onCheckPayment()
                    setChecking(false)
                  }}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:underline disabled:opacity-60"
                >
                  <RefreshCw size={12} className={cn(checking && 'animate-spin')} />
                  {checking ? 'Checking with Flutterwave…' : 'Check payment now'}
                </button>
              )}
            </section>

            <section>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor={`status-${o.reference}`}>
                Update status
              </label>
              <select
                id={`status-${o.reference}`}
                value={o.status}
                onChange={(e) => onStatus(e.target.value as OrderStatus)}
                className="h-9 w-full rounded-md border border-hairline bg-white px-2 text-sm"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
