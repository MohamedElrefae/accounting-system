import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    CircularProgress,
    Button,
    Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import DraggableResizableDialog from '../Common/DraggableResizableDialog';
import { useConnectionHealth } from '../../utils/connectionMonitor';
import {
    getTransactionLineItems,
    replaceLineItems,
    canEditTransactionLine,
    queueLineItemsForSync
} from '../../services/transaction-line-items';
import type { TransactionLineItem } from '../../services/transaction-line-items';
import { useArabicLanguage } from '../../services/ArabicLanguageService';
import ItemsTable from './CostAnalysis/ItemsTable';
import TotalsSummary from './CostAnalysis/TotalsSummary';
import UnsavedChangesDialog from './CostAnalysis/UnsavedChangesDialog';

interface CostAnalysisModalProps {
    open: boolean;
    transactionLineId: string;
    orgId: string;
    onClose: () => void;
    onSaveSuccess?: (side: 'debit' | 'credit') => void;
    isLocked?: boolean; // Forced lock from parent (e.g. approved transaction)
}

const CostAnalysisModal: React.FC<CostAnalysisModalProps> = ({
    open,
    transactionLineId,
    orgId,
    onClose,
    onSaveSuccess,
    isLocked: forcedLocked = false
}) => {
    const { t, isRTL, texts } = useArabicLanguage();
    const { isOnline } = useConnectionHealth();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [items, setItems] = useState<TransactionLineItem[]>([]);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

    // Final effective lock status: either forced by prop or derived from line status
    const effectiveLocked = forcedLocked || isReadOnly;

    const handleSave = useCallback(async (side: 'debit' | 'credit') => {
        if (!transactionLineId || effectiveLocked) return;

        setSaving(true);
        setError(null);

        try {
            if (isOnline) {
                await replaceLineItems(transactionLineId, items);
            } else {
                // Offline mode - queue the operation
                await queueLineItemsForSync(transactionLineId, items);
            }

            setHasUnsavedChanges(false);
            if (onSaveSuccess) onSaveSuccess(side);
            onClose();
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || t(texts.costAnalysis.saveError));
        } finally {
            setSaving(false);
        }
    }, [transactionLineId, effectiveLocked, isOnline, items, onSaveSuccess, onClose, t, texts.costAnalysis.saveError]);

    const handleClose = useCallback(() => {
        if (hasUnsavedChanges && !effectiveLocked) {
            setShowUnsavedDialog(true);
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, effectiveLocked, onClose]);

    const handleConfirmClose = useCallback(() => {
        setShowUnsavedDialog(false);
        onClose();
    }, [onClose]);

    // New item creation
    const handleAddItem = useCallback(() => {
        if (effectiveLocked) return;
        const newItem: Partial<TransactionLineItem> = {
            id: crypto.randomUUID?.() || Math.random().toString(), // local id for keyed list
            transaction_line_id: transactionLineId,
            line_item_id: '', // Blank initially
            quantity: 1,
            unit_price: 0,
            percentage: 100,
            line_number: items.length + 1
        };

        setItems([...items, newItem as TransactionLineItem]);
        setHasUnsavedChanges(true);
    }, [effectiveLocked, transactionLineId, items]);

    const handleItemsChange = useCallback((newItems: TransactionLineItem[]) => {
        setItems(newItems);
        setHasUnsavedChanges(true);
    }, []);

    // Load data when modal opens with a valid transaction line
    useEffect(() => {
        if (!open || !transactionLineId) return;

        let isMounted = true;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Check if the line is editable (status = draft)
                const editable = await canEditTransactionLine(transactionLineId);
                if (!isMounted) return;
                setIsReadOnly(!editable);

                // 2. Load existing items
                const rawItems = await getTransactionLineItems(transactionLineId);
                if (!isMounted) return;

                setItems(rawItems);
                setHasUnsavedChanges(false);
            } catch (err: any) {
                if (!isMounted) return;
                console.error('Error loading cost analysis:', err);
                setError(err.message || 'Failed to load data');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [open, transactionLineId]);

    // Handle keyboard shortcuts
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (!effectiveLocked && !saving && hasUnsavedChanges) {
                    handleSave('debit'); // Default Ctrl+S to debit or maybe we should disable it if ambiguous?
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, effectiveLocked, saving, hasUnsavedChanges, handleSave]);

    if (!open) return null;

    return (
        <>
            <DraggableResizableDialog
                open={open}
                onClose={handleClose}
                title={t(texts.costAnalysis.modalTitle)}
                storageKey="cost_analysis_modal_v1"
                initialWidth={1000}
                initialHeight={700}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    {/* Messages / Alerts area */}
                    <Box sx={{ p: 2, pb: 0, flexShrink: 0 }}>
                        {effectiveLocked && (
                            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                                {t(texts.costAnalysis.lockedWarning)}
                            </Alert>
                        )}

                        {error && (
                            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </Box>

                    {/* Main Content Area */}
                    <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box>
                                <ItemsTable
                                    items={items}
                                    orgId={orgId}
                                    isLocked={effectiveLocked}
                                    onItemsChange={handleItemsChange}
                                />
                            </Box>
                        )}
                    </Box>

                    {/* Summary Panel */}
                    <Box sx={{ px: 2, pb: 2, flexShrink: 0 }}>
                        {items.length > 0 && <TotalsSummary items={items} />}
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderTop: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'background.paper',
                            flexShrink: 0
                        }}
                    >
                        <Box>
                            {!effectiveLocked && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleAddItem}
                                    disabled={loading || saving}
                                >
                                    {t(texts.costAnalysis.addItem)}
                                </Button>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={handleClose}
                                disabled={saving}
                            >
                                {t(texts.common.cancel)}
                            </Button>

                            {!effectiveLocked && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => handleSave('debit')}
                                        disabled={saving || loading || !hasUnsavedChanges}
                                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    >
                                        {isRTL ? 'حفظ كمدين' : 'Save as Debit'}
                                    </Button>

                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => handleSave('credit')}
                                        disabled={saving || loading || !hasUnsavedChanges}
                                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    >
                                        {isRTL ? 'حفظ كدائن' : 'Save as Credit'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </DraggableResizableDialog>

            {/* Unsaved Changes Confirmation Dialog */}
            <UnsavedChangesDialog
                open={showUnsavedDialog}
                onClose={() => setShowUnsavedDialog(false)}
                onDiscard={handleConfirmClose}
                onSave={() => {
                    setShowUnsavedDialog(false);
                    // Defaulting to debit when saving via unsaved changes dialog
                    if (!saving) handleSave('debit');
                }}
            />
        </>
    );
};

export default CostAnalysisModal;
