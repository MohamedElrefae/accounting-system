import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
  Skeleton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Avatar,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Switch,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  alpha,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddUserIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ViewIcon from '@mui/icons-material/Visibility';
import GroupIcon from '@mui/icons-material/Group';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import ActiveIcon from '@mui/icons-material/CheckCircle';
import InactiveIcon from '@mui/icons-material/Cancel';
import SecurityIcon from '@mui/icons-material/Security';
import MoreIcon from '@mui/icons-material/MoreVert';
import ExportIcon from '@mui/icons-material/FileDownload';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TimelineIcon from '@mui/icons-material/Timeline';
import DeactivateIcon from '@mui/icons-material/PersonOff';
import InviteIcon from '@mui/icons-material/PersonAddAlt';
import ShieldIcon from '@mui/icons-material/Shield';
import PermissionIcon from '@mui/icons-material/Key';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TestUserCreation } from '../../components/admin/TestUserCreation';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  department?: string;
  job_title?: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  user_roles?: { roles: Role }[];
  role?: Role | null;
  permission_count?: number;
}

interface Role {
  id: number;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  is_system?: boolean;
}

type ViewMode = 'cards' | 'table' | 'analytics';
type SortField = 'name' | 'email' | 'role' | 'last_login' | 'created';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'inactive';
type FilterRole = 'all' | string;

