import React, { useState } from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    Collapse,
    Typography,
    Tooltip,
    useMediaQuery,
    useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { useArabicLanguage } from '../../../services/ArabicLanguageService';
import NumberDisplay from './NumberDisplay';
import LineItemSelector from './LineItemSelector';
import AdditionDeductionPanel from './AdditionDeductionPanel';
import { calculateTotals } from '../../../services/transaction-line-items';
import type { TransactionLineItem } from '../../../services/transaction-line-items';

interface ItemsTableProps {
    items: TransactionLineItem[];
    orgId: string;
    isLocked: boolean;
    onItemsChange: (items: TransactionLineItem[]) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
    items,
    orgId,
    isLocked,
    onItemsChange
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { t, isRTL, formatCurrency, texts } = useArabicLanguage();
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

    const handleToggleExpand = (index: number) => {
        setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleItemChange = (index: number, field: keyof TransactionLineItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onItemsChange(newItems);
    };

    const handleLineItemSelect = (index: number, catalogItem: any) => {
        const newItems = [...items];
        if (catalogItem) {
            newItems[index] = {
                ...newItems[index],
                line_item_id: catalogItem.id,
                // Auto-fill some defaults if blank
                unit_price: newItems[index].unit_price || catalogItem.standard_cost || 0,
                unit_of_measure: newItems[index].unit_of_measure || catalogItem.base_unit_of_measure || 'EA'
            };
        } else {
            newItems[index] = { ...newItems[index], line_item_id: '' };
        }
        onItemsChange(newItems);
    };

    const handleDelete = (index: number) => {
        if (isLocked) return;
        const newItems = items.filter((_, i) => i !== index);

        // Reassign line numbers
        newItems.forEach((item, i) => {
            item.line_number = i + 1;
        });

        onItemsChange(newItems);
    };

    const handleMoveUp = (index: number) => {
        if (isLocked || index === 0) return;
        const newItems = [...items];
        const temp = newItems[index - 1];
        newItems[index - 1] = newItems[index];
        newItems[index] = temp;

        // Reassign line numbers
        newItems.forEach((item, i) => {
            item.line_number = i + 1;
        });

        onItemsChange(newItems);
    };

    const handleMoveDown = (index: number) => {
        if (isLocked || index === items.length - 1) return;
        const newItems = [...items];
        const temp = newItems[index + 1];
        newItems[index + 1] = newItems[index];
        newItems[index] = temp;

        // Reassign line numbers
        newItems.forEach((item, i) => {
            item.line_number = i + 1;
        });

        onItemsChange(newItems);
    };

    // Safe number parser for inputs to prevent NaN crashes
    const parseNumber = (val: string) => {
        if (val === '-' || val === '') return val;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small" sx={{
                '& .MuiTableCell-root': {
                    textAlign: 'start',
                    px: 1
                }
            }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                        <TableCell width={50}></TableCell>
                        <TableCell width={300}>{t(texts.costAnalysis.item)}</TableCell>
                        {!isMobile && <TableCell width={100}>{t(texts.costAnalysis.quantity)}</TableCell>}
                        {!isMobile && <TableCell width={120}>{t(texts.costAnalysis.unitPrice)}</TableCell>}
                        {!isMobile && <TableCell width={100}>{t(texts.costAnalysis.percentage)}</TableCell>}
                        <TableCell width={120} sx={{ textAlign: 'end' }}>{t(texts.costAnalysis.netAmount)}</TableCell>
                        <TableCell width={120}></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                {t(texts.costAnalysis.noItems)}
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((row, index) => {
                            // Calculate row local totals
                            const rowTotals = calculateTotals([row]);
                            const isExpanded = !!expandedRows[index];

                            return (
                                <React.Fragment key={row.id || `temp - ${index} `}>
                                    <TableRow
                                        sx={{
                                            '&:nth-of-type(4n+1)': { backgroundColor: 'background.paper' },
                                            '&:nth-of-type(4n+3)': { backgroundColor: 'action.hover' },
                                            '&:hover': { backgroundColor: 'action.selected' }
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={isLocked || index === 0}
                                                    sx={{ p: 0.5 }}
                                                >
                                                    <KeyboardArrowUpIcon fontSize="small" />
                                                </IconButton>
                                                <Typography variant="caption" sx={{ userSelect: 'none' }}>
                                                    <NumberDisplay value={row.line_number} />
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={isLocked || index === items.length - 1}
                                                    sx={{ p: 0.5 }}
                                                >
                                                    <KeyboardArrowDownIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>

                                        <TableCell>
                                            <LineItemSelector
                                                orgId={orgId}
                                                value={row.line_item_id}
                                                onChange={(item) => handleLineItemSelect(index, item)}
                                                disabled={isLocked}
                                            />
                                        </TableCell>

                                        {!isMobile && (
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    disabled={isLocked}
                                                    value={row.quantity ?? ''}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseNumber(e.target.value))}
                                                    inputProps={{ step: "any" }} // Allows decimals and negatives
                                                    fullWidth
                                                />
                                            </TableCell>
                                        )}

                                        {!isMobile && (
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    disabled={isLocked}
                                                    value={row.unit_price ?? ''}
                                                    onChange={(e) => handleItemChange(index, 'unit_price', parseNumber(e.target.value))}
                                                    inputProps={{ step: "any" }}
                                                    fullWidth
                                                />
                                            </TableCell>
                                        )}

                                        {!isMobile && (
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    disabled={isLocked}
                                                    value={row.percentage ?? ''}
                                                    onChange={(e) => handleItemChange(index, 'percentage', parseNumber(e.target.value))}
                                                    inputProps={{ min: 0, max: 100, step: "0.1" }}
                                                    fullWidth
                                                />
                                            </TableCell>
                                        )}

                                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'end' }}>
                                            <NumberDisplay value={formatCurrency(rowTotals.netTotal)} />
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <Tooltip title={isExpanded ? "Hide Adjustments" : "Show Adjustments"}>
                                                    <IconButton size="small" color="primary" onClick={() => handleToggleExpand(index)}>
                                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t(texts.common.delete)}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(index)}
                                                            disabled={isLocked}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded Row for Additions/Deductions Panel */}
                                    <TableRow sx={{ '& > td': { borderBottom: isExpanded ? '1px solid rgba(224, 224, 224, 1)' : 'none' } }}>
                                        <TableCell colSpan={7} sx={{ py: 0, px: 0 }}>
                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                                                    <AdditionDeductionPanel
                                                        item={row}
                                                        orgId={orgId}
                                                        isLocked={isLocked}
                                                        onChange={(field, value) => handleItemChange(index, field, value)}
                                                    />
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ItemsTable;
