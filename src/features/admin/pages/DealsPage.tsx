import { useEffect, useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { db } from '@/data'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Deal, DealKind, Product } from '@/types/catalog'
import type { NewDealInput } from '@/types/admin'

const field = 'h-10 w-full rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-navy-500'
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted'
const KINDS: DealKind[] = ['day', 'week', 'bundle']

function toInputDateTime(iso: string) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function emptyDraft(): NewDealInput {
  const now = new Date()
  return {
    kind: 'day', title: '', subtitle: '', productIds: [],
    startsAt: now.toISOString(),
    endsAt: new Date(+now + 86400000).toISOString(),
    headlineDiscount: 40, active: true,
  }
}

function DealDrawer({
  products, deal, onClose, onSaved,
}: { products: Product[]; deal: Deal | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<NewDealInput>(
    deal
      ? { kind: deal.kind, title: deal.title, subtitle: deal.subtitle, productIds: deal.productIds, startsAt: deal.startsAt, endsAt: deal.endsAt, headlineDiscount: deal.headlineDiscount, active: deal.active }
      : emptyDraft(),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleProduct = (id: string) => {
    setDraft((d) => ({ ...d, productIds: d.productIds.includes(id) ? d.productIds.filter((x) => x !== id) : [...d.productIds, id] }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (deal) await db.admin.updateDeal(deal.id, draft)
      else await db.admin.createDeal(draft)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the deal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{deal ? 'Edit deal' : 'New deal'}</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {error && <p role="alert" className="mb-3 rounded-md bg-flash/10 px-3 py-2 text-xs font-semibold text-flash-dark">{error}</p>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="kind">Kind</label>
              <select id="kind" className={field} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as DealKind })}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="discount">Headline discount %</label>
              <input id="discount" type="number" className={field} value={draft.headlineDiscount} onChange={(e) => setDraft({ ...draft, headlineDiscount: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="title">Title</label>
            <input id="title" className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="subtitle">Subtitle (the marketing line)</label>
            <input id="subtitle" className={field} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="startsAt">Starts</label>
              <input
                id="startsAt" type="datetime-local" className={field} value={toInputDateTime(draft.startsAt)}
                onChange={(e) => setDraft({ ...draft, startsAt: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div>
              <label className={label} htmlFor="endsAt">Ends</label>
              <input
                id="endsAt" type="datetime-local" className={field} value={toInputDateTime(draft.endsAt)}
                onChange={(e) => setDraft({ ...draft, endsAt: new Date(e.target.value).toISOString() })}
              />
            </div>
          </div>

          <div>
            <label className={label}>Products in this deal ({draft.productIds.length} selected)</label>
            <div className="max-h-48 overflow-y-auto rounded-md border border-hairline">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 border-b border-hairline px-3 py-2 text-sm last:border-0 hover:bg-navy-50">
                  <input type="checkbox" checked={draft.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Active
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !draft.title}>
            {saving ? 'Saving…' : 'Save deal'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [drawer, setDrawer] = useState<'closed' | 'new' | Deal>('closed')
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    Promise.all([db.admin.listAllDeals(), db.admin.listAllProducts()]).then(([d, p]) => {
      setDeals(d)
      setProducts(p)
      setLoading(false)
    })
  }
  useEffect(reload, [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Deals</h1>
        <Button variant="primary" size="sm" onClick={() => setDrawer('new')}>
          <Plus size={15} /> New deal
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : deals.length === 0 ? (
          <p className="text-sm text-muted">No deals scheduled yet.</p>
        ) : (
          deals.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-md bg-white p-4 shadow-card">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={d.active ? 'navy' : 'muted'}>{d.kind}</Badge>
                  <p className="truncate font-bold">{d.title}</p>
                </div>
                <p className="mt-1 truncate text-sm text-muted">{d.subtitle}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(d.startsAt)} → {formatDate(d.endsAt)} · {d.productIds.length} products · {d.headlineDiscount}% off
                </p>
              </div>
              <button onClick={() => setDrawer(d)} className="shrink-0 text-navy-600 hover:underline" aria-label={`Edit ${d.title}`}>
                <Pencil size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {drawer !== 'closed' && (
        <DealDrawer products={products} deal={drawer === 'new' ? null : drawer} onClose={() => setDrawer('closed')} onSaved={reload} />
      )}
    </div>
  )
}
