import React from 'react';
import {
    Box,
    Switch,
    FormControlLabel,
    Typography,
    Divider,
    Button,
    Paper,
    Alert,
    Tooltip,
    IconButton,
    Stack
} from '@mui/material';
import {
    CloudOff as OfflineIcon,
    CloudQueue as OnlineIcon,
    DeleteForever as WipeIcon,
    InfoOutlined as InfoIcon,
    DescriptionOutlined as ExportIcon,
    Security as SecurityIcon
} from '@mui/icons-material';
import { securityManager } from '../../services/offline/security/SecurityManager';
import { OfflineExportService } from '../../services/offline/reports/OfflineExportService';
import { useUniversalExport } from '../../hooks/useUniversalExport';

interface OfflineSettingsProps {
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
}

/**
 * OfflineSettings
 * Implements Req 7.3: Offline capability toggle (online-only mode).
 * Implements Req 16.2: Regulatory compliance exporting.
 */
export const OfflineSettings: React.FC<OfflineSettingsProps> = ({ isEnabled, onToggle }) => {
    const { exportToPDF, exportToExcel } = useUniversalExport();

    const handleWipe = async () => {
        if (window.confirm('This will securely erase all local financial data cached on this device. Proceed?')) {
            await securityManager.secureWipe();
            window.location.reload();
        }
    };

    const handleExportJournal = async (format: 'pdf' | 'excel') => {
        const data = await OfflineExportService.getJournalDataset();
        if (format === 'pdf') {
            await exportToPDF(data, { title: 'Local Transaction Journal (Regulatory)' });
        } else {
            await exportToExcel(data, { title: 'Local Transaction Journal (Regulatory)' });
        }
    };

    const handleExportAudit = async () => {
        const data = await OfflineExportService.getAuditDataset();
        await exportToPDF(data, { title: 'Offline Security Audit Log' });
    };

    return (
        <Box sx={{ p: 1 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                {/* ... existing switch code ... */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <OfflineIcon sx={{ mr: 1, color: isEnabled ? 'primary.main' : 'text.disabled' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Offline Capability
                    </Typography>
                    <Tooltip title="When enabled, your work is saved locally and synced automatically. When disabled, the app works only when you have a connection.">
                        <IconButton size="small">
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={isEnabled}
                            onChange={(e) => onToggle(e.target.checked)}
                            color="primary"
                        />
                    }
                    label={isEnabled ? "Offline Mode Enabled" : "Online Only Mode"}
                    sx={{ mb: 2 }}
                />

                {!isEnabled && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        The app will not cache data on this device. You will need a reliable internet connection to work.
                    </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Regulatory Exports Section */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <ExportIcon fontSize="small" sx={{ mr: 1 }} /> Regulatory Compliance & Exports
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Generate standardized reports from your local data. These work without a server connection.
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleExportJournal('pdf')}
                            sx={{ textTransform: 'none' }}
                        >
                            Export Journal (PDF)
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleExportJournal('excel')}
                            sx={{ textTransform: 'none' }}
                        >
                            Journal (Excel)
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SecurityIcon />}
                            onClick={handleExportAudit}
                            sx={{ textTransform: 'none' }}
                        >
                            Security Log
                        </Button>
                    </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Local Data Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Periodically clearing your local data can free up storage. All synced changes are safe on the server.
                    </Typography>

                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<WipeIcon />}
                        onClick={handleWipe}
                        sx={{ mt: 1, textTransform: 'none' }}
                    >
                        Secure Wipe Local Storage
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};
