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
