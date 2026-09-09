import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { db } from '@/data'
import { useAuth } from '@/store/auth'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Role } from '@/types/identity'
import type { TeamMember } from '@/types/admin'

const ROLES: Role[] = ['owner', 'admin', 'catalog_manager', 'support_agent', 'customer']
const INVITABLE: Role[] = ['admin', 'catalog_manager', 'support_agent']

export function TeamPage() {
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('catalog_manager')
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const reload = () => {
    setLoading(true)
    db.admin.listTeam().then((t) => {
      setTeam(t)
      setLoading(false)
    })
  }
  useEffect(reload, [])

  const isOwner = user?.role === 'owner'

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    try {
      await db.admin.inviteTeamMember(email, fullName, role)
      setEmail('')
      setFullName('')
      setInviteOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invite')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Team</h1>
        {isOwner && (
          <Button variant="primary" size="sm" onClick={() => setInviteOpen((v) => !v)}>
            <UserPlus size={15} /> Invite
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        You are the CEO account — only you can invite staff or change roles. Every change is written to the
        role_audit table.
      </p>

      {inviteOpen && (
        <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-2 rounded-md bg-white p-4 shadow-card">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="inviteName">Full name</label>
            <input id="inviteName" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 rounded-md border border-hairline px-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="inviteEmail">Email</label>
            <input id="inviteEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-md border border-hairline px-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="inviteRole">Role</label>
            <select id="inviteRole" value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-9 rounded-md border border-hairline px-2.5 text-sm capitalize">
              {INVITABLE.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={inviting}>{inviting ? 'Sending…' : 'Send invite'}</Button>
          {error && <p role="alert" className="w-full text-xs font-semibold text-flash-dark">{error}</p>}
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-md bg-white shadow-card">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-hairline text-left text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : (
              team.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.fullName || '—'}</td>
                  <td className="px-4 py-3 text-muted">{m.email}</td>
                  <td className="px-4 py-3">
                    {isOwner && m.role !== 'owner' ? (
                      <select
                        value={m.role}
                        onChange={async (e) => {
                          await db.admin.setTeamRole(m.id, e.target.value as Role)
                          reload()
                        }}
                        className="h-8 rounded-md border border-hairline bg-white px-2 text-xs capitalize"
                      >
                        {ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : (
                      <Badge tone="navy">{m.role.replace(/_/g, ' ')}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(m.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
