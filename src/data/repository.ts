import type {
  Category,
  Deal,
  Paginated,
  Product,
  ProductQuery,
  Review,
} from '@/types/catalog'
import type { Order, CheckoutDraft, CartLine } from '@/types/commerce'

/**
 * The seam. Every screen talks to these interfaces and nothing else, so
 * swapping the mock implementation for Supabase is a one-file change in
 * `src/data/index.ts` — no component gets touched.
 */

export interface CatalogRepository {
  listCategories(): Promise<Category[]>
  getCategory(slug: string): Promise<Category | null>
  listProducts(query: ProductQuery): Promise<Paginated<Product>>
  getProduct(slug: string): Promise<Product | null>
  getProductsByIds(ids: string[]): Promise<Product[]>
  listReviews(productId: string): Promise<Review[]>
  relatedProducts(product: Product, limit?: number): Promise<Product[]>
  searchSuggestions(term: string, limit?: number): Promise<Product[]>
}

export interface DealRepository {
  listActiveDeals(): Promise<Deal[]>
  getDeal(id: string): Promise<Deal | null>
}

export interface OrderRepository {
  placeOrder(input: { lines: CartLine[]; draft: CheckoutDraft }): Promise<Order>
  getOrder(reference: string): Promise<Order | null>
}

export interface DataClient {
  catalog: CatalogRepository
  deals: DealRepository
  orders: OrderRepository
}
