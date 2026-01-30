import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectMembersWithDetails,
  addUserToProject,
  removeUserFromProject,
  updateProjectMembership,
} from '../../services/projectMemberships'
import { getOrganizationUsers } from '../../services/organization'
import './ProjectMembersManager.css'

interface ProjectMembersManagerProps {
  projectId: string
  orgId: string
  onClose?: () => void
}

export const ProjectMembersManager: React.FC<ProjectMembersManagerProps> = ({
  projectId,
  orgId,
  onClose,
}) => {
  const queryClient = useQueryClient()
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'viewer'>('member')

  // Fetch project members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => getProjectMembersWithDetails(projectId),
  })

  // Fetch available users
  const { data: availableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['orgUsers', orgId],
    queryFn: () => getOrganizationUsers(orgId),
  })

  // Get users not yet added to project
  const memberUserIds = new Set(members.map(m => m.user_id))
  const availableUsersForProject = availableUsers.filter((u: any) => !memberUserIds.has(u.id))

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return addUserToProject(projectId, userId, orgId, selectedRole)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
      setSelectedUserIds([])
    },
  })

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      return removeUserFromProject(membershipId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: string }) => {
      return updateProjectMembership(membershipId, { role: role as any })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
    },
  })

  const handleAddUsers = async () => {
    for (const userId of selectedUserIds) {
      await addUserMutation.mutateAsync(userId)
    }
  }

  return (
    <div className="project-members-manager">
      <div className="members-header">
        <h3>Project Members</h3>
        {onClose && <button onClick={onClose} className="close-btn">×</button>}
      </div>

      {/* Current Members */}
      <div className="members-section">
        <h4>Current Members ({members.length})</h4>
        {membersLoading ? (
          <p>Loading members...</p>
        ) : members.length === 0 ? (
          <p className="empty-state">No members assigned yet</p>
        ) : (
          <div className="members-list">
            {members.map(member => (
              <div key={member.id} className="member-item">
                <div className="member-info">
                  <div className="member-name">{member.user_name || 'Unknown'}</div>
                  <div className="member-email">{member.user_email}</div>
                </div>
                <div className="member-controls">
                  <select
                    value={member.role}
                    onChange={e =>
                      updateRoleMutation.mutate({
                        membershipId: member.id,
                        role: e.target.value,
                      })
                    }
                    className="role-select"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => removeUserMutation.mutate(member.id)}
                    className="remove-btn"
                    disabled={removeUserMutation.isPending}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Members */}
      <div className="add-members-section">
        <h4>Add Members</h4>
        {usersLoading ? (
          <p>Loading users...</p>
        ) : availableUsersForProject.length === 0 ? (
          <p className="empty-state">All organization users are already members</p>
        ) : (
          <>
            <div className="add-members-form">
              <div className="form-group">
                <label>Select Users</label>
                <div className="users-list">
                  {availableUsersForProject.map((user: any) => (
                    <label key={user.id} className="user-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedUserIds([...selectedUserIds, user.id])
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                          }
                        }}
                      />
                      <span>{user.name || 'Unknown'}</span>
                      <span className="user-email">({user.email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as any)}
                  className="role-select"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <button
                onClick={handleAddUsers}
                disabled={selectedUserIds.length === 0 || addUserMutation.isPending}
                className="add-btn"
              >
                {addUserMutation.isPending ? 'Adding...' : `Add ${selectedUserIds.length} User(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ProjectMembersManager
