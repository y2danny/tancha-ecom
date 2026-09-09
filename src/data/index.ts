import type { DataClient } from './repository'
import { mockClient } from './mock/client'
import { supabaseClient } from './supabase/dataClient'
import { supabaseReady } from './supabase/client'

/**
 * The one line that flips the whole app onto a live backend. Set
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example) and every
 * screen — storefront and admin — starts reading and writing Postgres
 * instead of the in-memory mock. No component imports mock or supabase code
 * directly; they only ever see `db`.
 */
export const db: DataClient = supabaseReady ? supabaseClient : mockClient
export type { DataClient } from './repository'
