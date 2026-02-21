/**
 * ConflictResolutionWizard.tsx
 * Side-by-side conflict resolution dialog for accounting data conflicts.
 *
 * Implements:
 * - Req 7.2: Guided conflict resolution wizard
 * - Req 7.8: Modal with side-by-side comparison, Keep Both/Mine/Server/Merge actions,
 *            match score, conflict reasons, and notification of affected users
 * - Req 2.9: Suspected duplicate detection with side-by-side review
 */

import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, Chip, Divider, Alert,
    Table, TableBody, TableRow, TableCell, TableHead,
    Stepper, Step, StepLabel, LinearProgress, Tooltip,
    IconButton, Collapse,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
    WarningAmberRounded as WarningIcon,
    MergeTypeRounded as MergeIcon,
    PersonRounded as PersonIcon,
    CheckCircleRounded as CheckIcon,
    InfoRounded as InfoIcon,
    ExpandMoreRounded as ExpandIcon,
} from '@mui/icons-material';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConflictResolutionAction = 'keep_mine' | 'keep_server' | 'keep_both' | 'merge';

export interface ConflictField {
    field: string;
    label: string;
    localValue: any;
    serverValue: any;
    isDifferent: boolean;
}

export interface ConflictData {
    id: string;
    entityType: 'transaction' | 'payment' | 'journal_entry';
    entityId: string;
    referenceNumber?: string;
    conflictType: 'edit_conflict' | 'duplicate_suspected' | 'sequence_conflict' | 'amount_discrepancy';
    severity: 'low' | 'medium' | 'high' | 'critical';
    matchScore?: number; // 0-100 for duplicate detection
    conflictReasons: string[];
    affectedUsers: string[];
    fields: ConflictField[];
    localVersion: Record<string, any>;
    serverVersion: Record<string, any>;
    localModifiedAt: string;
    serverModifiedAt: string;
    localModifiedBy: string;
    serverModifiedBy: string;
}

interface ConflictResolutionWizardProps {
    open: boolean;
    conflict: ConflictData | null;
    onResolve: (action: ConflictResolutionAction, mergedData?: Record<string, any>) => void;
    onClose: () => void;
}

// ─── Styled Components ────────────────────────────────────────────────────────

const VersionCard = styled(Box)<{ side: 'local' | 'server' }>(({ theme, side }) => ({
    flex: 1,
    borderRadius: 12,
    border: `2px solid ${side === 'local'
        ? alpha(theme.palette.primary.main, 0.4)
        : alpha(theme.palette.secondary.main, 0.4)}`,
    backgroundColor: side === 'local'
        ? alpha(theme.palette.primary.main, 0.03)
        : alpha(theme.palette.secondary.main, 0.03),
    overflow: 'hidden',
}));

