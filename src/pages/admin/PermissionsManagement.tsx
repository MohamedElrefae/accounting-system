import { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import KeyIcon from '@mui/icons-material/Key';
import ViewIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import { supabase } from '../../utils/supabase';
import { PermissionGuard } from '../../components/auth/PermissionGuard';

interface Permission {
  id: string;
  name: string;
  name_ar: string;
  resource: string;
  action: string;
  description?: string;
  description_ar?: string;
  created_at: string;
}

interface PermissionsByResource {
  [key: string]: Permission[];
}

export default function PermissionsManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    resource: '',
    action: '',
    description: '',
    description_ar: ''
  });
  const [saving, setSaving] = useState(false);
  const [expandedResources, setExpandedResources] = useState<string[]>(['transactions']);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('resource')
        .order('name');

      if (error) {
        console.error('Error loading permissions:', error);
        return;
      }

      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermission = (permission: Permission | null) => {
    if (permission) {
      setSelectedPermission(permission);
      setFormData({
        name: permission.name,
        name_ar: permission.name_ar,
        resource: permission.resource,
        action: permission.action,
        description: permission.description || '',
        description_ar: permission.description_ar || ''
      });
    } else {
      setSelectedPermission(null);
      setFormData({
        name: '',
        name_ar: '',
        resource: '',
        action: '',
        description: '',
        description_ar: ''
      });
    }
    setEditDialogOpen(true);
  };

  const handleSavePermission = async () => {
    // Validation
    const { name, name_ar, resource, action } = formData;
    if (!name.trim() || !name_ar.trim() || !resource.trim() || !action.trim()) {
      alert('يرجى إدخال جميع الحقول المطلوبة');
      return;
    }

    // Auto-generate permission name if not in correct format
    const standardName = `${resource}.${action}`;
    if (!name.includes('.') && resource && action) {
      setFormData(prev => ({ ...prev, name: standardName }));
    }

    try {
      setSaving(true);

      if (selectedPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('permissions')
          .update({
            name: formData.name,
            name_ar: formData.name_ar,
            resource: formData.resource,
            action: formData.action,
            description: formData.description,
            description_ar: formData.description_ar
          })
          .eq('id', selectedPermission.id);

        if (error) throw error;
      } else {
        // Create new permission
        const { error } = await supabase
          .from('permissions')
          .insert({
            name: formData.name,
            name_ar: formData.name_ar,
            resource: formData.resource,
            action: formData.action,
            description: formData.description,
            description_ar: formData.description_ar
          });

        if (error) throw error;
      }

      await loadPermissions();
      setEditDialogOpen(false);
      alert(selectedPermission ? 'تم تحديث الصلاحية بنجاح' : 'تم إنشاء الصلاحية بنجاح');
    } catch (error: any) {
      console.error('Error saving permission:', error);
      let msg = 'فشل حفظ الصلاحية';
      if (error?.code === '23505') {
        msg = 'فشل حفظ الصلاحية: الاسم مستخدم من قبل. اختر اسمًا فريدًا.';
      }
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermission = async (permissionId: string, permissionName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الصلاحية "${permissionName}"؟\nتحذير: سيتم حذف جميع الارتباطات مع الأدوار والمستخدمين.`)) return;

    try {
      // First, remove all role assignments for this permission
      await supabase.from('role_permissions').delete().eq('permission_id', permissionId);
      
      // Then, remove all direct user assignments for this permission
      await supabase.from('user_permissions').delete().eq('permission_id', permissionId);
      
      // Finally, delete the permission itself
      const { error } = await supabase.from('permissions').delete().eq('id', permissionId);
      if (error) throw error;

      await loadPermissions();
      alert('تم حذف الصلاحية بنجاح');
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      alert('فشل حذف الصلاحية');
    }
  };

  const handleResourceToggle = (resource: string) => {
    setExpandedResources(prev => 
      prev.includes(resource) 
        ? prev.filter(r => r !== resource)
        : [...prev, resource]
    );
  };

  // Filter permissions
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = searchTerm === '' || 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.name_ar.includes(searchTerm) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description_ar?.includes(searchTerm);
    
    const matchesResource = resourceFilter === '' || permission.resource === resourceFilter;
    
    return matchesSearch && matchesResource;
  });

  // Group permissions by resource
  const permissionsByResource: PermissionsByResource = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as PermissionsByResource);

  const allResources = [...new Set(permissions.map(p => p.resource))].sort();

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (action.toLowerCase()) {
      case 'create': return 'success';
      case 'read': case 'view': return 'info';
      case 'update': case 'edit': return 'warning';
      case 'delete': return 'error';
      case 'manage': case 'admin': return 'secondary';
      case 'post': case 'approve': return 'primary';
      default: return 'default';
    }
  };

  const ResourceIcon = ({ resource }: { resource: string }) => {
    switch (resource) {
      case 'transactions': return <KeyIcon />;
      case 'accounts': return <CodeIcon />;
      case 'users': return <SecurityIcon />;
      case 'roles': return <SecurityIcon />;
      default: return <ViewIcon />;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            إدارة الصلاحيات
          </Typography>
        </Stack>
        <PermissionGuard permission="permissions.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleEditPermission(null)}
          >
            صلاحية جديدة
          </Button>
        </PermissionGuard>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
        <TextField
          placeholder="البحث في الصلاحيات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>تصفية حسب المورد</InputLabel>
          <Select
            value={resourceFilter}
            label="تصفية حسب المورد"
            onChange={(e) => setResourceFilter(e.target.value)}
          >
            <MenuItem value="">جميع الموارد</MenuItem>
            {allResources.map(resource => (
              <MenuItem key={resource} value={resource}>
                {resource}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Statistics */}
      <Alert severity="info" sx={{ mb: 2, flexShrink: 0 }}>
        إجمالي الصلاحيات: {permissions.length} | المعروضة: {filteredPermissions.length} | الموارد: {allResources.length}
      </Alert>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="rectangular" height={100} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack spacing={2}>
          {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
            <Accordion 
              key={resource}
              expanded={expandedResources.includes(resource)}
              onChange={() => handleResourceToggle(resource)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                  <ResourceIcon resource={resource} />
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {resource}
                  </Typography>
                  <Chip 
                    label={`${resourcePermissions.length} صلاحية`} 
                    size="small" 
                    color="primary"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {resourcePermissions.map((permission) => (
                    <Grid item xs={12} md={6} lg={4} key={permission.id}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                                {permission.name_ar}
                              </Typography>
                              <Chip 
                                label={permission.action} 
                                size="small" 
                                color={getActionColor(permission.action)}
                              />
                            </Stack>
                            
                            <Typography variant="body2" color="text.secondary">
                              {permission.name}
                            </Typography>
                            
                            {permission.description_ar && (
                              <Typography variant="body2" color="text.secondary">
                                {permission.description_ar}
                              </Typography>
                            )}
                            
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip label={permission.resource} size="small" variant="outlined" />
                            </Stack>
                          </Stack>
                        </CardContent>
                        <CardActions>
                          <PermissionGuard permission="permissions.update">
                            <Tooltip title="تعديل الصلاحية">
                              <IconButton
                                size="small"
                                onClick={() => handleEditPermission(permission)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </PermissionGuard>
                          <PermissionGuard permission="permissions.delete">
                            <Tooltip title="حذف الصلاحية">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePermission(permission.id, permission.name_ar)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </PermissionGuard>
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
      </Box>

      {/* Edit/Create Permission Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">
              {selectedPermission ? 'تعديل الصلاحية' : 'صلاحية جديدة'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المورد (Resource) *"
                  value={formData.resource}
                  onChange={(e) => {
                    const resource = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      resource,
                      name: prev.action ? `${resource}.${prev.action}` : prev.name
                    }));
                  }}
                  placeholder="مثل: transactions, users, roles"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الإجراء (Action) *"
                  value={formData.action}
                  onChange={(e) => {
                    const action = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      action,
                      name: prev.resource ? `${prev.resource}.${action}` : prev.name
                    }));
                  }}
                  placeholder="مثل: create, read, update, delete"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="اسم الصلاحية (بالإنجليزية) *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="سيتم إنشاؤه تلقائياً من المورد والإجراء"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="اسم الصلاحية (بالعربية) *"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="مثل: إنشاء المعاملات"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الوصف (بالإنجليزية)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الوصف (بالعربية)"
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            {formData.resource && formData.action && (
              <Alert severity="info">
                اسم الصلاحية المقترح: <code>{formData.resource}.{formData.action}</code>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={handleSavePermission}
            variant="contained"
            disabled={saving || !formData.name || !formData.name_ar || !formData.resource || !formData.action}
            startIcon={<SaveIcon />}
          >
            {saving ? 'جاري الحفظ...' : (selectedPermission ? 'تحديث' : 'إنشاء')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
