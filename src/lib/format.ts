/**
 * Money is stored in kobo (integer) everywhere in the domain layer.
 * Floats and currency do not mix — this is the one rule that saves an
 * accounting nightmare once real Paystack settlements start landing.
 */

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const nairaWithKoboFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatNaira(kobo: number, opts?: { showKobo?: boolean }) {
  const naira = kobo / 100
  if (opts?.showKobo && naira % 1 !== 0) {
    return nairaWithKoboFormatter.format(naira)
  }
  return nairaFormatter.format(naira)
}

export function naira(amount: number) {
  return Math.round(amount * 100)
}

export function discountPercent(priceKobo: number, compareAtKobo?: number | null) {
  if (!compareAtKobo || compareAtKobo <= priceKobo) return 0
  return Math.round(((compareAtKobo - priceKobo) / compareAtKobo) * 100)
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat('en-NG', { notation: 'compact' }).format(value)
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

/** "2–5" for a real range, or just "14" when a product's min and max
 *  delivery days are the same — avoids showing a silly "14–14 days". */
export function formatDayRange(min: number, max: number) {
  return min === max ? `${min}` : `${min}–${max}`
}

export function formatDeliveryWindow(from: string, to: string) {
  const f = new Date(from)
  const t = new Date(to)
  const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' })
  return `${day.format(f)} — ${day.format(t)}`
}

export type CountdownParts = {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

export function countdownTo(target: string | Date, now: number = Date.now()): CountdownParts {
  const end = typeof target === 'string' ? new Date(target).getTime() : target.getTime()
  const diff = end - now
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const seconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    expired: false,
  }
}

export function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Nigerian numbers arrive as 0803..., +234803..., 234803... — normalise for wa.me */
export function toWhatsAppNumber(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  return digits
}
