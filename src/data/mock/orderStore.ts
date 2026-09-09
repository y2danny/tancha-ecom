import type { Order, OrderStatus } from '@/types/commerce'

/**
 * Orders live in localStorage in mock mode so the admin console has
 * something real to list across a page reload, without standing up a
 * backend just to demo the pipeline. `src/data/supabase/dataClient.ts`
 * replaces this whole file with actual `orders` table reads.
 */
const KEY = 'tancha.orders.v2'

function readAll(): Order[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Order[]
  } catch {
    /* ignore */
  }
  return []
}

function writeAll(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders))
  } catch {
    /* private mode — demo data just won't survive a refresh */
  }
}

export function saveOrder(order: Order) {
  const all = readAll()
  all.unshift(order)
  writeAll(all.slice(0, 200))
}

export function getOrder(reference: string): Order | null {
  return readAll().find((o) => o.reference === reference) ?? null
}

export function listOrders(filter?: { status?: OrderStatus }): Order[] {
  let all = readAll()
  if (all.length === 0) {
    seedIfEmpty(all)
    all = readAll()
  }
  const list = filter?.status ? all.filter((o) => o.status === filter.status) : all
  return [...list].sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
}

export function updateOrderStatus(reference: string, status: OrderStatus): Order | null {
  const all = readAll()
  const idx = all.findIndex((o) => o.reference === reference)
  if (idx === -1) return null
  all[idx] = { ...all[idx], status }
  writeAll(all)
  return all[idx]
}

/** So a fresh admin login isn't staring at an empty Orders table. */
function seedIfEmpty(all: Order[]) {
  if (all.length > 0) return
  const now = Date.now()
  const demo: Order[] = [
    {
      id: 'ord_demo_1',
      reference: 'TCH-DEM01',
      status: 'delivered',
      lines: [],
      totals: { subtotalKobo: 1845000, deliveryKobo: 0, discountKobo: 0, totalKobo: 1845000, itemCount: 3, freeDeliveryUnlocked: true, koboToFreeDelivery: 0 },
      address: { fullName: 'Chinedu Okafor', phone: '08031234567', city: 'Ikeja', state: 'Lagos', street: '14 Adeniyi Jones Avenue' },
      paymentMethod: 'paystack',
      placedAt: new Date(now - 6 * 86400000).toISOString(),
      estimatedFrom: new Date(now - 4 * 86400000).toISOString(),
      estimatedTo: new Date(now - 1 * 86400000).toISOString(),
      customerId: null,
    },
    {
      id: 'ord_demo_2',
      reference: 'TCH-DEM02',
      status: 'in_transit',
      lines: [],
      totals: { subtotalKobo: 920000, deliveryKobo: 150000, discountKobo: 0, totalKobo: 1070000, itemCount: 1, freeDeliveryUnlocked: false, koboToFreeDelivery: 0 },
      address: { fullName: 'Fatima Bello', phone: '08123456789', city: 'Wuse', state: 'FCT — Abuja', street: '22 Aminu Kano Crescent' },
      paymentMethod: 'pay_on_delivery',
      placedAt: new Date(now - 1 * 86400000).toISOString(),
      estimatedFrom: new Date(now).toISOString(),
      estimatedTo: new Date(now + 2 * 86400000).toISOString(),
      customerId: null,
    },
    {
      id: 'ord_demo_3',
      reference: 'TCH-DEM03',
      status: 'pending_payment',
      lines: [],
      totals: { subtotalKobo: 452000, deliveryKobo: 150000, discountKobo: 0, totalKobo: 602000, itemCount: 2, freeDeliveryUnlocked: false, koboToFreeDelivery: 0 },
      address: { fullName: 'Tolu Adebayo', phone: '09012345678', city: 'Yaba', state: 'Lagos', street: '5 Herbert Macaulay Way' },
      paymentMethod: 'paystack',
      placedAt: new Date(now - 3 * 3600000).toISOString(),
      estimatedFrom: new Date(now + 1 * 86400000).toISOString(),
      estimatedTo: new Date(now + 4 * 86400000).toISOString(),
      customerId: null,
    },
  ]
  writeAll(demo)
}
