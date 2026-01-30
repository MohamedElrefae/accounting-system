import React, { useState, useEffect } from 'react';
import {
  Box,
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
  TextField,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { scopedRolesService } from '@/services/scopedRolesService';
import { permissionAuditService } from '@/services/permissionAuditService';
import { supabase } from '@/utils/supabase';

interface ProjectRoleAssignmentEnhancedProps {
  projectId: string;
  projectName?: string;
  orgId?: string;
}

interface UserWithRole {
  user_id: string;
  email: string;
  name: string;
  role: string;
  date_added?: string;
}

interface AvailableUser {
  id: string;
  email: string;
  name: string;
}

const PROJECT_ROLES = [
  { value: 'project_manager', label: 'مدير المشروع', labelEn: 'Manager' },
  { value: 'project_contributor', label: 'مساهم', labelEn: 'Contributor' },
  { value: 'project_viewer', label: 'عارض', labelEn: 'Viewer' },
];

export const ProjectRoleAssignmentEnhanced: React.FC<ProjectRoleAssignmentEnhancedProps> = ({
  projectId,
  projectName = 'Project',
  orgId,
}) => {
  const theme = useTheme();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('project_viewer');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  // Filter and search
  const [filterRole, setFilterRole] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadProjectUsers();
    loadAvailableUsers();
  }, [projectId]);

  const loadProjectUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('project_roles')
        .select('*, user_profiles(id, email, name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setUsers(
        data?.map((r: any) => ({
          user_id: r.user_id,
          email: r.user_profiles?.email || 'Unknown',
          name: r.user_profiles?.name || 'Unknown',
          role: r.role,
          date_added: r.created_at,
        })) || []
      );
    } catch (err: any) {
      console.error('Error loading project users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .order('name');

      if (err) throw err;
      setAvailableUsers(data || []);
    } catch (err: any) {
      console.error('Error loading available users:', err);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await scopedRolesService.assignProjectRole({
        user_id: selectedUser,
        project_id: projectId,
        role: selectedRole as any,
      });

      // Log audit
      const user = availableUsers.find((u) => u.id === selectedUser);
      await permissionAuditService.logPermissionChange(
        orgId || projectId,
        'ASSIGN',
        'project_role',
        selectedUser,
        null,
        { role: selectedRole },
        `Added user ${user?.name} to project ${projectName}`
      );

      setSuccess(`User added to project successfully`);
      setTimeout(() => setSuccess(null), 3000);

      await loadProjectUsers();
      setAddDialogOpen(false);
      setSelectedUser('');
      setSelectedRole('project_viewer');
    } catch (err: any) {
      console.error('Error adding user:', err);
      setError(err.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      setLoading(true);
      setError(null);

      const user = users.find((u) => u.user_id === userId);
      const oldRole = user?.role;

      await scopedRolesService.updateProjectRole(userId, projectId, newRole);

      // Log audit
      await permissionAuditService.logPermissionChange(
        orgId || projectId,
        'MODIFY',
        'project_role',
        userId,
        { role: oldRole },
        { role: newRole },
        `Updated role for ${user?.name} in project ${projectName}`
      );

      setSuccess(`Role updated successfully`);
      setTimeout(() => setSuccess(null), 3000);

      await loadProjectUsers();
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const user = users.find((u) => u.user_id === userId);

      await scopedRolesService.removeProjectRole(userId, projectId);

      // Log audit
      await permissionAuditService.logPermissionChange(
        orgId || projectId,
        'REVOKE',
        'project_role',
        userId,
        { role: user?.role },
        null,
        `Removed user ${user?.name} from project ${projectName}`
      );

      setSuccess(`User removed from project`);
      setTimeout(() => setSuccess(null), 3000);

      await loadProjectUsers();
      setSelectedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error removing user:', err);
      setError(err.message || 'Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select users to remove');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      for (const userId of selectedUsers) {
        const user = users.find((u) => u.user_id === userId);
        await scopedRolesService.removeProjectRole(userId, projectId);

        // Log audit
        await permissionAuditService.logPermissionChange(
          orgId || projectId,
          'REVOKE',
          'project_role',
          userId,
          { role: user?.role },
          null,
          `Bulk removed user ${user?.name} from project ${projectName}`
        );
      }

      setSuccess(`${selectedUsers.size} users removed from project`);
      setTimeout(() => setSuccess(null), 3000);

      await loadProjectUsers();
      setSelectedUsers(new Set());
    } catch (err: any) {
      console.error('Error bulk removing users:', err);
      setError(err.message || 'Failed to remove users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.user_id)));
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesSearch =
      !searchText ||
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleLabel = (role: string) => {
    const roleObj = PROJECT_ROLES.find((r) => r.value === role);
    return roleObj?.label || role;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'project_manager':
        return 'error';
      case 'project_contributor':
        return 'warning';
      case 'project_viewer':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {projectName} - إدارة أدوار المستخدمين
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {projectName} - User Roles Management
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadProjectUsers}
                disabled={loading}
              >
                تحديث
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                disabled={loading}
              >
                إضافة مستخدم
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              placeholder="البحث عن المستخدم..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ flex: 1 }}
              size="small"
            />
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>تصفية حسب الدور</InputLabel>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                label="تصفية حسب الدور"
              >
                <MenuItem value="">الكل</MenuItem>
                {PROJECT_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUsers.size === filteredUsers.length
                      }
                      indeterminate={
                        selectedUsers.size > 0 && selectedUsers.size < filteredUsers.length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>البريد الإلكتروني</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الدور</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>تاريخ الإضافة</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    الإجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        لا توجد مستخدمين في هذا المشروع
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.user_id}
                      sx={{
                        backgroundColor: selectedUsers.has(user.user_id)
                          ? alpha(theme.palette.primary.main, 0.08)
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.has(user.user_id)}
                          onChange={() => handleSelectUser(user.user_id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {user.date_added
                          ? new Date(user.date_added).toLocaleDateString('ar-SA')
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingUser(user);
                              setSelectedRole(user.role);
                              setEditDialogOpen(true);
                            }}
                            title="تعديل"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveUser(user.user_id)}
                            title="حذف"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
        {selectedUsers.size > 0 && (
          <CardActions>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {selectedUsers.size} مستخدم محدد
            </Typography>
            <Button
              color="error"
              onClick={handleBulkRemove}
              disabled={loading}
              startIcon={<DeleteIcon />}
            >
              حذف المحددين
            </Button>
          </CardActions>
        )}
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مستخدم إلى المشروع</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>اختر المستخدم</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="اختر المستخدم"
              >
                <MenuItem value="">-- اختر --</MenuItem>
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
              <InputLabel>اختر الدور</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="اختر الدور"
              >
                {PROJECT_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            disabled={loading || !selectedUser}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل دور المستخدم</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingUser && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  المستخدم
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {editingUser.name} ({editingUser.email})
                </Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel>اختر الدور الجديد</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  label="اختر الدور الجديد"
                >
                  {PROJECT_ROLES.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={() => editingUser && handleUpdateRole(editingUser.user_id, selectedRole)}
            variant="contained"
            disabled={loading}
          >
            تحديث
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
