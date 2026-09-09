// Deno Edge Function. Deploy with: supabase functions deploy invite-team-member
//
// Creating an auth user and setting a staff role both need the service key —
// the anon key can never do either, by design (see profiles_owner_manage in
// schema.sql). This function is the one place that gap is bridged, and it
// re-checks the caller is `owner` itself rather than trusting the client.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handlePreflight, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Not signed in' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: caller } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!caller.user) return json({ error: 'Not signed in' }, 401)

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.user.id).single()
  if (callerProfile?.role !== 'owner') return json({ error: 'Only the owner can invite team members' }, 403)

  let body: { email?: string; fullName?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const { email, fullName, role } = body
  if (!email || !role) return json({ error: 'email and role are required' }, 400)
  if (!['owner', 'admin', 'catalog_manager', 'support_agent'].includes(role)) {
    return json({ error: 'Invalid role' }, 400)
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName ?? '' },
  })
  if (inviteError || !invited.user) return json({ error: inviteError?.message ?? 'Could not invite user' }, 500)

  // handle_new_user always inserts 'customer' first — overwrite to the
  // intended role and log it, same as any other role change.
  await admin.from('profiles').update({ role, full_name: fullName ?? '' }).eq('id', invited.user.id)
  await admin.from('role_audit').insert({
    actor_id: caller.user.id,
    subject_id: invited.user.id,
    from_role: 'customer',
    to_role: role,
  })

  return json({
    member: {
      id: invited.user.id,
      email,
      full_name: fullName ?? '',
      role,
      created_at: invited.user.created_at,
    },
  })
})
