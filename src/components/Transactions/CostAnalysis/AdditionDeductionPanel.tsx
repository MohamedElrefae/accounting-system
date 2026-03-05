import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    InputAdornment,
    TextField,
    Grid
} from '@mui/material';
import { useArabicLanguage } from '../../../services/ArabicLanguageService';
import NumberDisplay from './NumberDisplay';
import { calculateTotals } from '../../../services/transaction-line-items';
import type { TransactionLineItem } from '../../../services/transaction-line-items';
import { getAdjustmentTypes } from '../../../services/adjustment-types';
import type { AdjustmentType } from '../../../services/adjustment-types';
import SearchableSelect from '../../Common/SearchableSelect';

interface AdditionDeductionPanelProps {
    item: TransactionLineItem;
    orgId: string;
    isLocked: boolean;
    onChange: (field: keyof TransactionLineItem, value: any) => void;
}

const AdditionDeductionPanel: React.FC<AdditionDeductionPanelProps> = ({
    item,
    orgId,
    isLocked,
    onChange
}) => {
    const { t, formatCurrency, texts } = useArabicLanguage();
    const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentType[]>([]);

    // Local state for dropdown selections (not saved to DB, just for UX)
    const [selectedAdditionType, setSelectedAdditionType] = useState<string>('');
    const [selectedDeductionType, setSelectedDeductionType] = useState<string>('');

    useEffect(() => {
        let active = true;
        const loadTypes = async () => {
            try {
                const types = await getAdjustmentTypes(orgId);
                if (active) {
                    setAdjustmentTypes(types);
                }
            } catch (err) {
                console.error('Failed to load adjustment types', err);
            }
        };
        loadTypes();
        return () => { active = false; };
    }, [orgId]);

    const handleAdditionTypeChange = (typeId: string) => {
        setSelectedAdditionType(typeId);
        if (!typeId) {
            onChange('addition_percentage', 0);
            return;
        }
        const type = adjustmentTypes.find(t => t.id === typeId);
        if (type) {
            // Adjustment percentages are stored as 5 for 5%, but sometimes as 0.05. 
            // Based on UI input expectations (0-100), we'll assume it needs to be 0-100 format.
            // If DB has 0.05, we multiply by 100.
            const pct = type.default_percentage < 1 ? type.default_percentage * 100 : type.default_percentage;
            onChange('addition_percentage', pct);
        }
    };

    const handleDeductionTypeChange = (typeId: string) => {
        setSelectedDeductionType(typeId);
        if (!typeId) {
            onChange('deduction_percentage', 0);
            return;
        }
        const type = adjustmentTypes.find(t => t.id === typeId);
        if (type) {
            const pct = type.default_percentage < 1 ? type.default_percentage * 100 : type.default_percentage;
            onChange('deduction_percentage', pct);
        }
    };

    const parseNumber = (val: string) => {
        if (val === '-' || val === '') return val;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    // Real-time calculation preview
    const totals = calculateTotals([item]);

    return (
        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {/* Additions Column */}
                <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                        {t(texts.costAnalysis.additions)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                            <SearchableSelect
                                id="addition-type-selector"
                                value={selectedAdditionType}
                                options={adjustmentTypes.map(t => ({
                                    value: t.id,
                                    label: t.name,
                                    searchText: t.name
                                }))}
                                onChange={handleAdditionTypeChange}
                                placeholder="Select Addition Type"
                                disabled={isLocked}
                                clearable
                                compact
                            />
                        </Box>
                        <TextField
                            size="small"
                            type="number"
                            label="%"
                            disabled={isLocked}
                            value={item.addition_percentage ?? ''}
                            onChange={(e) => onChange('addition_percentage', parseNumber(e.target.value))}
                            inputProps={{ min: 0, step: "0.1" }}
                            sx={{ width: 100 }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Amount:</span>
                        <NumberDisplay value={formatCurrency(totals.totalAdditions)} sx={{ color: 'success.main', fontWeight: 'bold' }} />
                    </Typography>
                </Grid>

                {/* Deductions Column */}
                <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                        {t(texts.costAnalysis.deductions)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                            <SearchableSelect
                                id="deduction-type-selector"
                                value={selectedDeductionType}
                                options={adjustmentTypes.map(t => ({
                                    value: t.id,
                                    label: t.name,
                                    searchText: t.name
                                }))}
                                onChange={handleDeductionTypeChange}
                                placeholder="Select Deduction Type"
                                disabled={isLocked}
                                clearable
                                compact
                            />
                        </Box>
                        <TextField
                            size="small"
                            type="number"
                            label="%"
                            disabled={isLocked}
                            value={item.deduction_percentage ?? ''}
                            onChange={(e) => onChange('deduction_percentage', parseNumber(e.target.value))}
                            inputProps={{ min: 0, step: "0.1" }}
                            sx={{ width: 100 }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Amount:</span>
                        <NumberDisplay value={formatCurrency(totals.totalDeductions)} sx={{ color: 'error.main', fontWeight: 'bold' }} />
                    </Typography>
                </Grid>

                {/* Summary Column */}
                <Grid item xs={12} md={4} sx={{ borderInlineStart: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Box sx={{ px: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Gross Total:</Typography>
                            <NumberDisplay value={formatCurrency(totals.grossTotal)} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2">{t(texts.costAnalysis.netAmount)}:</Typography>
                            <NumberDisplay value={formatCurrency(totals.netTotal)} sx={{ fontWeight: 'bold' }} />
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdditionDeductionPanel;
