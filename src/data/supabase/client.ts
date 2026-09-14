import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once both env vars are set — this is the single switch the whole app reads. */
export const supabaseReady = Boolean(url && anonKey)

/**
 * Always constructed, even with empty strings, so every module that imports
 * `supabase` can do so unconditionally. Nothing calls a method on it unless
 * `supabaseReady` is true — see `src/data/index.ts` and `src/data/auth/index.ts`.
 */
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Base URL for this project's Edge Functions, e.g. `${functionsUrl}/checkout`. */
export const functionsUrl = url ? `${url}/functions/v1` : ''

/**
 * supabase-js only runs its proactive token-refresh timer while the tab is
 * visible (deliberately — see GoTrueClient's `_onVisibilityChanged`), so a
 * session can sit un-refreshed the whole time a mobile tab is backgrounded.
 * That's the ordinary case for an admin on their phone: switching to the
 * system photo picker to choose a product photo, or just answering a call,
 * backgrounds the tab. If the access token happens to expire during that
 * gap, the *next* write after returning gets rejected outright with an
 * auth error — a real, non-retryable rejection, not a dropped request — and
 * looks exactly like a random "can't save" failure that a plain retry can't
 * fix, since retrying with the same stale token just fails the same way
 * again. Call this right before a write that a backgrounded tab could have
 * gone stale during, so the token gets refreshed first instead of failing.
 */
export async function ensureFreshSession() {
  const { data } = await supabase.auth.getSession()
  const expiresAt = data.session?.expires_at
  const staleOrExpiringSoon = !expiresAt || expiresAt * 1000 - Date.now() < 60_000
  if (data.session && staleOrExpiringSoon) {
    await supabase.auth.refreshSession()
  }
}
