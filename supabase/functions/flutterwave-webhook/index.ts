// Deno Edge Function. Deploy with: supabase functions deploy flutterwave-webhook
// Then set the resulting URL as the webhook URL in the Flutterwave dashboard
// (Settings → Webhooks), and put the same string you set there as the
// "Secret Hash" into the FLUTTERWAVE_SECRET_HASH secret below. Flutterwave's
// webhook auth isn't an HMAC of the body like Paystack's — it's a static
// shared secret that must come back unchanged in the `verif-hash` header.
//
// This is the ONLY thing allowed to mark an order paid. The client-side
// redirect after checkout is for the customer's benefit — it is never
// trusted to confirm payment, because a browser can be closed, spoofed, or
// simply lie. On top of the header check, we also re-fetch the transaction
// from Flutterwave's own API before trusting it, since a static shared
// secret is weaker than an HMAC signature and is worth double-checking.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const expectedHash = Deno.env.get('FLUTTERWAVE_SECRET_HASH')
  const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
  const signature = req.headers.get('verif-hash')

  if (!expectedHash || !secretKey || !signature || !timingSafeEqual(signature, expectedHash)) {
    return json({ error: 'Invalid signature' }, 401)
  }

  const event = JSON.parse(await req.text())
  if (event.event !== 'charge.completed' || event.data?.status !== 'successful') {
    return json({ received: true })
  }

  const reference: string = event.data?.tx_ref
  const transactionId = event.data?.id
  if (!reference || !transactionId) return json({ received: true })

  // Don't trust the webhook body alone — re-verify server-to-server against
  // Flutterwave's own API before paying out, the same way the checkout
  // function never trusts a price from the browser.
  const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const verifyJson = await verifyRes.json()
  const tx = verifyJson?.data
  if (
    !verifyRes.ok ||
    verifyJson.status !== 'success' ||
    tx?.status !== 'successful' ||
    tx?.tx_ref !== reference ||
    tx?.currency !== 'NGN'
  ) {
    return json({ received: true })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: order } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .or(`reference.eq.${reference},flutterwave_reference.eq.${reference}`)
    .maybeSingle()

  if (!order) return json({ received: true }) // unknown reference — ack anyway, nothing to do
  if (order.paid_at) return json({ received: true }) // already processed — idempotent

  // The amount Flutterwave actually settled (in naira) must match what we
  // charged for (in kobo), within a 1-kobo rounding tolerance.
  const settledKobo = Math.round(tx.amount * 100)
  if (Math.abs(settledKobo - order.total_kobo) > 1) return json({ received: true })

  await admin
    .from('orders')
    .update({ status: 'confirmed', paid_at: new Date().toISOString() })
    .eq('id', order.id)

  const items = order.order_items ?? []
  if (items.length) {
    await admin.from('inventory_movements').insert(
      items.map((it: any) => ({
        product_id: it.product_id,
        variant_id: it.variant_id,
        delta: -it.quantity,
        reason: 'sale',
        order_id: order.id,
      })),
    )
  }

  return json({ received: true })
})
