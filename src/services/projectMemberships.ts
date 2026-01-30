import { supabase } from '../utils/supabase'

export interface ProjectMembership {
  id: string
  project_id: string
  user_id: string
  org_id: string
  role: 'admin' | 'member' | 'viewer'
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  is_default: boolean
  created_at: string
  updated_at: string | null
  created_by: string | null
}

// Get all project memberships for a project
export async function getProjectMemberships(projectId: string): Promise<ProjectMembership[]> {
  const { data, error } = await supabase
    .from('project_memberships')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as ProjectMembership[]) || []
}

// Get project memberships for a user
export async function getUserProjectMemberships(userId: string): Promise<ProjectMembership[]> {
  const { data, error } = await supabase
    .from('project_memberships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as ProjectMembership[]) || []
}

// Add user to project
export async function addUserToProject(
  projectId: string,
  userId: string,
  orgId: string,
  role: 'admin' | 'member' | 'viewer' = 'member',
  permissions?: {
    can_create?: boolean
    can_edit?: boolean
    can_delete?: boolean
    can_approve?: boolean
  }
): Promise<ProjectMembership> {
  const { data, error } = await supabase
    .from('project_memberships')
    .insert({
      project_id: projectId,
      user_id: userId,
      org_id: orgId,
      role,
      can_create: permissions?.can_create ?? true,
      can_edit: permissions?.can_edit ?? true,
      can_delete: permissions?.can_delete ?? false,
      can_approve: permissions?.can_approve ?? false,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as ProjectMembership
}

// Update project membership
export async function updateProjectMembership(
  membershipId: string,
  updates: Partial<Omit<ProjectMembership, 'id' | 'created_at' | 'created_by'>>
): Promise<ProjectMembership> {
  const { data, error } = await supabase
    .from('project_memberships')
    .update(updates)
    .eq('id', membershipId)
    .select('*')
    .single()

  if (error) throw error
  return data as ProjectMembership
}

// Remove user from project
export async function removeUserFromProject(membershipId: string): Promise<void> {
  const { error } = await supabase
    .from('project_memberships')
    .delete()
    .eq('id', membershipId)

  if (error) throw error
}

// Check if user is member of project
export async function isUserProjectMember(projectId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('project_memberships')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

// Get project members with user details
export async function getProjectMembersWithDetails(projectId: string): Promise<Array<ProjectMembership & { user_name?: string; user_email?: string }>> {
  try {
    // First get project memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('project_memberships')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (membershipsError) throw membershipsError

    if (!memberships || memberships.length === 0) {
      return []
    }

    // Then get user profiles for those members
    const userIds = memberships.map(m => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, full_name_ar, email')
      .in('id', userIds)

    if (profilesError) throw profilesError

    // Create a map of user profiles
    const profileMap = new Map((profiles as any[])?.map(p => [p.id, p]) || [])

    // Combine memberships with user details
    return memberships.map(membership => ({
      ...membership,
      user_name: (() => {
        const profile = profileMap.get(membership.user_id)
        if (!profile) return 'Unknown'
        return profile.full_name_ar || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
      })(),
      user_email: profileMap.get(membership.user_id)?.email || '',
    }))
  } catch (error) {
    console.error('[getProjectMembersWithDetails] Error:', error)
    throw error
  }
}

// Bulk add users to project
export async function bulkAddUsersToProject(
  projectId: string,
  orgId: string,
  userIds: string[],
  role: 'admin' | 'member' | 'viewer' = 'member'
): Promise<ProjectMembership[]> {
  const memberships = userIds.map(userId => ({
    project_id: projectId,
    user_id: userId,
    org_id: orgId,
    role,
    can_create: true,
    can_edit: true,
    can_delete: false,
    can_approve: false,
  }))

  const { data, error } = await supabase
    .from('project_memberships')
    .insert(memberships)
    .select('*')

  if (error) throw error
  return (data as ProjectMembership[]) || []
}