const VersionHeader = styled(Box)<{ side: 'local' | 'server' }>(({ theme, side }) => ({
    padding: theme.spacing(1.5, 2),
    backgroundColor: side === 'local'
        ? alpha(theme.palette.primary.main, 0.1)
        : alpha(theme.palette.secondary.main, 0.1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
}));

const DiffRow = styled(TableRow)<{ isDifferent?: boolean }>(({ theme, isDifferent }) => ({
    backgroundColor: isDifferent
        ? alpha(theme.palette.warning.main, 0.05)
        : 'transparent',
    '& td': {
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    },
}));

// ─── Severity Badge ───────────────────────────────────────────────────────────

const SeverityBadge: React.FC<{ severity: ConflictData['severity'] }> = ({ severity }) => {
    const colorMap = {
        low: 'success',
        medium: 'warning',
        high: 'error',
        critical: 'error',
    } as const;
    return (
        <Chip
            label={severity.toUpperCase()}
            color={colorMap[severity]}
            size="small"
            variant={severity === 'critical' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
        />
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const WIZARD_STEPS = ['Review Conflict', 'Choose Resolution', 'Confirm'];

export const ConflictResolutionWizard: React.FC<ConflictResolutionWizardProps> = ({
    open,
    conflict,
    onResolve,
    onClose,
}) => {
    const [step, setStep] = useState(0);
    const [selectedAction, setSelectedAction] = useState<ConflictResolutionAction | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    if (!conflict) return null;

    const isPayment = conflict.entityType === 'payment';
    const isDuplicate = conflict.conflictType === 'duplicate_suspected';

    const handleActionSelect = (action: ConflictResolutionAction) => {
        if (isPayment && action !== 'keep_both') {
            // Payments require manual confirmation — always show both
            setSelectedAction('keep_both');
        } else {
            setSelectedAction(action);
        }
        setStep(2);
    };

    const handleConfirm = () => {
        if (!selectedAction) return;
        onResolve(selectedAction);
        setStep(0);
        setSelectedAction(null);
    };

    const formatValue = (val: any): string => {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'number') return val.toLocaleString('en-US', { minimumFractionDigits: 2 });
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
            return new Date(val).toLocaleDateString();
        }
        return String(val);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                },
            }}
        >
            {/* Header */}
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WarningIcon color="warning" sx={{ fontSize: 28 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700}>
                            {isDuplicate ? 'Suspected Duplicate Detected' : 'Data Conflict Detected'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {conflict.referenceNumber && `Ref: ${conflict.referenceNumber} · `}
                            {conflict.entityType.replace('_', ' ').toUpperCase()}
                        </Typography>
                    </Box>
                    <SeverityBadge severity={conflict.severity} />
                </Box>

                {/* Wizard Steps */}
                <Stepper activeStep={step} sx={{ mt: 2 }}>
                    {WIZARD_STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </DialogTitle>

            <DialogContent dividers>

                {/* Step 0: Review Conflict */}
                {step === 0 && (
                    <Box>
                        {/* Conflict Reasons */}
                        <Alert
                            severity={conflict.severity === 'critical' ? 'error' : 'warning'}
                            icon={<InfoIcon />}
                            sx={{ mb: 2, borderRadius: 2 }}
                        >
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                Conflict Reasons:
                            </Typography>
                            {conflict.conflictReasons.map((reason, i) => (
                                <Typography key={i} variant="body2">• {reason}</Typography>
                            ))}
                        </Alert>

                        {/* Match Score for Duplicates */}
                        {isDuplicate && conflict.matchScore !== undefined && (
                            <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: (t) => alpha(t.palette.warning.main, 0.08) }}>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                    Duplicate Match Score
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={conflict.matchScore}
                                        color={conflict.matchScore > 80 ? 'error' : 'warning'}
                                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                                    />
                                    <Typography variant="h6" fontWeight={700} color="warning.main">
                                        {conflict.matchScore}%
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Affected Users */}
                        {conflict.affectedUsers.length > 0 && (
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">Affects:</Typography>
                                {conflict.affectedUsers.map((user) => (
                                    <Chip key={user} label={user} size="small" variant="outlined" />
                                ))}
                            </Box>
                        )}

                        {/* Side-by-Side Comparison */}
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Side-by-Side Comparison
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <VersionCard side="local">
                                <VersionHeader side="local">
                                    <PersonIcon fontSize="small" color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                            Your Version (Local)
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {conflict.localModifiedBy} · {new Date(conflict.localModifiedAt).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </VersionHeader>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Field</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {conflict.fields.map((f) => (
                                            <DiffRow key={f.field} isDifferent={f.isDifferent}>
                                                <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{f.label}</TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', fontWeight: f.isDifferent ? 700 : 400 }}>
                                                    {formatValue(f.localValue)}
                                                </TableCell>
                                            </DiffRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </VersionCard>

                            <VersionCard side="server">
                                <VersionHeader side="server">
                                    <PersonIcon fontSize="small" color="secondary" />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
                                            Server Version
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {conflict.serverModifiedBy} · {new Date(conflict.serverModifiedAt).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </VersionHeader>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Field</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {conflict.fields.map((f) => (
                                            <DiffRow key={f.field} isDifferent={f.isDifferent}>
                                                <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{f.label}</TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', fontWeight: f.isDifferent ? 700 : 400 }}>
                                                    {formatValue(f.serverValue)}
                                                </TableCell>
                                            </DiffRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </VersionCard>
                        </Box>
                    </Box>
                )}

                {/* Step 1: Choose Resolution */}
                {step === 1 && (
                    <Box>
                        {isPayment && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Payment conflicts require manual confirmation.
                                </Typography>
                                <Typography variant="body2">
                                    Auto-resolution is disabled for payment transactions to prevent financial errors.
                                    You must review both versions before proceeding.
                                </Typography>
                            </Alert>
                        )}

                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            Choose how to resolve this conflict:
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                            {[
                                {
                                    action: 'keep_mine' as const,
                                    label: 'Keep My Version',
                                    description: 'Discard the server version and use your local changes.',
                                    color: 'primary',
                                    disabled: isPayment,
                                },
                                {
                                    action: 'keep_server' as const,
                                    label: 'Keep Server Version',
                                    description: 'Discard your local changes and use the server version.',
                                    color: 'secondary',
                                    disabled: isPayment,
                                },
                                {
                                    action: 'keep_both' as const,
                                    label: 'Keep Both',
                                    description: 'Save both versions for manual review. Recommended for payments.',
                                    color: 'warning',
                                    disabled: false,
                                },
                                {
                                    action: 'merge' as const,
                                    label: 'Merge Changes',
                                    description: 'Intelligently merge non-conflicting fields from both versions.',
                                    color: 'success',
                                    disabled: isPayment || isDuplicate,
                                },
                            ].map(({ action, label, description, color, disabled }) => (
                                <Box
                                    key={action}
                                    onClick={() => !disabled && handleActionSelect(action)}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        border: (t) => `2px solid ${disabled ? t.palette.divider : alpha(t.palette[color as 'primary'].main, 0.3)}`,
                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                        opacity: disabled ? 0.4 : 1,
                                        transition: 'all 0.2s',
                                        '&:hover': !disabled ? {
                                            borderColor: `${color}.main`,
                                            bgcolor: (t) => alpha(t.palette[color as 'primary'].main, 0.05),
                                            transform: 'translateX(4px)',
                                        } : {},
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                                    <Typography variant="body2" color="text.secondary">{description}</Typography>
                                    {disabled && isPayment && (
                                        <Typography variant="caption" color="error.main">
                                            Not available for payment conflicts
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Step 2: Confirm */}
                {step === 2 && selectedAction && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                            Confirm Resolution
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            You chose: <strong>{selectedAction.replace('_', ' ').toUpperCase()}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This action will be logged to the audit trail and all affected users will be notified.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                {step > 0 && (
                    <Button onClick={() => setStep(s => s - 1)} variant="outlined">
                        Back
                    </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                {step === 0 && (
                    <Button onClick={() => setStep(1)} variant="contained" color="warning">
                        Choose Resolution →
                    </Button>
                )}
                {step === 2 && (
                    <Button onClick={handleConfirm} variant="contained" color="success" startIcon={<CheckIcon />}>
                        Confirm & Resolve
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ConflictResolutionWizard;
