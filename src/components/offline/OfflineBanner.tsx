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

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import {
    CloudOff,
    Sync,
    Wifi,
    Close
} from '@mui/icons-material';
import { syncEngine } from '../../services/offline/sync/SynchronizationEngine';
import { getQueueLength } from '../../services/offline/sync/SyncQueueManager';

export const OfflineBanner: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const interval = setInterval(async () => {
            const count = await getQueueLength();
            setPendingCount(count);
            setIsSyncing(syncEngine.getSyncStatus().isSyncing);
        }, 3000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const handleSyncClick = async () => {
        await syncEngine.startSync();
    };

    if (!visible || (isOnline && pendingCount === 0 && !isSyncing)) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                width: 'auto',
                minWidth: 400,
                bgcolor: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                px: 3,
                py: 1.5,
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: 'slideIn 0.3s ease-out'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isOnline ? (
                    isSyncing ? (
                        <Sync sx={{ animation: 'spin 2s linear infinite', color: '#60a5fa' }} />
                    ) : (
                        <Wifi sx={{ color: '#4ade80' }} />
                    )
                ) : (
                    <CloudOff sx={{ color: '#f87171' }} />
                )}

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {!isOnline ? 'You are working offline' : isSyncing ? 'Syncing your data...' : 'Waiting to sync'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {pendingCount > 0 ? `${pendingCount} operations pending` : 'All changes saved locally'}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {isOnline && pendingCount > 0 && !isSyncing && (
                <Button
                    variant="contained"
                    size="small"
                    onClick={handleSyncClick}
                    sx={{
                        bgcolor: '#3b82f6',
                        '&:hover': { bgcolor: '#2563eb' },
                        textTransform: 'none',
                        borderRadius: '6px'
                    }}
                >
                    Sync Now
                </Button>
            )}

            <IconButton size="small" onClick={() => setVisible(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                <Close fontSize="small" />
            </IconButton>

            <style>
                {`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                `}
            </style>
        </Box>
    );
};
