// Deno Edge Function. Deploy with: supabase functions deploy paystack-webhook --no-verify-jwt
// Then set the resulting URL as the webhook URL in the Paystack dashboard
// (Settings → API Keys & Webhooks).
//
// This is the ONLY thing allowed to mark an order paid. The client-side
// redirect after checkout is for the customer's benefit — it is never
// trusted to confirm payment, because a browser can be closed, spoofed, or
// simply lie.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'

async function verifySignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
  const signature = req.headers.get('x-paystack-signature')
  const rawBody = await req.text()

  if (!secret || !signature || !(await verifySignature(rawBody, signature, secret))) {
    return json({ error: 'Invalid signature' }, 401)
  }

  const event = JSON.parse(rawBody)
  if (event.event !== 'charge.success') return json({ received: true })

  const reference: string = event.data?.reference
  if (!reference) return json({ received: true })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: order } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .or(`reference.eq.${reference},paystack_reference.eq.${reference}`)
    .maybeSingle()

  if (!order) return json({ received: true }) // unknown reference — ack anyway, nothing to do
  if (order.paid_at) return json({ received: true }) // already processed — idempotent

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
