/**
 * Catalog domain. These types are the contract between the UI and whatever
 * is behind the repository — mock data today, Supabase tomorrow. Column names
 * are snake_case-convertible on purpose so the Supabase mapping stays boring.
 */

export type ImageKey =
  | 'backpack'
  | 'notebook'
  | 'calculator'
  | 'earbuds'
  | 'powerbank'
  | 'lunchbox'
  | 'shoes'
  | 'uniform'
  | 'trousers'
  | 'skirt'
  | 'sweater'
  | 'pens'
  | 'bottle'
  | 'tablet'
  | 'lamp'
  | 'sportsbag'
  | 'geometry'
  | 'socks'
  | 'crayons'

export interface Category {
  id: string
  slug: string
  name: string
  imageKey: ImageKey
  /** null for top-level; category tree stays one table in Postgres */
  parentId: string | null
  productCount: number
  featured: boolean
}

export interface ProductVariant {
  id: string
  label: string
  /** e.g. "Size", "Colour" — grouped in the UI */
  optionName: string
  priceKobo: number
  stock: number
  sku: string
}

export interface Product {
  id: string
  slug: string
  name: string
  /** Short marketing line shown under the title on the PDP */
  hook: string
  description: string
  bullets: string[]
  brand: string
  categoryId: string
  imageKey: ImageKey
  /** Real photography drops in here later — SVG illustration is the fallback */
  imageUrl?: string | null
  /** Extra photos shown as thumbnails on the product page, beyond `imageUrl`. */
  gallery: string[]
  priceKobo: number
  compareAtKobo: number | null
  stock: number
  variants: ProductVariant[]
  rating: number
  reviewCount: number
  unitsSold: number
  tags: ProductTag[]
  /** Fulfilment promise shown as "Delivered in N–M days" */
  deliveryDaysMin: number
  deliveryDaysMax: number
  payOnDelivery: boolean
  createdAt: string
  active: boolean
}

export type ProductTag =
  | 'back-to-school'
  | 'bestseller'
  | 'new'
  | 'clearance'
  | 'bulk-discount'
  | 'official-store'

export type DealKind = 'day' | 'week' | 'bundle'

export interface Deal {
  id: string
  kind: DealKind
  title: string
  /** High-toned marketing subline — this is the copy engine of the homepage */
  subtitle: string
  productIds: string[]
  startsAt: string
  endsAt: string
  /** Percentage taken off the compare-at price, for display copy */
  headlineDiscount: number
  active: boolean
}

export interface Review {
  id: string
  productId: string
  author: string
  city: string
  rating: number
  body: string
  createdAt: string
  verifiedPurchase: boolean
}

export interface ProductQuery {
  categorySlug?: string
  search?: string
  tags?: ProductTag[]
  minPriceKobo?: number
  maxPriceKobo?: number
  minRating?: number
  inStockOnly?: boolean
  payOnDeliveryOnly?: boolean
  sort?: ProductSort
  page?: number
  perPage?: number
}

export type ProductSort =
  | 'relevance'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'bestselling'
  | 'discount'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  pageCount: number
}
