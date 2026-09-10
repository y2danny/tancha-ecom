import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/brand/Logo'
import { useSeo } from '@/lib/seo'

const field =
  'h-11 w-full rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-navy-500'

/**
 * Where an invited staff member lands after clicking the link in their
 * invite email. `invite-team-member` sends that link with `redirectTo`
 * pointing here — Supabase's own invite flow signs them in directly (that's
 * how invite links work), it just never gives them a password, so this page
 * is the one place that gap gets closed before they reach the console.
 */
export function AcceptInvitePage() {
  useSeo({ title: 'Set your password', noindex: true })
  const { user, loading, setPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted">Checking your invite…</div>
  }

  // No session means the link didn't carry a valid one — expired, already
  // used, or opened on a device/browser that never had it in the first
  // place. Sending them anywhere in the app but here would be misleading.
  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-navy-950 px-4">
        <div className="w-full max-w-sm rounded-md bg-white p-6 text-center shadow-panel">
          <h1 className="text-sm font-bold uppercase tracking-wide text-navy-800">Invite link not valid</h1>
          <p className="mt-2 text-sm text-muted">
            This link has expired or was already used. Ask the owner to resend your invite from Team in the admin
            console, then open the new email's link.
          </p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/admin/login')}>
            Go to sign-in
          </Button>
        </div>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setSubmitting(true)
    try {
      await setPassword(password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set your password')
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
            <h1 className="text-sm font-bold uppercase tracking-wide text-navy-800">Welcome to Tancha</h1>
          </div>
          <p className="mb-4 text-xs text-muted">
            Signed in as <span className="font-semibold text-navy-800">{user.email}</span>. Set a password to finish
            setting up your account.
          </p>

          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="password">
            New password
          </label>
          <input
            id="password" type="password" required minLength={8} autoFocus className={field} value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
          />

          <label className="mb-1.5 mt-3 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm" type="password" required minLength={8} className={field} value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <p role="alert" className="mt-3 text-xs font-semibold text-flash-dark">{error}</p>}

          <Button type="submit" variant="primary" className="mt-4 w-full" disabled={submitting}>
            <KeyRound size={15} />
            {submitting ? 'Saving…' : 'Set password and continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

