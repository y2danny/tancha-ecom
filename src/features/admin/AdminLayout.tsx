import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, Boxes, LogOut, Menu, Package, ShieldCheck, Tag, Users, X,
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'
import { useSeo } from '@/lib/seo'
import type { Permission } from '@/types/identity'

const NAV: { to: string; label: string; icon: typeof Package; permission: Permission }[] = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, permission: 'admin.access' },
  { to: '/admin/products', label: 'Products', icon: Package, permission: 'product.update' },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.update' },
  { to: '/admin/deals', label: 'Deals', icon: Tag, permission: 'deal.manage' },
  { to: '/admin/orders', label: 'Orders', icon: BarChart3, permission: 'order.view' },
  { to: '/admin/team', label: 'Team', icon: Users, permission: 'admin.invite' },
]

export function AdminLayout() {
  useSeo({ title: 'Admin', noindex: true })
  const { user, loading, can, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading the console…</div>
  }

  if (!user || !can('admin.access')) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  const links = NAV.filter((n) => can(n.permission))

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-navy-950 text-white transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/admin"><Logo variant="white" size={34} /></Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="mt-2 space-y-0.5 px-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-gold-400 text-navy-950' : 'text-navy-100 hover:bg-navy-900',
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
          <p className="truncate px-3 text-xs text-navy-300">{user.fullName}</p>
          <p className="truncate px-3 pb-2 text-xs capitalize text-navy-400">{user.role.replace(/_/g, ' ')}</p>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-navy-100 hover:bg-navy-900"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-hairline bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <ShieldCheck size={18} className="text-navy-600" />
          <span className="text-sm font-bold">Tancha Admin</span>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
