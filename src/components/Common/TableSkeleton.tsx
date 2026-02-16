import React from 'react';
import { Box, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

interface TableSkeletonProps {
    columns?: number;
    rows?: number;
    rowHeight?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
    columns = 5,
    rows = 10,
    rowHeight = 52
}) => {
    return (
        <Box sx={{ width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
            <Table>
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                        {Array.from(new Array(columns)).map((_, i) => (
                            <TableCell key={i} sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
                                <Skeleton variant="text" width="60%" height={24} />
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Array.from(new Array(rows)).map((_, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {Array.from(new Array(columns)).map((_, colIndex) => (
                                <TableCell key={colIndex} sx={{ height: rowHeight }}>
                                    <Skeleton variant="text" width={colIndex === 0 ? '40%' : '80%'} height={20} />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
};

export default TableSkeleton;
