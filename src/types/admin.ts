import type { ImageKey, ProductTag, DealKind } from './catalog'
import type { OrderStatus } from './commerce'
import type { Role } from './identity'

/**
 * Shapes the admin console writes. Kept separate from the read-side domain
 * types (catalog.ts / commerce.ts) because a create/update payload is never
 * identical to the row it produces — ids, computed fields and audit columns
 * are the backend's job, not the form's.
 */

export interface ProductVariantInput {
  id?: string
  label: string
  optionName: string
  priceKobo: number
  stock: number
  sku: string
}

export interface NewProductInput {
  slug: string
  name: string
  hook: string
  description: string
  bullets: string[]
  brand: string
  categoryId: string
  imageKey: ImageKey
  /** Real product photo, uploaded to the `product-images` storage bucket.
   *  Falls back to the ImageKey illustration when unset — see ProductImage. */
  imageUrl?: string | null
  /** Extra photos, same bucket — thumbnails on the product page. */
  gallery: string[]
  priceKobo: number
  compareAtKobo: number | null
  stock: number
  tags: ProductTag[]
  deliveryDaysMin: number
  deliveryDaysMax: number
  payOnDelivery: boolean
  active: boolean
  variants: ProductVariantInput[]
}

export interface InventoryAdjustment {
  productId: string
  variantId?: string | null
  delta: number
  reason: 'restock' | 'damage' | 'correction' | 'sale'
  note?: string
}

export interface InventoryMovementRecord extends InventoryAdjustment {
  id: string
  productName: string
  createdAt: string
  actorName: string
}

export interface NewDealInput {
  kind: DealKind
  title: string
  subtitle: string
  productIds: string[]
  startsAt: string
  endsAt: string
  headlineDiscount: number
  active: boolean
}

export interface TeamMember {
  id: string
  email: string
  fullName: string
  role: Role
  createdAt: string
}

export interface AdminRepository {
  // Products
  listAllProducts(): Promise<import('./catalog').Product[]>
  createProduct(input: NewProductInput): Promise<import('./catalog').Product>
  updateProduct(id: string, patch: Partial<NewProductInput>): Promise<import('./catalog').Product>
  setProductActive(id: string, active: boolean): Promise<void>
  /** Hard delete. Rejects if the product has ever been ordered — order
   *  history must stay intact, so hide it with setProductActive instead. */
  deleteProduct(id: string): Promise<void>

  // Inventory
  adjustInventory(input: InventoryAdjustment): Promise<void>
  listMovements(limit?: number): Promise<InventoryMovementRecord[]>

  // Deals
  listAllDeals(): Promise<import('./catalog').Deal[]>
  createDeal(input: NewDealInput): Promise<import('./catalog').Deal>
  updateDeal(id: string, patch: Partial<NewDealInput>): Promise<import('./catalog').Deal>

  // Orders
  listAllOrders(filter?: { status?: OrderStatus }): Promise<import('./commerce').Order[]>
  updateOrderStatus(reference: string, status: OrderStatus, note?: string): Promise<import('./commerce').Order>

  // Team (owner only, enforced again server-side by RLS)
  listTeam(): Promise<TeamMember[]>
  inviteTeamMember(email: string, fullName: string, role: Role): Promise<TeamMember>
  setTeamRole(userId: string, role: Role): Promise<void>
}
