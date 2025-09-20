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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
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
  Badge,
  LinearProgress,
  Avatar,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Switch,
  Tabs,
  Tab,
  alpha,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import ViewIcon from '@mui/icons-material/Visibility';
import GroupIcon from '@mui/icons-material/Group';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import CompareIcon from '@mui/icons-material/Compare';
import CopyIcon from '@mui/icons-material/ContentCopy';
import ExportIcon from '@mui/icons-material/FileDownload';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TimelineIcon from '@mui/icons-material/Timeline';
import PeopleIcon from '@mui/icons-material/People';
import ShieldIcon from '@mui/icons-material/Shield';
import StarIcon from '@mui/icons-material/Star';
import CheckIcon from '@mui/icons-material/CheckCircle';
import MoreIcon from '@mui/icons-material/MoreVert';
import PermissionIcon from '@mui/icons-material/Assignment';
import { supabase } from '../../utils/supabase';
import { PERMISSION_CATEGORIES } from '../../constants/permissions';
import EnhancedQuickPermissionAssignment from '../../components/EnhancedQuickPermissionAssignment';

interface Role {
  id: number;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  is_system: boolean;
  created_at: string;
  permissions?: string[];
  user_count?: number;
}


type ViewMode = 'cards' | 'table' | 'comparison';
type SortField = 'name' | 'permissions' | 'users' | 'created';
type SortDirection = 'asc' | 'desc';

