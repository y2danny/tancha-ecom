import type { AppUser, Role } from '@/types/identity'

/**
 * The auth seam — separate from `DataClient` because signing in is a
 * different concern from reading/writing rows, and because the mock
 * implementation needs believable demo accounts rather than fake data.
 */
export interface AuthClient {
  readonly name: string
  getSession(): Promise<AppUser | null>
  signIn(email: string, password: string): Promise<AppUser>
  signUp(email: string, password: string, fullName: string): Promise<AppUser>
  signOut(): Promise<void>
  /**
   * Sets the password on the CURRENT session — used by the invite-accept
   * flow, where clicking the emailed link already signs the invitee in
   * (Supabase's invite/recovery links establish a session directly) but
   * they have no password yet.
   */
  setPassword(password: string): Promise<void>
  /** Fires once immediately with the current session, then on every change. */
  onChange(cb: (user: AppUser | null) => void): () => void
}

export const DEMO_ACCOUNTS: { email: string; password: string; fullName: string; role: Role }[] = [
  { email: 'owner@tancha.ng', password: 'tancha-demo', fullName: 'Adaeze Nwosu (CEO)', role: 'owner' },
  { email: 'admin@tancha.ng', password: 'tancha-demo', fullName: 'Biodun Fashola', role: 'admin' },
  { email: 'support@tancha.ng', password: 'tancha-demo', fullName: 'Chiamaka Eze', role: 'support_agent' },
]
