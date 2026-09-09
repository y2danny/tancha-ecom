import { Link } from 'react-router-dom'
import { BarChart3, Boxes, MessagesSquare, Package, ShieldCheck, Tag, Users } from 'lucide-react'
import { ROLE_PERMISSIONS } from '@/types/identity'

const MODULES = [
  { icon: Package, name: 'Products', body: 'Create, edit, deactivate. Images to Supabase Storage.', roles: 'Owner, Admin, Catalog manager' },
  { icon: Boxes, name: 'Inventory', body: 'Stock movements with an audit trail, low-stock alerts.', roles: 'Owner, Admin, Catalog manager' },
  { icon: Tag, name: 'Deals', body: 'Schedule deal of the day/week — the countdowns the storefront reads.', roles: 'Owner, Admin, Catalog manager' },
  { icon: BarChart3, name: 'Orders', body: 'Status pipeline, Paystack reconciliation, delivery assignment.', roles: 'Owner, Admin, Support agent' },
  { icon: MessagesSquare, name: 'Support inbox', body: 'Escalated AI chats land here alongside the WhatsApp handoff.', roles: 'Owner, Admin, Support agent' },
  { icon: Users, name: 'Team', body: 'The CEO invites admins and assigns roles. Every change is audited.', roles: 'Owner only' },
]

export function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 py-8 sm:px-4">
      <div className="rounded-md bg-navy-900 p-6 text-white shadow-card sm:p-8">
        <ShieldCheck size={30} className="text-gold-300" />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Admin console</h1>
        <p className="mt-2 max-w-xl text-sm text-navy-100">
          Not built in this pass — the storefront came first. The schema, roles and RLS policies it
          runs on are already written in{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">src/data/supabase/schema.sql</code>,
          so this is assembly rather than design.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {MODULES.map(({ icon: Icon, name, body, roles }) => (
          <div key={name} className="rounded-md bg-white p-4 shadow-card">
            <Icon size={20} className="text-navy-600" />
            <h2 className="mt-2 text-sm font-bold">{name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            <p className="mt-2 text-xs font-semibold text-navy-600">{roles}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md bg-white p-4 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide">Roles defined today</h2>
        <div className="mt-3 space-y-2">
          {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
            <div key={role} className="flex flex-wrap items-baseline gap-2 border-b border-hairline pb-2 last:border-0">
              <span className="w-36 shrink-0 text-sm font-bold capitalize">{role.replace('_', ' ')}</span>
              <span className="text-xs text-muted">
                {perms.length === 0 ? 'Storefront only' : perms.join(' · ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Link to="/" className="mt-5 inline-block text-sm font-semibold text-navy-600 hover:underline">
        ← Back to the storefront
      </Link>
    </div>
  )
}
