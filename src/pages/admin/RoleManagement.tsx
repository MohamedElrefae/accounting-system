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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import UnlockIcon from '@mui/icons-material/LockOpen';
import { supabase } from '../../utils/supabase';
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
  const [savingPerms, setSavingPerms] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

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
    // Basic client-side validation
    const name = formData.name.trim();
    const nameAr = formData.name_ar.trim();
    if (!name || !nameAr) {
      alert('يرجى إدخال اسم الدور باللغتين قبل الحفظ');
      return;
    }
    try {
      setSaving(true);

      if (selectedRole) {
        // Update existing role (info only)
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

        // Do not touch permissions here for edit unless user explicitly saves permissions
      } else {
        // Create new role (first step) and keep dialog open to assign permissions next
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

        // Set the created role so permissions section becomes actionable
        setSelectedRole(newRole as Role);
        alert('تم إنشاء الدور. يمكنك الآن تعيين الصلاحيات ثم الضغط على حفظ الصلاحيات.');
        await loadRoles();
        return; // Exit early to prevent closing the dialog
      }

      await loadRoles();
      alert('تم حفظ معلومات الدور');
    } catch (error: any) {
      console.error('Error saving role:', error);
      // Surface clearer messages
      let msg = 'فشل حفظ الدور';
      const code = error?.code || error?.status || '';
      const details = error?.details || error?.message || '';
      if (code === '23505') {
        msg = 'فشل حفظ الدور: الاسم مستخدم من قبل. اختر اسمًا فريدًا.';
      } else if (code === '42501' || error?.message?.toLowerCase?.().includes('rls') || error?.message?.toLowerCase?.().includes('policy')) {
        msg = 'فشل حفظ الدور: لا توجد صلاحية للكتابة (تحقق من سياسات RLS لجدول roles).';
      } else if (details) {
        msg = `فشل حفظ الدور: ${details}`;
      }
      alert(msg);
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

      // Use the new RPC function to save permissions
      const { data, error } = await supabase.rpc('save_role_permissions', {
        p_role_id: selectedRole.id,
        p_permission_names: formData.permissions
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Save result:', data);
      alert('تم حفظ الصلاحيات بنجاح');
      await loadRoles();
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving role permissions:', error);
      let msg = 'فشل حفظ الصلاحيات';
      const code = error?.code || error?.status || '';
      const details = error?.details || error?.message || '';
      if (code === '23503') {
        msg = 'فشل حفظ الصلاحيات: صلاحية غير موجودة أو الدور غير موجود.';
      } else if (code === '42501' || error?.message?.toLowerCase?.().includes('rls') || error?.message?.toLowerCase?.().includes('policy')) {
        msg = 'فشل حفظ الصلاحيات: لا توجد صلاحية للكتابة (تحقق من سياسات RLS لجدول role_permissions).';
      } else if (details) {
        msg = `فشل حفظ الصلاحيات: ${details}`;
      }
      alert(msg);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدور؟ سيتم إزالة الصلاحيات والمستخدمين المرتبطين به.')) return;

    try {
      // Remove related rows first (best-effort)
      await supabase.from('user_roles').delete().eq('role_id', roleId);
      await supabase.from('role_permissions').delete().eq('role_id', roleId);

      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      if (error) throw error;

      setSelectedRoleIds(prev => prev.filter(id => id !== roleId));
      await loadRoles();
      alert('تم حذف الدور بنجاح');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      let msg = 'فشل حذف الدور';
      if (error?.message?.toLowerCase?.().includes('rls') || error?.message?.toLowerCase?.().includes('policy')) {
        msg = 'فشل حذف الدور: سياسة RLS تمنع الحذف. أضف سياسة حذف للمشرف العام.';
      }
      alert(msg);
    }
  };

  const handleDemoteSystemRole = async (role: Role) => {
    if (!role.is_system) return;
    if (!confirm(`تحويل الدور "${role.name_ar || role.name}" إلى دور عادي؟`)) return;
    try {
      const { error } = await supabase
        .from('roles')
        .update({ is_system: false })
        .eq('id', role.id);
      if (error) throw error;
      await loadRoles();
      alert('تم تحويل الدور إلى غير نظامي. يمكنك الآن حذفه إن رغبت.');
    } catch (error: any) {
      console.error('Demote system role failed:', error);
      let msg = 'فشل تحويل الدور';
      if (error?.message?.toLowerCase?.().includes('column') && error?.message?.includes('is_system')) {
        msg = 'فشل التحويل: عمود is_system غير موجود في الجدول roles.';
      }
      alert(msg);
    }
  };

  const handleToggleSelectRole = (roleId: number, checked: boolean) => {
    setSelectedRoleIds(prev => {
      const set = new Set(prev);
      if (checked) set.add(roleId); else set.delete(roleId);
      return Array.from(set);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedRoleIds.length === 0) return;
    if (!confirm(`سيتم حذف ${selectedRoleIds.length} دور/أدوار مع إلغاء ربط المستخدمين والصلاحيات. هل تريد المتابعة؟`)) return;
    try {
      for (const roleId of selectedRoleIds) {
        await supabase.from('user_roles').delete().eq('role_id', roleId);
        await supabase.from('role_permissions').delete().eq('role_id', roleId);
        await supabase.from('roles').delete().eq('id', roleId);
      }
      setSelectedRoleIds([]);
      await loadRoles();
      alert('تم حذف الأدوار المحددة بنجاح');
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      let msg = 'فشل حذف بعض الأدوار';
      if (error?.message?.toLowerCase?.().includes('rls') || error?.message?.toLowerCase?.().includes('policy')) {
        msg = 'فشل الحذف: سياسة RLS تمنع الحذف. أضف سياسات الحذف للمشرف العام.';
      }
      alert(msg);
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, flexShrink: 0 }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الأدوار والصلاحيات
        </Typography>
        <Stack direction="row" spacing={1}>
          {selectedRoleIds.length > 0 && (
            <PermissionGuard permission={PERMISSIONS.ROLES_DELETE}>
              <Button color="error" variant="outlined" onClick={handleBulkDelete}>
                حذف الأدوار المحددة ({selectedRoleIds.length})
              </Button>
            </PermissionGuard>
          )}
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
      </Stack>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
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
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={(e) => handleToggleSelectRole(role.id, e.target.checked)}
                      />
                    }
                    label="تحديد"
                  />
                  <PermissionGuard permission={PERMISSIONS.ROLES_UPDATE}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditRole(role)}
                      disabled={role.is_system && role.id === 1} // Prevent editing Super Admin
                    >
                      <EditIcon />
                    </IconButton>
                  </PermissionGuard>
                  {role.is_system && (
                    <PermissionGuard permission={PERMISSIONS.ROLES_UPDATE}>
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleDemoteSystemRole(role)}
                        title="تحويل إلى غير نظامي"
                      >
                        <UnlockIcon />
                      </IconButton>
                    </PermissionGuard>
                  )}
                  <PermissionGuard permission={PERMISSIONS.ROLES_DELETE}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.is_system}
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
      </Box>

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
                  rows={1}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الوصف (بالعربية)"
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  multiline
                  rows={1}
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle1" fontWeight="medium" mb={1}>
                الصلاحيات
              </Typography>
              {!selectedRole && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  أنشئ الدور أولاً باستخدام زر "إنشاء الدور"، ثم قم باختيار الصلاحيات واضغط "حفظ الصلاحيات".
                </Alert>
              )}
              {PERMISSION_CATEGORIES.map(category => (
                <Accordion key={category.key} disabled={!selectedRole}>
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
                                disabled={!selectedRole}
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
            <Button
              onClick={handleSavePermissions}
              variant="contained"
              disabled={savingPerms || !selectedRole}
              startIcon={<SaveIcon />}
            >
              {savingPerms ? 'جاري حفظ الصلاحيات...' : 'حفظ الصلاحيات'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

