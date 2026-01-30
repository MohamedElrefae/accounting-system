import React, { useState, useEffect } from 'react';
import { scopedRolesService } from '@/services/scopedRolesService';
import { supabase } from '@/utils/supabase';

interface ProjectRoleAssignmentProps {
  projectId: string;
  projectName?: string;
}

interface UserWithRole {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

export const ProjectRoleAssignment: React.FC<ProjectRoleAssignmentProps> = ({
  projectId,
  projectName,
}) => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('project_viewer');

  useEffect(() => {
    loadProjectUsers();
    loadAvailableUsers();
  }, [projectId]);

  const loadProjectUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_roles')
        .select('*, user_profiles(id, email, name)')
        .eq('project_id', projectId);

      if (error) throw error;

      setUsers(
        data?.map((r: any) => ({
          user_id: r.user_id,
          email: r.user_profiles?.email || 'Unknown',
          name: r.user_profiles?.name || 'Unknown',
          role: r.role,
        })) || []
      );
    } catch (err) {
      console.error('Error loading project users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .order('name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (err) {
      console.error('Error loading available users:', err);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;

    try {
      await scopedRolesService.assignProjectRole({
        user_id: selectedUser,
        project_id: projectId,
        role: selectedRole as any,
      });
      await loadProjectUsers();
      setSelectedUser('');
    } catch (err) {
      console.error('Error adding user:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await scopedRolesService.updateProjectRole(userId, projectId, newRole);
      await loadProjectUsers();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await scopedRolesService.removeProjectRole(userId, projectId);
      await loadProjectUsers();
    } catch (err) {
      console.error('Error removing user:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {projectName} - User Roles
      </h3>

      {/* Current Users */}
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center justify-between bg-gray-50 p-3 rounded border"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <select
                value={user.role}
                onChange={(e) => handleUpdateRole(user.user_id, e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="project_manager">Manager</option>
                <option value="project_contributor">Contributor</option>
                <option value="project_viewer">Viewer</option>
              </select>
              <button
                onClick={() => handleRemoveUser(user.user_id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add User */}
      <div className="bg-green-50 p-4 rounded border border-green-200">
        <p className="text-sm font-medium mb-2">Add User to Project:</p>
        <div className="flex gap-2">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          >
            <option value="">Select User...</option>
            {availableUsers
              .filter((u) => !users.some((ur) => ur.user_id === u.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="project_manager">Manager</option>
            <option value="project_contributor">Contributor</option>
            <option value="project_viewer">Viewer</option>
          </select>
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
