// Deno Edge Function. Deploy with:
//   supabase functions deploy flutterwave-webhook --no-verify-jwt
// Then set the resulting URL as the webhook URL in the Flutterwave dashboard
// (Settings → Webhooks), and put the same string you set there as the
// "Secret Hash" into the FLUTTERWAVE_SECRET_HASH secret. Flutterwave's
// webhook auth isn't an HMAC of the body like Paystack's — it's a static
// shared secret that must come back unchanged in the `verif-hash` header.
//
// The header check only decides whether to bother looking. What actually
// marks an order paid is the server-to-server verify call in
// ../_shared/flutterwave.ts. Every decision is logged (never secrets), so
// Supabase → Edge Functions → flutterwave-webhook → Logs says exactly why a
// given call did or didn't confirm an order.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'
import { confirmFlutterwavePayment } from '../_shared/flutterwave.ts'

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
  const signature = req.headers.get('verif-hash') ?? req.headers.get('verifi-hash')

  if (!expectedHash || !secretKey) {
    console.error('[flw-webhook] FLUTTERWAVE_SECRET_HASH or FLUTTERWAVE_SECRET_KEY secret is not set')
    return json({ error: 'Not configured' }, 500)
  }
  if (!signature) {
    console.warn('[flw-webhook] rejected: no verif-hash header on the request')
    return json({ error: 'Invalid signature' }, 401)
  }
  if (!timingSafeEqual(signature, expectedHash)) {
    console.warn('[flw-webhook] rejected: verif-hash does not match FLUTTERWAVE_SECRET_HASH')
    return json({ error: 'Invalid signature' }, 401)
  }

  let event: any
  try {
    event = JSON.parse(await req.text())
  } catch {
    console.warn('[flw-webhook] rejected: body is not JSON')
    return json({ received: true })
  }

  // v3 webhooks nest the transaction under `data`; accounts still on the
  // older webhook format send it flat. Either way all we need is the id —
  // the verify call is the source of truth for everything else.
  const transactionId = event?.data?.id ?? event?.id
  const eventName = event?.event ?? event?.['event.type'] ?? 'unknown'
  if (!transactionId) {
    console.warn(`[flw-webhook] ignored ${eventName}: no transaction id in payload`)
    return json({ received: true })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const outcome = await confirmFlutterwavePayment(admin, secretKey, transactionId)
  console.log(`[flw-webhook] ${eventName} tx ${transactionId}: ${outcome}`)
  return json({ received: true })
})
