// Deno Edge Function. Deploy with: supabase functions deploy order-lookup
//
// Guest checkout means most orders have no auth.uid() to match against RLS's
// "customer_id = auth.uid()" policy, so the order confirmation page can't
// read the row directly. The order reference itself is the capability here
// (long, random, shown only to the person who just placed the order) — this
// function trades that for read access to exactly one row, nothing else.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handlePreflight, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { reference?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.reference) return json({ error: 'Missing reference' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: order } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('reference', body.reference)
    .maybeSingle()

  return json({ order: order ?? null })
})
