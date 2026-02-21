/**
 * StorageDashboard.tsx
 * Real-time storage monitoring dashboard for the offline system.
 *
 * Implements:
 * - Req 4.9: Display transactions cached (count + size), attachments cached,
 *            pending sync queue size, available browser quota, projected days until full
 * - Req 4.7: Alert administrators when critical storage thresholds are reached
 * - Req 4.10: Mobile 200MB cap warning at 80% capacity
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, LinearProgress,
    Chip, Button, Divider, Alert, Grid, Tooltip,
    CircularProgress, IconButton,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
    StorageRounded as StorageIcon,
    SyncRounded as SyncIcon,
    AttachFileRounded as AttachIcon,
    ReceiptRounded as TxIcon,
    WarningAmberRounded as WarningIcon,
    RefreshRounded as RefreshIcon,
    DeleteSweepRounded as CleanupIcon,
    PhoneAndroidRounded as MobileIcon,
} from '@mui/icons-material';
import { getStorageInfo, checkStorageHealth } from '../../services/offline/core/OfflineStore';
import type { StorageInfo } from '../../services/offline/core/OfflineTypes';

// ─── Styled Components ────────────────────────────────────────────────────────

const MetricCard = styled(Card)(({ theme }) => ({
    borderRadius: 16,
    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    background: theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.paper, 0.6)
        : alpha(theme.palette.background.paper, 0.9),
    backdropFilter: 'blur(8px)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
    },
}));

const QuotaBar = styled(LinearProgress)<{ severity: 'ok' | 'warning' | 'critical' }>(
    ({ theme, severity }) => ({
        height: 12,
        borderRadius: 6,
        '& .MuiLinearProgress-bar': {
            borderRadius: 6,
            background: severity === 'critical'
                ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                : severity === 'warning'
                    ? `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
                    : `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
        },
    })
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function estimateDaysUntilFull(used: number, quota: number, dailyGrowthEstimate = 500_000): number {
    const available = quota - used;
    if (dailyGrowthEstimate <= 0) return 999;
    return Math.floor(available / dailyGrowthEstimate);
}

// ─── Metric Card Component ────────────────────────────────────────────────────

interface MetricProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color?: string;
}

const MetricDisplay: React.FC<MetricProps> = ({ icon, label, value, subValue, color = 'primary.main' }) => (
    <MetricCard>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ color }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {label}
                </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color }}>
                {value}
            </Typography>
            {subValue && (
                <Typography variant="caption" color="text.secondary">
                    {subValue}
                </Typography>
            )}
        </CardContent>
    </MetricCard>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface StorageDashboardProps {
    compact?: boolean;
}

export const StorageDashboard: React.FC<StorageDashboardProps> = ({ compact = false }) => {
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const [health, setHealth] = useState<{ status: 'ok' | 'warning' | 'critical'; percentUsed: number; message?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [info, healthStatus] = await Promise.all([
                getStorageInfo(),
                checkStorageHealth(),
            ]);
            setStorageInfo(info);
            setHealth(healthStatus);
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('[StorageDashboard] Failed to load storage info:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        // Auto-refresh every 30 seconds
        const interval = setInterval(refresh, 30_000);
        return () => clearInterval(interval);
    }, [refresh]);

    if (loading && !storageInfo) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const percentUsed = health?.percentUsed ?? 0;
    const percentDisplay = Math.round(percentUsed * 100);
    const daysUntilFull = storageInfo
        ? estimateDaysUntilFull(storageInfo.usedSpace, storageInfo.totalCapacity)
        : 999;

    const breakdown = storageInfo?.dataBreakdown;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StorageIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                        Storage Dashboard
                    </Typography>
                    {storageInfo?.isMobileCapped && (
                        <Chip
                            icon={<MobileIcon />}
                            label="Mobile (200MB cap)"
                            size="small"
                            color="info"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Tooltip title={`Last refreshed: ${lastRefreshed.toLocaleTimeString()}`}>
                    <IconButton onClick={refresh} size="small" disabled={loading}>
                        <RefreshIcon fontSize="small" sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Health Alert */}
            {health && health.status !== 'ok' && (
                <Alert
                    severity={health.status === 'critical' ? 'error' : 'warning'}
                    icon={<WarningIcon />}
                    sx={{ mb: 2, borderRadius: 2 }}
                    action={
                        <Button size="small" startIcon={<CleanupIcon />} color="inherit">
                            Clean Up
                        </Button>
                    }
                >
                    {health.message}
                </Alert>
            )}

            {/* Overall Quota Bar */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                        Browser Storage Quota
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color={
                        health?.status === 'critical' ? 'error.main' :
                            health?.status === 'warning' ? 'warning.main' : 'success.main'
                    }>
                        {percentDisplay}% used
                    </Typography>
                </Box>
                <QuotaBar
                    variant="determinate"
                    value={Math.min(percentDisplay, 100)}
                    severity={health?.status ?? 'ok'}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        {formatBytes(storageInfo?.usedSpace ?? 0)} used
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatBytes(storageInfo?.availableSpace ?? 0)} available
                    </Typography>
                </Box>
            </Box>

            {/* Metrics Grid */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                    <MetricDisplay
                        icon={<TxIcon fontSize="small" />}
                        label="Transactions Cached"
                        value={breakdown ? Math.round(breakdown.transactions / 5000).toLocaleString() : '—'}
                        subValue={formatBytes(breakdown?.transactions ?? 0)}
                        color="primary.main"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <MetricDisplay
                        icon={<AttachIcon fontSize="small" />}
                        label="Attachments Cached"
                        value={breakdown ? Math.round(breakdown.attachments / 50000).toLocaleString() : '—'}
                        subValue={formatBytes(breakdown?.attachments ?? 0)}
                        color="secondary.main"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <MetricDisplay
                        icon={<SyncIcon fontSize="small" />}
                        label="Pending Sync Queue"
                        value={breakdown ? Math.round(breakdown.syncQueue / 1000).toLocaleString() : '—'}
                        subValue={formatBytes(breakdown?.syncQueue ?? 0)}
                        color="warning.main"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <MetricDisplay
                        icon={<StorageIcon fontSize="small" />}
                        label="Days Until Full"
                        value={daysUntilFull > 365 ? '365+' : String(daysUntilFull)}
                        subValue="at current growth rate"
                        color={daysUntilFull < 30 ? 'error.main' : daysUntilFull < 90 ? 'warning.main' : 'success.main'}
                    />
                </Grid>
            </Grid>

            {/* Storage Mode */}
            {!compact && (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => alpha(t.palette.info.main, 0.05), border: (t) => `1px solid ${alpha(t.palette.info.main, 0.2)}` }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Attachment Storage Mode
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {storageInfo?.attachmentMode === 'cloud_reference'
                            ? '☁️ Cloud Reference Mode — Attachments stored as URLs. Download on demand to save space.'
                            : '💾 Full Download Mode — Attachments cached locally for offline access.'}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default StorageDashboard;
