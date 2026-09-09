// Deno Edge Function. Deploy with: supabase functions deploy checkout
//
// This is the only code path allowed to write a row into `orders`. It never
// trusts a price or total that came from the browser — every kobo here is
// re-read from the live `products` / `product_variants` tables.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handlePreflight, json } from '../_shared/cors.ts'

// Kept in sync with src/config/site.ts by hand — it's two numbers, not worth
// a cross-runtime import between the Vite app and Deno functions.
const FREE_DELIVERY_THRESHOLD_KOBO = 3_000_000
const FLAT_DELIVERY_KOBO = 150_000

interface CartLineIn {
  productId: string
  variantId: string | null
  quantity: number
}

interface DraftIn {
  address: {
    fullName: string
    email?: string
    phone: string
    altPhone?: string
    city: string
    state: string
    street: string
    landmark?: string
  }
  paymentMethod: 'paystack' | 'pay_on_delivery'
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
  const admin = createClient(supabaseUrl, serviceKey)

  // Identify the caller if signed in — guest checkout stays allowed, the
  // order's customer_id is just null in that case.
  let customerId: string | null = null
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const { data } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    customerId = data.user?.id ?? null
  }

  let body: { lines: CartLineIn[]; draft: DraftIn; origin?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { lines, draft } = body
  if (!Array.isArray(lines) || lines.length === 0) return json({ error: 'Cart is empty' }, 400)
  if (!draft?.address?.phone || !draft?.address?.fullName) return json({ error: 'Missing delivery address' }, 400)
  if (draft.paymentMethod === 'paystack' && !draft.address.email) {
    return json({ error: 'Email is required to pay with Paystack' }, 400)
  }

  // ── Re-price from the live tables. This is the whole point of this function. ──
  const productIds = [...new Set(lines.map((l) => l.productId))]
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, name, price_kobo, stock, active, pay_on_delivery, product_variants(*)')
    .in('id', productIds)
  if (productsError) return json({ error: productsError.message }, 500)

  const productById = new Map((products ?? []).map((p) => [p.id, p]))
  const orderItems: {
    product_id: string
    variant_id: string | null
    name_snapshot: string
    unit_price_kobo: number
    quantity: number
  }[] = []
  const stockOk: { productId: string; variantId: string | null; delta: number }[] = []

  for (const line of lines) {
    const product = productById.get(line.productId)
    if (!product || !product.active) {
      return json({ error: `"${line.productId}" is no longer available` }, 409)
    }
    if (draft.paymentMethod === 'pay_on_delivery' && !product.pay_on_delivery) {
      return json({ error: `${product.name} is not available for pay on delivery` }, 409)
    }
    let unitPriceKobo = product.price_kobo
    let availableStock = product.stock
    let variantId: string | null = null
    if (line.variantId) {
      const variant = (product.product_variants ?? []).find((v: any) => v.id === line.variantId)
      if (!variant) return json({ error: `Variant not found for ${product.name}` }, 409)
      unitPriceKobo = variant.price_kobo
      availableStock = variant.stock
      variantId = variant.id
    }
    if (availableStock < line.quantity) {
      return json({ error: `Only ${availableStock} left of ${product.name}` }, 409)
    }
    orderItems.push({
      product_id: product.id,
      variant_id: variantId,
      name_snapshot: product.name,
      unit_price_kobo: unitPriceKobo,
      quantity: line.quantity,
    })
    stockOk.push({ productId: product.id, variantId, delta: -line.quantity })
  }

  const subtotalKobo = orderItems.reduce((sum, it) => sum + it.unit_price_kobo * it.quantity, 0)
  const deliveryKobo = subtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO ? 0 : FLAT_DELIVERY_KOBO
  const totalKobo = subtotalKobo + deliveryKobo
  const reference = `TCH-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  const now = new Date()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      reference,
      customer_id: customerId,
      status: draft.paymentMethod === 'pay_on_delivery' ? 'confirmed' : 'pending_payment',
      payment_method: draft.paymentMethod,
      subtotal_kobo: subtotalKobo,
      delivery_kobo: deliveryKobo,
      discount_kobo: 0,
      total_kobo: totalKobo,
      full_name: draft.address.fullName,
      phone: draft.address.phone,
      alt_phone: draft.address.altPhone ?? null,
      street: draft.address.street,
      city: draft.address.city,
      state: draft.address.state,
      landmark: draft.address.landmark ?? null,
      estimated_from: new Date(+now + 2 * 86400000).toISOString(),
      estimated_to: new Date(+now + 5 * 86400000).toISOString(),
    })
    .select('*')
    .single()

  if (orderError || !order) return json({ error: orderError?.message ?? 'Could not create order' }, 500)

  await admin.from('order_items').insert(orderItems.map((it) => ({ ...it, order_id: order.id })))

  // Pay on delivery is "sold" the moment the order is placed — nothing else
  // will ever confirm it, unlike Paystack's webhook.
  if (draft.paymentMethod === 'pay_on_delivery') {
    await admin.from('inventory_movements').insert(
      stockOk.map((s) => ({
        product_id: s.productId,
        variant_id: s.variantId,
        delta: s.delta,
        reason: 'sale',
        order_id: order.id,
      })),
    )
    const { data: full } = await admin.from('orders').select('*, order_items(*)').eq('id', order.id).single()
    return json({ order: full ?? order })
  }

  // ── Paystack ──
  if (!paystackSecret) {
    return json({ error: 'Paystack is not configured on the server yet (PAYSTACK_SECRET_KEY secret missing)' }, 500)
  }
  const origin = body.origin || Deno.env.get('PUBLIC_SITE_URL') || ''
  const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: draft.address.email,
      amount: totalKobo, // Paystack NGN amounts are in kobo — matches our convention exactly
      reference,
      callback_url: origin ? `${origin}/order/${reference}` : undefined,
      metadata: { order_id: order.id, reference },
    }),
  })
  const initJson = await initRes.json()
  if (!initRes.ok || !initJson.status) {
    // Don't leave an orphaned pending order behind if Paystack itself rejected the request.
    await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return json({ error: initJson.message ?? 'Could not start the Paystack transaction' }, 502)
  }

  await admin.from('orders').update({ paystack_reference: reference }).eq('id', order.id)
  const { data: full } = await admin.from('orders').select('*, order_items(*)').eq('id', order.id).single()
  return json({ order: full ?? order, authorization_url: initJson.data.authorization_url })
})
