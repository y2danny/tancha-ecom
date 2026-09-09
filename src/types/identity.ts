/**
 * Roles are defined here now and enforced by Postgres RLS later.
 * The CEO is `owner` and is the only role that can mint other admins.
 */
export type Role = 'owner' | 'admin' | 'catalog_manager' | 'support_agent' | 'customer'

export type Permission =
  | 'admin.access'
  | 'admin.invite'
  | 'admin.revoke'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'inventory.update'
  | 'order.view'
  | 'order.update'
  | 'deal.manage'
  | 'support.respond'
  | 'settings.update'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'admin.access',
    'admin.invite',
    'admin.revoke',
    'product.create',
    'product.update',
    'product.delete',
    'inventory.update',
    'order.view',
    'order.update',
    'deal.manage',
    'support.respond',
    'settings.update',
  ],
  admin: [
    'admin.access',
    'product.create',
    'product.update',
    'product.delete',
    'inventory.update',
    'order.view',
    'order.update',
    'deal.manage',
    'support.respond',
  ],
  catalog_manager: [
    'admin.access',
    'product.create',
    'product.update',
    'inventory.update',
    'deal.manage',
  ],
  support_agent: ['admin.access', 'order.view', 'support.respond'],
  customer: [],
}

export interface AppUser {
  id: string
  email: string
  fullName: string
  phone?: string
  role: Role
  createdAt: string
}

export function can(user: AppUser | null, permission: Permission) {
  if (!user) return false
  return ROLE_PERMISSIONS[user.role].includes(permission)
}
