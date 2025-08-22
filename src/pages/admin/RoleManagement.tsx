import React, { useState, useEffect } from 'react';
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
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSION_CATEGORIES, PERMISSIONS } from '../../constants/permissions';
import { PermissionGuard } from '../../components/auth/PermissionGuard';

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

export default function RoleManagement() {
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    permissions: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      
      // Load roles with permissions and user count
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permissions (
              name
            )
          ),
          user_roles (
            count
          )
        `)
        .order('id');

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
        return;
      }

      // Format the data
      const formattedRoles = rolesData?.map(role => ({
        ...role,
        permissions: role.role_permissions?.map((rp: any) => rp.permissions?.name).filter(Boolean) || [],
        user_count: role.user_roles?.length || 0
      })) || [];

      setRoles(formattedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handlePermissionToggle = (permissionName: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName]
    }));
  };

  const handleSaveRole = async () => {
    try {
      setSaving(true);

      if (selectedRole) {
        // Update existing role
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

        // Update permissions
        // First, delete existing permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRole.id);

        // Then add new permissions
        if (formData.permissions.length > 0) {
          // Get permission IDs
          const { data: perms } = await supabase
            .from('permissions')
            .select('id, name')
            .in('name', formData.permissions);

          if (perms && perms.length > 0) {
            const rolePermissions = perms.map(p => ({
              role_id: selectedRole.id,
              permission_id: p.id,
              granted_by: currentUser?.id
            }));

            await supabase.from('role_permissions').insert(rolePermissions);
          }
        }
      } else {
        // Create new role
        const { data: newRole, error: createError } = await supabase
          .from('roles')
          .insert({
            name: formData.name,
            name_ar: formData.name_ar,
            description: formData.description,
            description_ar: formData.description_ar,
            is_system: false
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add permissions
        if (formData.permissions.length > 0 && newRole) {
          const { data: perms } = await supabase
            .from('permissions')
            .select('id, name')
            .in('name', formData.permissions);

          if (perms && perms.length > 0) {
            const rolePermissions = perms.map(p => ({
              role_id: newRole.id,
              permission_id: p.id,
              granted_by: currentUser?.id
            }));

            await supabase.from('role_permissions').insert(rolePermissions);
          }
        }
      }

      setEditDialogOpen(false);
      await loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('فشل حفظ الدور');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدور؟')) return;

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      await loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('فشل حذف الدور');
    }
  };

  const getRoleColor = (roleName: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    if (roleName.toLowerCase().includes('super') || roleName.toLowerCase().includes('admin')) return 'error';
    if (roleName.toLowerCase().includes('manager')) return 'warning';
    if (roleName.toLowerCase().includes('account')) return 'info';
    if (roleName.toLowerCase().includes('user')) return 'success';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الأدوار والصلاحيات
        </Typography>
        <PermissionGuard permission={PERMISSIONS.ROLES_CREATE}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleEditRole(null)}
          >
            دور جديد
          </Button>
        </PermissionGuard>
      </Stack>

      {loading ? (
        <Grid container spacing={3}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {roles.map(role => (
            <Grid item xs={12} md={6} lg={4} key={role.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SecurityIcon color="primary" />
                        <Typography variant="h6">{role.name_ar}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {role.name}
                      </Typography>
                    </Box>
                    {role.is_system && (
                      <Chip
                        label="نظامي"
                        size="small"
                        color={getRoleColor(role.name)}
                      />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {role.description_ar || 'لا يوجد وصف'}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip
                      icon={<SecurityIcon />}
                      label={`${role.permissions?.length || 0} صلاحية`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${role.user_count || 0} مستخدم`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
                <CardActions>
                  <PermissionGuard permission={PERMISSIONS.ROLES_UPDATE}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditRole(role)}
                      disabled={role.is_system && role.id === 1} // Prevent editing Super Admin
                    >
                      <EditIcon />
                    </IconButton>
                  </PermissionGuard>
                  <PermissionGuard permission={PERMISSIONS.ROLES_DELETE}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.is_system || role.user_count > 0}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </PermissionGuard>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit/Create Role Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AdminIcon color="primary" />
            <Typography variant="h6">
              {selectedRole ? 'تعديل الدور' : 'دور جديد'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الدور (بالإنجليزية)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={selectedRole?.is_system}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الدور (بالعربية)"
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
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
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

            <Box>
              <Typography variant="subtitle1" fontWeight="medium" mb={2}>
                الصلاحيات
              </Typography>
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
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            disabled={saving || !formData.name || !formData.name_ar}
            startIcon={<SaveIcon />}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
