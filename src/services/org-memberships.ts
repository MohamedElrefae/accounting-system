import { supabase } from "../utils/supabase";

export type OrgMemberRole = 'viewer' | 'manager' | 'admin';

export interface OrgMemberRecord {
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  created_at?: string;
}

export interface OrgMemberWithUser {
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  created_at?: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name_ar?: string;
    department?: string;
    job_title?: string;
    is_active?: boolean;
    avatar_url?: string | null;
  };
}

// Feature flag to allow using mock in development without touching DB
const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK_ORG === '1';

// In-memory mock store (dev only)
const mockStore: { memberships: OrgMemberWithUser[] } = {
  memberships: []
};

export async function listOrgMembers(orgId: string): Promise<OrgMemberWithUser[]> {
  if (USE_MOCK) {
    return mockStore.memberships.filter(m => m.org_id === orgId);
  }
  const { data, error } = await supabase
    .from("org_memberships")
    .select(
      `org_id, user_id, role, created_at,
       user:user_profiles ( id, email, first_name, last_name, full_name_ar, department, job_title, is_active, avatar_url )`
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as OrgMemberWithUser[];
}

export async function addOrgMember(orgId: string, userId: string, role: OrgMemberRole): Promise<void> {
  if (USE_MOCK) {
    const exists = mockStore.memberships.find(m => m.org_id === orgId && m.user_id === userId);
    if (!exists) {
      mockStore.memberships.push({
        org_id: orgId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
        user: { id: userId, email: `${userId}@example.com`, first_name: 'User', last_name: userId.slice(0, 6), is_active: true, full_name_ar: 'مستخدم تجريبي' }
      });
    }
    return;
  }
  const { error } = await supabase
    .from("org_memberships")
    .insert({ org_id: orgId, user_id: userId, role });
  if (error) throw error;
}

export async function updateOrgMemberRole(orgId: string, userId: string, role: OrgMemberRole): Promise<void> {
  if (USE_MOCK) {
    const item = mockStore.memberships.find(m => m.org_id === orgId && m.user_id === userId);
    if (item) item.role = role;
    return;
  }
  const { error } = await supabase
    .from("org_memberships")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.memberships.findIndex(m => m.org_id === orgId && m.user_id === userId);
    if (idx >= 0) mockStore.memberships.splice(idx, 1);
    return;
  }
  const { error } = await supabase
    .from("org_memberships")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function searchUsersNotInOrg(orgId: string, query: string, limit = 20) {
  if (USE_MOCK) {
    // Return a few fake users filtered by query
    const pool = Array.from({ length: 10 }).map((_, i) => ({
      id: `mock-user-${i+1}`,
      email: `mock${i+1}@example.com`,
      first_name: 'Mock',
      last_name: String(i+1),
      department: 'Engineering',
      job_title: 'Developer',
      is_active: true,
    }));
    const existing = new Set(mockStore.memberships.filter(m => m.org_id === orgId).map(m => m.user_id));
    return pool.filter(u => !existing.has(u.id) && (!query || u.email.includes(query))).slice(0, limit);
  }

  let q = supabase.from('user_profiles')
    .select('id, email, first_name, last_name, full_name_ar, department, job_title, is_active')
    .order('email')
    .limit(limit);

  if (query) {
    q = q.ilike('email', `%${query}%`);
  }

  const { data: users, error } = await q;
  if (error) throw error;

  const { data: members, error: memErr } = await supabase
    .from('org_memberships')
    .select('user_id')
    .eq('org_id', orgId);
  if (memErr) throw memErr;
  const memberIds = new Set((members || []).map((m: any) => m.user_id));

  return (users || []).filter((u: any) => !memberIds.has(u.id));
}
