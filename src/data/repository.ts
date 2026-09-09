import type {
  Category,
  Deal,
  Paginated,
  Product,
  ProductQuery,
  Review,
} from '@/types/catalog'
import type { Order, CheckoutDraft, CartLine } from '@/types/commerce'
import type { AdminRepository } from '@/types/admin'

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
  /**
   * Client-side call only. The mock client creates the order directly; the
   * Supabase client posts to the `/checkout` Edge Function, which re-prices
   * the cart from the live product table and is the only thing ever allowed
   * to write a row into `orders`.
   */
  placeOrder(input: {
    lines: CartLine[]
    draft: CheckoutDraft
  }): Promise<{ order: Order; authorizationUrl?: string }>
  getOrder(reference: string): Promise<Order | null>
}

export interface DataClient {
  catalog: CatalogRepository
  deals: DealRepository
  orders: OrderRepository
  admin: AdminRepository
}

export type { AdminRepository } from '@/types/admin'
