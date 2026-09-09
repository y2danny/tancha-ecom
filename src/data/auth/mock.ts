import type { AppUser } from '@/types/identity'
import type { AuthClient } from './types'
import { DEMO_ACCOUNTS } from './types'

const STORAGE_KEY = 'tancha.demoSession.v1'
const listeners = new Set<(user: AppUser | null) => void>()

function read(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

function write(user: AppUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode — session just won't survive a refresh */
  }
  listeners.forEach((cb) => cb(user))
}

const wait = <T,>(v: T, ms = 350) => new Promise<T>((resolve) => setTimeout(() => resolve(v), ms))

/**
 * No real backend yet, so this is a believable stand-in: three seeded demo
 * accounts (see DEMO_ACCOUNTS), sessions kept in localStorage so a reload
 * doesn't sign you out mid-demo. Swapped for `supabaseAuth` the same way the
 * data layer swaps in `src/data/index.ts`.
 */
export const mockAuth: AuthClient = {
  name: 'mock',

  async getSession() {
    return wait(read(), 60)
  },

  async signIn(email, password) {
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
    )
    if (!account) throw new Error('Incorrect email or password. Try one of the demo accounts below.')
    const user: AppUser = {
      id: `demo_${account.role}`,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      createdAt: new Date().toISOString(),
    }
    const resolved = await wait(user)
    write(resolved)
    return resolved
  },

  async signUp(email, _password, fullName) {
    // Demo mode: new sign-ups are always plain customers, mirroring the
    // real schema's "first user becomes owner, everyone after is customer".
    const user: AppUser = {
      id: `demo_customer_${Date.now()}`,
      email,
      fullName: fullName || email.split('@')[0],
      role: 'customer',
      createdAt: new Date().toISOString(),
    }
    const resolved = await wait(user)
    write(resolved)
    return resolved
  },

  async signOut() {
    await wait(undefined, 120)
    write(null)
  },

  onChange(cb) {
    cb(read())
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
