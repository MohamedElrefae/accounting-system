import { supabase } from "../utils/supabase";

export interface OrgMemberRecord {
  org_id: string;
  user_id: string;
  created_at?: string;
  can_access_all_projects?: boolean;
}

export interface OrgMemberWithUser {
  org_id: string;
  user_id: string;
  created_at?: string;
  can_access_all_projects?: boolean;
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
const USE_MOCK = import.meta.env.DEV && (import.meta as { env?: { VITE_USE_MOCK_ORG?: string } }).env?.VITE_USE_MOCK_ORG === '1';

// In-memory mock store (dev only)
const mockStore: { memberships: OrgMemberWithUser[] } = {
  memberships: []
};

export async function listOrgMembers(orgId: string): Promise<OrgMemberWithUser[]> {
  if (USE_MOCK) {
    console.log('[org-memberships] Using MOCK data for listOrgMembers');
    return mockStore.memberships.filter(m => m.org_id === orgId);
  }
  console.log('[org-memberships] Using SUPABASE for listOrgMembers', { orgId });
  const { data, error } = await supabase.rpc('org_members_list', { p_org_id: orgId });
  if (error) {
    console.error('[org-memberships] Error in org_members_list:', error);
    throw error;
  }
  console.log('[org-memberships] org_members_list result:', { count: data?.length });
  return (data || []).map((r: any) => ({
    org_id: r.org_id,
    user_id: r.user_id,
    created_at: r.created_at,
    can_access_all_projects: r.can_access_all_projects ?? true,
    user: {
      id: r.user_id,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      full_name_ar: r.full_name_ar,
      department: r.department,
      job_title: r.job_title,
      is_active: r.is_active,
      avatar_url: r.avatar_url,
    }
  })) as OrgMemberWithUser[];
}

export async function addOrgMember(
  orgId: string, 
  userId: string, 
  canAccessAllProjects: boolean = true
): Promise<void> {
  if (USE_MOCK) {
    const exists = mockStore.memberships.find(m => m.org_id === orgId && m.user_id === userId);
    if (!exists) {
      mockStore.memberships.push({
        org_id: orgId,
        user_id: userId,
        created_at: new Date().toISOString(),
        can_access_all_projects: canAccessAllProjects,
        user: { id: userId, email: `${userId}@example.com`, first_name: 'User', last_name: userId.slice(0, 6), is_active: true, full_name_ar: 'مستخدم تجريبي' }
      });
    }
    return;
  }
  const { error } = await supabase.rpc('org_member_add', { 
    p_org_id: orgId, 
    p_user_id: userId, 
    p_is_default: false,
    p_can_access_all_projects: canAccessAllProjects
  });
  if (error) throw error;
}


export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.memberships.findIndex(m => m.org_id === orgId && m.user_id === userId);
    if (idx >= 0) mockStore.memberships.splice(idx, 1);
    return;
  }
  const { error } = await supabase.rpc('org_member_remove', { p_org_id: orgId, p_user_id: userId });
  if (error) throw error;
}

export async function searchUsersNotInOrg(orgId: string, query: string, limit = 20) {
  if (USE_MOCK) {
    console.log('[org-memberships] Using MOCK data for searchUsersNotInOrg');
    const pool = Array.from({ length: 20 }).map((_, i) => ({
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

  console.log('[org-memberships] Using SUPABASE for searchUsersNotInOrg', { orgId, query, limit });
  const { data, error } = await supabase.rpc('org_users_not_in', { p_org_id: orgId, p_query: query || '', p_limit: limit });
  if (error) {
    console.error('[org-memberships] Error in org_users_not_in:', error);
    throw error;
  }
  console.log('[org-memberships] org_users_not_in result:', { count: data?.length });
  return data as any[];
}
