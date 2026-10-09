// Deno Edge Function. Deploy with: supabase functions deploy order-lookup
//
// Guest checkout means most orders have no auth.uid() to match against RLS's
// "customer_id = auth.uid()" policy, so the order confirmation page can't
// read the row directly. The order reference itself is the capability here
// (long, random, shown only to the person who just placed the order) — this
// function trades that for read access to exactly one row, nothing else.
//
// For an unpaid Flutterwave order it also asks Flutterwave what actually
// happened before answering (see ../_shared/flutterwave.ts), so the order
// moves to "confirmed" or "cancelled" without depending on the webhook
// arriving. The confirmation page passes along what Flutterwave put on the
// redirect (`transaction_id`, `status=cancelled`); the admin Orders screen
// passes just the reference. Either way the decision comes from Flutterwave's
// API, never from what the browser claims.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handlePreflight, json } from '../_shared/cors.ts'
import { syncFlutterwaveOrder } from '../_shared/flutterwave.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { reference?: string; transactionId?: string; status?: string }
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
  if (order && secretKey) {
    const outcome = await syncFlutterwaveOrder(admin, secretKey, order, {
      transactionId: body.transactionId || undefined,
      customerCancelled: body.status === 'cancelled',
    })
    if (outcome !== 'nothing to sync') {
      console.log(`[order-lookup] ${order.reference}: ${outcome}`)
      ;({ data: order } = await read())
    }
  }

  return json({ order: order ?? null })
})
