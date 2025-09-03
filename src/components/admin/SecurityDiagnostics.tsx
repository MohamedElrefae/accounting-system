import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, Divider, Stack, Typography, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import { usePermissions } from '../../hooks/usePermissions';
import { useUserProfile } from '../../contexts/UserProfileContext';

const RlsChecks: React.FC = () => {
  const { profile } = useUserProfile();
  const [status, setStatus] = useState<string>('');
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      // These checks should succeed if RLS is configured as owner-only
      const uid = profile?.id || '';
      // 1) own profile should be readable
      const res1 = await (await import('../../utils/supabase')).supabase
        .from('user_profiles')
        .select('id')
        .eq('id', uid)
        .single();
      const ok1 = !!res1.data && !res1.error;

      // 2) user_roles should only return current user's rows
      const res2 = await (await import('../../utils/supabase')).supabase
        .from('user_roles')
        .select('user_id')
        .limit(100);
      const onlyOwn = (res2.data || []).every((r: { user_id?: string }) => r.user_id === uid);
      const ok2 = !res2.error && onlyOwn;

      // 3) user_permissions should only return current user's rows
      const res3 = await (await import('../../utils/supabase')).supabase
        .from('user_permissions')
        .select('user_id')
        .limit(100);
      const onlyOwnP = (res3.data || []).every((r: { user_id?: string }) => r.user_id === uid);
      const ok3 = !res3.error && onlyOwnP;

      setStatus(`Profiles: ${ok1 ? 'ok' : 'fail'} • Roles: ${ok2 ? 'ok' : 'fail'} • Permissions: ${ok3 ? 'ok' : 'fail'}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Error: ${msg}`);
    } finally {
      setRunning(false);
    }
  };
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Button variant="outlined" size="small" onClick={run} disabled={running}>Run RLS checks</Button>
      <Typography variant="body2">{status}</Typography>
    </Stack>
  );
};

export const SecurityDiagnostics: React.FC = () => {
  const { permissions, loading } = usePermissions();
  const { profile } = useUserProfile();
  const [checks, setChecks] = useState<string[]>([]);

  const idleMinutes = useMemo(() => Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 0) || 0, []);
  const isAuditEnabled = useMemo(() => import.meta.env.VITE_ENABLE_AUDIT === 'true', []);
  const isInviteFxEnabled = useMemo(() => import.meta.env.VITE_ENABLE_INVITE_EMAILS === 'true', []);

  const runChecks = async () => {
    const out: string[] = [];
    if (profile?.roles?.includes('super_admin')) out.push('role: super_admin');
    if (permissions.includes('*')) out.push('permission: *');
    if (permissions.includes('users.manage')) out.push('permission: users.manage');
    if (permissions.includes('roles.manage')) out.push('permission: roles.manage');
    setChecks(out);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader title="Security" subheader="Runtime configuration and quick checks" />
      <Divider />
      <CardContent>
        <Grid container spacing={2}>
<Grid size={{ xs: 12, md: 4 }}>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Idle auto-logout</Typography>
              <Typography variant="body2">Timeout: {idleMinutes} minute(s)</Typography>
            </Stack>
</Grid>
<Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Feature flags</Typography>
              <Typography variant="body2">Audit logging: {isAuditEnabled ? 'enabled' : 'disabled'}</Typography>
              <Typography variant="body2">Invite emails (Edge Function): {isInviteFxEnabled ? 'enabled' : 'disabled'}</Typography>
            </Stack>
</Grid>
<Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Current user</Typography>
              <Typography variant="body2">User ID: {profile?.id || '—'}</Typography>
              <Typography variant="body2">Roles: {(profile?.roles || []).join(', ') || '—'}</Typography>
            </Stack>
</Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="outlined" size="small" disabled={loading} onClick={runChecks}>Run quick permission checks</Button>
          <Typography variant="body2">{checks.join(' • ')}</Typography>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <RlsChecks />
      </CardContent>
    </Card>
  );
};

