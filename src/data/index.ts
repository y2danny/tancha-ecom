import type { DataClient } from './repository'
import { mockClient } from './mock/client'

/**
 * The only file that changes when Supabase goes in:
 *
 *   const supabaseReady = Boolean(import.meta.env.VITE_SUPABASE_URL)
 *   export const db: DataClient = supabaseReady ? supabaseClient : mockClient
 *
 * `src/data/supabase/schema.sql` already holds the tables and RLS policies
 * these interfaces map onto.
 */
export const db: DataClient = mockClient
export type { DataClient } from './repository'
