import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from '@/data/auth'
import type { AppUser, Permission } from '@/types/identity'
import { can } from '@/types/identity'

interface AuthState {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AppUser>
  signOut: () => Promise<void>
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onChange((next) => {
      setUser(next)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: (email, password) => auth.signIn(email, password),
      signOut: () => auth.signOut(),
      can: (permission) => can(user, permission),
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
