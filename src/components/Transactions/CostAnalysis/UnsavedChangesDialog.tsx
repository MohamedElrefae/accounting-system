import React, { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useArabicLanguage } from '../../../services/ArabicLanguageService';

interface UnsavedChangesDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    onDiscard: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
    open,
    onClose,
    onSave,
    onDiscard
}) => {
    const { t, isRTL, texts } = useArabicLanguage();

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onSave, onClose]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            dir={isRTL ? 'rtl' : 'ltr'}
            PaperProps={{ sx: { minWidth: 400 } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
                <WarningAmberIcon />
                {t(texts.costAnalysis.unsavedChanges)}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {t(texts.costAnalysis.unsavedWarning)}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit">
                    {t(texts.common.cancel)}
                </Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onDiscard} color="error" variant="outlined">
                        {t(texts.costAnalysis.leave)}
                    </Button>
                    <Button onClick={onSave} color="primary" variant="contained">
                        {t(texts.common.save)}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default UnsavedChangesDialog;
