/**
 * OfflineBanner.tsx
 * A premium, floating status banner that informs the user of their connection 
 * and synchronization state.
 * 
 * Visibility:
 * - Always visible when offline
 * - Visible when syncing
 * - Auto-hides when online and sync is complete
 */

import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, LinearProgress, Stack } from '@mui/material';
import {
    CloudOff,
    Sync,
    Wifi,
    Close,
    WarningAmberRounded as ConflictIcon,
    ErrorOutlineRounded as ErrorIcon
} from '@mui/icons-material';
import { syncEngine } from '../../services/offline/sync/SynchronizationEngine';
import { useOffline } from '../OfflineProvider';

export const OfflineBanner: React.FC = () => {
    const { isOnline, pendingOperations, syncProgress } = useOffline();
    const [visible, setVisible] = useState(true);

    const isSyncing = syncProgress.isSyncing;
    const { synced, total, conflicts, errors } = syncProgress;

    const handleSyncClick = async () => {
        await syncEngine.startSync();
    };

    if (!visible || (isOnline && pendingOperations === 0 && !isSyncing)) return null;

    // Calculate progress percentage
    const progress = total > 0 ? (synced / total) * 100 : 0;

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                width: 'auto',
                minWidth: 420,
                bgcolor: 'rgba(30, 41, 59, 0.98)',
                backdropFilter: 'blur(12px)',
                color: 'white',
                px: 3,
                py: 2,
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, width: 40, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                    {isOnline ? (
                        isSyncing ? (
                            <Sync sx={{ animation: 'spin 2s linear infinite', color: '#60a5fa' }} />
                        ) : (
                            <Wifi sx={{ color: '#4ade80' }} />
                        )
                    ) : (
                        <CloudOff sx={{ color: '#f87171' }} />
                    )}
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.01em' }}>
                        {!isOnline ? 'Offline Mode' : isSyncing ? 'Synchronizing Data' : 'Changes Staged Locally'}
                    </Typography>

                    <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {pendingOperations > 0 ? `${pendingOperations} pending` : 'All changes saved'}
                        </Typography>

                        {conflicts > 0 && (
                            <Typography variant="caption" sx={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                <ConflictIcon sx={{ fontSize: 12 }} /> {conflicts} conflicts
                            </Typography>
                        )}

                        {errors > 0 && (
                            <Typography variant="caption" sx={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                <ErrorIcon sx={{ fontSize: 12 }} /> {errors} errors
                            </Typography>
                        )}
                    </Stack>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isOnline && pendingOperations > 0 && !isSyncing && (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSyncClick}
                            sx={{
                                bgcolor: '#3b82f6',
                                '&:hover': { bgcolor: '#2563eb' },
                                textTransform: 'none',
                                borderRadius: '8px',
                                px: 2,
                                height: 32,
                                fontWeight: 600
                            }}
                        >
                            Sync Now
                        </Button>
                    )}

                    <IconButton size="small" onClick={() => setVisible(false)} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}>
                        <Close sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
            </Box>

            {isSyncing && (
                <Box sx={{ width: '100%', mt: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Sync Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '10px' }}>
                            {synced} / {total}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                            }
                        }}
                    />
                </Box>
            )}

            <style>
                {`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                `}
            </style>
        </Box>
    );
};
