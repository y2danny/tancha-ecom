// Shared by flutterwave-webhook and order-lookup: the one place that decides
// whether a Flutterwave order is paid, still pending, or dead.
//
// Nothing a browser or a webhook body says is trusted on its own. Every
// decision comes from asking Flutterwave's API directly with our secret key —
// the status, the reference, the currency and the amount all have to check
// out before an order is marked paid.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const API = 'https://api.flutterwave.com/v3/transactions'

/** An unpaid order this old, with no successful payment at Flutterwave, is
 *  treated as abandoned and cancelled. Long enough for a slow bank transfer
 *  to land; short enough that the admin list doesn't fill up with ghosts. */
const ABANDON_AFTER_MINUTES = 120

type Lookup = { transactionId: string | number } | { reference: string }

async function fetchTransaction(secretKey: string, lookup: Lookup) {
  const url =
    'transactionId' in lookup
      ? `${API}/${encodeURIComponent(String(lookup.transactionId))}/verify`
      : `${API}/verify_by_reference?tx_ref=${encodeURIComponent(lookup.reference)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } })
  const body = await res.json().catch(() => null)
  if (res.ok && body?.status === 'success' && body.data) return { tx: body.data, note: null }
  // Flutterwave answers "no transaction" with a non-2xx — that's an answer,
  // not an outage, so it's reported rather than thrown.
  return { tx: null, note: `${res.status} ${body?.message ?? 'no body'}` }
}

/** Marks the order paid if `tx` is a genuine, matching, successful payment. */
async function applyTransaction(admin: SupabaseClient, tx: any): Promise<string> {
  if (tx.status !== 'successful') return `transaction status is "${tx.status}"`
  if (tx.currency !== 'NGN') return `unexpected currency ${tx.currency}`
  const reference: string | undefined = tx.tx_ref
  if (!reference) return 'transaction has no tx_ref'

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

  // The webhook and the confirmation page can both land here at once. Only
  // the call that actually flips paid_at from null wins, so stock is never
  // taken twice. A payment that arrives after an order was auto-cancelled
  // still un-cancels it — the money is real, so the order is too.
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

/** Webhook path: Flutterwave told us a transaction id. */
export async function confirmFlutterwaveTransaction(
  admin: SupabaseClient,
  secretKey: string,
  transactionId: string | number,
): Promise<string> {
  const { tx, note } = await fetchTransaction(secretKey, { transactionId })
  if (!tx) return `verify failed: ${note}`
  return applyTransaction(admin, tx)
}

/**
 * Lookup path: bring one order's status in line with what Flutterwave knows.
 * Used by the confirmation page (with the transaction id / status Flutterwave
 * put on the redirect, if any) and by the admin Orders screen (with nothing
 * but the reference).
 */
export async function syncFlutterwaveOrder(
  admin: SupabaseClient,
  secretKey: string,
  order: { id: string; reference: string; status: string; payment_method: string; paid_at: string | null; placed_at: string },
  hint: { transactionId?: string; customerCancelled?: boolean } = {},
): Promise<string> {
  if (order.payment_method !== 'flutterwave' || order.paid_at) return 'nothing to sync'
  if (order.status !== 'pending_payment' && order.status !== 'cancelled') return 'nothing to sync'

  const { tx, note } = await fetchTransaction(
    secretKey,
    hint.transactionId ? { transactionId: hint.transactionId } : { reference: order.reference },
  )

  if (tx && tx.tx_ref === order.reference) {
    if (tx.status === 'successful') return applyTransaction(admin, tx)
    // Bank transfers and some USSD payments sit in "pending" for a while.
    if (tx.status === 'pending') return 'still pending at Flutterwave'
  }
  if (order.status === 'cancelled') return 'already cancelled'

  // No successful payment exists. Cancel if the customer said so on the way
  // back from Flutterwave, or if the order has been sitting unpaid too long.
  // (If money does turn up later, applyTransaction above un-cancels it.)
  const ageMinutes = (Date.now() - new Date(order.placed_at).getTime()) / 60000
  if (!hint.customerCancelled && ageMinutes < ABANDON_AFTER_MINUTES) {
    return `not paid yet (${tx ? `status "${tx.status}"` : note})`
  }
  const { error } = await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id)
    .eq('status', 'pending_payment')
    .is('paid_at', null)
  if (error) return `could not cancel: ${error.message}`
  return hint.customerCancelled ? 'cancelled by customer' : `cancelled after ${Math.round(ageMinutes)} min unpaid`
}
