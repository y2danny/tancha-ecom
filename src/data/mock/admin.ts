import type { AdminRepository, InventoryAdjustment, InventoryMovementRecord, NewDealInput, NewProductInput } from '@/types/admin'
import type { Product, ProductVariant, Deal } from '@/types/catalog'
import { slugify } from '@/lib/format'
import { products, productById, productBySlug } from './products'
import { deals } from './deals'
import * as orderStore from './orderStore'
import * as teamStore from './teamStore'

const wait = <T,>(v: T, ms = 250) => new Promise<T>((resolve) => setTimeout(() => resolve(v), ms))

const MOVEMENTS_KEY = 'tancha.movements.v1'
function readMovements(): InventoryMovementRecord[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY)
    return raw ? (JSON.parse(raw) as InventoryMovementRecord[]) : []
  } catch {
    return []
  }
}
function pushMovement(record: InventoryMovementRecord) {
  try {
    const all = [record, ...readMovements()].slice(0, 300)
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

let productCounter = products.length

function variantsFrom(input: NewProductInput['variants'], productId: string): ProductVariant[] {
  return input.map((v, i) => ({
    id: v.id ?? `${productId}_v${i + 1}`,
    label: v.label,
    optionName: v.optionName,
    priceKobo: v.priceKobo,
    stock: v.stock,
    sku: v.sku,
  }))
}

export const mockAdmin: AdminRepository = {
  async listAllProducts() {
    return wait([...products])
  },

  async createProduct(input) {
    productCounter += 1
    const id = `prd_admin_${productCounter}`
    const slug = input.slug || slugify(input.name)
    const product: Product = {
      id,
      slug,
      name: input.name,
      hook: input.hook,
      description: input.description,
      bullets: input.bullets,
      brand: input.brand,
      categoryId: input.categoryId,
      imageKey: input.imageKey,
      imageUrl: input.imageUrl ?? null,
      gallery: input.gallery ?? [],
      priceKobo: input.priceKobo,
      compareAtKobo: input.compareAtKobo,
      stock: input.stock,
      variants: variantsFrom(input.variants, id),
      rating: 0,
      reviewCount: 0,
      unitsSold: 0,
      tags: input.tags,
      deliveryDaysMin: input.deliveryDaysMin,
      deliveryDaysMax: input.deliveryDaysMax,
      payOnDelivery: input.payOnDelivery,
      createdAt: new Date().toISOString(),
      active: input.active,
    }
    products.push(product)
    productById.set(product.id, product)
    productBySlug.set(product.slug, product)
    return wait(product)
  },

  async updateProduct(id, patch) {
    const product = productById.get(id)
    if (!product) throw new Error('Product not found')
    if (patch.slug && patch.slug !== product.slug) productBySlug.delete(product.slug)
    Object.assign(product, {
      ...(patch.slug !== undefined && { slug: patch.slug }),
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.hook !== undefined && { hook: patch.hook }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.bullets !== undefined && { bullets: patch.bullets }),
      ...(patch.brand !== undefined && { brand: patch.brand }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.imageKey !== undefined && { imageKey: patch.imageKey }),
      ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
      ...(patch.gallery !== undefined && { gallery: patch.gallery }),
      ...(patch.priceKobo !== undefined && { priceKobo: patch.priceKobo }),
      ...(patch.compareAtKobo !== undefined && { compareAtKobo: patch.compareAtKobo }),
      ...(patch.stock !== undefined && { stock: patch.stock }),
      ...(patch.tags !== undefined && { tags: patch.tags }),
      ...(patch.deliveryDaysMin !== undefined && { deliveryDaysMin: patch.deliveryDaysMin }),
      ...(patch.deliveryDaysMax !== undefined && { deliveryDaysMax: patch.deliveryDaysMax }),
      ...(patch.payOnDelivery !== undefined && { payOnDelivery: patch.payOnDelivery }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.variants !== undefined && { variants: variantsFrom(patch.variants, product.id) }),
    })
    productBySlug.set(product.slug, product)
    return wait(product)
  },

  async setProductActive(id, active) {
    const product = productById.get(id)
    if (product) product.active = active
    await wait(undefined, 120)
  },

  async deleteProduct(id) {
    const product = productById.get(id)
    if (!product) return
    // Mirrors the real "on delete restrict" on order_items.product_id —
    // a product that's ever been ordered keeps its history intact.
    const everOrdered = orderStore.listOrders().some((o) => o.lines.some((l) => l.productId === id))
    if (everOrdered) {
      throw new Error('This product has order history and can’t be deleted — use Hide instead.')
    }
    const index = products.findIndex((p) => p.id === id)
    if (index !== -1) products.splice(index, 1)
    productById.delete(id)
    productBySlug.delete(product.slug)
    await wait(undefined, 150)
  },

  async adjustInventory(input: InventoryAdjustment) {
    const product = productById.get(input.productId)
    if (!product) throw new Error('Product not found')
    if (input.variantId) {
      const variant = product.variants.find((v) => v.id === input.variantId)
      if (variant) variant.stock = Math.max(0, variant.stock + input.delta)
    }
    product.stock = Math.max(0, product.stock + input.delta)
    pushMovement({
      id: `mv_${Date.now().toString(36)}`,
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.delta,
      reason: input.reason,
      note: input.note,
      productName: product.name,
      createdAt: new Date().toISOString(),
      actorName: 'You',
    })
    await wait(undefined, 150)
  },

  async listMovements(limit = 50) {
    return wait(readMovements().slice(0, limit))
  },

  async listAllDeals() {
    return wait([...deals])
  },

  async createDeal(input: NewDealInput) {
    const deal: Deal = {
      id: `deal_${Date.now().toString(36)}`,
      kind: input.kind,
      title: input.title,
      subtitle: input.subtitle,
      productIds: input.productIds,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      headlineDiscount: input.headlineDiscount,
      active: input.active,
    }
    deals.push(deal)
    return wait(deal)
  },

  async updateDeal(id, patch) {
    const deal = deals.find((d) => d.id === id)
    if (!deal) throw new Error('Deal not found')
    Object.assign(deal, patch)
    return wait(deal)
  },

  async listAllOrders(filter) {
    return wait(orderStore.listOrders(filter))
  },

  async updateOrderStatus(reference, status) {
    const order = orderStore.updateOrderStatus(reference, status)
    if (!order) throw new Error('Order not found')
    return wait(order, 200)
  },

  async listTeam() {
    return wait(teamStore.listTeam())
  },

  async inviteTeamMember(email, fullName, role) {
    return wait(teamStore.inviteTeamMember(email, fullName, role), 300)
  },

  async setTeamRole(userId, role) {
    teamStore.setTeamRole(userId, role)
    await wait(undefined, 150)
  },
}
