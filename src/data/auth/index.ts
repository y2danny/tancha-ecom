import { supabaseReady } from '@/data/supabase/client'
import { mockAuth } from './mock'
import { supabaseAuth } from './supabase'

/** Same switch as `src/data/index.ts` — one env check, one line. */
export const auth = supabaseReady ? supabaseAuth : mockAuth
export type { AuthClient } from './types'
export { DEMO_ACCOUNTS } from './types'
