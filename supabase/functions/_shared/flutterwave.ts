// Shared by flutterwave-webhook and order-lookup. Takes a Flutterwave
// transaction id, asks Flutterwave's own API what actually happened to it,
// and only then marks the matching order paid. The id itself is just a lookup
// key — whoever supplies it (Flutterwave's webhook, or the customer's browser
// after the redirect), nothing is trusted until the API confirms the status,
// the reference, the currency and the amount.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function confirmFlutterwavePayment(
  admin: SupabaseClient,
  secretKey: string,
  transactionId: string | number,
  expectedReference?: string,
): Promise<string> {
  const verifyRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  )
  const verifyJson = await verifyRes.json().catch(() => null)
  const tx = verifyJson?.data
  if (!verifyRes.ok || verifyJson?.status !== 'success' || !tx) {
    return `verify call failed (${verifyRes.status}): ${verifyJson?.message ?? 'no body'}`
  }
  if (tx.status !== 'successful') return `transaction status is "${tx.status}"`
  if (tx.currency !== 'NGN') return `unexpected currency ${tx.currency}`
  const reference: string | undefined = tx.tx_ref
  if (!reference) return 'transaction has no tx_ref'
  if (expectedReference && reference !== expectedReference) {
    return `tx_ref ${reference} does not match order ${expectedReference}`
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('reference', reference)
    .maybeSingle()
  if (error) return `order lookup failed: ${error.message}`
  if (!order) return `no order with reference ${reference}`
  if (order.paid_at) return 'already paid'

  // What Flutterwave settled (naira) must match what we charged (kobo).
  const settledKobo = Math.round(Number(tx.amount) * 100)
  if (Math.abs(settledKobo - order.total_kobo) > 1) {
    return `amount mismatch: paid ${settledKobo} kobo, order is ${order.total_kobo} kobo`
  }

  // The webhook and the confirmation page can both land here at the same
  // moment. Only the call that actually flips paid_at from null wins, so
  // stock is never decremented twice.
  const { data: flipped, error: updateError } = await admin
    .from('orders')
    .update({ status: 'confirmed', paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .is('paid_at', null)
    .select('id')
  if (updateError) return `could not mark paid: ${updateError.message}`
  if (!flipped || flipped.length === 0) return 'already paid'

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
  return 'confirmed'
}
