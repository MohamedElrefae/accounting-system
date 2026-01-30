import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { scopedRolesService } from '@/services/scopedRolesService';
import { supabase } from '@/utils/supabase';

interface ScopedRoleAssignmentProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

interface UserOrgRole {
  org_id: string;
  org_name: string;
  role: string;
  can_access_all_projects: boolean;
}

interface UserProjectRole {
  project_id: string;
  project_name: string;
  org_id: string;
  role: string;
}

export const ScopedRoleAssignment: React.FC<ScopedRoleAssignmentProps> = ({
  userId,
  userName,
  userEmail,
}) => {
  const { canPerformActionInOrg } = useOptimizedAuth();
  const [orgRoles, setOrgRoles] = useState<UserOrgRole[]>([]);
  const [projectRoles, setProjectRoles] = useState<UserProjectRole[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's current roles
  useEffect(() => {
    loadUserRoles();
    loadAvailableOrgsAndProjects();
  }, [userId]);

  const loadUserRoles = async () => {
    try {
      setLoading(true);

      // Get org roles
      const { data: orgData, error: orgError } = await supabase
        .from('org_roles')
        .select('*, organizations(id, name)')
        .eq('user_id', userId);

      if (orgError) throw orgError;

      setOrgRoles(
        orgData?.map((r: any) => ({
          org_id: r.org_id,
          org_name: r.organizations?.name || 'Unknown',
          role: r.role,
          can_access_all_projects: r.can_access_all_projects,
        })) || []
      );

      // Get project roles
      const { data: projectData, error: projectError } = await supabase
        .from('project_roles')
        .select('*, projects(id, name, org_id)')
        .eq('user_id', userId);

      if (projectError) throw projectError;

      setProjectRoles(
        projectData?.map((r: any) => ({
          project_id: r.project_id,
          project_name: r.projects?.name || 'Unknown',
          org_id: r.projects?.org_id,
          role: r.role,
        })) || []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading roles');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableOrgsAndProjects = async () => {
    try {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (orgsError) throw orgsError;
      setOrganizations(orgs || []);

      // Get all projects
      const { data: projs, error: projsError } = await supabase
        .from('projects')
        .select('id, name, org_id')
        .order('name');

      if (projsError) throw projsError;
      setProjects(projs || []);
    } catch (err) {
      console.error('Error loading orgs/projects:', err);
    }
  };

  const handleAddOrgRole = async (orgId: string, role: string) => {
    try {
      await scopedRolesService.assignOrgRole({
        user_id: userId,
        org_id: orgId,
        role: role as any,
      });
      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding org role');
    }
  };

  const handleUpdateOrgRole = async (
    orgId: string,
    role: string,
    canAccessAll: boolean
  ) => {
    try {
      await scopedRolesService.updateOrgRole(userId, orgId, role, canAccessAll);
      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating org role');
    }
  };

  const handleRemoveOrgRole = async (orgId: string) => {
    try {
      await scopedRolesService.removeOrgRole(userId, orgId);
      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing org role');
    }
  };

  const handleAddProjectRole = async (projectId: string, role: string) => {
    try {
      await scopedRolesService.assignProjectRole({
        user_id: userId,
        project_id: projectId,
        role: role as any,
      });
      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding project role');
    }
  };

  const handleUpdateProjectRole = async (projectId: string, role: string) => {
    try {
      await scopedRolesService.updateProjectRole(userId, projectId, role);
      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating project role');
    }
  };

  const handleRemoveProjectRole = async (projectId: string) => {
    try {
      await scopedRolesService.removeProjectRole(userId, projectId);
      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing project role');
    }
  };

  if (loading) return <div className="p-4">Loading roles...</div>;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Role Assignment</h2>
        <p className="text-gray-600 mt-1">
          {userName} ({userEmail})
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Organization Roles Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Organization Roles</h3>

        {/* Current Org Roles */}
        {orgRoles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Current Roles:</p>
            {orgRoles.map((orgRole) => (
              <div
                key={orgRole.org_id}
                className="flex items-center justify-between bg-gray-50 p-3 rounded border"
              >
                <div>
                  <p className="font-medium">{orgRole.org_name}</p>
                  <p className="text-sm text-gray-600">
                    Role: {orgRole.role}
                    {orgRole.can_access_all_projects && (
                      <span className="ml-2 text-blue-600">(All Projects)</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={orgRole.role}
                    onChange={(e) =>
                      handleUpdateOrgRole(
                        orgRole.org_id,
                        e.target.value,
                        orgRole.can_access_all_projects
                      )
                    }
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="org_admin">Admin</option>
                    <option value="org_manager">Manager</option>
                    <option value="org_accountant">Accountant</option>
                    <option value="org_auditor">Auditor</option>
                    <option value="org_viewer">Viewer</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={orgRole.can_access_all_projects}
                      onChange={(e) =>
                        handleUpdateOrgRole(
                          orgRole.org_id,
                          orgRole.role,
                          e.target.checked
                        )
                      }
                    />
                    All Projects
                  </label>
                  <button
                    onClick={() => handleRemoveOrgRole(orgRole.org_id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Org Role */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <p className="text-sm font-medium mb-2">Add Organization Role:</p>
          <div className="flex gap-2">
            <select
              id="org-select"
              className="flex-1 px-3 py-2 border rounded"
              defaultValue=""
            >
              <option value="">Select Organization...</option>
              {organizations
                .filter(
                  (org) => !orgRoles.some((r) => r.org_id === org.id)
                )
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </select>
            <select
              id="org-role-select"
              className="px-3 py-2 border rounded"
              defaultValue="org_viewer"
            >
              <option value="org_admin">Admin</option>
              <option value="org_manager">Manager</option>
              <option value="org_accountant">Accountant</option>
              <option value="org_auditor">Auditor</option>
              <option value="org_viewer">Viewer</option>
            </select>
            <button
              onClick={() => {
                const orgSelect = document.getElementById(
                  'org-select'
                ) as HTMLSelectElement;
                const roleSelect = document.getElementById(
                  'org-role-select'
                ) as HTMLSelectElement;
                if (orgSelect.value) {
                  handleAddOrgRole(orgSelect.value, roleSelect.value);
                  orgSelect.value = '';
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Project Roles Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Project Roles</h3>

        {/* Current Project Roles */}
        {projectRoles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Current Roles:</p>
            {projectRoles.map((projRole) => (
              <div
                key={projRole.project_id}
                className="flex items-center justify-between bg-gray-50 p-3 rounded border"
              >
                <div>
                  <p className="font-medium">{projRole.project_name}</p>
                  <p className="text-sm text-gray-600">Role: {projRole.role}</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={projRole.role}
                    onChange={(e) =>
                      handleUpdateProjectRole(projRole.project_id, e.target.value)
                    }
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="project_manager">Manager</option>
                    <option value="project_contributor">Contributor</option>
                    <option value="project_viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => handleRemoveProjectRole(projRole.project_id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Project Role */}
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <p className="text-sm font-medium mb-2">Add Project Role:</p>
          <div className="flex gap-2">
            <select
              id="project-select"
              className="flex-1 px-3 py-2 border rounded"
              defaultValue=""
            >
              <option value="">Select Project...</option>
              {projects
                .filter(
                  (proj) => !projectRoles.some((r) => r.project_id === proj.id)
                )
                .map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
            </select>
            <select
              id="project-role-select"
              className="px-3 py-2 border rounded"
              defaultValue="project_viewer"
            >
              <option value="project_manager">Manager</option>
              <option value="project_contributor">Contributor</option>
              <option value="project_viewer">Viewer</option>
            </select>
            <button
              onClick={() => {
                const projSelect = document.getElementById(
                  'project-select'
                ) as HTMLSelectElement;
                const roleSelect = document.getElementById(
                  'project-role-select'
                ) as HTMLSelectElement;
                if (projSelect.value) {
                  handleAddProjectRole(projSelect.value, roleSelect.value);
                  projSelect.value = '';
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded border">
        <p className="text-sm font-medium">Summary:</p>
        <ul className="text-sm text-gray-600 mt-2 space-y-1">
          <li>• Organization Roles: {orgRoles.length}</li>
          <li>• Project Roles: {projectRoles.length}</li>
          <li>
            • Can Access All Projects:{' '}
            {orgRoles.filter((r) => r.can_access_all_projects).length}
          </li>
        </ul>
      </div>
    </div>
  );
};
