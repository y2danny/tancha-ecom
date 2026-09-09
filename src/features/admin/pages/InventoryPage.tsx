import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { db } from '@/data'
import { formatDate } from '@/lib/format'
import type { Product } from '@/types/catalog'
import type { InventoryAdjustment, InventoryMovementRecord } from '@/types/admin'

const REASONS: InventoryAdjustment['reason'][] = ['restock', 'damage', 'correction']

function AdjustRow({ product, onAdjusted }: { product: Product; onAdjusted: () => void }) {
  const [delta, setDelta] = useState(1)
  const [reason, setReason] = useState<InventoryAdjustment['reason']>('restock')
  const [busy, setBusy] = useState(false)

  const apply = async (sign: 1 | -1) => {
    if (delta <= 0) return
    setBusy(true)
    try {
      await db.admin.adjustInventory({ productId: product.id, delta: delta * sign, reason })
      onAdjusted()
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td className="max-w-xs truncate px-4 py-3 font-medium">{product.name}</td>
      <td className={`px-4 py-3 font-bold tabular ${product.stock === 0 ? 'text-flash-dark' : product.stock <= 10 ? 'text-gold-700' : ''}`}>
        {product.stock}
      </td>
      <td className="px-4 py-3">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as InventoryAdjustment['reason'])}
          className="h-8 rounded-md border border-hairline bg-white px-2 text-xs"
        >
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number" min={1} value={delta}
            onChange={(e) => setDelta(Math.max(1, Number(e.target.value)))}
            className="h-8 w-16 rounded-md border border-hairline px-2 text-xs tabular"
          />
          <button onClick={() => apply(1)} disabled={busy} className="grid h-8 w-8 place-items-center rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100" aria-label={`Add stock to ${product.name}`}>
            <Plus size={14} />
          </button>
          <button onClick={() => apply(-1)} disabled={busy} className="grid h-8 w-8 place-items-center rounded-md bg-flash/10 text-flash-dark hover:bg-flash/20" aria-label={`Remove stock from ${product.name}`}>
            <Minus size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([])
  const [query, setQuery] = useState('')

  const reload = () => {
    db.admin.listAllProducts().then(setProducts)
    db.admin.listMovements(30).then(setMovements)
  }
  useEffect(reload, [])

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  const lowStock = [...products].sort((a, b) => a.stock - b.stock)

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Inventory</h1>
      <p className="mt-1 text-sm text-muted">
        Every change is a ledger entry — stock is never edited directly, so there is always a trail.
      </p>

      <input
        placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)}
        className="mt-4 h-10 w-full max-w-sm rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-navy-500"
      />

      <div className="mt-3 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-x-auto rounded-md bg-white shadow-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-hairline text-left text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {(query ? filtered : lowStock).map((p) => (
                <AdjustRow key={p.id} product={p} onAdjusted={reload} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Recent movements</h2>
          {movements.length === 0 ? (
            <p className="text-sm text-muted">No movements logged yet.</p>
          ) : (
            <ul className="max-h-[420px] space-y-2.5 overflow-y-auto">
              {movements.map((m) => (
                <li key={m.id} className="border-b border-hairline pb-2 text-sm last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-2 font-medium">{m.productName}</span>
                    <span className={`font-bold tabular ${m.delta > 0 ? 'text-emerald-600' : 'text-flash-dark'}`}>
                      {m.delta > 0 ? '+' : ''}{m.delta}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {m.reason} · {formatDate(m.createdAt)} · {m.actorName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
