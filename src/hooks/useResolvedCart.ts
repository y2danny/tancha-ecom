import { useMemo } from 'react'
import { db } from '@/data'
import { useCart } from '@/store/cart'
import { useAsync } from './useAsync'
import { site } from '@/config/site'
import type { CartTotals, ResolvedCartLine } from '@/types/commerce'

const DELIVERY_FLAT_KOBO = 150_000 // ₦1,500 — a settings row once admin is live

export function useResolvedCart() {
  const { lines } = useCart()
  const ids = useMemo(() => [...new Set(lines.map((l) => l.productId))], [lines])
  const { data: products, loading } = useAsync(
    () => db.catalog.getProductsByIds(ids),
    [ids.join(',')],
    [],
  )

  const resolved: ResolvedCartLine[] = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]))
    return lines.flatMap((line) => {
      const product = byId.get(line.productId)
      if (!product) return []
      const variant = product.variants.find((v) => v.id === line.variantId) ?? null
      return [{ ...line, product, variant, lineTotalKobo: line.unitPriceKobo * line.quantity }]
    })
  }, [lines, products])

  const totals: CartTotals = useMemo(() => {
    const subtotalKobo = resolved.reduce((sum, l) => sum + l.lineTotalKobo, 0)
    const itemCount = resolved.reduce((sum, l) => sum + l.quantity, 0)
    const freeDeliveryUnlocked = subtotalKobo >= site.freeDeliveryThresholdKobo
    return {
      subtotalKobo,
      deliveryKobo: itemCount === 0 || freeDeliveryUnlocked ? 0 : DELIVERY_FLAT_KOBO,
      discountKobo: 0,
      totalKobo:
        subtotalKobo + (itemCount === 0 || freeDeliveryUnlocked ? 0 : DELIVERY_FLAT_KOBO),
      itemCount,
      freeDeliveryUnlocked,
      koboToFreeDelivery: Math.max(0, site.freeDeliveryThresholdKobo - subtotalKobo),
    }
  }, [resolved])

  return { lines: resolved, totals, loading }
}
