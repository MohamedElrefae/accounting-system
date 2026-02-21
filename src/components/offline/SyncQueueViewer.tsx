/**
 * SyncQueueViewer.tsx
 * A detailed dashboard for users to review and manage their pending sync operations.
 * 
 * Features:
 * - List of pending, failed, and conflicted operations
 * - Conflict resolution wizard integration (Req 7.2, 7.8)
 * - Sync progress modal trigger (Req 7.9)
 * - Storage dashboard tab (Req 4.9)
 * - Queue priority management
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent,
    List, Chip, Typography, Box, Button, Card, CardContent,
    Tabs, Tab, IconButton, Tooltip, Badge,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
    SyncRounded as SyncIcon,
    ErrorRounded as ErrorIcon,
    WarningRounded as WarningIcon,
    HistoryRounded as HistoryIcon,
    StorageRounded as StorageIcon,
    RefreshRounded as RefreshIcon,
    CloseRounded as CloseIcon,
    PlayArrowRounded as PlayIcon,
    SettingsRounded as SettingsIcon,
} from '@mui/icons-material';
import { getAllPending, getAllFailed, getAllConflicts } from '../../services/offline/sync/SyncQueueManager';
import { syncEngine } from '../../services/offline/sync/SynchronizationEngine';
import type { SyncQueueEntry } from '../../services/offline/core/OfflineTypes';
import { ConflictResolutionWizard, type ConflictData } from './ConflictResolutionWizard';
import { SyncProgressModal } from './SyncProgressModal';
import { StorageDashboard } from './StorageDashboard';
import { OfflineSettings } from './OfflineSettings';

// ─── Styled Components ────────────────────────────────────────────────────────

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: 20,
        background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    },
}));

const EntryCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(1.5),
    borderRadius: 12,
    boxShadow: 'none',
    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    transition: 'transform 0.15s, box-shadow 0.15s',
    '&:hover': {
        transform: 'translateX(4px)',
        boxShadow: theme.shadows[2],
    },
}));

// ─── Queue Entry Row ──────────────────────────────────────────────────────────

const QueueEntryRow: React.FC<{
    entry: SyncQueueEntry;
    onResolveConflict?: (entry: SyncQueueEntry) => void;
}> = ({ entry, onResolveConflict }) => (
    <EntryCard>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                        size="small"
                        label={entry.operation.type}
                        color={entry.operation.type === 'CREATE' ? 'success' : entry.operation.type === 'DELETE' ? 'error' : 'primary'}
                        sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                        {entry.operation.entityType.replace('_', ' ')}
                    </Typography>
                    {entry.retryCount > 0 && (
                        <Chip size="small" label={`Retry ${entry.retryCount}`} color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                    {new Date(entry.createdAt).toLocaleString()} · ID: {entry.operation.entityId.slice(0, 8)}…
                </Typography>
                {entry.error && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, p: 0.75, bgcolor: (t) => alpha(t.palette.error.main, 0.05), borderRadius: 1 }}>
                        ⚠ {entry.error}
                    </Typography>
                )}
            </Box>
            {entry.status === 'conflict' && onResolveConflict && (
                <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    onClick={() => onResolveConflict(entry)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem' }}
                >
                    Resolve
                </Button>
            )}
        </CardContent>
    </EntryCard>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ message: string; icon?: React.ReactNode }> = ({ message, icon }) => (
    <Box sx={{ py: 8, textAlign: 'center', opacity: 0.5 }}>
        <Box sx={{ fontSize: 48, mb: 1 }}>{icon ?? <SyncIcon sx={{ fontSize: 48 }} />}</Box>
        <Typography color="text.secondary">{message}</Typography>
    </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const SyncQueueViewer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [tab, setTab] = useState(0);
    const [offlineEnabled, setOfflineEnabled] = useState(true);
    const [pending, setPending] = useState<SyncQueueEntry[]>([]);
    const [failed, setFailed] = useState<SyncQueueEntry[]>([]);
    const [conflicts, setConflicts] = useState<SyncQueueEntry[]>([]);
    const [conflictWizardOpen, setConflictWizardOpen] = useState(false);
    const [syncProgressOpen, setSyncProgressOpen] = useState(false);
    const [activeConflict, setActiveConflict] = useState<ConflictData | null>(null);

    useEffect(() => {
        if (open) refreshData();
    }, [open]);

    const refreshData = async () => {
        setPending(await getAllPending());
        setFailed(await getAllFailed());
        setConflicts(await getAllConflicts());
    };

    const handleManualSync = async () => {
        setSyncProgressOpen(true);
        await syncEngine.startSync();
    };

    const handleResolveConflict = (entry: SyncQueueEntry) => {
        // Build a ConflictData object from the queue entry
        const conflictData: ConflictData = {
            id: entry.id,
            entityType: entry.operation.entityType as any,
            entityId: entry.operation.entityId,
            conflictType: 'edit_conflict',
            severity: 'high',
            conflictReasons: [entry.error || 'Conflicting edits detected during sync'],
            affectedUsers: [],
            fields: [],
            localVersion: entry.operation.data || {},
            serverVersion: {},
            localModifiedAt: entry.createdAt,
            serverModifiedAt: new Date().toISOString(),
            localModifiedBy: entry.operation.userId || 'You',
            serverModifiedBy: 'Server',
        };
        setActiveConflict(conflictData);
        setConflictWizardOpen(true);
    };

    const handleConflictResolved = (action: any) => {
        console.info(`[SyncQueueViewer] Conflict resolved with action: ${action}`);
        setConflictWizardOpen(false);
        setActiveConflict(null);
        refreshData();
    };

    return (
        <>
            <StyledDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                {/* Header */}
                <DialogTitle sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}`, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SyncIcon color="primary" />
                        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                            Offline Sync Manager
                        </Typography>
                        <Tooltip title="Sync Now">
                            <IconButton onClick={handleManualSync} size="small" color="primary">
                                <PlayIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Refresh">
                            <IconButton onClick={refreshData} size="small">
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {/* Tabs */}
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="fullWidth"
                        sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}` }}
                    >
                        <Tab
                            label={`Pending (${pending.length})`}
                            icon={<HistoryIcon fontSize="small" />}
                            iconPosition="start"
                            sx={{ fontSize: '0.8rem' }}
                        />
                        <Tab
                            label={`Failed (${failed.length})`}
                            icon={
                                <Badge badgeContent={failed.length > 0 ? failed.length : undefined} color="error">
                                    <ErrorIcon fontSize="small" />
                                </Badge>
                            }
                            iconPosition="start"
                            sx={{ fontSize: '0.8rem' }}
                        />
                        <Tab
                            label={`Conflicts (${conflicts.length})`}
                            icon={
                                <Badge badgeContent={conflicts.length > 0 ? conflicts.length : undefined} color="warning">
                                    <WarningIcon fontSize="small" />
                                </Badge>
                            }
                            iconPosition="start"
                            sx={{ fontSize: '0.8rem' }}
                        />
                        <Tab
                            label="Storage"
                            icon={<StorageIcon fontSize="small" />}
                            iconPosition="start"
                            sx={{ fontSize: '0.8rem' }}
                        />
                        <Tab
                            label="Settings"
                            icon={<SettingsIcon fontSize="small" />}
                            iconPosition="start"
                            sx={{ fontSize: '0.8rem' }}
                        />
                    </Tabs>

                    {/* Tab Content */}
                    <Box sx={{ p: 2.5, maxHeight: '60vh', overflowY: 'auto' }}>
                        {tab === 0 && (
                            <List disablePadding>
                                {pending.map(entry => <QueueEntryRow key={entry.id} entry={entry} />)}
                                {pending.length === 0 && <EmptyState message="No pending operations — all synced!" />}
                            </List>
                        )}
                        {tab === 1 && (
                            <List disablePadding>
                                {failed.map(entry => <QueueEntryRow key={entry.id} entry={entry} />)}
                                {failed.length === 0 && <EmptyState message="No failed operations" icon={<ErrorIcon sx={{ fontSize: 48, color: 'success.main' }} />} />}
                            </List>
                        )}
                        {tab === 2 && (
                            <List disablePadding>
                                {conflicts.map(entry => (
                                    <QueueEntryRow
                                        key={entry.id}
                                        entry={entry}
                                        onResolveConflict={handleResolveConflict}
                                    />
                                ))}
                                {conflicts.length === 0 && <EmptyState message="No conflicts detected" icon={<WarningIcon sx={{ fontSize: 48, color: 'success.main' }} />} />}
                            </List>
                        )}
                        {tab === 3 && <StorageDashboard />}
                        {tab === 4 && <OfflineSettings isEnabled={offlineEnabled} onToggle={setOfflineEnabled} />}
                    </Box>
                </DialogContent>

                {/* Footer */}
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderTop: (t) => `1px solid ${t.palette.divider}` }}>
                    <Typography variant="caption" color="text.secondary">
                        {pending.length + failed.length + conflicts.length} total operations
                    </Typography>
                    <Button onClick={onClose} color="inherit" size="small">Close</Button>
                </Box>
            </StyledDialog>

            {/* Conflict Resolution Wizard */}
            <ConflictResolutionWizard
                open={conflictWizardOpen}
                conflict={activeConflict}
                onResolve={handleConflictResolved}
                onClose={() => setConflictWizardOpen(false)}
            />

            {/* Sync Progress Modal */}
            <SyncProgressModal
                open={syncProgressOpen}
                onClose={() => setSyncProgressOpen(false)}
                onBackground={() => setSyncProgressOpen(false)}
            />
        </>
    );
};

export default SyncQueueViewer;
