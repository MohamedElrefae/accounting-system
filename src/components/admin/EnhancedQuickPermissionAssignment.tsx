import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  SelectAll as SelectAllIcon,
  Security as SecurityIcon,
  Group as GroupIcon
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

interface EnhancedQuickPermissionAssignmentProps {
  open: boolean;
  onClose: () => void;
  selectedPermissions?: Permission[];
  onRefreshPermissions?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`permission-tabpanel-${index}`}
      aria-labelledby={`permission-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function EnhancedQuickPermissionAssignment({ 
  open, 
  onClose, 
  selectedPermissions = [],
  onRefreshPermissions 
}: EnhancedQuickPermissionAssignmentProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedPermissionNames, setSelectedPermissionNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Permission filtering
  const [expandedResources, setExpandedResources] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
      // Pre-fill with selected permissions from permissions tab
      if (selectedPermissions.length > 0) {
        setSelectedPermissionNames(selectedPermissions.map(p => p.name));
      }
    }
  }, [open, selectedPermissions]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load roles and permissions in parallel
      const [rolesResponse, permissionsResponse] = await Promise.all([
        supabase.from('roles').select('id, name, name_ar').order('name_ar'),
        supabase.from('permissions').select('*').order('resource, name')
      ]);

      if (rolesResponse.error) throw rolesResponse.error;
      if (permissionsResponse.error) throw permissionsResponse.error;

      setRoles(rolesResponse.data || []);
      setPermissions(permissionsResponse.data || []);
      
      // Auto-expand first few resource groups
      const resources = [...new Set(permissionsResponse.data?.map(p => p.resource) || [])];
      setExpandedResources(resources.slice(0, 3));
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'فشل تحميل البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const handleMultiAssign = async () => {
    if (selectedRoleIds.length === 0) {
      setMessage({ type: 'error', text: 'يرجى اختيار دور واحد على الأقل' });
      return;
    }

    if (selectedPermissionNames.length === 0) {
      setMessage({ type: 'error', text: 'يرجى اختيار صلاحية واحدة على الأقل' });
      return;
    }

    try {
      setSaving(true);
      
      // Use the new multi-assign function
      const { data, error } = await supabase.rpc('multi_assign_permissions_to_roles', {
        role_ids: selectedRoleIds,
        permission_names: selectedPermissionNames
      });

      if (error) {
        console.error('Multi-assign error:', error);
        throw error;
      }

      console.log('Multi-assign result:', data);
      
      if (data?.success) {
        setMessage({ 
          type: 'success', 
          text: `تم تعيين ${data.permissions_assigned} صلاحية بنجاح لعدد ${selectedRoleIds.length} دور` 
        });
        
        // Clear selections after successful assignment
        setTimeout(() => {
          setSelectedRoleIds([]);
          setSelectedPermissionNames([]);
          onRefreshPermissions?.();
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: `فشل تعيين الصلاحيات: ${data?.message || 'خطأ غير معروف'}` 
        });
      }
    } catch (error: any) {
      console.error('Error in multi-assign:', error);
      setMessage({ 
        type: 'error', 
        text: `فشل تعيين الصلاحيات: ${error.message || 'خطأ في الاتصال'}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyAssignAll = async (roleType: string) => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase.rpc('emergency_assign_all_permissions_to_role', {
        role_name: roleType
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ 
          type: 'success', 
          text: `تم تعيين جميع الصلاحيات (${data.permissions_assigned}) للدور: ${roleType}` 
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

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handlePermissionToggle = (permissionName: string) => {
    setSelectedPermissionNames(prev => 
      prev.includes(permissionName) 
        ? prev.filter(name => name !== permissionName)
        : [...prev, permissionName]
    );
  };

  const handleSelectAllRoles = () => {
    setSelectedRoleIds(selectedRoleIds.length === roles.length ? [] : roles.map(r => r.id));
  };

  const handleSelectAllPermissions = () => {
    const allNames = permissions.map(p => p.name);
    setSelectedPermissionNames(
      selectedPermissionNames.length === allNames.length ? [] : allNames
    );
  };

  const handleResourceToggle = (resource: string) => {
    setExpandedResources(prev =>
      prev.includes(resource)
        ? prev.filter(r => r !== resource)
        : [...prev, resource]
    );
  };

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: 600, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">تعيين الصلاحيات المتقدم - مع التحديد المتعدد</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
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

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="تحديد الأدوار" icon={<GroupIcon />} />
            <Tab label="تحديد الصلاحيات" icon={<SecurityIcon />} />
            <Tab label="إجراءات طوارئ" icon={<SaveIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                الأدوار المتاحة ({selectedRoleIds.length}/{roles.length} محدد)
              </Typography>
              <Button
                onClick={handleSelectAllRoles}
                startIcon={<SelectAllIcon />}
                size="small"
              >
                {selectedRoleIds.length === roles.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </Button>
            </Box>
            
            <List>
              {roles.map((role) => (
                <ListItem key={role.id} dense>
                  <ListItemText 
                    primary={role.name_ar} 
                    secondary={role.name}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                الصلاحيات المتاحة ({selectedPermissionNames.length}/{permissions.length} محدد)
              </Typography>
              <Button
                onClick={handleSelectAllPermissions}
                startIcon={<SelectAllIcon />}
                size="small"
              >
                {selectedPermissionNames.length === permissions.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </Button>
            </Box>
            
            {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
              <Accordion 
                key={resource}
                expanded={expandedResources.includes(resource)}
                onChange={() => handleResourceToggle(resource)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    {resource} ({resourcePermissions.length} صلاحية)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    {resourcePermissions.map((permission) => (
                      <FormControlLabel
                        key={permission.name}
                        control={
                          <Checkbox
                            checked={selectedPermissionNames.includes(permission.name)}
                            onChange={() => handlePermissionToggle(permission.name)}
                            size="small"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {permission.name_ar || permission.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.name} ({permission.action})
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" color="warning.main">
              إجراءات الطوارئ
            </Typography>
            
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  تعيين جميع الصلاحيات لدور معين
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleEmergencyAssignAll('admin')}
                    disabled={saving}
                  >
                    إعطاء الكل للمدير
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleEmergencyAssignAll('super')}
                    disabled={saving}
                  >
                    إعطاء الكل للمدير العام
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Divider />
            
            <Typography variant="body2" color="text.secondary">
              ⚠️ إجراءات الطوارئ ستحذف جميع الصلاحيات الحالية للدور وتعيد تعيين جميع الصلاحيات المتاحة.
            </Typography>
          </Box>
        </TabPanel>

        {/* Summary Card */}
        {(selectedRoleIds.length > 0 || selectedPermissionNames.length > 0) && (
          <Card sx={{ mt: 2, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary.main" gutterBottom>
                ملخص التحديد:
              </Typography>
              <Typography variant="body2">
                • الأدوار المحددة: {selectedRoleIds.length}
              </Typography>
              <Typography variant="body2">
                • الصلاحيات المحددة: {selectedPermissionNames.length}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                • إجمالي العمليات: {selectedRoleIds.length * selectedPermissionNames.length}
              </Typography>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleMultiAssign}
          disabled={saving || selectedRoleIds.length === 0 || selectedPermissionNames.length === 0}
          startIcon={saving ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {saving ? 'جاري التعيين...' : `تعيين ${selectedPermissionNames.length} صلاحية لـ ${selectedRoleIds.length} دور`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}