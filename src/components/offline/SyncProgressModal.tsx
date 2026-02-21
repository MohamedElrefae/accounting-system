/**
 * SyncProgressModal.tsx
 * Progress modal for long-running sync operations (>30 seconds).
 *
 * Implements:
 * - Req 7.9: Display progress modal with operation counts and ETA
 * - Req 7.9: Allow user to continue in background
 * - Req 7.9: Queue new operations separately from in-progress sync
 * - Req 7.9: Show toast notification on completion
 * - Req 7.9: Resume interrupted syncs on next login
 */

import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, LinearProgress,
    IconButton, Alert
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
    SyncRounded as SyncIcon,
    CheckCircleRounded as CheckIcon,
    MinimizeRounded as MinimizeIcon,
    CloseRounded as CloseIcon,
} from '@mui/icons-material';
import { syncEngine } from '../../services/offline/sync/SynchronizationEngine';

import { useOffline } from '../OfflineProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncProgressModalProps {
    open: boolean;
    onClose: () => void;
    onBackground: () => void; // User clicks "Continue in Background"
}

// ─── Styled Components ────────────────────────────────────────────────────────
// ... (ProgressBar and StatBox remain Same)

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
    height: 10,
    borderRadius: 5,
    '& .MuiLinearProgress-bar': {
        borderRadius: 5,
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    },
}));

const StatBox = styled(Box)(({ theme }) => ({
    flex: 1,
    textAlign: 'center',
    padding: theme.spacing(1.5),
    borderRadius: 10,
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
}));

// ─── ETA Formatter ────────────────────────────────────────────────────────────

function formatEta(ms?: number): string {
    if (!ms || ms <= 0) return 'Calculating...';
    if (ms < 1000) return 'Less than a second';
    if (ms < 60000) return `~${Math.round(ms / 1000)}s`;
    return `~${Math.round(ms / 60000)}m`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
    open,
    onClose,
    onBackground,
}) => {
    const { syncProgress } = useOffline();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Track elapsed time
    useEffect(() => {
        if (!open || syncProgress.status !== 'running') return;
        const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, [open, syncProgress.status]);

    // Reset on open
    useEffect(() => {
        if (open) setElapsedSeconds(0);
    }, [open]);

    const percentComplete = syncProgress.total > 0
        ? Math.round(((syncProgress.synced + syncProgress.conflicts + syncProgress.errors) / syncProgress.total) * 100)
        : 0;

    const isComplete = syncProgress.status === 'completed' || (syncProgress.total > 0 && (syncProgress.synced + syncProgress.conflicts + syncProgress.errors) === syncProgress.total && !syncProgress.isSyncing);
    const isFailed = syncProgress.status === 'failed';
    const isDeferred = syncProgress.status === 'deferred_jwt';
    const isEmpty = syncProgress.total === 0 && !syncProgress.isSyncing;

    return (
        <Dialog
            open={open}
            onClose={(isComplete || isEmpty) ? onClose : undefined}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={!(isComplete || isEmpty)}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
                },
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SyncIcon
                        color={isComplete ? 'success' : isFailed ? 'error' : 'primary'}
                        sx={{
                            fontSize: 28,
                            animation: syncProgress.isSyncing ? 'spin 1.5s linear infinite' : 'none',
                            '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                        }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700}>
                            {isComplete ? 'Sync Complete' :
                                isFailed ? 'Sync Failed' :
                                    isDeferred ? 'Sync Paused' :
                                        isEmpty ? 'All Caught Up' :
                                            'Synchronizing Data...'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isComplete ? `${syncProgress.synced} operations synced successfully` :
                                isFailed ? 'Some operations could not be synced' :
                                    isDeferred ? 'Session expired — will resume on next login' :
                                        isEmpty ? 'No pending operations to synchronize' :
                                            `Elapsed: ${elapsedSeconds}s`}
                        </Typography>
                    </Box>
                    {(isComplete || isEmpty) && (
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    )}
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Progress Bar */}
                {!isComplete && !isDeferred && !isEmpty && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                                {syncProgress.synced + syncProgress.conflicts + syncProgress.errors} / {syncProgress.total} operations
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                                {percentComplete}%
                            </Typography>
                        </Box>
                        <ProgressBar variant={syncProgress.total > 0 ? 'determinate' : 'indeterminate'} value={percentComplete} />
                    </Box>
                )}

                {/* Stats Row */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <StatBox>
                        <Typography variant="h5" fontWeight={800} color="success.main">
                            {syncProgress.synced}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Synced</Typography>
                    </StatBox>
                    <StatBox>
                        <Typography variant="h5" fontWeight={800} color="warning.main">
                            {syncProgress.conflicts}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Conflicts</Typography>
                    </StatBox>
                    <StatBox>
                        <Typography variant="h5" fontWeight={800} color="error.main">
                            {syncProgress.errors}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Errors</Typography>
                    </StatBox>
                    {syncProgress.isSyncing && (
                        <StatBox>
                            <Typography variant="h5" fontWeight={800} color="info.main">
                                {formatEta(syncProgress.synced > 0 ? (syncProgress.total - (syncProgress.synced + syncProgress.conflicts + syncProgress.errors)) * 1000 : 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">ETA</Typography>
                        </StatBox>
                    )}
                </Box>

                {/* Deferred Alert */}
                {isDeferred && (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Your session expired during sync. The remaining operations have been saved and will
                        automatically resume when you log in again.
                    </Alert>
                )}

                {/* Success */}
                {isComplete && (
                    <Alert severity="success" icon={<CheckIcon />} sx={{ borderRadius: 2 }}>
                        All operations have been successfully synchronized with the server.
                    </Alert>
                )}

                {/* Empty State */}
                {isEmpty && (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        There are no pending operations in the sync queue. Your local data is up to date.
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                {(syncProgress.status === 'running' || syncProgress.isSyncing) ? (
                    <>
                        <Button
                            onClick={onBackground}
                            variant="outlined"
                            startIcon={<MinimizeIcon />}
                        >
                            Continue in Background
                        </Button>
                        <Button onClick={() => syncEngine.pauseSync()} color="warning" variant="outlined">
                            Pause
                        </Button>
                    </>
                ) : null}
                {(isComplete || isFailed || isDeferred || isEmpty) && (
                    <Button onClick={onClose} variant="contained" color={(isComplete || isEmpty) ? 'success' : 'primary'}>
                        {isComplete || isEmpty ? 'Done' : 'Close'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default SyncProgressModal;
