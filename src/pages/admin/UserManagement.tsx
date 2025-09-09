import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  Avatar,
  InputAdornment,
  Alert,
  Skeleton,
  Stack,
  Checkbox,
  Toolbar,
  Collapse,
  Badge,
  FormControlLabel,
  Switch
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PermissionMatrix } from '../../components/admin/PermissionMatrix';
import { UserDialogEnhanced as UserDialog } from '../../components/admin/UserDialogEnhanced';
import { InviteUserDialog } from '../../components/admin/InviteUserDialog';
import { TestUserCreation } from '../../components/admin/TestUserCreation';
import { PERMISSIONS } from '../../constants/permissions';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  department?: string;
  job_title?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  user_roles?: { roles: Role }[];
}

interface Role {
  id: number;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRoleMap, setUserRoleMap] = useState<Record<string, Role | null>>({});
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadRoles()]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setErrorMsg(null);
    // 1) Load users without nested relationships to avoid PostgREST relationship issues
    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('email', { ascending: true });

    if (usersError) {
      console.error('Error loading users:', usersError);
      setErrorMsg(usersError.message || 'فشل تحميل المستخدمين');
      setUsers([]);
      setUserRoleMap({});
      return;
    }

    const list = usersData || [];
    setUsers(list);

    // 2) Load active role assignment per user (if any)
    if (list.length > 0) {
      const userIds = list.map(u => u.id);
      const { data: urData, error: urError } = await supabase
        .from('user_roles')
        .select('user_id, role_id, roles ( id, name, name_ar )')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (urError) {
        console.warn('Warning loading user roles (continuing without roles):', urError.message);
        setUserRoleMap({});
      } else {
        const map: Record<string, Role | null> = {};
        (urData || []).forEach((row: any) => {
          map[row.user_id] = row.roles || null;
        });
        setUserRoleMap(map);
      }
    } else {
      setUserRoleMap({});
    }
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading roles:', error);
      return;
    }
    setRoles(data || []);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRoleChange = async (userId: string, roleId: number | null) => {
    try {
      // Remove existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Add new role if selected
      if (roleId) {
        const { error } = await supabase.from('user_roles').insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: currentUser?.id,
          is_active: true
        });
        
        if (error) throw error;
      }

      await loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleUserStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = showInactive || user.is_active;
    
    return matchesSearch && matchesStatus;
  });

  const getUserRole = (user: User) => {
    return userRoleMap[user.id] || null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'لم يسجل دخول بعد';
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Bulk operations handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const userIds = new Set(filteredUsers.filter(u => u.id !== currentUser?.id).map(u => u.id));
      setSelectedUserIds(userIds);
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleBulkActivate = async (activate: boolean) => {
    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: activate })
        .in('id', userIds);
      
      if (error) throw error;
      
      await loadUsers();
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Error in bulk activate:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRoleAssignment = async (roleId: number | null) => {
    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      
      // Remove existing roles for selected users
      await supabase.from('user_roles').delete().in('user_id', userIds);
      
      // Add new role if selected
      if (roleId) {
        const insertData = userIds.map(userId => ({
          user_id: userId,
          role_id: roleId,
          assigned_by: currentUser?.id,
          is_active: true
        }));
        
        const { error } = await supabase.from('user_roles').insert(insertData);
        if (error) throw error;
      }
      
      await loadUsers();
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Error in bulk role assignment:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedUserIds.size} مستخدم؟`)) {
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      
      // First remove from user_roles
      await supabase.from('user_roles').delete().in('user_id', userIds);
      
      // Then remove from user_profiles  
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .in('id', userIds);
      
      if (error) throw error;
      
      await loadUsers();
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Error in bulk delete:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
    const csvData = selectedUsers.map(user => ({
      Email: user.email,
      FirstName: user.first_name || '',
      LastName: user.last_name || '',
      Department: user.department || '',
      JobTitle: user.job_title || '',
      Role: getUserRole(user)?.name_ar || '',
      Status: user.is_active ? 'نشط' : 'غير نشط',
      LastLogin: formatDate(user.last_login),
      CreatedAt: formatDate(user.created_at)
    }));
    
    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const isAllSelected = selectedUserIds.size > 0 && 
    selectedUserIds.size === filteredUsers.filter(u => u.id !== currentUser?.id).length;
  const isIndeterminate = selectedUserIds.size > 0 && !isAllSelected;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة المستخدمين
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            تحديث
          </Button>
          <PermissionGuard permission={PERMISSIONS.USERS_CREATE}>
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={() => setInviteDialogOpen(true)}
            >
              دعوة مستخدمين
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.USERS_CREATE}>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => {
                setSelectedUser(null);
                setEditDialogOpen(true);
              }}
            >
              مستخدم جديد
            </Button>
          </PermissionGuard>
        </Stack>
      </Stack>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Temporary Test Component - Remove after testing */}
      <TestUserCreation onUserCreated={loadUsers} />

      <Paper sx={{ mb: 2, p: 2, flexShrink: 0 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="البحث عن المستخدمين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="عرض المستخدمين غير النشطين"
            />
            
            {selectedUserIds.size > 0 && (
              <Badge badgeContent={selectedUserIds.size} color="primary">
                <Typography variant="body2" color="text.secondary">
                  {selectedUserIds.size} مستخدم محدد
                </Typography>
              </Badge>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Bulk Actions Toolbar */}
      <Collapse in={selectedUserIds.size > 0}>
        <Paper sx={{ mb: 2, p: 2, bgcolor: 'action.hover' }}>
          <Toolbar sx={{ p: 0, minHeight: 'auto !important' }}>
            <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
              {selectedUserIds.size} مستخدم محدد
            </Typography>
            
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<CheckBoxIcon />}
                onClick={() => handleBulkActivate(true)}
                disabled={bulkActionLoading}
              >
                تفعيل
              </Button>
              
              <Button
                size="small"
                startIcon={<CheckBoxOutlineBlankIcon />}
                onClick={() => handleBulkActivate(false)}
                disabled={bulkActionLoading}
              >
                إلغاء تفعيل
              </Button>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  displayEmpty
onChange={(e) => { const v = e.target.value as unknown as string; handleBulkRoleAssignment(v === '' ? null : Number(v)); }}
                  disabled={bulkActionLoading}
                  value=""
                >
                  <MenuItem value="" disabled>تعيين دور</MenuItem>
<MenuItem value="__none__">إزالة الدور</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name_ar}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={bulkActionLoading}
              >
                تصدير
              </Button>
              
              <PermissionGuard permission={PERMISSIONS.USERS_DELETE}>
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  color="error"
                >
                  حذف
                </Button>
              </PermissionGuard>
            </Stack>
          </Toolbar>
        </Paper>
      </Collapse>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TableContainer component={Paper}>
          <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={filteredUsers.filter(u => u.id !== currentUser?.id).length === 0}
                />
              </TableCell>
              <TableCell>المستخدم</TableCell>
              <TableCell>القسم</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>آخر دخول</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell padding="checkbox"><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد مستخدمين
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const userRole = getUserRole(user);
                return (
                  <TableRow key={user.id} hover selected={selectedUserIds.has(user.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        disabled={user.id === currentUser?.id}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.first_name} {user.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.department || 'غير محدد'}</TableCell>
                    <TableCell>
                      <PermissionGuard permission={PERMISSIONS.ROLES_MANAGE}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={userRole?.id || ''}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as number || null)}
                            disabled={!user.is_active}
                          >
                            <MenuItem value="">بدون دور</MenuItem>
                            {roles.map((role) => (
                              <MenuItem key={role.id} value={role.id}>
                                {role.name_ar}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </PermissionGuard>
                      {!currentUser || currentUser.id !== user.id ? null : (
                        <Chip label={userRole?.name_ar || 'بدون دور'} size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'نشط' : 'غير نشط'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleUserStatusToggle(user.id, user.is_active)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <PermissionGuard permission={PERMISSIONS.USERS_UPDATE}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </PermissionGuard>
                        <PermissionGuard permission={PERMISSIONS.ROLES_MANAGE}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedUser(user);
                              setPermissionDialogOpen(true);
                            }}
                          >
                            <SecurityIcon fontSize="small" />
                          </IconButton>
                        </PermissionGuard>
                        <PermissionGuard permission={PERMISSIONS.USERS_DELETE}>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={user.id === currentUser?.id}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </PermissionGuard>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Permission Matrix Dialog */}
      {permissionDialogOpen && selectedUser && (
        <PermissionMatrix
          open={permissionDialogOpen}
          onClose={() => setPermissionDialogOpen(false)}
          userId={selectedUser.id}
          userName={`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`}
          userEmail={selectedUser.email}
          onPermissionsUpdated={() => {
            // Optionally reload users or show success message
            console.log('Permissions updated for user:', selectedUser.id);
          }}
        />
      )}

      {/* Edit/Create User Dialog */}
      <UserDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        user={selectedUser}
        roles={roles}
        onUserSaved={() => {
          setEditDialogOpen(false);
          loadData();
        }}
      />

      {/* Invite Users Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        roles={roles}
        onInvitationsSent={() => {
          loadData(); // Refresh users after invitations sent
        }}
      />
    </Box>
  );
}
