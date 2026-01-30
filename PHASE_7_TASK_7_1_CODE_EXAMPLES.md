# Phase 7 Task 7.1: ScopedRoleAssignment Enhancement - Code Examples

## Overview

This document provides code examples for enhancing the `ScopedRoleAssignment.tsx` component to use MUI and integrate with the scoped roles system.

## Key Changes

1. Replace basic HTML with MUI components
2. Add tabs for org/project/system roles
3. Integrate `useOptimizedAuth` hook
4. Add audit logging
5. Improve error handling and loading states

## Component Structure

```typescript
// src/components/admin/ScopedRoleAssignment.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
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
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { scopedRolesService } from '@/services/scopedRolesService';
import { permissionAuditService } from '@/services/permissionAuditService';
import { supabase } from '@/utils/supabase';

interface ScopedRoleAssignmentProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

type TabValue = 'org' | 'project' | 'system';

export const ScopedRoleAssignment: React.FC<ScopedRoleAssignmentProps> = ({
  userId,
  userName,
  userEmail,
}) => {
  const theme = useTheme();
  const auth = useOptimizedAuth();
  
  // State
  const [tabValue, setTabValue] = useState<TabValue>('org');
  const [orgRoles, setOrgRoles] = useState<any[]>([]);
  const [projectRoles, setProjectRoles] = useState<any[]>([]);
  const [systemRoles, setSystemRoles] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
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
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadUserRoles(),
        loadAvailableOrgsAndProjects()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async () => {
    // Load org roles
    const { data: orgData, error: orgError } = await supabase
      .from('org_roles')
      .select('*, organizations(id, name)')
      .eq('user_id', userId);

    if (orgError) throw orgError;
    setOrgRoles(orgData || []);

    // Load project roles
    const { data: projData, error: projError } = await supabase
      .from('project_roles')
      .select('*, projects(id, name, org_id)')
      .eq('user_id', userId);

    if (projError) throw projError;
    setProjectRoles(projData || []);

    // Load system roles
    const { data: sysData, error: sysError } = await supabase
      .from('system_roles')
      .select('*')
      .eq('user_id', userId);

    if (sysError) throw sysError;
    setSystemRoles(sysData || []);
  };

  const loadAvailableOrgsAndProjects = async () => {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');

    setOrganizations(orgs || []);

    const { data: projs } = await supabase
      .from('projects')
      .select('id, name, org_id')
      .order('name');

    setProjects(projs || []);
  };

  const handleAddOrgRole = async () => {
    if (!selectedOrg || !selectedRole) return;

    try {
      setSaving(true);
      
      await scopedRolesService.assignOrgRole({
        user_id: userId,
        org_id: selectedOrg,
        role: selectedRole as any,
        can_access_all_projects: canAccessAll,
      });

      // Log to audit trail
      const org = organizations.find(o => o.id === selectedOrg);
      await permissionAuditService.logPermissionChange(
        selectedOrg,
        'CREATE',
        'org_role',
        userId,
        null,
        { role: selectedRole, can_access_all_projects: canAccessAll },
        `Assigned ${selectedRole} to ${userName || userEmail} in ${org?.name}`
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
      
      const role = orgRoles.find(r => r.org_id === orgId);
      await scopedRolesService.removeOrgRole(userId, orgId);

      // Log to audit trail
      const org = organizations.find(o => o.id === orgId);
      await permissionAuditService.logPermissionChange(
        orgId,
        'DELETE',
        'org_role',
        userId,
        { role: role?.role },
        null,
        `Removed ${role?.role} from ${userName || userEmail} in ${org?.name}`
      );

      await loadUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing role');
    } finally {
      setSaving(false);
    }
  };

  // Similar methods for project and system roles...

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, background: alpha(theme.palette.primary.main, 0.04) }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Scoped Role Assignment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {userName} ({userEmail})
        </Typography>
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
          {/* Tabs */}
          <Paper elevation={0} sx={{ mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
            >
              <Tab label="Organization Roles" value="org" />
              <Tab label="Project Roles" value="project" />
              <Tab label="System Roles" value="system" />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {tabValue === 'org' && (
              <Box>
                {/* Org Roles Table */}
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                        <TableCell>Organization</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>All Projects</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orgRoles.map((role) => (
                        <TableRow key={role.org_id}>
                          <TableCell>{role.organizations?.name}</TableCell>
                          <TableCell>
                            <Chip label={role.role} size="small" />
                          </TableCell>
                          <TableCell>
                            <Checkbox checked={role.can_access_all_projects} disabled />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveOrgRole(role.org_id)}
                              disabled={saving}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Add Button */}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  disabled={saving}
                >
                  Add Organization Role
                </Button>
              </Box>
            )}

            {/* Similar for project and system tabs */}
          </Box>

          {/* Add Dialog */}
          <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Organization Role</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Organization</InputLabel>
                  <Select
                    value={selectedOrg}
                    label="Organization"
                    onChange={(e) => setSelectedOrg(e.target.value)}
                  >
                    {organizations
                      .filter(org => !orgRoles.some(r => r.org_id === org.id))
                      .map(org => (
                        <MenuItem key={org.id} value={org.id}>
                          {org.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Role"
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <MenuItem value="org_admin">Admin</MenuItem>
                    <MenuItem value="org_manager">Manager</MenuItem>
                    <MenuItem value="org_accountant">Accountant</MenuItem>
                    <MenuItem value="org_auditor">Auditor</MenuItem>
                    <MenuItem value="org_viewer">Viewer</MenuItem>
                  </Select>
                </FormControl>

                <Checkbox
                  label="Can Access All Projects"
                  checked={canAccessAll}
                  onChange={(e) => setCanAccessAll(e.target.checked)}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddOrgRole}
                variant="contained"
                disabled={!selectedOrg || !selectedRole || saving}
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
```

## Key Implementation Details

1. **Tabs**: Use MUI Tabs for org/project/system roles
2. **Tables**: Use MUI Table for displaying current roles
3. **Dialogs**: Use MUI Dialog for adding new roles
4. **Error Handling**: Show error alerts and handle gracefully
5. **Loading States**: Show spinner while loading
6. **Audit Logging**: Log all role changes
7. **Permission Checks**: Use `useOptimizedAuth` to verify permissions

## Next Steps

1. Implement project roles tab (similar to org roles)
2. Implement system roles tab
3. Add edit functionality
4. Add bulk operations
5. Test thoroughly
