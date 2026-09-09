import type { Deal, Review } from '@/types/catalog'
import { productBySlug } from './products'

/** Slugs are stable; positional ids are not. Resolve by slug and drop misses. */
const ids = (...slugs: string[]) =>
  slugs.map((s) => productBySlug.get(s)?.id).filter((id): id is string => Boolean(id))

/**
 * Deals are time-boxed and generated relative to "now" so the countdowns are
 * always live in demo. In production these are rows the admin creates with
 * explicit start/end timestamps.
 */
const now = Date.now()
const hours = (n: number) => new Date(now + n * 3600_000).toISOString()
const daysAgo = (n: number) => new Date(now - n * 86400_000).toISOString()

export const deals: Deal[] = [
  {
    id: 'deal_day',
    kind: 'day',
    title: 'Deal of the Day',
    subtitle: 'Ends at midnight. Restocked at full price tomorrow.',
    productIds: ids(
      'casio-fx-82ms-scientific-calculator',
      'a4-hardcover-exercise-books-10-pack-80-leaves',
      'complete-stationery-starter-kit-32-pieces',
      'stainless-steel-lunch-flask-700ml',
      'rechargeable-led-study-lamp-with-power-bank',
      'bic-ballpoint-pens-box-of-50-blue',
    ),
    startsAt: hours(-6),
    endsAt: hours(9),
    headlineDiscount: 55,
    active: true,
  },
  {
    id: 'deal_week',
    kind: 'week',
    title: 'Deal of the Week — Resumption Bundle',
    subtitle: 'Bag, books, lunch flask and calculator. One order, one delivery.',
    productIds: ids(
      'tancha-classic-24l-school-backpack',
      'a4-hardcover-exercise-books-10-pack-80-leaves',
      'stainless-steel-lunch-flask-700ml',
      'casio-fx-991ex-scientific-calculator',
      'mathematical-set-with-compass-protractor',
      'insulated-water-bottle-750ml',
    ),
    startsAt: hours(-48),
    endsAt: hours(96),
    headlineDiscount: 48,
    active: true,
  },
  {
    id: 'deal_bundle',
    kind: 'bundle',
    title: 'Boarding House Checklist',
    subtitle: 'Everything the boarding list asks for, priced as one run.',
    productIds: ids(
      'canvas-sports-boarding-duffel-45l',
      'black-leather-school-shoes-boys',
      'white-school-shirts-3-pack',
      'white-ankle-school-socks-10-pairs',
      '20-000mah-power-bank-with-digital-display',
      'solar-rechargeable-reading-light',
    ),
    startsAt: hours(-24),
    endsAt: hours(168),
    headlineDiscount: 42,
    active: true,
  },
]

const NAMES = [
  'Chinedu O.', 'Aisha B.', 'Tolu A.', 'Ngozi E.', 'Emeka N.', 'Fatima S.',
  'Bola A.', 'Ifeanyi U.', 'Zainab M.', 'Segun T.', 'Amaka I.', 'Yusuf K.',
]
const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City']
const BODIES = [
  'Delivered in 3 days to Surulere. Exactly what was in the pictures.',
  'Bought two for my children. Quality is better than what I get at the market for the same money.',
  'Paid on delivery, no wahala. The rider even waited while I checked the box.',
  'Second time ordering. Still holding up after a full term.',
  'Price is genuinely lower than the shops in Computer Village. I checked.',
  'Packaging was solid, nothing damaged. Will order again before next term.',
  'My son has used it every day since August. No complaints so far.',
  'Customer service answered on WhatsApp within minutes when I asked about sizing.',
  'Ordered Friday, arrived Monday in Abuja. Fair.',
  'The quality surprised me for this price. Ordering the bundle next.',
]

export function reviewsFor(productId: string, count: number): Review[] {
  const n = Math.min(count, 6)
  const seed = productId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Array.from({ length: n }, (_, i) => {
    const k = (seed + i * 7) % NAMES.length
    return {
      id: `${productId}_rev_${i}`,
      productId,
      author: NAMES[k],
      city: CITIES[(seed + i * 3) % CITIES.length],
      rating: i % 6 === 0 ? 4 : 5,
      body: BODIES[(seed + i * 5) % BODIES.length],
      createdAt: daysAgo(3 + i * 9),
      verifiedPurchase: i % 4 !== 3,
    }
  })
}
