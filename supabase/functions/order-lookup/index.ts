// Deno Edge Function. Deploy with: supabase functions deploy order-lookup
//
// Guest checkout means most orders have no auth.uid() to match against RLS's
// "customer_id = auth.uid()" policy, so the order confirmation page can't
// read the row directly. The order reference itself is the capability here
// (long, random, shown only to the person who just placed the order) — this
// function trades that for read access to exactly one row, nothing else.
//
// It also backs up the Flutterwave webhook. After paying, Flutterwave sends
// the customer to /order/<reference>?transaction_id=... — if the order is
// still pending, that id is checked against Flutterwave's API (same code the
// webhook uses), so a late or missing webhook can't strand a paid customer on
// "waiting for confirmation". The browser only supplies the id to look up;
// the payment is confirmed by Flutterwave's API, never by the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handlePreflight, json } from '../_shared/cors.ts'
import { confirmFlutterwavePayment } from '../_shared/flutterwave.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { reference?: string; transactionId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.reference) return json({ error: 'Missing reference' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const read = () =>
    admin.from('orders').select('*, order_items(*)').eq('reference', body.reference!).maybeSingle()

  let { data: order } = await read()

  const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
  if (
    order &&
    order.status === 'pending_payment' &&
    order.payment_method === 'flutterwave' &&
    body.transactionId &&
    secretKey
  ) {
    const outcome = await confirmFlutterwavePayment(admin, secretKey, body.transactionId, order.reference)
    console.log(`[order-lookup] ${order.reference} tx ${body.transactionId}: ${outcome}`)
    if (outcome === 'confirmed') ({ data: order } = await read())
  }

  return json({ order: order ?? null })
})
