import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/brand/Logo'
import { supabaseReady } from '@/data/supabase/client'
import { DEMO_ACCOUNTS } from '@/data/auth'
import { useSeo } from '@/lib/seo'

const field =
  'h-11 w-full rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-navy-500'

export function LoginPage() {
  useSeo({ title: 'Staff Sign-in', noindex: true })
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={location.state?.from ?? '/admin'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(location.state?.from ?? '/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo variant="white" /></div>
        <form onSubmit={submit} className="rounded-md bg-white p-6 shadow-panel">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-navy-600" />
            <h1 className="text-sm font-bold uppercase tracking-wide text-navy-800">Staff sign-in</h1>
          </div>

          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email" type="email" required className={field} value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@tancha.ng"
          />

          <label className="mb-1.5 mt-3 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="password">
            Password
          </label>
          <input
            id="password" type="password" required className={field} value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p role="alert" className="mt-3 text-xs font-semibold text-flash-dark">{error}</p>}

          <Button type="submit" variant="primary" className="mt-4 w-full" disabled={submitting}>
            <Lock size={15} />
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          {!supabaseReady && (
            <div className="mt-4 rounded-md bg-navy-50 p-3 text-xs text-navy-700">
              <p className="font-bold">Demo mode — no Supabase connected yet.</p>
              <p className="mt-1">Any of these sign in (password: <code>tancha-demo</code>):</p>
              <ul className="mt-1.5 space-y-0.5">
                {DEMO_ACCOUNTS.map((a) => (
                  <li key={a.email} className="font-mono">{a.email} — {a.role.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
