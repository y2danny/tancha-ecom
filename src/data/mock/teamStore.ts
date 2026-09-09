import type { TeamMember } from '@/types/admin'
import { DEMO_ACCOUNTS } from '@/data/auth/types'

const KEY = 'tancha.team.v1'

function readAll(): TeamMember[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as TeamMember[]
  } catch {
    /* ignore */
  }
  const seeded: TeamMember[] = DEMO_ACCOUNTS.map((a) => ({
    id: `demo_${a.role}`,
    email: a.email,
    fullName: a.fullName,
    role: a.role,
    createdAt: new Date().toISOString(),
  }))
  writeAll(seeded)
  return seeded
}

function writeAll(team: TeamMember[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(team))
  } catch {
    /* ignore */
  }
}

export function listTeam(): TeamMember[] {
  return readAll()
}

export function inviteTeamMember(email: string, fullName: string, role: TeamMember['role']): TeamMember {
  const team = readAll()
  const member: TeamMember = {
    id: `member_${Date.now().toString(36)}`,
    email,
    fullName,
    role,
    createdAt: new Date().toISOString(),
  }
  writeAll([...team, member])
  return member
}

export function setTeamRole(userId: string, role: TeamMember['role']) {
  const team = readAll()
  writeAll(team.map((m) => (m.id === userId ? { ...m, role } : m)))
}
