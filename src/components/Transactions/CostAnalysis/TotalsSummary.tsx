import React, { useMemo } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useArabicLanguage } from '../../../services/ArabicLanguageService';
import NumberDisplay from './NumberDisplay';
import { calculateTotals } from '../../../services/transaction-line-items';
import type { TransactionLineItem } from '../../../services/transaction-line-items';

interface TotalsSummaryProps {
    items: TransactionLineItem[];
}

export const TotalsSummary: React.FC<TotalsSummaryProps> = ({ items }) => {
    const { t, formatCurrency, texts } = useArabicLanguage();

    // Real-time calculation using service handler
    const totals = useMemo(() => calculateTotals(items), [items]);

    return (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={3} alignItems="center">
                <Grid item xs={6} md={2}>
                    <Typography variant="body2" color="text.secondary">Items</Typography>
                    <Typography variant="h6">{items.length}</Typography>
                </Grid>

                <Grid item xs={6} md={2}>
                    <Typography variant="body2" color="text.secondary">Gross Total</Typography>
                    <Typography variant="h6">
                        <NumberDisplay value={formatCurrency(totals.grossTotal)} />
                    </Typography>
                </Grid>

                <Grid item xs={6} md={2}>
                    <Typography variant="body2" color="success.main">{t(texts.costAnalysis.additions)}</Typography>
                    <Typography variant="h6" color="success.main">
                        <NumberDisplay value={formatCurrency(totals.totalAdditions)} prefix="+" />
                    </Typography>
                </Grid>

                <Grid item xs={6} md={2}>
                    <Typography variant="body2" color="error.main">{t(texts.costAnalysis.deductions)}</Typography>
                    <Typography variant="h6" color="error.main">
                        <NumberDisplay value={formatCurrency(totals.totalDeductions)} prefix="-" />
                    </Typography>
                </Grid>

                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderInlineStart: { md: '1px solid' }, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {t(texts.costAnalysis.netAmount)}
                    </Typography>
                    <Typography variant="h5" color="primary.main" fontWeight="bold">
                        <NumberDisplay value={formatCurrency(totals.netTotal)} />
                    </Typography>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TotalsSummary;
