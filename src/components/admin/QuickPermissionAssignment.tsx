import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../../utils/supabase';

interface Role {
  id: number;
  name: string;
  name_ar: string;
}

interface Permission {
  id: string;
  name: string;
  name_ar: string;
  resource: string;
  action: string;
  description?: string;
}

interface QuickPermissionAssignmentProps {
  open: boolean;
  onClose: () => void;
  selectedPermissions?: Permission[];
  onRefreshPermissions?: () => void;
}

export default function QuickPermissionAssignment({ 
  open, 
  onClose, 
  selectedPermissions = [],
  onRefreshPermissions 
}: QuickPermissionAssignmentProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissionNames, setSelectedPermissionNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadRoles();
      // Pre-fill with selected permissions from permissions tab
      if (selectedPermissions.length > 0) {
        setSelectedPermissionNames(selectedPermissions.map(p => p.name));
      }
    }
  }, [open, selectedPermissions]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, name_ar')
        .order('name_ar');

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      setMessage({ type: 'error', text: 'فشل تحميل الأدوار' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPermissions = async () => {
    if (!selectedRole) {
      setMessage({ type: 'error', text: 'يرجى اختيار دور أولاً' });
      return;
    }

    if (selectedPermissionNames.length === 0) {
      setMessage({ type: 'error', text: 'يرجى اختيار صلاحية واحدة على الأقل' });
      return;
    }

    try {
      setSaving(true);
      
      // Use the fixed RPC function
      const { data, error } = await supabase.rpc('save_role_permissions', {
        p_role_id: selectedRole.id,
        p_permission_names: selectedPermissionNames
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Assignment result:', data);
      
      if (data?.success) {
        setMessage({ 
          type: 'success', 
          text: `تم تعيين ${data.permissions_assigned} صلاحية بنجاح للدور "${selectedRole.name_ar}"` 
        });
        
        // Clear selections after successful assignment
        setTimeout(() => {
          setSelectedRole(null);
          setSelectedPermissionNames([]);
          onRefreshPermissions?.();
        }, 1500);
      } else {
        setMessage({ 
          type: 'error', 
          text: `فشل تعيين الصلاحيات: ${data?.message || 'خطأ غير معروف'}` 
        });
      }
    } catch (error: any) {
      console.error('Error assigning permissions:', error);
      setMessage({ 
        type: 'error', 
        text: `فشل تعيين الصلاحيات: ${error.message || 'خطأ في الاتصال'}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignAllToSuperAdmin = async () => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase.rpc('assign_all_permissions_to_superadmin');
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ 
          type: 'success', 
          text: `تم تعيين جميع الصلاحيات (${data.permissions_assigned}) للمدير العام` 
        });
        onRefreshPermissions?.();
      } else {
        setMessage({ type: 'error', text: data?.message || 'فشل في تعيين الصلاحيات' });
      }
    } catch (error: any) {
      console.error('Error assigning all permissions:', error);
      setMessage({ type: 'error', text: 'فشل في تعيين جميع الصلاحيات' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePermission = (permissionName: string) => {
    setSelectedPermissionNames(prev => prev.filter(name => name !== permissionName));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">تعيين الصلاحيات للأدوار - الحل السريع</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Role Selection */}
          <FormControl fullWidth>
            <InputLabel>اختر الدور</InputLabel>
            <Select
              value={selectedRole?.id || ''}
              onChange={(e) => {
                const role = roles.find(r => r.id === Number(e.target.value));
                setSelectedRole(role || null);
              }}
              label="اختر الدور"
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name_ar} ({role.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Selected Permissions Display */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              الصلاحيات المحددة ({selectedPermissionNames.length}):
            </Typography>
            {selectedPermissionNames.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                لا توجد صلاحيات محددة
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {selectedPermissionNames.map((permName) => (
                  <Chip
                    key={permName}
                    label={permName}
                    onDelete={() => handleRemovePermission(permName)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Pre-selected from permissions tab */}
          {selectedPermissions.length > 0 && (
            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                  الصلاحيات المحددة من صفحة الصلاحيات:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedPermissions.map((perm) => (
                    <Chip
                      key={perm.id}
                      label={`${perm.name_ar || perm.name} (${perm.resource}.${perm.action})`}
                      size="small"
                      color="primary"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Emergency Actions */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="warning.main">
              إجراءات طوارئ:
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleAssignAllToSuperAdmin}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              fullWidth
            >
              تعيين جميع الصلاحيات للمدير العام
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleAssignPermissions}
          disabled={saving || !selectedRole || selectedPermissionNames.length === 0}
          startIcon={saving ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {saving ? 'جاري التعيين...' : 'تعيين الصلاحيات'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}