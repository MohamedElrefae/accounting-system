/**
 * BasicConflictModal.tsx
 * Lightweight modal for immediate conflict notification and quick resolution.
 * 
 * Options:
 * - Keep Mine: Overwrite the server with local changes.
 * - Keep Server: Discard local changes and adopt server data.
 * - Advanced: Open the full side-by-side ConflictResolutionWizard.
 */

import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Button, Box, Alert, Stack
} from '@mui/material';
import {
    WarningAmberRounded as WarningIcon,
    CompareRounded as CompareIcon,
    CloudDownloadRounded as ServerIcon,
    SaveRounded as LocalIcon
} from '@mui/icons-material';

interface BasicConflictModalProps {
    open: boolean;
    onClose: () => void;
    onResolve: (action: 'keep_mine' | 'keep_server' | 'advanced') => void;
    entityName?: string;
}

export const BasicConflictModal: React.FC<BasicConflictModalProps> = ({
    open,
    onClose,
    onResolve,
    entityName = 'Transaction'
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <WarningIcon color="warning" />
                <Typography variant="h6" fontWeight={700}>
                    Data Conflict
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    The <strong>{entityName}</strong> has been modified by another user or on another device.
                </Alert>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Your changes cannot be saved because they conflict with the version currently on the server.
                    Please choose how to proceed:
                </Typography>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<LocalIcon />}
                        onClick={() => onResolve('keep_mine')}
                        sx={{ justifyContent: 'flex-start', py: 1.5, borderRadius: 2 }}
                    >
                        <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="subtitle2" fontWeight={700}>Keep My Version</Typography>
                            <Typography variant="caption" color="text.secondary">Force save your changes (Overwrites Server)</Typography>
                        </Box>
                    </Button>

                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<ServerIcon />}
                        onClick={() => onResolve('keep_server')}
                        sx={{ justifyContent: 'flex-start', py: 1.5, borderRadius: 2 }}
                    >
                        <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="subtitle2" fontWeight={700}>Keep Server Version</Typography>
                            <Typography variant="caption" color="text.secondary">Adopt server changes (Discards Mine)</Typography>
                        </Box>
                    </Button>

                    <Button
                        variant="contained"
                        fullWidth
                        color="primary"
                        startIcon={<CompareIcon />}
                        onClick={() => onResolve('advanced')}
                        sx={{ py: 1.5, borderRadius: 2 }}
                    >
                        Advanced Comparison...
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};

export default BasicConflictModal;
