import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Paper,
  Grid,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assignment as AssignIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Speed as QuickIcon,
  Group as GroupIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { supabase } from '../utils/supabase';

interface Role {
  id: number;
  name: string;
  name_ar: string;
  is_system: boolean;
  permissions?: string[];
}

interface Permission {
  id: number;
  name: string;
  name_ar?: string;
  resource: string;
  action: string;
  description?: string;
}

interface AssignmentResult {
  success: boolean;
  message: string;
  permissions_assigned?: number;
  errors_count?: number;
  total_permissions?: number;
}

interface EnhancedQuickPermissionAssignmentProps {
  onAssignmentComplete?: (result: AssignmentResult) => void;
  onRefreshNeeded?: () => void;
  selectedRoleId?: number | null;
  allRoles?: Role[];
  allPermissions?: Permission[];
}

const MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 300,
      width: 300,
    },
  },
};

export default function EnhancedQuickPermissionAssignment({
  onAssignmentComplete,
  onRefreshNeeded,
  selectedRoleId = null,
  allRoles = [],
  allPermissions = []
}: EnhancedQuickPermissionAssignmentProps) {
  const theme = useTheme();
  
  // States
  const [roles, setRoles] = useState<Role[]>(allRoles);
  const [permissions, setPermissions] = useState<Permission[]>(allPermissions);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(selectedRoleId ? [selectedRoleId] : []);
  const [selectedPermissionNames, setSelectedPermissionNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [lastResult, setLastResult] = useState<AssignmentResult | null>(null);

  // Load data if not provided via props
  useEffect(() => {
    if (allRoles.length === 0) {
      loadRoles();
    } else {
      setRoles(allRoles);
    }
  }, [allRoles]);

  useEffect(() => {
    if (allPermissions.length === 0) {
      loadPermissions();
    } else {
      setPermissions(allPermissions);
    }
  }, [allPermissions]);

  // Update selected role when prop changes
  useEffect(() => {
    if (selectedRoleId) {
      setSelectedRoleIds([selectedRoleId]);
    }
  }, [selectedRoleId]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name_ar');
      
      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('resource, action');
      
      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by resource for better organization
  const groupedPermissions = useMemo(() => {
    const groups: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      const resource = permission.resource || 'other';
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(permission);
    });
    return groups;
  }, [permissions]);

  const handleRoleChange = (event: any) => {
    const value = event.target.value;
    setSelectedRoleIds(typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  const handlePermissionChange = (event: any) => {
    const value = event.target.value;
    setSelectedPermissionNames(typeof value === 'string' ? value.split(',') : value);
  };

  const handleQuickSelectAllPermissions = () => {
    setSelectedPermissionNames(permissions.map(p => p.name));
  };

  const handleQuickSelectResourcePermissions = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource]?.map(p => p.name) || [];
    setSelectedPermissionNames(prev => {
      const newPermissions = [...new Set([...prev, ...resourcePermissions])];
      return newPermissions;
    });
  };

  const handleAssignPermissions = async () => {
    if (selectedRoleIds.length === 0) {
      alert('يرجى اختيار دور واحد على الأقل');
      return;
    }

    if (selectedPermissionNames.length === 0) {
      alert('يرجى اختيار صلاحية واحدة على الأقل');
      return;
    }

    try {
      setAssigning(true);
      const overallResult: AssignmentResult = {
        success: true,
        message: '',
        permissions_assigned: 0,
        errors_count: 0,
        total_permissions: 0
      };

      // Assign permissions to each selected role
      for (const roleId of selectedRoleIds) {
        console.log(`🔄 Assigning ${selectedPermissionNames.length} permissions to role ${roleId}...`);
        
        const { data, error } = await supabase.rpc('save_role_permissions', {
          p_role_id: roleId,
          p_permission_names: selectedPermissionNames
        });

        if (error) {
          console.error(`❌ Error assigning permissions to role ${roleId}:`, error);
          overallResult.success = false;
          overallResult.errors_count = (overallResult.errors_count || 0) + 1;
        } else {
          console.log(`✅ RPC Response for role ${roleId}:`, data);
          overallResult.permissions_assigned = (overallResult.permissions_assigned || 0) + (data?.permissions_assigned || 0);
          overallResult.total_permissions = (overallResult.total_permissions || 0) + (data?.total_permissions || 0);
        }
      }

      // Verify the save by checking database
      console.log('🔍 Verifying permissions were saved...');
      for (const roleId of selectedRoleIds) {
        const { data: verifyData, error: verifyError } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(name)')
          .eq('role_id', roleId);

        if (!verifyError && verifyData) {
          console.log(`✅ Role ${roleId} now has ${verifyData.length} permissions in database:`, 
            verifyData.map((rp: any) => rp.permissions?.name).filter(Boolean)
          );
        } else {
          console.error(`❌ Failed to verify role ${roleId}:`, verifyError);
        }
      }

      overallResult.message = `تم تعيين ${overallResult.permissions_assigned} صلاحية لـ ${selectedRoleIds.length} دور`;
      
      setLastResult(overallResult);
      
      // Refresh data BEFORE calling callbacks
      await loadRoles();
      await loadPermissions();
      
      if (onAssignmentComplete) {
        onAssignmentComplete(overallResult);
      }
      
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }

      // Clear selections after successful assignment
      if (overallResult.success) {
        setSelectedPermissionNames([]);
        if (!selectedRoleId) { // Only clear roles if not pre-selected
          setSelectedRoleIds([]);
        }
      }

    } catch (error) {
      console.error('❌ Error in permission assignment:', error);
      const errorResult: AssignmentResult = {
        success: false,
        message: 'فشل في تعيين الصلاحيات',
        errors_count: 1
      };
      setLastResult(errorResult);
      
      if (onAssignmentComplete) {
        onAssignmentComplete(errorResult);
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleEmergencyAssignAllToAdmin = async () => {
    if (!confirm('هل أنت متأكد من تعيين جميع الصلاحيات للمدير العام؟ هذا إجراء طارئ!')) {
      return;
    }

    try {
      setAssigning(true);
      const { data, error } = await supabase.rpc('emergency_assign_all_permissions_to_role', {
        role_name: 'admin'
      });

      if (error) throw error;

      const result: AssignmentResult = {
        success: true,
        message: `تم تعيين جميع الصلاحيات (${data?.permissions_assigned}) للمدير العام`,
        permissions_assigned: data?.permissions_assigned || 0
      };

      setLastResult(result);
      
      if (onAssignmentComplete) {
        onAssignmentComplete(result);
      }
      
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }

    } catch (error) {
      console.error('Error in emergency assignment:', error);
      const errorResult: AssignmentResult = {
        success: false,
        message: 'فشل في التعيين الطارئ للصلاحيات'
      };
      setLastResult(errorResult);
    } finally {
      setAssigning(false);
    }
  };

  const getSelectedRoleNames = () => {
    return roles
      .filter(role => selectedRoleIds.includes(role.id))
      .map(role => role.name_ar)
      .join(', ');
  };

  const getSelectedPermissionsByResource = () => {
    const groups: { [key: string]: string[] } = {};
    
    selectedPermissionNames.forEach(permName => {
      const permission = permissions.find(p => p.name === permName);
      if (permission) {
        const resource = permission.resource || 'other';
        if (!groups[resource]) {
          groups[resource] = [];
        }
        groups[resource].push(permission.name);
      }
    });
    
    return groups;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={20} />
            <Typography>جاري التحميل...</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        background: alpha(theme.palette.primary.main, 0.02),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        borderRadius: 2
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
            <SecurityIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              تعيين سريع للصلاحيات
            </Typography>
            <Chip 
              label="متقدم" 
              color="primary" 
              size="small" 
              icon={<QuickIcon />}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            تعيين صلاحيات متعددة لأدوار متعددة مع أزرار الطوارئ
          </Typography>
        </Box>

        {/* Role Selection */}
        <FormControl fullWidth>
          <InputLabel>اختيار الأدوار ({selectedRoleIds.length} مختار)</InputLabel>
          <Select
            multiple
            value={selectedRoleIds}
            onChange={handleRoleChange}
            input={<OutlinedInput label="اختيار الأدوار" />}
            renderValue={() => getSelectedRoleNames()}
            MenuProps={MENU_PROPS}
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                <Checkbox checked={selectedRoleIds.includes(role.id)} />
                <ListItemText 
                  primary={role.name_ar} 
                  secondary={role.is_system ? 'نظامي' : 'مخصص'} 
                />
                {role.is_system && <SecurityIcon fontSize="small" color="error" />}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Permission Selection */}
        <Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>اختيار الصلاحيات ({selectedPermissionNames.length} مختار)</InputLabel>
            <Select
              multiple
              value={selectedPermissionNames}
              onChange={handlePermissionChange}
              input={<OutlinedInput label="اختيار الصلاحيات" />}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {selected.slice(0, 3).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                  {selected.length > 3 && (
                    <Chip label={`+${selected.length - 3} المزيد`} size="small" color="primary" />
                  )}
                </Stack>
              )}
              MenuProps={MENU_PROPS}
            >
              {permissions.map((permission) => (
                <MenuItem key={permission.id} value={permission.name}>
                  <Checkbox checked={selectedPermissionNames.includes(permission.name)} />
                  <ListItemText 
                    primary={permission.name} 
                    secondary={`${permission.resource}.${permission.action}`} 
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quick Selection Buttons */}
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleQuickSelectAllPermissions}
              startIcon={<KeyIcon />}
            >
              تحديد الكل
            </Button>
            {Object.keys(groupedPermissions).slice(0, 4).map((resource) => (
              <Button
                key={resource}
                size="small"
                variant="outlined"
                onClick={() => handleQuickSelectResourcePermissions(resource)}
              >
                {resource}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Selected Summary */}
        {(selectedRoleIds.length > 0 || selectedPermissionNames.length > 0) && (
          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                ملخص التحديد:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <GroupIcon fontSize="small" />
                    <Typography variant="body2">
                      {selectedRoleIds.length} دور مختار
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <KeyIcon fontSize="small" />
                    <Typography variant="body2">
                      {selectedPermissionNames.length} صلاحية مختارة
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
              
              {selectedPermissionNames.length > 0 && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    الصلاحيات بحسب المورد:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(getSelectedPermissionsByResource()).map(([resource, perms]) => (
                      <Badge key={resource} badgeContent={perms.length} color="primary">
                        <Chip label={resource} size="small" variant="outlined" />
                      </Badge>
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            onClick={handleAssignPermissions}
            disabled={assigning || selectedRoleIds.length === 0 || selectedPermissionNames.length === 0}
            startIcon={assigning ? <CircularProgress size={20} /> : <AssignIcon />}
            sx={{ py: 1.5 }}
          >
            {assigning ? 'جاري التعيين...' : 'تعيين الصلاحيات المختارة'}
          </Button>

          <Divider>
            <Chip label="إجراءات الطوارئ" size="small" color="error" />
          </Divider>

          <Button
            variant="outlined"
            color="error"
            onClick={handleEmergencyAssignAllToAdmin}
            disabled={assigning}
            startIcon={<WarningIcon />}
            sx={{ borderStyle: 'dashed' }}
          >
            تعيين جميع الصلاحيات للمدير العام (طارئ)
          </Button>
        </Stack>

        {/* Results */}
        {lastResult && (
          <Alert 
            severity={lastResult.success ? 'success' : 'error'}
            icon={lastResult.success ? <SuccessIcon /> : <ErrorIcon />}
          >
            <Typography variant="body2" fontWeight={500}>
              {lastResult.message}
            </Typography>
            {lastResult.permissions_assigned && lastResult.permissions_assigned > 0 && (
              <LinearProgress 
                variant="determinate" 
                value={100}
                sx={{ mt: 1, backgroundColor: alpha(theme.palette.success.main, 0.2) }}
              />
            )}
          </Alert>
        )}

        {/* Refresh Button */}
        <Stack direction="row" justifyContent="center">
          <Tooltip title="تحديث البيانات">
            <IconButton 
              onClick={() => {
                loadRoles();
                loadPermissions();
                if (onRefreshNeeded) onRefreshNeeded();
              }}
              disabled={loading || assigning}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
