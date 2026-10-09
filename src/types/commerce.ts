import type { Product, ProductVariant } from './catalog'

export type PaymentMethod = 'flutterwave' | 'pay_on_delivery'

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'packed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export interface CartLine {
  productId: string
  variantId: string | null
  quantity: number
  /** Snapshot of price at add-to-cart time — carts must not silently reprice */
  unitPriceKobo: number
}

export interface ResolvedCartLine extends CartLine {
  product: Product
  variant: ProductVariant | null
  lineTotalKobo: number
}

export interface CartTotals {
  subtotalKobo: number
  deliveryKobo: number
  discountKobo: number
  totalKobo: number
  itemCount: number
  freeDeliveryUnlocked: boolean
  koboToFreeDelivery: number
}

export interface DeliveryAddress {
  fullName: string
  /** Required to pay by Flutterwave — it needs somewhere to send the receipt. */
  email?: string
  phone: string
  altPhone?: string
  city: string
  state: string
  street: string
  landmark?: string
}

/** One line of a placed order, as snapshotted at checkout — what to pack. */
export interface OrderItem {
  productId: string
  variantId: string | null
  name: string
  /** e.g. "Size: EU 36". Null for products without variants. */
  variantLabel: string | null
  quantity: number
  unitPriceKobo: number
}

export interface Order {
  id: string
  reference: string
  status: OrderStatus
  lines: CartLine[]
  items: OrderItem[]
  /** When the payment was confirmed. Null for unpaid and pay-on-delivery orders. */
  paidAt?: string | null
  totals: CartTotals
  address: DeliveryAddress
  paymentMethod: PaymentMethod
  placedAt: string
  estimatedFrom: string
  estimatedTo: string
  customerId: string | null
}

export interface CheckoutDraft {
  address: DeliveryAddress
  paymentMethod: PaymentMethod
  note?: string
}
