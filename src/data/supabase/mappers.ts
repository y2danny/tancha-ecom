/**
 * Supabase rows are snake_case and flat; the domain types are camelCase and
 * sometimes nested (variants on a product, lines on an order). Every mapper
 * here is the single place that boundary gets crossed — if a column is
 * renamed in `schema.sql`, this is the only file that needs to know.
 */
import type { Category, Deal, ImageKey, Product, ProductVariant, Review } from '@/types/catalog'
import type { DeliveryAddress, Order, OrderStatus, PaymentMethod } from '@/types/commerce'
import type { TeamMember } from '@/types/admin'
import type { Role } from '@/types/identity'

export function mapCategory(row: any, productCount = 0): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageKey: row.image_key as ImageKey,
    parentId: row.parent_id,
    productCount,
    featured: row.featured,
  }
}

export function mapVariant(row: any): ProductVariant {
  return {
    id: row.id,
    label: row.label,
    optionName: row.option_name,
    priceKobo: row.price_kobo,
    stock: row.stock,
    sku: row.sku,
  }
}

export function mapProduct(row: any): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    hook: row.hook,
    description: row.description,
    bullets: row.bullets ?? [],
    brand: row.brand,
    categoryId: row.category_id,
    imageKey: row.image_key as ImageKey,
    imageUrl: row.image_url,
    gallery: row.gallery ?? [],
    priceKobo: row.price_kobo,
    compareAtKobo: row.compare_at_kobo,
    stock: row.stock,
    variants: (row.product_variants ?? []).map(mapVariant),
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    unitsSold: row.units_sold ?? 0,
    tags: row.tags ?? [],
    deliveryDaysMin: row.delivery_days_min,
    deliveryDaysMax: row.delivery_days_max,
    payOnDelivery: row.pay_on_delivery,
    createdAt: row.created_at,
    active: row.active,
  }
}

export function mapDeal(row: any): Deal {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    productIds: (row.deal_products ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((dp: any) => dp.product_id),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    headlineDiscount: row.headline_discount,
    active: row.active,
  }
}

export function mapReview(row: any): Review {
  return {
    id: row.id,
    productId: row.product_id,
    author: row.author_name,
    city: row.city ?? '',
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
    verifiedPurchase: row.verified_purchase,
  }
}

export function mapAddress(row: any): DeliveryAddress {
  return {
    fullName: row.full_name,
    phone: row.phone,
    altPhone: row.alt_phone ?? undefined,
    city: row.city,
    state: row.state,
    street: row.street,
    landmark: row.landmark ?? undefined,
  }
}

export function mapOrder(row: any): Order {
  const items = row.order_items ?? []
  return {
    id: row.id,
    reference: row.reference,
    status: row.status as OrderStatus,
    lines: items.map((it: any) => ({
      productId: it.product_id,
      variantId: it.variant_id,
      quantity: it.quantity,
      unitPriceKobo: it.unit_price_kobo,
    })),
    totals: {
      subtotalKobo: row.subtotal_kobo,
      deliveryKobo: row.delivery_kobo,
      discountKobo: row.discount_kobo,
      totalKobo: row.total_kobo,
      itemCount: items.reduce((n: number, it: any) => n + it.quantity, 0),
      freeDeliveryUnlocked: row.delivery_kobo === 0,
      koboToFreeDelivery: 0,
    },
    address: mapAddress(row),
    paymentMethod: row.payment_method as PaymentMethod,
    placedAt: row.placed_at,
    estimatedFrom: row.estimated_from,
    estimatedTo: row.estimated_to,
    customerId: row.customer_id,
  }
}

export function mapTeamMember(row: any): TeamMember {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as Role,
    createdAt: row.created_at,
  }
}
