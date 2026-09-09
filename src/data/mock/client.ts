import type {
  Category, Deal, Paginated, Product, ProductQuery, Review,
} from '@/types/catalog'
import type { CartLine, Order, CartTotals } from '@/types/commerce'
import type { CatalogRepository, DataClient, DealRepository, OrderRepository } from '../repository'
import { categories, categoryBySlug } from './categories'
import { products, productById, productBySlug } from './products'
import { deals, reviewsFor } from './deals'
import { site } from '@/config/site'
import { mockAdmin } from './admin'
import * as orderStore from './orderStore'

/** Simulated latency so loading states are real rather than theoretical. */
const wait = <T,>(value: T, ms = 140): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms))

function matches(p: Product, q: ProductQuery, categoryId?: string) {
  if (!p.active) return false
  if (categoryId && p.categoryId !== categoryId) return false
  if (q.tags?.length && !q.tags.some((t) => p.tags.includes(t))) return false
  if (q.minPriceKobo !== undefined && p.priceKobo < q.minPriceKobo) return false
  if (q.maxPriceKobo !== undefined && p.priceKobo > q.maxPriceKobo) return false
  if (q.minRating !== undefined && p.rating < q.minRating) return false
  if (q.inStockOnly && p.stock <= 0) return false
  if (q.payOnDeliveryOnly && !p.payOnDelivery) return false
  if (q.search) {
    const term = q.search.toLowerCase()
    const haystack = `${p.name} ${p.brand} ${p.hook} ${p.tags.join(' ')}`.toLowerCase()
    if (!haystack.includes(term)) return false
  }
  return true
}

function sortProducts(list: Product[], sort: ProductQuery['sort']) {
  const out = [...list]
  switch (sort) {
    case 'price-asc':
      return out.sort((a, b) => a.priceKobo - b.priceKobo)
    case 'price-desc':
      return out.sort((a, b) => b.priceKobo - a.priceKobo)
    case 'newest':
      return out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'bestselling':
      return out.sort((a, b) => b.unitsSold - a.unitsSold)
    case 'discount':
      return out.sort(
        (a, b) =>
          (b.compareAtKobo ? 1 - b.priceKobo / b.compareAtKobo : 0) -
          (a.compareAtKobo ? 1 - a.priceKobo / a.compareAtKobo : 0),
      )
    default:
      return out.sort((a, b) => b.unitsSold * b.rating - a.unitsSold * a.rating)
  }
}

const catalog: CatalogRepository = {
  async listCategories(): Promise<Category[]> {
    return wait(categories)
  },

  async getCategory(slug) {
    return wait(categoryBySlug.get(slug) ?? null)
  },

  async listProducts(query): Promise<Paginated<Product>> {
    const categoryId = query.categorySlug ? categoryBySlug.get(query.categorySlug)?.id : undefined
    const filtered = products.filter((p) => matches(p, query, categoryId))
    const sorted = sortProducts(filtered, query.sort)
    const perPage = query.perPage ?? 24
    const page = query.page ?? 1
    const start = (page - 1) * perPage
    return wait({
      items: sorted.slice(start, start + perPage),
      total: sorted.length,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(sorted.length / perPage)),
    })
  },

  async getProduct(slug) {
    return wait(productBySlug.get(slug) ?? null)
  },

  async getProductsByIds(ids) {
    return wait(ids.map((id) => productById.get(id)).filter((p): p is Product => Boolean(p)))
  },

  async listReviews(productId): Promise<Review[]> {
    const product = productById.get(productId)
    return wait(reviewsFor(productId, product?.reviewCount ?? 0))
  },

  async relatedProducts(product, limit = 6) {
    const same = products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    const fill = products.filter((p) => p.categoryId !== product.categoryId && p.id !== product.id)
    return wait([...same, ...fill].slice(0, limit))
  },

  async searchSuggestions(term, limit = 6) {
    if (!term.trim()) return wait([])
    const t = term.toLowerCase()
    return wait(
      products
        .filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(t))
        .slice(0, limit),
      60,
    )
  },
}

const dealRepo: DealRepository = {
  async listActiveDeals(): Promise<Deal[]> {
    const now = Date.now()
    return wait(deals.filter((d) => d.active && +new Date(d.endsAt) > now))
  },
  async getDeal(id) {
    return wait(deals.find((d) => d.id === id) ?? null)
  },
}

function totalsFor(lines: CartLine[]): CartTotals {
  const subtotalKobo = lines.reduce((sum, l) => sum + l.unitPriceKobo * l.quantity, 0)
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const freeDeliveryUnlocked = subtotalKobo >= site.freeDeliveryThresholdKobo
  const deliveryKobo = itemCount === 0 || freeDeliveryUnlocked ? 0 : 150_000
  return {
    subtotalKobo,
    deliveryKobo,
    discountKobo: 0,
    totalKobo: subtotalKobo + deliveryKobo,
    itemCount,
    freeDeliveryUnlocked,
    koboToFreeDelivery: Math.max(0, site.freeDeliveryThresholdKobo - subtotalKobo),
  }
}

const orders: OrderRepository = {
  async placeOrder({ lines, draft }) {
    const reference = `TCH-${Date.now().toString(36).toUpperCase().slice(-6)}`
    const now = new Date()
    // No real Paystack in mock mode — both methods confirm immediately so the
    // storefront demo has a complete order to show. The Supabase client's
    // `placeOrder` is the one that actually returns a Paystack authorization_url.
    const order: Order = {
      id: `ord_${reference}`,
      reference,
      status: 'confirmed',
      lines,
      totals: totalsFor(lines),
      address: draft.address,
      paymentMethod: draft.paymentMethod,
      placedAt: now.toISOString(),
      estimatedFrom: new Date(+now + 2 * 86400000).toISOString(),
      estimatedTo: new Date(+now + 5 * 86400000).toISOString(),
      customerId: null,
    }
    orderStore.saveOrder(order)
    return wait({ order }, 600)
  },

  async getOrder(reference) {
    return wait(orderStore.getOrder(reference))
  },
}

export const mockClient: DataClient = { catalog, deals: dealRepo, orders, admin: mockAdmin }
export { totalsFor }
