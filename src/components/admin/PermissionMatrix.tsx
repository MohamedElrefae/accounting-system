import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Stack,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
  Divider,
  Grid,
  Snackbar,
  CircularProgress,
  Switch
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  LockOpen as GrantIcon,
  Lock as RevokeIcon
} from '@mui/icons-material';
import { supabase } from '../../utils/supabase';
import { audit } from '../../utils/audit';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSION_CATEGORIES } from '../../constants/permissions';
import type { PermissionCategory, PermissionDefinition } from '../../constants/permissions';

interface PermissionMatrixProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  onPermissionsUpdated?: () => void;
}

interface UserPermission {
  permission_id: number;
  permission_name: string;
  is_granted: boolean;
  granted_by?: string;
  granted_at?: string;
}

interface RolePermission {
  permission_name: string;
  role_name: string;
  role_name_ar: string;
}

interface PermissionState {
  name: string;
  hasFromRole: boolean;
  hasDirectGrant: boolean;
  hasDirectRevoke: boolean;
  roles: string[];
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  open,
  onClose,
  userId,
  userName,
  userEmail,
  onPermissionsUpdated
}) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [permissionStates, setPermissionStates] = useState<Map<string, PermissionState>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showEffectiveOnly, setShowEffectiveOnly] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadPermissions();
    }
  }, [open, userId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setPendingChanges(new Map());

      // Check if user is super admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('is_super_admin')
        .eq('id', userId)
        .single();

      setIsSuperAdmin(userProfile?.is_super_admin || false);

      // Load role-based permissions
      const { data: rolePerms, error: roleError } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name,
            name_ar,
            role_permissions (
              permissions (
                name
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (roleError) {
        console.error('Error loading role permissions:', roleError);
      }

      // Load direct user permissions
      const { data: userPerms, error: userError } = await supabase
        .from('user_permissions')
        .select(`
          permission_id,
          granted,
          granted_by,
          granted_at,
          permissions (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (userError) {
        console.error('Error loading user permissions:', userError);
      }

      // Build permission state map
      const stateMap = new Map<string, PermissionState>();

      // Process role permissions
      if (rolePerms) {
        rolePerms.forEach((userRole: any) => {
          const roleName = userRole.roles?.name_ar || userRole.roles?.name;
          if (userRole.roles?.role_permissions) {
            userRole.roles.role_permissions.forEach((rp: any) => {
              const permName = rp.permissions?.name;
              if (permName) {
                const existing = stateMap.get(permName) || {
                  name: permName,
                  hasFromRole: false,
                  hasDirectGrant: false,
                  hasDirectRevoke: false,
                  roles: []
                };
                existing.hasFromRole = true;
                existing.roles.push(roleName);
                stateMap.set(permName, existing);
              }
            });
          }
        });
      }

      // Process direct permissions
      if (userPerms) {
        userPerms.forEach((up: any) => {
          const permName = up.permissions?.name;
          if (permName) {
            const existing = stateMap.get(permName) || {
              name: permName,
              hasFromRole: false,
              hasDirectGrant: false,
              hasDirectRevoke: false,
              roles: []
            };
            if (up.granted) {
              existing.hasDirectGrant = true;
            } else {
              existing.hasDirectRevoke = true;
            }
            stateMap.set(permName, existing);
          }
        });
      }

      setPermissionStates(stateMap);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setSnackbar({
        open: true,
        message: 'فشل تحميل الصلاحيات',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionName: string) => {
    const currentState = permissionStates.get(permissionName);
    const currentEffective = isPermissionEffective(permissionName);
    
    // Determine the new state
    let newValue: boolean | null;
    
    if (currentState?.hasFromRole) {
      // Permission comes from role
      if (currentState.hasDirectRevoke) {
        // Currently revoked, remove revoke (null = inherit from role)
        newValue = null;
      } else if (currentEffective) {
        // Currently active from role, add revoke
        newValue = false;
      } else {
        // Edge case, grant it
        newValue = true;
      }
    } else {
      // No role permission
      if (currentState?.hasDirectGrant) {
        // Currently granted, remove grant
        newValue = null;
      } else {
        // Not granted, grant it
        newValue = true;
      }
    }

    // Update pending changes
    const newChanges = new Map(pendingChanges);
    if (newValue === null) {
      newChanges.delete(permissionName);
    } else {
      newChanges.set(permissionName, newValue);
    }
    setPendingChanges(newChanges);

    // Update local state optimistically
    const newStates = new Map(permissionStates);
    const state = newStates.get(permissionName) || {
      name: permissionName,
      hasFromRole: false,
      hasDirectGrant: false,
      hasDirectRevoke: false,
      roles: []
    };

    if (newValue === null) {
      state.hasDirectGrant = false;
      state.hasDirectRevoke = false;
    } else if (newValue === true) {
      state.hasDirectGrant = true;
      state.hasDirectRevoke = false;
    } else {
      state.hasDirectGrant = false;
      state.hasDirectRevoke = true;
    }
    
    newStates.set(permissionName, state);
    setPermissionStates(newStates);
  };

  const saveChanges = async () => {
    if (pendingChanges.size === 0) {
      setSnackbar({
        open: true,
        message: 'لا توجد تغييرات للحفظ',
        severity: 'info'
      });
      return;
    }

    try {
      setSaving(true);

      // Get all permissions from database to get their IDs
      const { data: allPermissions, error: permError } = await supabase
        .from('permissions')
        .select('id, name');

      if (permError) throw permError;

      const permissionMap = new Map(allPermissions?.map(p => [p.name, p.id]) || []);

      // Process each pending change
      for (const [permName, isGranted] of pendingChanges.entries()) {
        const permissionId = permissionMap.get(permName);
        if (!permissionId) continue;

        if (isGranted === null) {
          // Remove the permission entry
          await supabase
            .from('user_permissions')
            .delete()
            .eq('user_id', userId)
            .eq('permission_id', permissionId);
        } else {
          // Upsert the permission
          const { error } = await supabase
            .from('user_permissions')
            .upsert({
              user_id: userId,
              permission_id: permissionId,
              granted: isGranted,
              granted_by: currentUser?.id,
              granted_at: new Date().toISOString(),
              is_active: true
            }, {
              onConflict: 'user_id,permission_id'
            });

          if (error) throw error;
        }

        // Log via secure RPC
        await audit(supabase, isGranted ? 'permission.grant' : 'permission.revoke', 'user_permission', userId, {
          permission: permName,
          target_user: userId,
          granted: isGranted
        });
      }

      setSnackbar({
        open: true,
        message: `تم حفظ ${pendingChanges.size} تغيير بنجاح`,
        severity: 'success'
      });

      setPendingChanges(new Map());
      
      // Reload permissions to ensure consistency
      await loadPermissions();
      
      // Notify parent component
      if (onPermissionsUpdated) {
        onPermissionsUpdated();
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      setSnackbar({
        open: true,
        message: 'فشل حفظ التغييرات',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const isPermissionEffective = (permissionName: string): boolean => {
    if (isSuperAdmin) return true;
    
    const state = permissionStates.get(permissionName);
    if (!state) return false;
    
    // Direct grant overrides everything
    if (state.hasDirectGrant) return true;
    
    // Direct revoke overrides role
    if (state.hasDirectRevoke) return false;
    
    // Inherit from role
    return state.hasFromRole;
  };

  const getPermissionChipColor = (permissionName: string): 'default' | 'primary' | 'success' | 'error' => {
    const state = permissionStates.get(permissionName);
    const hasPending = pendingChanges.has(permissionName);
    
    if (hasPending) return 'primary';
    if (!state) return 'default';
    if (state.hasDirectGrant) return 'success';
    if (state.hasDirectRevoke) return 'error';
    if (state.hasFromRole) return 'primary';
    return 'default';
  };

  const getPermissionIcon = (permissionName: string) => {
    const state = permissionStates.get(permissionName);
    if (!state) return null;
    
    if (state.hasDirectGrant) return <GrantIcon fontSize="small" />;
    if (state.hasDirectRevoke) return <RevokeIcon fontSize="small" />;
    if (state.hasFromRole) return <SecurityIcon fontSize="small" />;
    return null;
  };

  const filterPermissions = (category: PermissionCategory): PermissionDefinition[] => {
    if (!searchTerm) return category.permissions;
    
    const term = searchTerm.toLowerCase();
    return category.permissions.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.nameAr.includes(searchTerm) ||
      p.description.toLowerCase().includes(term) ||
      p.descriptionAr.includes(searchTerm)
    );
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const expandAll = () => {
    setExpandedCategories(PERMISSION_CATEGORIES.map(c => c.key));
  };

  const collapseAll = () => {
    setExpandedCategories([]);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <AdminIcon color="primary" />
              <Box>
                <Typography variant="h6">إدارة صلاحيات المستخدم</Typography>
                <Typography variant="caption" color="text.secondary">
                  {userName} ({userEmail})
                </Typography>
              </Box>
            </Stack>
            {isSuperAdmin && (
              <Chip
                label="مدير عام"
                color="error"
                icon={<AdminIcon />}
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {isSuperAdmin && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              هذا المستخدم لديه صلاحيات المدير العام وله حق الوصول الكامل للنظام
            </Alert>
          )}

          <Stack spacing={2}>
            {/* Search and Controls */}
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                placeholder="البحث في الصلاحيات..."
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
              <Button size="small" onClick={expandAll}>توسيع الكل</Button>
              <Button size="small" onClick={collapseAll}>طي الكل</Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={showEffectiveOnly}
                    onChange={(e) => setShowEffectiveOnly(e.target.checked)}
                  />
                }
                label="الفعّالة فقط"
              />
              <IconButton onClick={loadPermissions} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Stack>

            {/* Legend */}
            <Stack direction="row" spacing={2} sx={{ px: 2 }}>
              <Chip
                size="small"
                icon={<SecurityIcon />}
                label="من الدور"
                color="primary"
                variant="outlined"
              />
              <Chip
                size="small"
                icon={<GrantIcon />}
                label="ممنوحة"
                color="success"
                variant="outlined"
              />
              <Chip
                size="small"
                icon={<RevokeIcon />}
                label="محجوبة"
                color="error"
                variant="outlined"
              />
              <Chip
                size="small"
                icon={<InfoIcon />}
                label="معلّقة"
                color="warning"
                variant="outlined"
              />
            </Stack>

            {/* Permission Categories */}
            <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))
              ) : (
                PERMISSION_CATEGORIES.map(category => {
                  const filteredPerms = filterPermissions(category);
                  
                  if (showEffectiveOnly) {
                    const hasEffective = filteredPerms.some(p => isPermissionEffective(p.name));
                    if (!hasEffective) return null;
                  }

                  if (filteredPerms.length === 0) return null;

                  return (
                    <Accordion
                      key={category.key}
                      expanded={expandedCategories.includes(category.key)}
                      onChange={() => toggleCategory(category.key)}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                          <Typography fontWeight="medium">{category.nameAr}</Typography>
                          <Chip
                            label={`${filteredPerms.filter(p => isPermissionEffective(p.name)).length}/${filteredPerms.length}`}
                            size="small"
                            color="primary"
                          />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {filteredPerms.map(permission => {
                            const state = permissionStates.get(permission.name);
                            const isEffective = isPermissionEffective(permission.name);
                            const hasPending = pendingChanges.has(permission.name);

                            if (showEffectiveOnly && !isEffective) return null;

                            return (
                              <Grid item xs={12} md={6} key={permission.name}>
                                <Box
                                  sx={{
                                    p: 1.5,
                                    border: 1,
                                    borderColor: hasPending ? 'warning.main' : 'divider',
                                    borderRadius: 1,
                                    backgroundColor: hasPending ? 'warning.50' : 'background.paper',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                                    <Checkbox
                                      checked={isEffective}
                                      onChange={() => handlePermissionToggle(permission.name)}
                                      disabled={isSuperAdmin}
                                      color={getPermissionChipColor(permission.name) as any}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="body2" fontWeight="medium">
                                          {permission.nameAr}
                                        </Typography>
                                        {getPermissionIcon(permission.name)}
                                      </Stack>
                                      <Typography variant="caption" color="text.secondary">
                                        {permission.descriptionAr}
                                      </Typography>
                                      {state?.roles.length > 0 && (
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                          {state.roles.map(role => (
                                            <Chip
                                              key={role}
                                              label={role}
                                              size="small"
                                              variant="outlined"
                                              color="primary"
                                            />
                                          ))}
                                        </Stack>
                                      )}
                                    </Box>
                                  </Stack>
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  );
                })
              )}
            </Box>

            {/* Pending Changes Summary */}
            {pendingChanges.size > 0 && (
              <Alert severity="warning" icon={<InfoIcon />}>
                لديك {pendingChanges.size} تغييرات معلّقة. اضغط حفظ لتطبيق التغييرات.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={saveChanges}
            variant="contained"
            disabled={saving || pendingChanges.size === 0 || isSuperAdmin}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'جاري الحفظ...' : `حفظ التغييرات (${pendingChanges.size})`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
