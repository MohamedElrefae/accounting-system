import React, { useEffect } from 'react';
import { Box, Paper, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';

export const PermissionDebug = () => {
    const { roles, resolvedPermissions, loading, profile } = useOptimizedAuth();
    const { user } = useAuth();
    const [open, setOpen] = React.useState(true);
    const [dbResult, setDbResult] = React.useState<any>(null);

    // 🕵️ DIRECT DB DEBUGGING
    useEffect(() => {
        const debugDB = async () => {
            if (!user?.id) return;
            const res: any = { userId: user.id };

            // Check 1: user_roles
            const { data: urData, error: urError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', user.id);
            res.userRoles = urError ? `Error: ${urError.message}` : urData;

            // Check 2: roles
            const { data: rData, error: rError } = await supabase
                .from('roles')
                .select('*');
            res.rolesTable = rError ? `Error: ${rError.message}` : `Success (${rData?.length} roles found)`;

            setDbResult(res);
        };
        debugDB();
    }, [user?.id]);

    if (!open) return null;

    // Filter actions to show only relevant ones (reports/accounts) to avoid spam
    const relevantActions = Array.from(resolvedPermissions?.actions || []).filter(a =>
        a.startsWith('reports') || a.startsWith('accounts') || a === 'transaction_lines_report.view'
    );

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 10,
                right: 10,
                zIndex: 9999,
                p: 2,
                maxWidth: 400,
                maxHeight: 500,
                overflow: 'auto',
                border: '2px solid red',
                bgcolor: 'rgba(255, 255, 255, 0.9)'
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" color="error">🕵️ Permission Debugger</Typography>
                <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon /></IconButton>
            </Box>

            <Typography variant="caption" display="block">User ID: {user?.id?.slice(0, 8)}...</Typography>

            {/* RAW DB OUTPUT */}
            <Box mt={1} p={1} bgcolor="#333" color="#0f0" borderRadius={1} sx={{ fontSize: '10px', fontFamily: 'monospace' }}>
                <Typography variant="caption" color="#fff" display="block" fontWeight="bold">DIRECT DB CHECK:</Typography>
                {dbResult ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(dbResult, null, 2)}
                    </pre>
                ) : 'Checking DB...'}
            </Box>

            <Typography variant="subtitle2" mt={1}>Example Log:</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Loading: {String(loading)}
            </Typography>

            <Typography variant="subtitle2" mt={1}>Current Roles (App State):</Typography>
            <pre style={{ margin: 0, fontSize: '11px', background: '#eee', padding: 4 }}>
                {JSON.stringify(roles, null, 2)}
            </pre>
            {roles.includes('viewer') && (
                <Typography color="warning.main" variant="caption" display="block">
                    ⚠️ 'viewer' role detected (System Default Fallback?)
                </Typography>
            )}

            <Typography variant="subtitle2" mt={1}>Profile IS Super Admin:</Typography>
            <Typography variant="body2" fontWeight="bold" color={profile?.is_super_admin ? 'error' : 'success'}>
                {profile?.is_super_admin ? 'YES (Has ALL Permissions)' : 'NO'}
            </Typography>

            <Typography variant="subtitle2" mt={1}>Active Permissions (Filtered):</Typography>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: '11px' }}>
                {relevantActions.map(a => <li key={a}>{a}</li>)}
            </ul>

            {relevantActions.includes('reports.view') && (
                <Typography color="error" fontWeight="bold" mt={1}>
                    ⛔ Warning: reports.view is ACTIVE!
                </Typography>
            )}
        </Paper>
    );
};
