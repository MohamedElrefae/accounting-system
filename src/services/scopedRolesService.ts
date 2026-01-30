import { supabase } from '@/utils/supabase';

export interface OrgRoleAssignment {
  user_id: string;
  org_id: string;
  role: 'org_admin' | 'org_manager' | 'org_accountant' | 'org_auditor' | 'org_viewer';
  can_access_all_projects?: boolean;
}

export interface ProjectRoleAssignment {
  user_id: string;
  project_id: string;
  role: 'project_manager' | 'project_contributor' | 'project_viewer';
}

export interface SystemRoleAssignment {
  user_id: string;
  role: 'super_admin' | 'system_auditor';
}

export const scopedRolesService = {
  // ===== ORG ROLES =====

  // Assign role to user in org
  async assignOrgRole(assignment: OrgRoleAssignment) {
    const { data, error } = await supabase
      .from('org_roles')
      .insert([
        {
          user_id: assignment.user_id,
          org_id: assignment.org_id,
          role: assignment.role,
          can_access_all_projects: assignment.can_access_all_projects || false,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // Update org role
  async updateOrgRole(
    userId: string,
    orgId: string,
    role: string,
    canAccessAllProjects?: boolean
  ) {
    const { data, error } = await supabase
      .from('org_roles')
      .update({
        role,
        can_access_all_projects: canAccessAllProjects,
      })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove org role
  async removeOrgRole(userId: string, orgId: string) {
    const { error } = await supabase
      .from('org_roles')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', orgId);

    if (error) throw error;
  },

  // Get org roles
  async getOrgRoles(orgId: string) {
    const { data, error } = await supabase
      .from('org_roles')
      .select('*, user_profiles(id, email, name)')
      .eq('org_id', orgId);

    if (error) throw error;
    return data;
  },

  // ===== PROJECT ROLES =====

  // Assign role to user in project
  async assignProjectRole(assignment: ProjectRoleAssignment) {
    const { data, error } = await supabase
      .from('project_roles')
      .insert([
        {
          user_id: assignment.user_id,
          project_id: assignment.project_id,
          role: assignment.role,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // Update project role
  async updateProjectRole(userId: string, projectId: string, role: string) {
    const { data, error } = await supabase
      .from('project_roles')
      .update({ role })
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove project role
  async removeProjectRole(userId: string, projectId: string) {
    const { error } = await supabase
      .from('project_roles')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) throw error;
  },

  // Get project roles
  async getProjectRoles(projectId: string) {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*, user_profiles(id, email, name)')
      .eq('project_id', projectId);

    if (error) throw error;
    return data;
  },

  // ===== SYSTEM ROLES =====

  // Assign system role
  async assignSystemRole(assignment: SystemRoleAssignment) {
    const { data, error } = await supabase
      .from('system_roles')
      .insert([
        {
          user_id: assignment.user_id,
          role: assignment.role,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select('id, user_id, role, created_at, updated_at, created_by');

    if (error) throw error;
    return data;
  },

  // Remove system role
  async removeSystemRole(userId: string, role: string) {
    const { error } = await supabase
      .from('system_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  },

  // Get system roles
  async getSystemRoles() {
    const { data, error } = await supabase
      .from('system_roles')
      .select('id, user_id, role, created_at, updated_at, created_by');

    if (error) throw error;
    return data;
  },
};
