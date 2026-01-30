import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  IconButton,
  Checkbox,
  Typography,
  alpha,
  useTheme,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import { scopedRolesService } from '@/services/scopedRolesService';
import { permissionAuditService } from '@/services/permissionAuditService';
import { supabase } from '@/utils/supabase';

interface OrgRoleAssignmentEnhancedProps {
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

const roleOptions = [
  { value: 'org_admin', label: 'Admin', color: 'error' },
  { value: 'org_manager', label: 'Manager', color: 'warning' },
  { value: 'org_accountant', label: 'Accountant', color: 'info' },
  { value: 'org_auditor', label: 'Auditor', color: 'success' },
  { value: 'org_viewer', label: 'Viewer', color: 'default' },
];

export const OrgRoleAssignmentEnhanced: React.FC<OrgRoleAssignmentEnhancedProps> = ({
  orgId,
  orgName = 'Organization',
}) => {
  const theme = useTheme();

  // State
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('org_viewer');
  const [canAccessAll, setCanAccessAll] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('org_viewer');
  const [editingCanAccessAll, setEditingCanAccessAll] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [orgId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([loadOrgUsers(), loadAvailableUsers()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

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
      throw err;
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
      throw err;
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setSaving(true);

      const user = availableUsers.find((u) => u.id === selectedUser);
      await scopedRolesService.assignOrgRole({
        user_id: selectedUser,
        org_id: orgId,
        role: selectedRole as any,
        can_access_all_projects: canAccessAll,
      });

      // Log to audit trail
      await permissionAuditService.logPermissionChange(
        orgId,
        'CREATE',
        'org_role',
        selectedUser,
        null,
        { role: selectedRole, can_access_all_projects: canAccessAll },
        `Assigned ${selectedRole} to ${user?.name} (${user?.email}) in ${orgName}`
      );

      await loadOrgUsers();
      setSelectedUser('');
      setSelectedRole('org_viewer');
      setCanAccessAll(false);
      setAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUserId(user.user_id);
    setEditingRole(user.role);
    setEditingCanAccessAll(user.can_access_all_projects);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;

    try {
      setSaving(true);

      const user = users.find((u) => u.user_id === editingUserId);
      const oldRole = user?.role;
      const oldCanAccessAll = user?.can_access_all_projects;

      await scopedRolesService.assignOrgRole({
        user_id: editingUserId,
        org_id: orgId,
        role: editingRole as any,
        can_access_all_projects: editingCanAccessAll,
      });

      // Log to audit trail
      await permissionAuditService.logPermissionChange(
        orgId,
        'UPDATE',
        'org_role',
        editingUserId,
        { role: oldRole, can_access_all_projects: oldCanAccessAll },
        { role: editingRole, can_access_all_projects: editingCanAccessAll },
        `Updated role for ${user?.name} (${user?.email}) in ${orgName}`
      );

      await loadOrgUsers();
      setEditDialogOpen(false);
      setEditingUserId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Remove this user from the organization?')) return;

    try {
      setSaving(true);

      const user = users.find((u) => u.user_id === userId);
      await scopedRolesService.removeOrgRole(userId, orgId);

      // Log to audit trail
      await permissionAuditService.logPermissionChange(
        orgId,
        'DELETE',
        'org_role',
        userId,
        { role: user?.role, can_access_all_projects: user?.can_access_all_projects },
        null,
        `Removed ${user?.role} from ${user?.name} (${user?.email}) in ${orgName}`
      );

      await loadOrgUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing user');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    return roleOption?.color || 'default';
  };

  const getRoleLabel = (role: string) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    return roleOption?.label || role;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, background: alpha(theme.palette.primary.main, 0.04) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              Organization Role Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orgName}
            </Typography>
          </Box>
          <IconButton onClick={loadData} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {/* Users Table */}
          {users.length > 0 ? (
            <TableContainer component={Paper} sx={{ mb: 2, flexGrow: 1, overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="center">All Projects</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id} hover>
                      <TableCell fontWeight={600}>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          size="small"
                          color={getRoleColor(user.role) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox checked={user.can_access_all_projects} disabled />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                          disabled={saving}
                          title="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveUser(user.user_id)}
                          disabled={saving}
                          title="Remove"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 2, flexGrow: 1 }}>
              <Typography color="text.secondary">No users assigned to this organization</Typography>
            </Paper>
          )}

          {/* Add User Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            disabled={saving}
          >
            Add User to Organization
          </Button>

          {/* Add User Dialog */}
          <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add User to Organization</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>User</InputLabel>
                  <Select
                    value={selectedUser}
                    label="User"
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    {availableUsers
                      .filter((u) => !users.some((ur) => ur.user_id === u.id))
                      .map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Role"
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {roleOptions.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={canAccessAll}
                      onChange={(e) => setCanAccessAll(e.target.checked)}
                    />
                  }
                  label="Can Access All Projects"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddUser}
                variant="contained"
                disabled={!selectedUser || !selectedRole || saving}
              >
                {saving ? 'Adding...' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {users.find((u) => u.user_id === editingUserId)?.name}
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={editingRole}
                    label="Role"
                    onChange={(e) => setEditingRole(e.target.value)}
                  >
                    {roleOptions.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingCanAccessAll}
                      onChange={(e) => setEditingCanAccessAll(e.target.checked)}
                    />
                  }
                  label="Can Access All Projects"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSaveEdit}
                variant="contained"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};
