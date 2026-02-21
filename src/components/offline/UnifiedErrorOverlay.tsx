import React from 'react';
import {
    Snackbar,
    Alert,
    AlertTitle,
    Button,
    Box,
    Typography
} from '@mui/material';
import {
    SignalWifiOff as OfflineIcon,
    SyncProblem as SyncErrorIcon,
    CloudDone as SyncedIcon
} from '@mui/icons-material';

interface SyncErrorNotification {
    id: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    action?: () => void;
    actionLabel?: string;
}

/**
 * UnifiedErrorOverlay
 * Implements Task 17.1c: Comprehensive error handling UI.
 */
export const UnifiedErrorOverlay: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    const [error, setError] = React.useState<SyncErrorNotification | null>(null);

    // Global listener for sync errors
    React.useEffect(() => {
        const handleSyncError = (event: any) => {
            setError({
                id: Math.random().toString(),
                message: event.detail.message,
                severity: event.detail.retryable ? 'warning' : 'error',
                action: event.detail.retryable ? () => window.location.reload() : undefined,
                actionLabel: event.detail.retryable ? 'Retry' : undefined
            });
            setOpen(true);
        };

        window.addEventListener('offline-sync-error', handleSyncError);
        return () => window.removeEventListener('offline-sync-error', handleSyncError);
    }, []);

    return (
        <Box>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setOpen(false)}
                    severity={error?.severity || 'info'}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: 2 }}
                    icon={error?.severity === 'error' ? <SyncErrorIcon /> : <OfflineIcon />}
                    action={
                        error?.action && (
                            <Button color="inherit" size="small" onClick={error.action}>
                                {error.actionLabel}
                            </Button>
                        )
                    }
                >
                    <AlertTitle sx={{ fontWeight: 'bold' }}>
                        {error?.severity === 'error' ? 'Sync Failure' : 'Connectivity Issue'}
                    </AlertTitle>
                    {error?.message}
                </Alert>
            </Snackbar>

            {/* Persistent Mini Banner for Background Status */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    pointerEvents: 'none'
                }}
            >
                {!navigator.onLine && (
                    <Paper
                        elevation={3}
                        sx={{
                            p: 1.5,
                            bgcolor: 'error.dark',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '24px',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.7)' },
                                '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(211, 47, 47, 0)' },
                                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' },
                            }
                        }}
                    >
                        <OfflineIcon sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="caption" fontWeight="bold">Working Offline</Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

import { Paper } from '@mui/material';
