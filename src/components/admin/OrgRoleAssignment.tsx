import React, { useState, useEffect } from 'react';
import { scopedRolesService } from '@/services/scopedRolesService';
import { supabase } from '@/utils/supabase';

interface OrgRoleAssignmentProps {
  orgId: string;
  orgName?: string;
}

interface UserWithRole {
  user_id: string;
  email: string;
  name: string;
  role: string;
  can_access_all_projects: boolean;
}

export const OrgRoleAssignment: React.FC<OrgRoleAssignmentProps> = ({
  orgId,
  orgName,
}) => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('org_viewer');

  useEffect(() => {
    loadOrgUsers();
    loadAvailableUsers();
  }, [orgId]);

  const loadOrgUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('org_roles')
        .select('*, user_profiles(id, email, name)')
        .eq('org_id', orgId);

      if (error) throw error;

      setUsers(
        data?.map((r: any) => ({
          user_id: r.user_id,
          email: r.user_profiles?.email || 'Unknown',
          name: r.user_profiles?.name || 'Unknown',
          role: r.role,
          can_access_all_projects: r.can_access_all_projects,
        })) || []
      );
    } catch (err) {
      console.error('Error loading org users:', err);
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
      await scopedRolesService.assignOrgRole({
        user_id: selectedUser,
        org_id: orgId,
        role: selectedRole as any,
      });
      await loadOrgUsers();
      setSelectedUser('');
    } catch (err) {
      console.error('Error adding user:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await scopedRolesService.updateOrgRole(userId, orgId, newRole);
      await loadOrgUsers();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await scopedRolesService.removeOrgRole(userId, orgId);
      await loadOrgUsers();
    } catch (err) {
      console.error('Error removing user:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {orgName} - User Roles
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
                <option value="org_admin">Admin</option>
                <option value="org_manager">Manager</option>
                <option value="org_accountant">Accountant</option>
                <option value="org_auditor">Auditor</option>
                <option value="org_viewer">Viewer</option>
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
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <p className="text-sm font-medium mb-2">Add User to Organization:</p>
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
            <option value="org_admin">Admin</option>
            <option value="org_manager">Manager</option>
            <option value="org_accountant">Accountant</option>
            <option value="org_auditor">Auditor</option>
            <option value="org_viewer">Viewer</option>
          </select>
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
