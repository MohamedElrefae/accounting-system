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
  Avatar,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Checkbox,
  LinearProgress,
  List,
  ListItem,
  ListItemText as MuiListItemText,
  ListItemAvatar,
  alpha,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddPermissionIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ViewIcon from '@mui/icons-material/Visibility';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreIcon from '@mui/icons-material/MoreVert';
import CopyIcon from '@mui/icons-material/ContentCopy';
import ExportIcon from '@mui/icons-material/FileDownload';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckIcon from '@mui/icons-material/CheckCircle';
import TestIcon from '@mui/icons-material/PlayArrow';
import CategoryIcon from '@mui/icons-material/Category';
import { supabase } from '../../utils/supabase';
import { PERMISSION_CATEGORIES } from '../../constants/permissions';

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
  role_count?: number;
  user_count?: number;
  category?: string;
  is_critical?: boolean;
}

interface PermissionTest {
  permission: string;
  user_id: string;
  result: boolean;
  reason?: string;
}

type ViewMode = 'cards' | 'table' | 'categories' | 'analytics';
type SortField = 'name' | 'resource' | 'action' | 'roles' | 'users' | 'created';
type SortDirection = 'asc' | 'desc';
type FilterResource = 'all' | string;
type FilterAction = 'all' | string;

export default function EnterprisePermissionsManagement() {
  const theme = useTheme();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [sortField, setSortField] = useState<SortField>('resource');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterResource, setFilterResource] = useState<FilterResource>('all');
  const [filterAction, setFilterAction] = useState<FilterAction>('all');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPermissionForMenu, setSelectedPermissionForMenu] = useState<Permission | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    resource: '',
    action: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  // Test states
  const [testUserId, setTestUserId] = useState('');
  const [testResults, setTestResults] = useState<PermissionTest[]>([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      
      // First, load permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('resource');

      if (permissionsError) {
        console.error('Error loading permissions:', permissionsError);
        return;
      }

      if (!permissionsData || permissionsData.length === 0) {
        setPermissions([]);
        return;
      }

      // Then load role assignments separately
      const permissionIds = permissionsData.map(p => p.id);
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('permission_id', permissionIds);

      if (rolePermsError) {
        console.warn('Warning loading role permissions:', rolePermsError);
      }

      // Count role assignments per permission
      const roleCountsMap: { [permissionId: number]: number } = {};
      rolePermsData?.forEach(rp => {
        roleCountsMap[rp.permission_id] = (roleCountsMap[rp.permission_id] || 0) + 1;
      });

      // Format permissions with calculated data
      const formattedPermissions = permissionsData.map(permission => ({
        ...permission,
        role_count: roleCountsMap[permission.id] || 0,
        user_count: 0, // Would need complex query to calculate
        category: getCategoryFromResource(permission.resource),
        is_critical: isCriticalPermission(permission.name)
      }));

      setPermissions(formattedPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryFromResource = (resource: string): string => {
    const category = PERMISSION_CATEGORIES.find(cat => 
      cat.permissions.some(p => p.name.includes(resource))
    );
    return category?.nameAr || 'عام';
  };

  const isCriticalPermission = (name: string): boolean => {
    const criticalKeywords = ['admin', 'delete', 'superuser', 'system', 'security'];
    return criticalKeywords.some(keyword => name.toLowerCase().includes(keyword));
  };

  // Get unique resources and actions for filtering
  const uniqueResources = useMemo(() => {
    const resources = [...new Set(permissions.map(p => p.resource))];
    return resources.sort();
  }, [permissions]);

  const uniqueActions = useMemo(() => {
    const actions = [...new Set(permissions.map(p => p.action))];
    return actions.sort();
  }, [permissions]);

  // Filtered and sorted permissions
  const processedPermissions = useMemo(() => {
    const filtered = permissions.filter(permission => {
      const matchesSearch = searchTerm === '' || 
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesResource = filterResource === 'all' || permission.resource === filterResource;
      const matchesAction = filterAction === 'all' || permission.action === filterAction;
      
      return matchesSearch && matchesResource && matchesAction;
    });

    // Sort permissions
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'resource':
          comparison = a.resource.localeCompare(b.resource);
          break;
        case 'action':
          comparison = a.action.localeCompare(b.action);
          break;
        case 'roles':
          comparison = (a.role_count || 0) - (b.role_count || 0);
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
  }, [permissions, searchTerm, filterResource, filterAction, sortField, sortDirection]);

  // Group permissions by category for category view
  const groupedPermissions = useMemo(() => {
    const groups: { [key: string]: Permission[] } = {};
    
    processedPermissions.forEach(permission => {
      const category = permission.category || 'عام';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
    });
    
    return groups;
  }, [processedPermissions]);

  const handleEditPermission = (permission: Permission | null) => {
    if (permission) {
      setSelectedPermission(permission);
      setFormData({
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        description: permission.description || ''
      });
    } else {
      setSelectedPermission(null);
      setFormData({
        name: '',
        resource: '',
        action: '',
        description: ''
      });
    }
    setEditDialogOpen(true);
  };

  const handleSavePermission = async () => {
    try {
      setSaving(true);

      if (selectedPermission) {
        // Update existing permission
        const { error: updateError } = await supabase
          .from('permissions')
          .update({
            name: formData.name,
            resource: formData.resource,
            action: formData.action,
            description: formData.description
          })
          .eq('id', selectedPermission.id);

        if (updateError) throw updateError;
      } else {
        // Create new permission
        const { error: createError } = await supabase
          .from('permissions')
          .insert({
            name: formData.name,
            resource: formData.resource,
            action: formData.action,
            description: formData.description
          });

        if (createError) throw createError;
      }

      await loadPermissions();
      setEditDialogOpen(false);
      alert('تم حفظ الصلاحية بنجاح');
    } catch (error: any) {
      console.error('Error saving permission:', error);
      alert('فشل حفظ الصلاحية: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermission = async (permissionId: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الصلاحية "${name}"؟`)) return;

    try {
      // Remove from role_permissions first
      await supabase.from('role_permissions').delete().eq('permission_id', permissionId);
      
      // Delete permission
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', permissionId);
      
      if (error) throw error;
      
      await loadPermissions();
      alert('تم حذف الصلاحية بنجاح');
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      alert('فشل حذف الصلاحية');
    }
  };

  const handleTestPermissions = async () => {
    if (!testUserId || selectedPermissions.length === 0) {
      alert('يرجى تحديد مستخدم وصلاحيات للاختبار');
      return;
    }

    try {
      setTesting(true);
      const results: PermissionTest[] = [];

      for (const permissionId of selectedPermissions) {
        const permission = permissions.find(p => p.id === permissionId);
        if (permission) {
          // Test permission (this would use your actual permission checking logic)
          const result = await testUserPermission(testUserId, permission.name);
          results.push({
            permission: permission.name,
            user_id: testUserId,
            result: result.has_permission,
            reason: result.reason
          });
        }
      }

      setTestResults(results);
    } catch (error) {
      console.error('Error testing permissions:', error);
      alert('فشل اختبار الصلاحيات');
    } finally {
      setTesting(false);
    }
  };

  const testUserPermission = async (userId: string, permissionName: string) => {
    // This is a mock implementation - replace with your actual permission checking logic
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        user_id: userId,
        permission_name: permissionName
      });

      if (error) {
        return { has_permission: false, reason: error.message };
      }

      return { has_permission: data || false, reason: data ? 'الصلاحية متاحة' : 'الصلاحية غير متاحة' };
    } catch (error) {
      return { has_permission: false, reason: 'خطأ في الاختبار' };
    }
  };

  const getPermissionIcon = (permission: Permission) => {
    if (permission.is_critical) return <WarningIcon color="error" />;
    if (permission.action === 'read') return <ViewIcon />;
    if (permission.action === 'create') return <AddPermissionIcon />;
    if (permission.action === 'update') return <EditIcon />;
    if (permission.action === 'delete') return <DeleteIcon />;
    return <KeyIcon />;
  };

  const getPermissionColor = (permission: Permission): 'error' | 'warning' | 'info' | 'success' | 'primary' => {
    if (permission.is_critical) return 'error';
    if (permission.action === 'delete') return 'warning';
    if (permission.action === 'read') return 'info';
    if (permission.action === 'create') return 'success';
    return 'primary';
  };

  const exportPermissions = () => {
    const data = processedPermissions.map(permission => ({
      'اسم الصلاحية': permission.name,
      'المورد': permission.resource,
      'الإجراء': permission.action,
      'الوصف': permission.description || '',
      'الفئة': permission.category || '',
      'عدد الأدوار': permission.role_count || 0,
      'حرجة': permission.is_critical ? 'نعم' : 'لا',
      'تاريخ الإنشاء': new Date(permission.created_at).toLocaleDateString('ar-SA')
    }));
    
    console.log('Exporting permissions:', data);
    alert('تم التصدير بنجاح');
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = permissions.length;
    const byResource = uniqueResources.reduce((acc, resource) => {
      acc[resource] = permissions.filter(p => p.resource === resource).length;
      return acc;
    }, {} as { [key: string]: number });
    
    const byAction = uniqueActions.reduce((acc, action) => {
      acc[action] = permissions.filter(p => p.action === action).length;
      return acc;
    }, {} as { [key: string]: number });
    
    const critical = permissions.filter(p => p.is_critical).length;
    const assigned = permissions.filter(p => (p.role_count || 0) > 0).length;
    
    return { total, byResource, byAction, critical, assigned };
  }, [permissions, uniqueResources, uniqueActions]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, background: alpha(theme.palette.primary.main, 0.04) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              إدارة الصلاحيات المتقدمة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              نظام شامل لإدارة صلاحيات النظام وتنظيمها واختبارها
            </Typography>
          </Box>
          
          {/* Quick Stats */}
          <Stack direction="row" spacing={2}>
            <Card elevation={1} sx={{ minWidth: 120, textAlign: 'center' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  {analytics.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  إجمالي الصلاحيات
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={1} sx={{ minWidth: 120, textAlign: 'center' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  {analytics.assigned}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  معينة للأدوار
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={1} sx={{ minWidth: 120, textAlign: 'center' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h6" color="error.main" fontWeight="bold">
                  {analytics.critical}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  صلاحيات حرجة
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="اختبار الصلاحيات">
              <IconButton onClick={() => setTestDialogOpen(true)}>
                <TestIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="تصدير البيانات">
              <IconButton onClick={exportPermissions}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddPermissionIcon />}
              onClick={() => handleEditPermission(null)}
              sx={{ px: 3 }}
            >
              صلاحية جديدة
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Filters and Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="البحث في الصلاحيات..."
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
              <MenuItem value="resource">المورد</MenuItem>
              <MenuItem value="action">الإجراء</MenuItem>
              <MenuItem value="roles">الأدوار</MenuItem>
              <MenuItem value="created">تاريخ الإنشاء</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>المورد</InputLabel>
            <Select
              value={filterResource}
              label="المورد"
              onChange={(e) => setFilterResource(e.target.value as FilterResource)}
            >
              <MenuItem value="all">جميع الموارد</MenuItem>
              {uniqueResources.map(resource => (
                <MenuItem key={resource} value={resource}>
                  {resource}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel>الإجراء</InputLabel>
            <Select
              value={filterAction}
              label="الإجراء"
              onChange={(e) => setFilterAction(e.target.value as FilterAction)}
            >
              <MenuItem value="all">جميع الإجراءات</MenuItem>
              {uniqueActions.map(action => (
                <MenuItem key={action} value={action}>
                  {action}
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
            <Tab icon={<CategoryIcon />} value="categories" label="فئات" />
            <Tab icon={<KeyIcon />} value="cards" label="بطاقات" />
            <Tab icon={<ViewIcon />} value="table" label="جدول" />
            <Tab icon={<AnalyticsIcon />} value="analytics" label="تحليلات" />
          </Tabs>
        </Stack>

        {selectedPermissions.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            تم تحديد {selectedPermissions.length} صلاحية
            <Button size="small" onClick={() => setSelectedPermissions([])}>
              مسح التحديد
            </Button>
            <Button 
              size="small" 
              startIcon={<TestIcon />}
              onClick={() => setTestDialogOpen(true)}
            >
              اختبار المحدد
            </Button>
          </Alert>
        )}
      </Paper>

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {viewMode === 'categories' && (
          <Stack spacing={2}>
            {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
              <Accordion key={category} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <CategoryIcon />
                    </Avatar>
                    <Typography variant="h6">{category}</Typography>
                    <Chip label={`${categoryPermissions.length} صلاحية`} size="small" />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {categoryPermissions.map((permission) => (
                      <Grid item xs={12} md={6} lg={4} key={permission.id}>
                        <Card
                          elevation={1}
                          sx={{
                            transition: 'all 0.2s ease',
                            border: selectedPermissions.includes(permission.id) ? 2 : 1,
                            borderColor: selectedPermissions.includes(permission.id) 
                              ? 'primary.main' 
                              : alpha(theme.palette.divider, 0.2),
                            '&:hover': {
                              elevation: 4,
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <CardContent sx={{ pb: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar
                                  sx={{
                                    bgcolor: `${getPermissionColor(permission)}.main`,
                                    width: 32,
                                    height: 32
                                  }}
                                >
                                  {getPermissionIcon(permission)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {permission.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {permission.resource}.{permission.action}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Checkbox
                                size="small"
                                checked={selectedPermissions.includes(permission.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermissions([...selectedPermissions, permission.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                                  }
                                }}
                              />
                            </Stack>
                            
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              {permission.description || 'لا يوجد وصف'}
                            </Typography>
                            
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                              <Chip 
                                label={`${permission.role_count || 0} دور`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {permission.is_critical && (
                                <Chip 
                                  icon={<WarningIcon />}
                                  label="حرجة"
                                  size="small"
                                  color="error"
                                />
                              )}
                            </Stack>
                          </CardContent>
                          <CardActions sx={{ p: 1, pt: 0 }}>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditPermission(permission)}
                            >
                              تعديل
                            </Button>
                            <Button
                              size="small"
                              startIcon={<DeleteIcon />}
                              color="error"
                              onClick={() => handleDeletePermission(permission.id, permission.name)}
                            >
                              حذف
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}

        {viewMode === 'cards' && (
          <Grid container spacing={3}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Grid item xs={12} md={6} lg={4} key={i}>
                  <Skeleton variant="rectangular" height={200} />
                </Grid>
              ))
            ) : (
              processedPermissions.map((permission) => (
                <Grid item xs={12} md={6} lg={4} key={permission.id}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      transition: 'all 0.3s ease',
                      border: selectedPermissions.includes(permission.id) ? 2 : 1,
                      borderColor: selectedPermissions.includes(permission.id) 
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
                              bgcolor: `${getPermissionColor(permission)}.main`,
                              width: 40,
                              height: 40
                            }}
                          >
                            {getPermissionIcon(permission)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                              {permission.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.resource}.{permission.action}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <Checkbox
                            size="small"
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions([...selectedPermissions, permission.id]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                              }
                            }}
                          />
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              setMenuAnchor(e.currentTarget);
                              setSelectedPermissionForMenu(permission);
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
                        {permission.description || 'لا يوجد وصف متاح'}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                        <Chip 
                          icon={<GroupIcon />}
                          label={`${permission.role_count || 0} دور`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          label={permission.category}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                        {permission.is_critical && (
                          <Chip 
                            icon={<WarningIcon />}
                            label="حرجة"
                            size="small"
                            color="error"
                          />
                        )}
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditPermission(permission)}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="small"
                        startIcon={<TestIcon />}
                        color="info"
                      >
                        اختبار
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        color="error"
                        onClick={() => handleDeletePermission(permission.id, permission.name)}
                      >
                        حذف
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
                      indeterminate={selectedPermissions.length > 0 && selectedPermissions.length < processedPermissions.length}
                      checked={processedPermissions.length > 0 && selectedPermissions.length === processedPermissions.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions(processedPermissions.map(p => p.id));
                        } else {
                          setSelectedPermissions([]);
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
                      الصلاحية
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>المورد والإجراء</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>الأدوار</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedPermissions.map((permission) => (
                  <TableRow key={permission.id} hover selected={selectedPermissions.includes(permission.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, permission.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor: `${getPermissionColor(permission)}.main`,
                            width: 32,
                            height: 32
                          }}
                        >
                          {getPermissionIcon(permission)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {permission.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.description || 'لا يوجد وصف'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Chip label={permission.resource} size="small" color="primary" variant="outlined" />
                        <Chip label={permission.action} size="small" color="secondary" variant="outlined" />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{permission.category}</Typography>
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={permission.role_count || 0} color="primary">
                        <GroupIcon color="action" />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {permission.is_critical && (
                          <Chip 
                            icon={<WarningIcon />}
                            label="حرجة"
                            size="small"
                            color="error"
                          />
                        )}
                        <Chip 
                          label={(permission.role_count || 0) > 0 ? 'معينة' : 'غير معينة'}
                          size="small"
                          color={(permission.role_count || 0) > 0 ? 'success' : 'default'}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => handleEditPermission(permission)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="info">
                          <TestIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeletePermission(permission.id, permission.name)}
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
                <Typography variant="h6" mb={2}>توزيع الموارد</Typography>
                <Stack spacing={2}>
                  {Object.entries(analytics.byResource).map(([resource, count]) => (
                    <Box key={resource}>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{resource}</Typography>
                        <Typography variant="body2" fontWeight="bold">{count}</Typography>
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / analytics.total) * 100} 
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>توزيع الإجراءات</Typography>
                <Stack spacing={2}>
                  {Object.entries(analytics.byAction).map(([action, count]) => (
                    <Box key={action}>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{action}</Typography>
                        <Typography variant="body2" fontWeight="bold">{count}</Typography>
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / analytics.total) * 100} 
                        color="secondary"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>تحليل الأمان</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error.main" fontWeight="bold">
                        {analytics.critical}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        صلاحيات حرجة
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {analytics.assigned}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        معينة للأدوار
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {analytics.total - analytics.assigned}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        غير معينة
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {Math.round((analytics.assigned / analytics.total) * 100)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        معدل التعيين
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
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
            handleEditPermission(selectedPermissionForMenu!);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>تعديل</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><TestIcon /></ListItemIcon>
            <ListItemText>اختبار الصلاحية</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><CopyIcon /></ListItemIcon>
            <ListItemText>نسخ</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon><AssignmentIcon /></ListItemIcon>
            <ListItemText>عرض الأدوار</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => {
              handleDeletePermission(selectedPermissionForMenu!.id, selectedPermissionForMenu!.name);
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>حذف</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Edit Permission Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <KeyIcon color="primary" />
            <Typography variant="h6">
              {selectedPermission ? 'تعديل الصلاحية' : 'صلاحية جديدة'}
            </Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الصلاحية *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  helperText="مثال: users.read, posts.create"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="المورد *"
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                  helperText="مثال: users, posts"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="الإجراء *"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  helperText="مثال: read, create, update"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الوصف"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                  helperText="وصف تفصيلي للصلاحية ووظيفتها"
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
            onClick={handleSavePermission}
            variant="contained"
            disabled={saving || !formData.name || !formData.resource || !formData.action}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Permissions Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>اختبار الصلاحيات</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="معرف المستخدم للاختبار"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              helperText="أدخل معرف المستخدم الذي تريد اختبار صلاحياته"
            />
            
            <Typography variant="subtitle1">
              الصلاحيات المحددة ({selectedPermissions.length}):
            </Typography>
            
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {selectedPermissions.map(permissionId => {
                const permission = permissions.find(p => p.id === permissionId);
                return permission ? (
                  <Chip
                    key={permissionId}
                    label={permission.name}
                    onDelete={() => {
                      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
                    }}
                    sx={{ m: 0.5 }}
                  />
                ) : null;
              })}
            </Box>

            {testResults.length > 0 && (
              <Box>
                <Typography variant="subtitle1" mb={2}>نتائج الاختبار:</Typography>
                <List>
                  {testResults.map((result, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: result.result ? 'success.main' : 'error.main' }}>
                          {result.result ? <CheckIcon /> : <LockIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <MuiListItemText
                        primary={result.permission}
                        secondary={result.reason}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>إغلاق</Button>
          <Button
            onClick={handleTestPermissions}
            variant="contained"
            disabled={testing || !testUserId || selectedPermissions.length === 0}
            startIcon={<TestIcon />}
          >
            {testing ? 'جاري الاختبار...' : 'اختبار الصلاحيات'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
