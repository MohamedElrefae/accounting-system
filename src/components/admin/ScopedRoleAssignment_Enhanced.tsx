import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  IconButton,
  Checkbox,
  Paper,
  Typography,
  alpha,
  useTheme,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { scopedRolesService } from '@/services/scopedRolesService';
import { permissionAuditService } from '@/services/permissionAuditService';
import { supabase } from '@/utils/supabase';

interface ScopedRoleAssignmentProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

type TabValue = 'org' | 'project' | 'system';

interface OrgRoleData {
  org_id: string;
  org_name: string;
  role: string;
  can_access_all_projects: boolean;
}

interface ProjectRoleData {
  project_id: string;
  project_name: string;
  org_id: string;
  role: string;
}

interface SystemRoleData {
  user_id: string;
  role: string;
}

export const ScopedRoleAssignmentEnhanced: React.FC<ScopedRoleAssignmentProps> = ({
  userId,
  userName,
  userEmail,
}) => {
  const theme = useTheme();

  // State
  const [tabValue, setTabValue] = useState<TabValue>('org');
  const [orgRoles, setOrgRoles] = useState<OrgRoleData[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRoleData[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRoleData[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(userId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [canAccessAll, setCanAccessAll] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all users for selection
      await loadAvailableUsers();

      // Load data for selected user
      if (selectedUser && selectedUser !== 'demo-user-id') {
        await Promise.all([loadUserRoles(), loadAvailableOrgsAndProjects(), loadAvailableRoles()]);
      } else if (selectedUser === 'demo-user-id') {
        console.warn('Demo user ID detected, skipping role load');
        // Still load orgs/projects for the dropdowns
        await Promise.all([loadAvailableOrgsAndProjects(), loadAvailableRoles()]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Get current user first to ensure we have auth context
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        console.error('No authenticated user found');
        setError('You must be logged in to view users.');
        setUsers([]);
        return;
      }

      // Query user_profiles with explicit column selection - fixed column names
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, full_name_ar', { count: 'exact' })
        .order('email', { ascending: true });

      if (usersError) {
        console.error('Error loading users:', usersError);
        // Provide more specific error message
        if (usersError.code === '42501') {
          setError('Permission denied: You do not have access to view users. Contact your administrator.');
        } else if (usersError.code === '400') {
          setError('Invalid query: Please check your database schema.');
        } else {
          setError(`Failed to load users: ${usersError.message}`);
        }
        setUsers([]);
      } else {
        // Map users to include a display name
        const mappedUsers = (usersData || []).map(u => ({
          ...u,
          name: u.full_name_ar ||
            (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : null) ||
            u.email.split('@')[0]
        }));
        setUsers(mappedUsers);

        if (!usersData || usersData.length === 0) {
          console.warn('No users found in the system.');
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error loading users');
    }
  };

  const loadUserRoles = async () => {
    // Load org roles
    const { data: orgData, error: orgError } = await supabase
      .from('org_roles')
      .select('*, organizations(id, name)')
      .eq('user_id', selectedUser);

    if (orgError) throw orgError;
    setOrgRoles(
      orgData?.map((r: any) => ({
        org_id: r.org_id,
        org_name: r.organizations?.name || 'Unknown',
        role: r.role,
        can_access_all_projects: r.can_access_all_projects,
      })) || []
    );

    // Load project roles
    const { data: projData, error: projError } = await supabase
      .from('project_roles')
      .select('*, projects(id, name, org_id)')
      .eq('user_id', selectedUser);

    if (projError) throw projError;
    setProjectRoles(
      projData?.map((r: any) => ({
        project_id: r.project_id,
        project_name: r.projects?.name || 'Unknown',
        org_id: r.projects?.org_id,
        role: r.role,
      })) || []
    );

    // Load system roles
    const { data: sysData, error: sysError } = await supabase
      .from('system_roles')
      .select('id, user_id, role, created_at, updated_at, created_by')
      .eq('user_id', selectedUser);

    if (sysError) throw sysError;
    setSystemRoles(sysData || []);
  };

  const loadAvailableOrgsAndProjects = async () => {
    try {
      // Load organizations - with better error handling
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (orgsError) {
        console.error('Error loading organizations:', orgsError);
        setError('Failed to load organizations. Please check your Supabase connection.');
        setOrganizations([]);
      } else {
        setOrganizations(orgs || []);
        if (!orgs || orgs.length === 0) {
          console.warn('No organizations found. Please create organizations first or check database permissions.');
        }
      }

      // Load projects - with better error handling
      const { data: projs, error: projsError } = await supabase
        .from('projects')
        .select('id, name, org_id')
        .order('name');

      if (projsError) {
        console.error('Error loading projects:', projsError);
        setError('Failed to load projects. Please check your Supabase connection.');
        setProjects([]);
      } else {
        setProjects(projs || []);
      }
    } catch (err) {
      console.error('Error loading orgs/projects:', err);
      setError(err instanceof Error ? err.message : 'Error loading organizations and projects');
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const { data: roles, error } = await supabase
        .from('roles')
        .select('id, name, name_ar')
        .order('name');

      if (error) {
        console.error('Error loading roles:', error);
        // Fallback to defaults if roles table access fails
        setAvailableRoles([
          { role_slug: 'admin', name: 'Admin' },
          { role_slug: 'manager', name: 'Manager' },
          { role_slug: 'accountant', name: 'Accountant' },
          { role_slug: 'auditor', name: 'Auditor' },
          { role_slug: 'viewer', name: 'Viewer' },
          { role_slug: 'hr', name: 'HR' },
        ]);
      } else {
        // Map roles to Generate slug if missing (since column role_slug doesn't exist)
        const mappedRoles = (roles || []).map((r: any) => ({
          ...r,
          role_slug: r.name.toLowerCase().replace(/ /g, '_')
        }));

        // Filter out system roles if needed
        const filteredRoles = mappedRoles.filter(r =>
          !['super_admin', 'owner', 'system_auditor'].includes(r.role_slug)
        );
        setAvailableRoles(filteredRoles);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleAddOrgRole = async () => {
    if (!selectedOrg || !selectedRole || !selectedUser) return;

    try {
      setSaving(true);

      const selectedUserData = users.find(u => u.id === selectedUser);

      await scopedRolesService.assignOrgRole({
        user_id: selectedUser,
        org_id: selectedOrg,
        role: `org_${selectedRole}` as any, // Prefix with scope
        can_access_all_projects: canAccessAll,
      });

      // Log to audit trail
      const org = organizations.find((o) => o.id === selectedOrg);

      await permissionAuditService.logPermissionChange(
        selectedOrg,
        'ASSIGN',
        'org_role',
        selectedUser,
        null,
        { role: selectedRole, can_access_all_projects: canAccessAll },
        `Assigned ${selectedRole} to ${selectedUserData?.email} in ${org?.name}`
      );

      await loadUserRoles();
      setSelectedOrg('');
      setSelectedRole('');
      setCanAccessAll(false);
      setAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOrgRole = async (orgId: string) => {
    if (!confirm('Remove this organization role?')) return;

    try {
      setSaving(true);

      const role = orgRoles.find((r) => r.org_id === orgId);
      const selectedUserData = users.find(u => u.id === selectedUser);
      await scopedRolesService.removeOrgRole(selectedUser, orgId);

      // Log to audit trail
      const org = organizations.find((o) => o.id === orgId);
      await permissionAuditService.logPermissionChange(
        orgId,
        'REVOKE',
        'org_role',
        selectedUser,
        { role: role?.role },
        null,
        `Removed ${role?.role} from ${selectedUserData?.email} in ${org?.name}`
      );

      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing role');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProjectRole = async () => {
    if (!selectedProject || !selectedRole || !selectedUser) return;

    try {
      setSaving(true);

      const selectedUserData = users.find(u => u.id === selectedUser);

      await scopedRolesService.assignProjectRole({
        user_id: selectedUser,
        project_id: selectedProject,
        role: `project_${selectedRole}` as any, // Prefix with scope
      });

      // Log to audit trail
      const project = projects.find((p) => p.id === selectedProject);
      await permissionAuditService.logPermissionChange(
        project?.org_id,
        'ASSIGN',
        'project_role',
        selectedUser,
        null,
        { role: selectedRole },
        `Assigned ${selectedRole} to ${selectedUserData?.email} in project ${project?.name}`
      );

      await loadUserRoles();
      setSelectedProject('');
      setSelectedRole('');
      setAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProjectRole = async (projectId: string) => {
    if (!confirm('Remove this project role?')) return;

    try {
      setSaving(true);

      const role = projectRoles.find((r) => r.project_id === projectId);
      const project = projects.find((p) => p.id === projectId);
      const selectedUserData = users.find(u => u.id === selectedUser);

      await scopedRolesService.removeProjectRole(selectedUser, projectId);

      // Log to audit trail
      await permissionAuditService.logPermissionChange(
        project?.org_id,
        'REVOKE',
        'project_role',
        selectedUser,
        { role: role?.role },
        null,
        `Removed ${role?.role} from ${selectedUserData?.email} in project ${project?.name}`
      );

      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing role');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSystemRole = async (systemRole: string) => {
    try {
      setSaving(true);

      const selectedUserData = users.find(u => u.id === selectedUser);

      await scopedRolesService.assignSystemRole({
        user_id: selectedUser,
        role: systemRole as any,
      });

      // Log to audit trail
      await permissionAuditService.logPermissionChange(
        'system',
        'ASSIGN',
        'system_role',
        selectedUser,
        null,
        { role: systemRole },
        `Assigned system role ${systemRole} to ${selectedUserData?.email}`
      );

      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding system role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSystemRole = async (systemRole: string) => {
    if (!confirm(`Remove system role ${systemRole}?`)) return;

    try {
      setSaving(true);

      const selectedUserData = users.find(u => u.id === selectedUser);

      await scopedRolesService.removeSystemRole(selectedUser, systemRole);

      // Log to audit trail
      await permissionAuditService.logPermissionChange(
        'system',
        'REVOKE',
        'system_role',
        selectedUser,
        { role: systemRole },
        null,
        `Removed system role ${systemRole} from ${selectedUserData?.email}`
      );

      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing system role');
    } finally {
      setSaving(false);
    }
  };

  // Helper to get role display name
  const getRoleDisplayName = (roleSlug: string) => {
    // Strip prefixes for display lookup
    const cleanSlug = roleSlug.replace(/^(org_|project_)/, '');
    const foundRole = availableRoles.find(r => r.role_slug === cleanSlug || r.role_slug === roleSlug);
    return foundRole?.name_ar || foundRole?.name || roleSlug;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, background: alpha(theme.palette.primary.main, 0.04) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              تخصيص الأدوار
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userName} ({userEmail})
            </Typography>
          </Box>
          <Tooltip title="تحديث البيانات">
            <span>
              <IconButton onClick={loadData} disabled={loading} size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {/* User Selector */}
          <Paper sx={{ p: 2, mb: 3, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
            <FormControl fullWidth>
              <InputLabel>اختر المستخدم</InputLabel>
              <Select
                value={selectedUser}
                label="اختر المستخدم"
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.email} {user.name ? `(${user.name})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {users.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                لا يوجد مستخدمين في النظام.
              </Alert>
            )}
          </Paper>

          {/* Tabs */}
          <Paper elevation={0} sx={{ mb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="أدوار المؤسسة" value="org" />
              <Tab label="أدوار المشروعات" value="project" />
              <Tab label="أدوار النظام" value="system" />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {/* Organization Roles Tab */}
            {tabValue === 'org' && (
              <Box>
                {orgRoles.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                          <TableCell>المؤسسة</TableCell>
                          <TableCell>الدور</TableCell>
                          <TableCell>كل المشروعات</TableCell>
                          <TableCell align="right">إجراءات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orgRoles.map((role) => (
                          <TableRow key={role.org_id}>
                            <TableCell>{role.org_name}</TableCell>
                            <TableCell>
                              <Chip label={getRoleDisplayName(role.role)} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Checkbox checked={role.can_access_all_projects} disabled />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="حذف الدور">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveOrgRole(role.org_id)}
                                    disabled={saving}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                    <Typography color="text.secondary">لا توجد أدوار مؤسسة مخصصة</Typography>
                  </Paper>
                )}

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setTabValue('org');
                    setAddDialogOpen(true);
                  }}
                  disabled={saving}
                >
                  إضافة دور مؤسسة
                </Button>
              </Box>
            )}

            {/* Project Roles Tab */}
            {tabValue === 'project' && (
              <Box>
                {projectRoles.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                          <TableCell>المشروع</TableCell>
                          <TableCell>المؤسسة</TableCell>
                          <TableCell>الدور</TableCell>
                          <TableCell align="right">إجراءات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {projectRoles.map((role) => (
                          <TableRow key={role.project_id}>
                            <TableCell>{role.project_name}</TableCell>
                            <TableCell>
                              {organizations.find((o) => o.id === role.org_id)?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Chip label={getRoleDisplayName(role.role)} size="small" color="secondary" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="حذف الدور">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveProjectRole(role.project_id)}
                                    disabled={saving}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                    <Typography color="text.secondary">لا توجد أدوار مشروع مخصصة</Typography>
                  </Paper>
                )}

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setTabValue('project');
                    setAddDialogOpen(true);
                  }}
                  disabled={saving}
                >
                  إضافة دور مشروع
                </Button>
              </Box>
            )}

            {/* System Roles Tab */}
            {tabValue === 'system' && (
              <Box>
                {systemRoles.length > 0 ? (
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack spacing={1}>
                      {systemRoles.map((role) => (
                        <Stack
                          key={role.role}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{
                            p: 2,
                            backgroundColor: alpha(theme.palette.warning.main, 0.1),
                            borderRadius: 1,
                            border: `1px solid ${theme.palette.warning.light}`,
                          }}
                        >
                          <Chip label={role.role} color="warning" />
                          <Tooltip title="Delete role">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveSystemRole(role.role)}
                                disabled={saving}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                    <Typography color="text.secondary">No system roles assigned</Typography>
                  </Paper>
                )}

                <Stack direction="row" spacing={1}>
                  <Tooltip title={systemRoles.some((r) => r.role === 'super_admin') ? 'Super Admin role already assigned' : ''}>
                    <span>
                      <Button
                        variant="outlined"
                        onClick={() => handleAddSystemRole('super_admin')}
                        disabled={saving || systemRoles.some((r) => r.role === 'super_admin')}
                      >
                        إضافة مدير نظام
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={systemRoles.some((r) => r.role === 'system_auditor') ? 'System Auditor role already assigned' : ''}>
                    <span>
                      <Button
                        variant="outlined"
                        onClick={() => handleAddSystemRole('system_auditor')}
                        disabled={saving || systemRoles.some((r) => r.role === 'system_auditor')}
                      >
                        إضافة مراجع نظام
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>
            )}
          </Box>

          {/* Add Dialog */}
          <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              {tabValue === 'org' && 'إضافة دور مؤسسة'}
              {tabValue === 'project' && 'إضافة دور مشروع'}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2}>
                {tabValue === 'org' && (
                  <>
                    {organizations.length === 0 ? (
                      <Alert severity="warning">
                        لا توجد منظمات متاحة.
                      </Alert>
                    ) : (
                      <>
                        <FormControl fullWidth>
                          <InputLabel>المؤسسة</InputLabel>
                          <Select
                            value={selectedOrg}
                            label="المؤسسة"
                            onChange={(e) => setSelectedOrg(e.target.value)}
                          >
                            {organizations
                              .filter((org) => !orgRoles.some((r) => r.org_id === org.id))
                              .map((org) => (
                                <MenuItem key={org.id} value={org.id}>
                                  {org.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth>
                          <InputLabel>الدور</InputLabel>
                          <Select
                            value={selectedRole}
                            label="الدور"
                            onChange={(e) => setSelectedRole(e.target.value)}
                          >
                            {availableRoles.map((role) => (
                              <MenuItem key={role.role_slug || role.id} value={role.role_slug}>
                                {role.name_ar || role.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={canAccessAll}
                              onChange={(e) => setCanAccessAll(e.target.checked)}
                            />
                          }
                          label="أحقية الوصول لكل المشروعات"
                        />
                      </>
                    )}
                  </>
                )}

                {tabValue === 'project' && (
                  <>
                    {projects.length === 0 ? (
                      <Alert severity="warning">
                        لا توجد مشروعات متاحة.
                      </Alert>
                    ) : (
                      <>
                        <FormControl fullWidth>
                          <InputLabel>المشروع</InputLabel>
                          <Select
                            value={selectedProject}
                            label="المشروع"
                            onChange={(e) => setSelectedProject(e.target.value)}
                          >
                            {projects
                              .filter((proj) => !projectRoles.some((r) => r.project_id === proj.id))
                              .map((proj) => (
                                <MenuItem key={proj.id} value={proj.id}>
                                  {proj.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth>
                          <InputLabel>الدور</InputLabel>
                          <Select
                            value={selectedRole}
                            label="الدور"
                            onChange={(e) => setSelectedRole(e.target.value)}
                          >
                            {availableRoles.map((role) => (
                              <MenuItem key={role.role_slug || role.id} value={role.role_slug}>
                                {role.name_ar || role.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </>
                    )}
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={
                  tabValue === 'org'
                    ? handleAddOrgRole
                    : tabValue === 'project'
                      ? handleAddProjectRole
                      : undefined
                }
                variant="contained"
                disabled={
                  !selectedRole ||
                  (tabValue === 'org' && (!selectedOrg || organizations.length === 0)) ||
                  (tabValue === 'project' && (!selectedProject || projects.length === 0)) ||
                  saving
                }
              >
                {saving ? 'Adding...' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};
