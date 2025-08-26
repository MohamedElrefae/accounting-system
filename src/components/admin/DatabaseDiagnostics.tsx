import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Stack,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import { PlayArrow as RunIcon, CheckCircle, Error } from '@mui/icons-material';
import { supabase } from '../../utils/supabase';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  data?: any;
  error?: any;
}

export function DatabaseDiagnostics() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [auditStatus, setAuditStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [auditMessage, setAuditMessage] = useState<string>('');

  const runTests = async () => {
    setRunning(true);
    const results: TestResult[] = [];

    // Test 1: Check authenticated user
    results.push({ name: 'Authentication Check', status: 'running' });
    setTests([...results]);
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      results[0] = {
        name: 'Authentication Check',
        status: user ? 'success' : 'error',
        data: user ? { id: user.id, email: user.email } : null,
        error: !user ? 'No authenticated user found' : null
      };
      setTests([...results]);
    } catch (err: any) {
      results[0] = {
        name: 'Authentication Check',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
      setRunning(false);
      return;
    }

    const userId = results[0].data?.id;
    if (!userId) {
      setRunning(false);
      return;
    }

    // Test 2: Check user profile
    results.push({ name: 'User Profile Check', status: 'running' });
    setTests([...results]);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      results[1] = {
        name: 'User Profile Check',
        status: 'success',
        data: data ? {
          id: data.id,
          email: data.email,
          is_super_admin: data.is_super_admin,
          is_active: data.is_active
        } : null
      };
      setTests([...results]);
    } catch (err: any) {
      results[1] = {
        name: 'User Profile Check',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
    }

    // Test 3: Count all user profiles
    results.push({ name: 'Count User Profiles', status: 'running' });
    setTests([...results]);
    
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      results[2] = {
        name: 'Count User Profiles',
        status: 'success',
        data: { total_users: count }
      };
      setTests([...results]);
    } catch (err: any) {
      results[2] = {
        name: 'Count User Profiles',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
    }

    // Test 4: Fetch first 5 user profiles
    results.push({ name: 'Fetch User Profiles (first 5)', status: 'running' });
    setTests([...results]);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, is_super_admin, is_active')
        .limit(5)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      results[3] = {
        name: 'Fetch User Profiles (first 5)',
        status: 'success',
        data: {
          count: data?.length || 0,
          users: data || []
        }
      };
      setTests([...results]);
    } catch (err: any) {
      results[3] = {
        name: 'Fetch User Profiles (first 5)',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
    }

    // Test 5: Check roles table
    results.push({ name: 'Fetch Roles', status: 'running' });
    setTests([...results]);
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, name_ar')
        .limit(5);
      
      if (error) throw error;
      
      results[4] = {
        name: 'Fetch Roles',
        status: 'success',
        data: {
          count: data?.length || 0,
          roles: data || []
        }
      };
      setTests([...results]);
    } catch (err: any) {
      results[4] = {
        name: 'Fetch Roles',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
    }

    // Test 6: Check user_roles table
    results.push({ name: 'Fetch User Roles', status: 'running' });
    setTests([...results]);
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role_id, is_active')
        .limit(5);
      
      if (error) throw error;
      
      results[5] = {
        name: 'Fetch User Roles',
        status: 'success',
        data: {
          count: data?.length || 0,
          assignments: data || []
        }
      };
      setTests([...results]);
    } catch (err: any) {
      results[5] = {
        name: 'Fetch User Roles',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
    }

    // Test 7: Test is_super_admin function
    results.push({ name: 'Test is_super_admin() Function', status: 'running' });
    setTests([...results]);
    
    try {
      const { data, error } = await supabase
        .rpc('is_super_admin');
      
      if (error) throw error;
      
      results[6] = {
        name: 'Test is_super_admin() Function',
        status: 'success',
        data: { is_super_admin: data }
      };
      setTests([...results]);
    } catch (err: any) {
      results[6] = {
        name: 'Test is_super_admin() Function',
        status: 'error',
        error: err.message
      };
      setTests([...results]);
    }

    setRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Database Connection Diagnostics
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Run these tests to diagnose issues with database connection and permissions.
      </Typography>

      {/* Audit logging indicator */}
      <Alert severity={import.meta.env.VITE_ENABLE_AUDIT === 'true' ? 'success' : 'info'} sx={{ mb: 2 }}>
        <Typography variant="body2">
          Audit logging: {import.meta.env.VITE_ENABLE_AUDIT === 'true' ? 'Enabled' : 'Disabled'}
        </Typography>
        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
            VITE_ENABLE_AUDIT = {String(import.meta.env.VITE_ENABLE_AUDIT)}
          </Typography>
        </Box>
      </Alert>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<RunIcon />}
          onClick={runTests}
          disabled={running}
        >
          {running ? 'Running Tests...' : 'Run Diagnostics'}
        </Button>

        <Button
          variant="outlined"
          onClick={async () => {
            setAuditStatus('running');
            setAuditMessage('');
            try {
              if (import.meta.env.VITE_ENABLE_AUDIT !== 'true') {
                setAuditStatus('error');
                setAuditMessage('Audit is disabled by VITE_ENABLE_AUDIT flag');
                return;
              }

              const { data: userRes } = await supabase.auth.getUser();
              if (!userRes?.user?.id) {
                setAuditStatus('error');
                setAuditMessage('Not authenticated');
                return;
              }

              const payload = {
                p_action: 'diagnostics.test',
                p_entity_type: 'diagnostics',
                p_entity_id: userRes.user.id,
                p_details: { page: 'diagnostics', ts: new Date().toISOString() }
              };
              const { data, error } = await supabase.rpc('log_audit', payload);
              if (error) {
                setAuditStatus('error');
                setAuditMessage(error.message);
              } else {
                setAuditStatus('success');
                setAuditMessage(typeof data === 'object' ? JSON.stringify(data) : String(data));
              }
            } catch (e: any) {
              setAuditStatus('error');
              setAuditMessage(e?.message || String(e));
            }
          }}
        >
          Test Audit Logging
        </Button>
      </Stack>

      {auditStatus !== 'idle' && (
        <Alert severity={auditStatus === 'success' ? 'success' : auditStatus === 'running' ? 'info' : 'error'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            {auditStatus === 'running' ? 'Testing audit logging...' : auditStatus === 'success' ? 'Audit logging OK' : 'Audit logging failed'}
          </Typography>
          {auditMessage && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'auto' }}>
                {auditMessage}
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {tests.length > 0 && (
        <Stack spacing={2}>
          {tests.map((test, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                {getStatusIcon(test.status)}
                <Typography variant="subtitle1" fontWeight="medium">
                  {test.name}
                </Typography>
                <Chip
                  label={test.status}
                  size="small"
                  color={getStatusColor(test.status) as any}
                />
              </Stack>

              {test.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Error: {test.error}
                  </Typography>
                </Alert>
              )}

              {test.data && (
                <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" component="pre" sx={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(test.data, null, 2)}
                  </Typography>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {tests.length > 0 && (
        <Box mt={3}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Troubleshooting Guide
          </Typography>
          
          {tests.some(t => t.name === 'Authentication Check' && t.status === 'error') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>No Authentication:</strong> You need to be logged in. Check your login flow.
              </Typography>
            </Alert>
          )}

          {tests.some(t => t.name === 'User Profile Check' && t.status === 'error') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Profile Missing:</strong> Your user exists in auth.users but not in user_profiles. 
                Run the sync SQL script in Supabase SQL editor.
              </Typography>
            </Alert>
          )}

          {tests.some(t => t.name === 'Count User Profiles' && t.status === 'error') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Cannot Access Profiles Table:</strong> Check RLS policies on user_profiles table.
              </Typography>
            </Alert>
          )}

          {tests.some(t => t.name === 'Test is_super_admin() Function' && t.status === 'error') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Function Missing:</strong> The is_super_admin() function doesn't exist. 
                Create it in Supabase SQL editor.
              </Typography>
            </Alert>
          )}

          {tests.every(t => t.status === 'success') && (
            <Alert severity="success">
              <Typography variant="body2">
                <strong>All Tests Passed!</strong> Your database connection and permissions are working correctly.
              </Typography>
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
}
