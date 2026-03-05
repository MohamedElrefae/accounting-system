import React from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import { CloudOff as CloudOffIcon, Storage as StorageIcon } from '@mui/icons-material';
import { useConnectionHealth } from '../../utils/connectionMonitor';

interface StalenessIndicatorProps {
    isStale?: boolean;
    lastUpdated?: string;
    compact?: boolean;
}

/**
 * StalenessIndicator
 * 
 * A UI component that alerts the user when they are viewing cached data while offline.
 * This is crucial for financial reports where data accuracy is paramount.
 */
const StalenessIndicator: React.FC<StalenessIndicatorProps> = ({
    isStale = false,
    lastUpdated,
    compact = false
}) => {
    const { isOnline } = useConnectionHealth();

    // If we are online and data is not explicitly marked as stale, don't show anything
    if (isOnline && !isStale) return null;

    const message = lastUpdated
        ? (document.documentElement.dir === 'rtl' ? `بيانات مخزنة (آخر تحديث: ${lastUpdated})` : `Cached Data (Last updated: ${lastUpdated})`)
        : (document.documentElement.dir === 'rtl' ? 'بيانات مخزنة محلياً' : 'Local Cached Data');

    if (compact) {
        return (
            <Tooltip title={message}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 1, verticalAlign: 'middle' }}>
                    <StorageIcon color="warning" sx={{ fontSize: '1rem' }} />
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: 'warning.light',
                color: 'warning.contrastText',
                border: '1px solid',
                borderColor: 'warning.main',
                boxShadow: 1
            }}
        >
            <CloudOffIcon color="inherit" />
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {document.documentElement.dir === 'rtl' ? 'وضع عدم الاتصال' : 'Offline Mode'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    {message}
                </Typography>
            </Box>
            <Chip
                label={document.documentElement.dir === 'rtl' ? 'وضع العرض فقط' : 'Read-Only'}
                size="small"
                color="warning"
                variant="filled"
                sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
            />
        </Box>
    );
};

export default StalenessIndicator;
