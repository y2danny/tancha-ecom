import { useEffect, useState } from 'react'
import { db } from '@/data'
import { formatDate, formatNaira } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import type { Order, OrderStatus } from '@/types/commerce'

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'packed', 'in_transit', 'delivered', 'cancelled', 'returned']

const TONE: Record<OrderStatus, 'flash' | 'gold' | 'navy' | 'green' | 'muted'> = {
  pending_payment: 'gold',
  confirmed: 'navy',
  packed: 'navy',
  in_transit: 'navy',
  delivered: 'green',
  cancelled: 'flash',
  returned: 'flash',
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    db.admin.listAllOrders(filter === 'all' ? undefined : { status: filter }).then((o) => {
      setOrders(o)
      setLoading(false)
    })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [filter])

  const updateStatus = async (reference: string, status: OrderStatus) => {
    await db.admin.updateOrderStatus(reference, status)
    reload()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Orders</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
          className="h-9 rounded-md border border-hairline bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md bg-white shadow-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-hairline text-left text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No orders for this filter.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.reference}>
                  <td className="px-4 py-3 font-mono">{o.reference}</td>
                  <td className="max-w-[160px] truncate px-4 py-3">{o.address.fullName}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(o.placedAt)}</td>
                  <td className="px-4 py-3 font-bold tabular">{formatNaira(o.totals.totalKobo)}</td>
                  <td className="px-4 py-3 capitalize text-muted">{o.paymentMethod.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.reference, e.target.value as OrderStatus)}
                      className="h-8 rounded-md border border-hairline bg-white px-2 text-xs capitalize"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                    <span className="ml-2 hidden sm:inline"><Badge tone={TONE[o.status]}>{o.status.replace(/_/g, ' ')}</Badge></span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