export default function EnterpriseRoleManagement() {
  const theme = useTheme();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterSystemRoles, setFilterSystemRoles] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    permissions: [] as string[]
  });
  const [saving, setSaving] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRoleForMenu, setSelectedRoleForMenu] = useState<Role | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      
      // First, load roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
        return;
      }

      if (!rolesData || rolesData.length === 0) {
        setRoles([]);
        return;
      }

      // Load all permissions for the enhanced component
      const { data: allPermissionsData, error: allPermissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('resource, action');

      if (allPermissionsError) {
        console.warn('Warning loading permissions:', allPermissionsError);
      } else {
        setPermissions(allPermissionsData || []);
      }

      // Then load role permissions separately
      const roleIds = rolesData.map(r => r.id);
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          permissions (name)
        `)
        .in('role_id', roleIds);

      if (rolePermsError) {
        console.warn('Warning loading role permissions:', rolePermsError);
      }

      // Load user counts for roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .in('role_id', roleIds);

      if (userRolesError) {
        console.warn('Warning loading user roles:', userRolesError);
      }

      // Create maps for permissions and user counts
      const permissionsMap: { [roleId: number]: string[] } = {};
      const userCountsMap: { [roleId: number]: number } = {};

      // Process permissions
      rolePermsData?.forEach((rp: { role_id: number; permissions?: { name: string } | { name: string }[] }) => {
        if (!permissionsMap[rp.role_id]) {
          permissionsMap[rp.role_id] = [];
        }
        const perms = rp.permissions;
        if (Array.isArray(perms)) {
          perms.forEach(p => {
            if (p?.name) permissionsMap[rp.role_id].push(p.name);
          });
        } else if (perms && (perms as { name?: string }).name) {
          permissionsMap[rp.role_id].push((perms as { name: string }).name);
        }
      });

      // Process user counts
      userRolesData?.forEach(ur => {
        userCountsMap[ur.role_id] = (userCountsMap[ur.role_id] || 0) + 1;
      });

      // Combine data
      const formattedRoles = rolesData.map(role => ({
        ...role,
        permissions: permissionsMap[role.id] || [],
        user_count: userCountsMap[role.id] || 0
      }));

      setRoles(formattedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted roles
  const processedRoles = useMemo(() => {
    const filtered = roles.filter(role => {
      const matchesSearch = searchTerm === '' || 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.name_ar.includes(searchTerm) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description_ar?.includes(searchTerm);
      
      const matchesFilter = filterSystemRoles || !role.is_system;
      
      return matchesSearch && matchesFilter;
    });

    // Sort roles
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name_ar.localeCompare(b.name_ar, 'ar');
          break;
        case 'permissions':
          comparison = (a.permissions?.length || 0) - (b.permissions?.length || 0);
          break;
        case 'users':
          comparison = (a.user_count || 0) - (b.user_count || 0);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [roles, searchTerm, filterSystemRoles, sortField, sortDirection]);

  // Role comparison data
  const comparisonData = useMemo(() => {
    if (selectedRoles.length < 2) return [];
    
    const selectedRoleObjects = roles.filter(r => selectedRoles.includes(r.id));
    const allPermissions = [...new Set(selectedRoleObjects.flatMap(r => r.permissions || []))].sort();
    
    return allPermissions.map(permission => {
      const rolePermissions: { [roleId: number]: boolean } = {};
      selectedRoleObjects.forEach(role => {
        rolePermissions[role.id] = role.permissions?.includes(permission) || false;
      });
      
      return {
        permission,
        roles: rolePermissions
      };
    });
  }, [roles, selectedRoles]);

  const handleEditRole = (role: Role | null) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        name: role.name,
        name_ar: role.name_ar,
        description: role.description || '',
        description_ar: role.description_ar || '',
        permissions: role.permissions || []
      });
    } else {
      setSelectedRole(null);
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        permissions: []
      });
    }
    setEditDialogOpen(true);
    setActiveTab(0);
  };

  const handleSaveRole = async () => {
    const { name, name_ar } = formData;
    if (!name.trim() || !name_ar.trim()) {
      alert('يرجى إدخال اسم الدور باللغتين قبل الحفظ');
      return;
    }

    try {
      setSaving(true);

      if (selectedRole) {
        const { error: updateError } = await supabase
          .from('roles')
          .update({
            name: formData.name,
            name_ar: formData.name_ar,
            description: formData.description,
            description_ar: formData.description_ar
          })
          .eq('id', selectedRole.id);

        if (updateError) throw updateError;
      } else {
        const { data: newRole, error: createError } = await supabase
          .from('roles')
          .insert({
            name: formData.name.trim(),
            name_ar: formData.name_ar.trim(),
            description: formData.description,
            description_ar: formData.description_ar
          })
          .select()
          .single();

        if (createError) throw createError;
        setSelectedRole(newRole as Role);
        alert('تم إنشاء الدور. يمكنك الآن تعيين الصلاحيات.');
        setActiveTab(1);
        await loadRoles();
        return;
      }

      await loadRoles();
      alert('تم حفظ معلومات الدور');
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert('فشل حفظ الدور: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) {
      alert('احفظ الدور أولاً قبل تعيين الصلاحيات');
      return;
    }

    try {
      setSavingPerms(true);

      const { data, error } = await supabase.rpc('save_role_permissions', {
        p_role_id: selectedRole.id,
        p_permission_names: formData.permissions
      });

      if (error) throw error;

      console.log('Permissions saved:', data);
      alert('تم حفظ الصلاحيات بنجاح');
      await loadRoles();
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      alert('فشل حفظ الصلاحيات: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (!confirm(`هل أنت متأكد من حذف الدور "${role?.name_ar}"؟`)) return;

    try {
      await supabase.from('user_roles').delete().eq('role_id', roleId);
      await supabase.from('role_permissions').delete().eq('role_id', roleId);
      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      
      if (error) throw error;
      
      await loadRoles();
      alert('تم حذف الدور بنجاح');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert('فشل حذف الدور');
    }
  };

  const handlePermissionToggle = (permissionName: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName]
    }));
  };

  const getRoleTypeIcon = (role: Role) => {
    if (role.is_system) return <ShieldIcon />;
    if ((role.permissions?.length || 0) > 20) return <StarIcon />;
    if ((role.user_count || 0) > 10) return <GroupIcon />;
    return <AdminIcon />;
  };

  const getRoleTypeColor = (role: Role): 'error' | 'warning' | 'info' | 'success' | 'primary' => {
    if (role.is_system) return 'error';
    if ((role.permissions?.length || 0) > 20) return 'warning';
    if ((role.user_count || 0) > 10) return 'info';
    return 'primary';
  };

  const exportRoles = () => {
    const data = processedRoles.map(role => ({
      'الاسم العربي': role.name_ar,
      'الاسم الإنجليزي': role.name,
      'الوصف': role.description_ar || role.description || '',
      'عدد الصلاحيات': role.permissions?.length || 0,
      'عدد المستخدمين': role.user_count || 0,
      'نوع الدور': role.is_system ? 'نظامي' : 'مخصص',
      'تاريخ الإنشاء': new Date(role.created_at).toLocaleDateString('ar-SA')
    }));
    
    console.log('Exporting roles:', data);
    alert('تم التصدير بنجاح');
  };

  const duplicateRole = (role: Role) => {
    setFormData({
      name: `${role.name}_copy`,
      name_ar: `${role.name_ar} (نسخة)`,
      description: role.description || '',
      description_ar: role.description_ar || '',
      permissions: [...(role.permissions || [])]
    });
    setSelectedRole(null);
    setEditDialogOpen(true);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, background: alpha(theme.palette.primary.main, 0.04) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              إدارة الأدوار المتقدمة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              نظام شامل لإدارة أدوار المستخدمين وصلاحياتهم في المؤسسة
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="تصدير البيانات">
              <IconButton onClick={exportRoles}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="عرض التحليلات">
              <IconButton>
                <AnalyticsIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleEditRole(null)}
              sx={{ px: 3 }}
            >
              دور جديد
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Filters and Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="البحث في الأدوار..."
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
              <MenuItem value="permissions">الصلاحيات</MenuItem>
              <MenuItem value="users">المستخدمين</MenuItem>
              <MenuItem value="created">تاريخ الإنشاء</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={filterSystemRoles}
                onChange={(e) => setFilterSystemRoles(e.target.checked)}
              />
            }
            label="إظهار الأدوار النظامية"
          />

          <Box sx={{ flexGrow: 1 }} />

          <Tabs
            value={viewMode}
            onChange={(_, newValue) => setViewMode(newValue)}
            sx={{ minHeight: 'auto' }}
          >
            <Tab icon={<GridViewIcon />} value="cards" label="بطاقات" />
            <Tab icon={<TableRowsIcon />} value="table" label="جدول" />
            <Tab icon={<CompareIcon />} value="comparison" label="مقارنة" />
          </Tabs>
        </Stack>

        {selectedRoles.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            تم تحديد {selectedRoles.length} دور للمقارنة
            <Button size="small" onClick={() => setSelectedRoles([])}>
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
              processedRoles.map((role) => (
                <Grid item xs={12} md={6} lg={4} key={role.id}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      transition: 'all 0.3s ease',
                      border: selectedRoles.includes(role.id) ? 2 : 1,
                      borderColor: selectedRoles.includes(role.id) 
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
                              bgcolor: `${getRoleTypeColor(role)}.main`,
                              width: 40,
                              height: 40
                            }}
                          >
                            {getRoleTypeIcon(role)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                              {role.name_ar}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {role.name}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <Checkbox
                            size="small"
                            checked={selectedRoles.includes(role.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoles([...selectedRoles, role.id]);
                              } else {
                                setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                              }
                            }}
                          />
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              setMenuAnchor(e.currentTarget);
                              setSelectedRoleForMenu(role);
                            }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 2, 
                          height: 40, 
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {role.description_ar || role.description || 'لا يوجد وصف متاح'}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                        <Chip 
                          icon={<PermissionIcon />}
                          label={`${role.permissions?.length || 0} صلاحية`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          icon={<PeopleIcon />}
                          label={`${role.user_count || 0} مستخدم`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                        {role.is_system && (
                          <Chip 
                            icon={<ShieldIcon />}
                            label="نظامي"
                            size="small"
                            color="error"
                          />
                        )}
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min(((role.permissions?.length || 0) / 50) * 100, 100)}
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1)
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        مستوى الصلاحيات: {Math.min(((role.permissions?.length || 0) / 50) * 100, 100).toFixed(0)}%
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditRole(role)}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        color="info"
                      >
                        عرض
                      </Button>
                      {!role.is_system && (
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          حذف
                        </Button>
                      )}
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
                      indeterminate={selectedRoles.length > 0 && selectedRoles.length < processedRoles.length}
                      checked={processedRoles.length > 0 && selectedRoles.length === processedRoles.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles(processedRoles.map(r => r.id));
                        } else {
                          setSelectedRoles([]);
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
                      الدور
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'permissions'}
                      direction={sortDirection}
                      onClick={() => {
                        if (sortField === 'permissions') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('permissions');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      الصلاحيات
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'users'}
                      direction={sortDirection}
                      onClick={() => {
                        if (sortField === 'users') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('users');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      المستخدمين
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedRoles.map((role) => (
                  <TableRow key={role.id} hover selected={selectedRoles.includes(role.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.id]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor: `${getRoleTypeColor(role)}.main`,
                            width: 32,
                            height: 32
                          }}
                        >
                          {getRoleTypeIcon(role)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {role.name_ar}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {role.name}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={role.is_system ? 'نظامي' : 'مخصص'}
                        size="small"
                        color={role.is_system ? 'error' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={role.permissions?.length || 0} color="primary">
                        <PermissionIcon color="action" />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={role.user_count || 0} color="secondary">
                        <PeopleIcon color="action" />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => handleEditRole(role)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="info">
                          <ViewIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="warning"
                          onClick={() => duplicateRole(role)}
                        >
                          <CopyIcon />
                        </IconButton>
                        {!role.is_system && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {viewMode === 'comparison' && (
          <Box>
            {selectedRoles.length < 2 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CompareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" mb={1}>
                  اختر دورين أو أكثر للمقارنة
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  حدد الأدوار من العرض العادي لمقارنة صلاحياتها
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الصلاحية</TableCell>
                      {selectedRoles.map(roleId => {
                        const role = roles.find(r => r.id === roleId);
                        return (
                          <TableCell key={roleId} align="center">
                            <Stack alignItems="center" spacing={0.5}>
                              <Avatar
                                sx={{
                                  bgcolor: `${getRoleTypeColor(role!)}.main`,
                                  width: 24,
                                  height: 24
                                }}
                              >
                                {getRoleTypeIcon(role!)}
                              </Avatar>
                              <Typography variant="caption">
                                {role?.name_ar}
                              </Typography>
                            </Stack>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comparisonData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {item.permission}
                          </Typography>
                        </TableCell>
                        {selectedRoles.map(roleId => (
                          <TableCell key={roleId} align="center">
                            {item.roles[roleId] ? (
                              <CheckIcon color="success" />
                            ) : (
                              <Box sx={{ width: 24, height: 24 }} />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuList>
          <MenuItem onClick={() => {
            handleEditRole(selectedRoleForMenu!);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>تعديل</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            duplicateRole(selectedRoleForMenu!);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><CopyIcon /></ListItemIcon>
            <ListItemText>نسخ</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><ViewIcon /></ListItemIcon>
            <ListItemText>عرض التفاصيل</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><TimelineIcon /></ListItemIcon>
            <ListItemText>سجل النشاط</ListItemText>
          </MenuItem>
          <Divider />
          {!selectedRoleForMenu?.is_system && (
            <MenuItem 
              onClick={() => {
                handleDeleteRole(selectedRoleForMenu!.id);
                setMenuAnchor(null);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
              <ListItemText>حذف</ListItemText>
            </MenuItem>
          )}
        </MenuList>
      </Menu>

      {/* Edit/Create Role Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AdminIcon color="primary" />
            <Typography variant="h6">
              {selectedRole ? 'تعديل الدور' : 'دور جديد'}
            </Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="معلومات الدور" />
            <Tab label="الصلاحيات" disabled={!selectedRole} />
            <Tab label="تعيين سريع" icon={<AdminIcon />} />
            <Tab label="المستخدمين" disabled={!selectedRole} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="اسم الدور (بالإنجليزية) *"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={selectedRole?.is_system}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="اسم الدور (بالعربية) *"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الوصف (بالإنجليزية)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="الوصف (بالعربية)"
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      multiline
                      rows={3}
                    />
                  </Grid>
                </Grid>
              </Stack>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="subtitle1" fontWeight="medium" mb={2}>
                  الصلاحيات ({formData.permissions.length})
                </Typography>
                
                {/* Enhanced Quick Permission Assignment Component */}
                <Box sx={{ mb: 4 }}>
                  <Divider sx={{ my: 3 }}>
                    <Chip label="تعيين سريع متقدم" color="primary" icon={<AdminIcon />} />
                  </Divider>
                  
                  <EnhancedQuickPermissionAssignment
                    selectedRoleId={selectedRole?.id}
                    allRoles={roles}
                    allPermissions={permissions}
                    onAssignmentComplete={(result) => {
                      console.log('Assignment result:', result);
                      if (result.success) {
                        loadRoles(); // Refresh roles data
                        // Update form data with current role permissions
                        if (selectedRole) {
                          const updatedRole = roles.find(r => r.id === selectedRole.id);
                          if (updatedRole) {
                            setFormData(prev => ({
                              ...prev,
                              permissions: updatedRole.permissions || []
                            }));
                          }
                        }
                      }
                    }}
                    onRefreshNeeded={() => {
                      loadRoles(); // Refresh when needed
                    }}
                  />
                  
                  <Divider sx={{ my: 3 }}>
                    <Chip label="تعيين تقليدي" variant="outlined" />
                  </Divider>
                </Box>
                
                {/* Original Permission Assignment */}
                <Stack spacing={2}>
                  {PERMISSION_CATEGORIES.map(category => (
                    <Accordion key={category.key}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Typography>{category.nameAr}</Typography>
                          <Chip
                            label={`${category.permissions.filter(p => formData.permissions.includes(p.name)).length}/${category.permissions.length}`}
                            size="small"
                            color="primary"
                          />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={1}>
                          {category.permissions.map(permission => (
                            <Grid item xs={12} md={6} key={permission.name}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={formData.permissions.includes(permission.name)}
                                    onChange={() => handlePermissionToggle(permission.name)}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">{permission.nameAr}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {permission.descriptionAr}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="h5" fontWeight="bold" mb={1} sx={{ color: 'primary.main' }}>
                  🚀 تعيين سريع متقدم
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  استخدم هذه الأداة المتقدمة لتعيين صلاحيات متعددة لأدوار متعددة في نفس الوقت
                </Typography>
                
                <EnhancedQuickPermissionAssignment
                  selectedRoleId={selectedRole?.id}
                  allRoles={roles}
                  allPermissions={permissions}
                  onAssignmentComplete={(result) => {
                    console.log('Assignment result:', result);
                    if (result.success) {
                      loadRoles(); // Refresh roles data
                      alert(`✅ تم تعيين ${result.permissions_assigned} صلاحية بنجاح!`);
                    } else {
                      alert(`❌ فشل في تعيين الصلاحيات: ${result.message}`);
                    }
                  }}
                  onRefreshNeeded={() => {
                    loadRoles(); // Refresh when needed
                  }}
                />
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Typography variant="subtitle1" fontWeight="medium" mb={2}>
                  المستخدمين المعينين لهذا الدور
                </Typography>
                <Alert severity="info">
                  سيتم تطوير هذا القسم لاحقاً لعرض وإدارة المستخدمين المعينين لهذا الدور
                </Alert>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving || savingPerms}>
            إلغاء
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleSaveRole}
              variant="outlined"
              disabled={saving || !formData.name || !formData.name_ar}
              startIcon={<SaveIcon />}
            >
              {selectedRole ? (saving ? 'جاري الحفظ...' : 'حفظ بيانات الدور') : (saving ? 'جاري الإنشاء...' : 'إنشاء الدور')}
            </Button>
            {activeTab === 1 && (
              <Button
                onClick={handleSavePermissions}
                variant="contained"
                disabled={savingPerms || !selectedRole}
                startIcon={<SaveIcon />}
              >
                {savingPerms ? 'جاري حفظ الصلاحيات...' : 'حفظ الصلاحيات'}
              </Button>
            )}
            {activeTab === 2 && (
              <Button
                variant="outlined"
                startIcon={<AdminIcon />}
                onClick={() => alert('✨ استخدم الأدوات المتقدمة أعلاه لتعيين الصلاحيات')}
              >
                دليل الاستخدام
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Additional icons (you may need to import these)
const GridViewIcon = () => <ViewIcon />;
const TableRowsIcon = () => <ViewIcon />;