export default function EnterpriseUserManagement() {
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    full_name_ar: '',
    department: '',
    job_title: '',
    phone: '',
    role_id: null as number | null,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

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
    try {
      // First, load users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('email');

      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        return;
      }

      // Then load user roles separately
      const userIds = usersData.map(u => u.id);
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles (
            id,
            name,
            name_ar,
            description,
            description_ar,
            is_system
          )
        `)
        .in('user_id', userIds);

      if (userRolesError) {
        console.warn('Warning loading user roles:', userRolesError);
      }

      // Create a map of user roles
      const roleMap: { [userId: string]: any } = {};
      userRolesData?.forEach(ur => {
        roleMap[ur.user_id] = ur.roles;
      });

      // Combine users with their roles
      const formattedUsers = usersData.map(user => ({
        ...user,
        role: roleMap[user.id] || null,
        permission_count: 0 // Will be calculated later if needed
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error loading roles:', error);
        return;
      }
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  // Filtered and sorted users
  const processedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name_ar?.includes(searchTerm) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);
      
      const matchesRole = filterRole === 'all' || 
        user.role?.id.toString() === filterRole;
      
      return matchesSearch && matchesStatus && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          const nameA = a.full_name_ar || `${a.first_name} ${a.last_name}` || a.email;
          const nameB = b.full_name_ar || `${b.first_name} ${b.last_name}` || b.email;
          comparison = nameA.localeCompare(nameB, 'ar');
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'role':
          const roleA = a.role?.name_ar || '';
          const roleB = b.role?.name_ar || '';
          comparison = roleA.localeCompare(roleB, 'ar');
          break;
        case 'last_login':
          const loginA = new Date(a.last_login || 0).getTime();
          const loginB = new Date(b.last_login || 0).getTime();
          comparison = loginA - loginB;
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [users, searchTerm, filterStatus, filterRole, sortField, sortDirection]);

  const handleEditUser = (user: User | null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        full_name_ar: user.full_name_ar || '',
        department: user.department || '',
        job_title: user.job_title || '',
        phone: user.phone || '',
        role_id: user.role?.id || null,
        is_active: user.is_active
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        full_name_ar: '',
        department: '',
        job_title: '',
        phone: '',
        role_id: null,
        is_active: true
      });
    }
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      setSaving(true);

      if (selectedUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name_ar: formData.full_name_ar,
            department: formData.department,
            job_title: formData.job_title,
            phone: formData.phone,
            is_active: formData.is_active
          })
          .eq('id', selectedUser.id);

        if (updateError) throw updateError;

        // Update role assignment
        await handleRoleUpdate(selectedUser.id, formData.role_id);
      } else {
        // Create new user via Edge Function (direct creation with temporary password)
        const payload = {
          email: formData.email,
          password: 'TempPass123',
          profile: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name_ar: formData.full_name_ar,
            department: formData.department,
            job_title: formData.job_title,
            phone: formData.phone,
            is_active: formData.is_active
          },
          role_id: formData.role_id,
          require_password_change: true
        };

        const { error } = await supabase.functions.invoke('admin-create-user', { body: payload });
        if (error) throw error;
      }

      await loadUsers();
      setEditDialogOpen(false);
      alert('تم حفظ بيانات المستخدم بنجاح');
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('فشل حفظ بيانات المستخدم: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleUpdate = async (userId: string, roleId: number | null) => {
    try {
      // Remove existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Add new role if selected
      if (roleId) {
        const { error } = await supabase.from('user_roles').insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: currentUser?.id
        });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      await loadUsers();
      alert(currentStatus ? 'تم إلغاء تفعيل المستخدم' : 'تم تفعيل المستخدم');
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert('فشل تغيير حالة المستخدم');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${email}"؟`)) return;

    try {
      // Remove user roles first
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Delete user profile
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      await loadUsers();
      alert('تم حذف المستخدم بنجاح');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('فشل حذف المستخدم');
    }
  };

  const getUserStatusIcon = (isActive: boolean) => {
    return isActive ? <ActiveIcon color="success" /> : <InactiveIcon color="error" />;
  };

  const getUserStatusColor = (isActive: boolean): 'success' | 'error' => {
    return isActive ? 'success' : 'error';
  };

  const getRoleIcon = (role: Role | null) => {
    if (!role) return <PersonIcon />;
    if (role.is_system) return <ShieldIcon />;
    return <AdminIcon />;
  };

  const getRoleColor = (role: Role | null): 'primary' | 'secondary' | 'error' | 'warning' => {
    if (!role) return 'secondary';
    if (role.is_system) return 'error';
    if (role.name.includes('admin')) return 'warning';
    return 'primary';
  };

  const exportUsers = () => {
    const data = processedUsers.map(user => ({
      'البريد الإلكتروني': user.email,
      'الاسم الكامل': user.full_name_ar || `${user.first_name} ${user.last_name}`,
      'القسم': user.department || '',
      'المسمى الوظيفي': user.job_title || '',
      'الهاتف': user.phone || '',
      'الدور': user.role?.name_ar || 'بلا دور',
      'الحالة': user.is_active ? 'نشط' : 'غير نشط',
      'آخر دخول': user.last_login ? new Date(user.last_login).toLocaleDateString('ar-SA') : 'لم يدخل',
      'تاريخ الإنشاء': new Date(user.created_at).toLocaleDateString('ar-SA')
    }));
    
    console.log('Exporting users:', data);
    alert('تم التصدير بنجاح');
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const inactive = total - active;
    const withRoles = users.filter(u => u.role).length;
    const admins = users.filter(u => u.role?.name.includes('admin')).length;
    
    return { total, active, inactive, withRoles, admins };
  }, [users]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, background: alpha(theme.palette.primary.main, 0.04) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              إدارة المستخدمين المتقدمة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              نظام شامل لإدارة حسابات المستخدمين وأدوارهم وصلاحياتهم
            </Typography>
          </Box>
          
          {/* Quick Stats */}
          <Stack direction="row" spacing={2}>
            <Card elevation={1} sx={{ minWidth: 120, textAlign: 'center' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  {analytics.active}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  مستخدم نشط
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={1} sx={{ minWidth: 120, textAlign: 'center' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h6" color="secondary.main" fontWeight="bold">
                  {analytics.withRoles}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  لديه دور
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={1} sx={{ minWidth: 120, textAlign: 'center' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h6" color="warning.main" fontWeight="bold">
                  {analytics.admins}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  مدير
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="تصدير البيانات">
              <IconButton onClick={exportUsers}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="دعوة مستخدم جديد">
              <IconButton onClick={() => setInviteDialogOpen(true)}>
                <InviteIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddUserIcon />}
              onClick={() => handleEditUser(null)}
              sx={{ px: 3 }}
            >
              مستخدم جديد
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Temporary Test - remove after confirming function works */}
      <TestUserCreation onUserCreated={loadUsers} />

      {/* Filters and Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="البحث في المستخدمين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>ترتيب حسب</InputLabel>
            <Select
              value={sortField}
              label="ترتيب حسب"
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <MenuItem value="name">الاسم</MenuItem>
              <MenuItem value="email">البريد الإلكتروني</MenuItem>
              <MenuItem value="role">الدور</MenuItem>
              <MenuItem value="last_login">آخر دخول</MenuItem>
              <MenuItem value="created">تاريخ الإنشاء</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={filterStatus}
              label="الحالة"
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="inactive">غير نشط</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>الدور</InputLabel>
            <Select
              value={filterRole}
              label="الدور"
              onChange={(e) => setFilterRole(e.target.value as FilterRole)}
            >
              <MenuItem value="all">جميع الأدوار</MenuItem>
              {roles.map(role => (
                <MenuItem key={role.id} value={role.id.toString()}>
                  {role.name_ar}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Tabs
            value={viewMode}
            onChange={(_, newValue) => setViewMode(newValue)}
            sx={{ minHeight: 'auto' }}
          >
            <Tab icon={<GroupIcon />} value="cards" label="بطاقات" />
            <Tab icon={<ViewIcon />} value="table" label="جدول" />
            <Tab icon={<AnalyticsIcon />} value="analytics" label="تحليلات" />
          </Tabs>
        </Stack>

        {selectedUsers.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            تم تحديد {selectedUsers.length} مستخدم
            <Button size="small" onClick={() => setSelectedUsers([])}>
              مسح التحديد
            </Button>
          </Alert>
        )}
      </Paper>

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {viewMode === 'cards' && (
          <Grid container spacing={3}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Grid item xs={12} md={6} lg={4} key={i}>
                  <Skeleton variant="rectangular" height={280} />
                </Grid>
              ))
            ) : (
              processedUsers.map((user) => (
                <Grid item xs={12} md={6} lg={4} key={user.id}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      transition: 'all 0.3s ease',
                      border: selectedUsers.includes(user.id) ? 2 : 1,
                      borderColor: selectedUsers.includes(user.id) 
                        ? 'primary.main' 
                        : alpha(theme.palette.divider, 0.2),
                      '&:hover': {
                        elevation: 8,
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{
                              bgcolor: user.is_active ? 'primary.main' : 'grey.400',
                              width: 50,
                              height: 50
                            }}
                          >
                            {user.full_name_ar 
                              ? user.full_name_ar.charAt(0)
                              : user.first_name?.charAt(0) || user.email.charAt(0).toUpperCase()
                            }
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                              {user.full_name_ar || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <Checkbox
                            size="small"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              setMenuAnchor(e.currentTarget);
                              setSelectedUserForMenu(user);
                            }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Stack spacing={1} mb={2}>
                        {user.job_title && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {user.job_title}
                            </Typography>
                          </Stack>
                        )}
                        {user.department && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {user.department}
                            </Typography>
                          </Stack>
                        )}
                        {user.phone && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {user.phone}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                        <Chip 
                          icon={getUserStatusIcon(user.is_active)}
                          label={user.is_active ? 'نشط' : 'غير نشط'}
                          size="small"
                          color={getUserStatusColor(user.is_active)}
                        />
                        {user.role && (
                          <Chip 
                            icon={getRoleIcon(user.role)}
                            label={user.role.name_ar}
                            size="small"
                            color={getRoleColor(user.role)}
                            variant="outlined"
                          />
                        )}
                        {user.permission_count && user.permission_count > 0 && (
                          <Chip 
                            icon={<PermissionIcon />}
                            label={`${user.permission_count} صلاحية`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      {user.last_login && (
                        <Typography variant="caption" color="text.secondary">
                          آخر دخول: {new Date(user.last_login).toLocaleDateString('ar-SA')}
                        </Typography>
                      )}
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditUser(user)}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="small"
                        startIcon={<SecurityIcon />}
                        color="info"
                        onClick={() => {
                          setSelectedUser(user);
                          setPermissionDialogOpen(true);
                        }}
                      >
                        الصلاحيات
                      </Button>
                      <Button
                        size="small"
                        startIcon={user.is_active ? <DeactivateIcon /> : <ActiveIcon />}
                        color={user.is_active ? 'error' : 'success'}
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        {user.is_active ? 'إلغاء تفعيل' : 'تفعيل'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {viewMode === 'table' && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < processedUsers.length}
                      checked={processedUsers.length > 0 && selectedUsers.length === processedUsers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(processedUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'name'}
                      direction={sortDirection}
                      onClick={() => {
                        if (sortField === 'name') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      المستخدم
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>معلومات الاتصال</TableCell>
                  <TableCell>الدور</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>آخر دخول</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedUsers.map((user) => (
                  <TableRow key={user.id} hover selected={selectedUsers.includes(user.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor: user.is_active ? 'primary.main' : 'grey.400',
                            width: 40,
                            height: 40
                          }}
                        >
                          {user.full_name_ar 
                            ? user.full_name_ar.charAt(0)
                            : user.first_name?.charAt(0) || user.email.charAt(0).toUpperCase()
                          }
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.full_name_ar || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.job_title} {user.department && `- ${user.department}`}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <EmailIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{user.email}</Typography>
                        </Stack>
                        {user.phone && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <PhoneIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption">{user.phone}</Typography>
                          </Stack>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {user.role ? (
                        <Chip 
                          icon={getRoleIcon(user.role)}
                          label={user.role.name_ar}
                          size="small"
                          color={getRoleColor(user.role)}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          بلا دور
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={getUserStatusIcon(user.is_active)}
                        label={user.is_active ? 'نشط' : 'غير نشط'}
                        size="small"
                        color={getUserStatusColor(user.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString('ar-SA')
                          : 'لم يدخل'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => handleEditUser(user)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="info" onClick={() => {
                          setSelectedUser(user);
                          setPermissionDialogOpen(true);
                        }}>
                          <SecurityIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color={user.is_active ? 'error' : 'success'}
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? <DeactivateIcon /> : <ActiveIcon />}
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {viewMode === 'analytics' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>إحصائيات المستخدمين</Typography>
                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">المستخدمون النشطون</Typography>
                      <Typography variant="body2" fontWeight="bold">{analytics.active}</Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={(analytics.active / analytics.total) * 100} 
                      color="success"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">لديهم أدوار</Typography>
                      <Typography variant="body2" fontWeight="bold">{analytics.withRoles}</Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={(analytics.withRoles / analytics.total) * 100} 
                      color="primary"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">المديرون</Typography>
                      <Typography variant="body2" fontWeight="bold">{analytics.admins}</Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={(analytics.admins / analytics.total) * 100} 
                      color="warning"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>توزيع الأدوار</Typography>
                <Stack spacing={1}>
                  {roles.map(role => {
                    const count = users.filter(u => u.role?.id === role.id).length;
                    return (
                      <Stack key={role.id} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{role.name_ar}</Typography>
                        <Chip label={count} size="small" color="primary" />
                      </Stack>
                    );
                  })}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">بلا دور</Typography>
                    <Chip label={users.filter(u => !u.role).length} size="small" color="default" />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuList>
          <MenuItem onClick={() => {
            handleEditUser(selectedUserForMenu!);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>تعديل</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            setSelectedUser(selectedUserForMenu);
            setPermissionDialogOpen(true);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><SecurityIcon /></ListItemIcon>
            <ListItemText>إدارة الصلاحيات</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><TimelineIcon /></ListItemIcon>
            <ListItemText>سجل النشاط</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => {
              handleToggleUserStatus(selectedUserForMenu!.id, selectedUserForMenu!.is_active);
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              {selectedUserForMenu?.is_active ? <DeactivateIcon /> : <ActiveIcon />}
            </ListItemIcon>
            <ListItemText>
              {selectedUserForMenu?.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
            </ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => {
              handleDeleteUser(selectedUserForMenu!.id, selectedUserForMenu!.email);
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>حذف</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <PersonIcon color="primary" />
            <Typography variant="h6">
              {selectedUser ? 'تعديل المستخدم' : 'مستخدم جديد'}
            </Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={Boolean(selectedUser)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>الدور</InputLabel>
                  <Select
                    value={formData.role_id || ''}
                    label="الدور"
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value as number })}
                  >
                    <MenuItem value="">بلا دور</MenuItem>
                    {roles.map(role => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name_ar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الاسم الأول"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الاسم الأخير"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الاسم الكامل بالعربية"
                  value={formData.full_name_ar}
                  onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="القسم"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المسمى الوظيفي"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="حساب نشط"
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={saving || !formData.email}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission Dialog Placeholder */}
      <Dialog
        open={permissionDialogOpen}
        onClose={() => setPermissionDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>إدارة صلاحيات المستخدم</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            سيتم تطوير واجهة إدارة الصلاحيات لاحقاً. حالياً يمكن تعيين الأدوار فقط.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Dialog Placeholder */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>دعوة مستخدم جديد</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            سيتم تطوير نظام الدعوات عبر البريد الإلكتروني لاحقاً.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
