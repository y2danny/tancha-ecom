import { useEffect, useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { formatNaira, naira, slugify } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProductPhotoUploader } from '@/components/admin/ProductPhotoUploader'
import { ProductGalleryUploader } from '@/components/admin/ProductGalleryUploader'
import { ProductImage } from '@/components/product/ProductImage'
import type { Category, ImageKey, Product, ProductTag } from '@/types/catalog'
import type { NewProductInput } from '@/types/admin'

const IMAGE_KEYS: ImageKey[] = [
  'backpack', 'notebook', 'calculator', 'earbuds', 'powerbank', 'lunchbox', 'shoes', 'uniform',
  'trousers', 'skirt', 'sweater', 'pens', 'bottle', 'tablet', 'lamp', 'sportsbag', 'geometry', 'socks', 'crayons',
]
const TAGS: ProductTag[] = ['back-to-school', 'bestseller', 'new', 'clearance', 'bulk-discount', 'official-store']

const field = 'h-10 w-full rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-navy-500'
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted'

function emptyDraft(categories: Category[]): NewProductInput {
  return {
    slug: '', name: '', hook: '', description: '', bullets: [], brand: 'Tancha',
    categoryId: categories[0]?.id ?? '', imageKey: 'notebook', imageUrl: null, gallery: [], priceKobo: 0, compareAtKobo: null,
    stock: 0, tags: [], deliveryDaysMin: 2, deliveryDaysMax: 5, payOnDelivery: true, active: true, variants: [],
  }
}

function ProductDrawer({
  categories, product, onClose, onSaved,
}: { categories: Category[]; product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<NewProductInput>(
    product
      ? {
          slug: product.slug, name: product.name, hook: product.hook, description: product.description,
          bullets: product.bullets, brand: product.brand, categoryId: product.categoryId, imageKey: product.imageKey,
          imageUrl: product.imageUrl ?? null,
          gallery: product.gallery ?? [],
          priceKobo: product.priceKobo, compareAtKobo: product.compareAtKobo, stock: product.stock,
          tags: product.tags, deliveryDaysMin: product.deliveryDaysMin, deliveryDaysMax: product.deliveryDaysMax,
          payOnDelivery: product.payOnDelivery, active: product.active,
          variants: product.variants.map((v) => ({ id: v.id, label: v.label, optionName: v.optionName, priceKobo: v.priceKobo, stock: v.stock, sku: v.sku })),
        }
      : emptyDraft(categories),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = { ...draft, slug: draft.slug || slugify(draft.name) }
      if (product) await db.admin.updateProduct(product.id, payload)
      else await db.admin.createProduct(payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{product ? 'Edit product' : 'New product'}</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {error && <p role="alert" className="mb-3 rounded-md bg-flash/10 px-3 py-2 text-xs font-semibold text-flash-dark">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className={label}>Photo</label>
            <ProductPhotoUploader
              value={draft.imageUrl}
              onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
              imageKey={draft.imageKey}
              alt={draft.name || 'Product photo'}
            />
          </div>
          <div>
            <label className={label}>More photos (optional)</label>
            <ProductGalleryUploader
              value={draft.gallery}
              onChange={(gallery) => setDraft({ ...draft, gallery })}
            />
          </div>
          <div>
            <label className={label} htmlFor="name">Name</label>
            <input id="name" className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="hook">Marketing hook</label>
            <input id="hook" className={field} value={draft.hook} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="description">Description</label>
            <textarea
              id="description" className={`${field} h-20 py-2`} value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="category">Category</label>
              <select id="category" className={field} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="imageKey">Fallback illustration</label>
              <select id="imageKey" className={field} value={draft.imageKey} onChange={(e) => setDraft({ ...draft, imageKey: e.target.value as ImageKey })}>
                {IMAGE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="price">Price (₦)</label>
              <input
                id="price" type="number" className={field} value={draft.priceKobo / 100}
                onChange={(e) => setDraft({ ...draft, priceKobo: naira(Number(e.target.value)) })}
              />
            </div>
            <div>
              <label className={label} htmlFor="compareAt">Compare-at (₦)</label>
              <input
                id="compareAt" type="number" className={field} value={draft.compareAtKobo ? draft.compareAtKobo / 100 : ''}
                onChange={(e) => setDraft({ ...draft, compareAtKobo: e.target.value ? naira(Number(e.target.value)) : null })}
              />
            </div>
            <div>
              <label className={label} htmlFor="stock">Stock</label>
              <input
                id="stock" type="number" className={field} value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
                disabled={Boolean(product)}
                title={product ? 'Adjust stock from the Inventory page so every change is logged' : undefined}
              />
            </div>
          </div>
          {product && (
            <p className="text-xs text-muted">
              Stock is locked here — adjust it from <strong>Inventory</strong> so every change leaves an audit trail.
            </p>
          )}

          <div>
            <label className={label}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const active = draft.tags.includes(t)
                return (
                  <button
                    key={t} type="button"
                    onClick={() => setDraft({ ...draft, tags: active ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })}
                  >
                    <Badge tone={active ? 'navy' : 'muted'}>{t}</Badge>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              Active (visible on the storefront)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={draft.payOnDelivery} onChange={(e) => setDraft({ ...draft, payOnDelivery: e.target.checked })} />
              Pay on delivery eligible
            </label>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !draft.name}>
            {saving ? 'Saving…' : 'Save product'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

export function ProductsPage() {
  const { data: categories } = useAsync(() => db.catalog.listCategories(), [], [] as Category[])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<'closed' | 'new' | Product>('closed')

  const reload = () => {
    setLoading(true)
    db.admin.listAllProducts().then((p) => {
      setProducts(p)
      setLoading(false)
    })
  }
  useEffect(reload, [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Products</h1>
        <Button variant="primary" size="sm" onClick={() => setDrawer('new')}>
          <Plus size={15} /> New product
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md bg-white shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-hairline text-left text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No products yet.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-xs px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-hairline bg-canvas">
                        <ProductImage imageKey={p.imageKey} imageUrl={p.imageUrl} alt="" />
                      </div>
                      <span className="truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular">{formatNaira(p.priceKobo)}</td>
                  <td className="px-4 py-3 tabular">{p.stock}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        await db.admin.setProductActive(p.id, !p.active)
                        reload()
                      }}
                    >
                      <Badge tone={p.active ? 'green' : 'muted'}>{p.active ? 'Active' : 'Hidden'}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDrawer(p)} className="text-navy-600 hover:underline" aria-label={`Edit ${p.name}`}>
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawer !== 'closed' && (
        <ProductDrawer
          categories={categories}
          product={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer('closed')}
          onSaved={reload}
        />
      )}
    </div>
  )
}
