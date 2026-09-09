import type { AppUser } from '@/types/identity'
import type { AuthClient } from './types'
import { supabase } from '@/data/supabase/client'

async function profileToUser(userId: string, email: string): Promise<AppUser | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) return null
  return {
    id: data.id,
    email: data.email ?? email,
    fullName: data.full_name ?? '',
    phone: data.phone ?? undefined,
    role: data.role,
    createdAt: data.created_at,
  }
}

export const supabaseAuth: AuthClient = {
  name: 'supabase',

  async getSession() {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session?.user) return null
    return profileToUser(session.user.id, session.user.email ?? '')
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message ?? 'Sign in failed')
    const user = await profileToUser(data.user.id, data.user.email ?? '')
    if (!user) throw new Error('Signed in, but your profile row was not found. Check the handle_new_user trigger ran.')
    return user
  },

  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error || !data.user) throw new Error(error?.message ?? 'Sign up failed')
    // The handle_new_user trigger inserts the profile row; it can lag the
    // auth response by a beat, so retry briefly rather than failing outright.
    for (let i = 0; i < 5; i += 1) {
      const user = await profileToUser(data.user.id, data.user.email ?? '')
      if (user) return user
      await new Promise((r) => setTimeout(r, 300))
    }
    throw new Error('Account created, but the profile was not ready yet. Try signing in again in a moment.')
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  onChange(cb) {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      const user = data.session?.user ? await profileToUser(data.session.user.id, data.session.user.email ?? '') : null
      if (!cancelled) cb(user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ? await profileToUser(session.user.id, session.user.email ?? '') : null
      cb(user)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  },
}
