/**
 * Which order this browser just sent off to the payment page. The cart is
 * kept until that payment is confirmed (so a cancelled payment doesn't leave
 * the customer with an empty cart), and this is how the confirmation page
 * knows the cart in this browser belongs to the order it's showing — and not
 * to some later shopping session.
 */
const KEY = 'tancha.pendingPayment'

export function rememberPendingPayment(reference: string) {
  try {
    sessionStorage.setItem(KEY, reference)
  } catch {
    /* storage blocked — worst case the cart isn't auto-cleared */
  }
}

/** True (once) if `reference` is the payment this browser was waiting on. */
export function takePendingPayment(reference: string) {
  try {
    if (sessionStorage.getItem(KEY) !== reference) return false
    sessionStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}

export function isPendingPayment(reference: string) {
  try {
    return sessionStorage.getItem(KEY) === reference
  } catch {
    return false
  }
}
