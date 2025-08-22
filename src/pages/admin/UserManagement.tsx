import React, { useState, useEffect } from 'react';
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
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  InputAdornment,
  Alert,
  Skeleton,
  Stack
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PermissionMatrix } from '../../components/admin/PermissionMatrix';
import { UserDialogEnhanced as UserDialog } from '../../components/admin/UserDialogEnhanced';
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

  const filteredUsers = users.filter(user => 
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
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

      <Paper sx={{ mb: 3, p: 2 }}>
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
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
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
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد مستخدمين
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const userRole = getUserRole(user);
                return (
                  <TableRow key={user.id} hover>
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
    </Box>
  );
}
