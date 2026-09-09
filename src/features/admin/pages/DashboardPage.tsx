import { AlertTriangle, Boxes, CircleDollarSign, ClipboardList, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { formatNaira } from '@/lib/format'
import { supabaseReady } from '@/data/supabase/client'
import type { Order } from '@/types/commerce'
import type { Product } from '@/types/catalog'

function StatCard({ icon: Icon, label, value, tone = 'navy' }: { icon: typeof Package; label: string; value: string; tone?: 'navy' | 'gold' | 'flash' }) {
  const toneClasses = {
    navy: 'bg-navy-50 text-navy-700',
    gold: 'bg-gold-100 text-gold-800',
    flash: 'bg-flash/10 text-flash-dark',
  }[tone]
  return (
    <div className="rounded-md bg-white p-4 shadow-card">
      <span className={`inline-flex rounded-md p-2 ${toneClasses}`}><Icon size={18} /></span>
      <p className="mt-3 text-2xl font-extrabold tabular">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { data: orders, loading: ordersLoading } = useAsync(() => db.admin.listAllOrders(), [], [] as Order[])
  const { data: products, loading: productsLoading } = useAsync(() => db.admin.listAllProducts(), [], [] as Product[])

  const today = new Date().toDateString()
  const ordersToday = orders.filter((o) => new Date(o.placedAt).toDateString() === today)
  const revenueToday = ordersToday.reduce((sum, o) => sum + o.totals.totalKobo, 0)
  const pendingCount = orders.filter((o) => o.status === 'pending_payment' || o.status === 'confirmed').length
  const lowStock = products.filter((p) => p.active && p.stock <= 10).sort((a, b) => a.stock - b.stock)

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
      {!supabaseReady && (
        <p className="mt-1 text-sm text-muted">
          Demo mode — figures come from this browser's local storage, not a shared database yet.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Orders today" value={String(ordersLoading ? '—' : ordersToday.length)} />
        <StatCard icon={CircleDollarSign} label="Revenue today" value={ordersLoading ? '—' : formatNaira(revenueToday)} tone="gold" />
        <StatCard icon={Boxes} label="Orders to action" value={String(ordersLoading ? '—' : pendingCount)} />
        <StatCard icon={Package} label="Products live" value={String(productsLoading ? '—' : products.filter((p) => p.active).length)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <AlertTriangle size={16} className="text-flash-dark" /> Low stock
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">Nothing below 10 units. Good place to be.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate pr-3">{p.name}</span>
                  <span className={`shrink-0 font-bold tabular ${p.stock === 0 ? 'text-flash-dark' : 'text-gold-700'}`}>
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/inventory" className="mt-3 inline-block text-sm font-semibold text-navy-600 hover:underline">
            Go to inventory →
          </Link>
        </div>

        <div className="rounded-md bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Recent orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {orders.slice(0, 6).map((o) => (
                <li key={o.reference} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-mono">{o.reference}</span>
                  <span className="capitalize text-muted">{o.status.replace(/_/g, ' ')}</span>
                  <span className="font-bold tabular">{formatNaira(o.totals.totalKobo)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/orders" className="mt-3 inline-block text-sm font-semibold text-navy-600 hover:underline">
            Go to orders →
          </Link>
        </div>
      </div>
    </div>
  )
}
