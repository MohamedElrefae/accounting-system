import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import type { ReportPreviewProps } from '../../types/reports';

const ReportPreview: React.FC<ReportPreviewProps> = ({
  data,
  loading = false,
  error = null,
  onRefresh,
}) => {
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'نعم' : 'لا';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString('ar-SA');
    }
    
    if (typeof value === 'string' && value.includes('T')) {
      // Try to format as date
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('ar-SA');
        }
      } catch {
        // Fall through to return as string
      }
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          معاينة النتائج
        </Typography>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            جارٍ تحميل المعاينة...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          معاينة النتائج
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          حدث خطأ أثناء تحميل المعاينة: {error}
        </Alert>
        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            إعادة المحاولة
          </Button>
        )}
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          معاينة النتائج
        </Typography>
        <Alert severity="info" icon={<PreviewIcon />}>
          اضغط على "معاينة" لرؤية عينة من النتائج
        </Alert>
        {onRefresh && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
            >
              معاينة النتائج
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        معاينة النتائج
      </Typography>
      
      {/* Summary Info */}
      <Box display="flex" gap={2} mb={2}>
        <Chip
          size="small"
          label={`${data.data.length} صف (معاينة)`}
          color="primary"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${data.columns.length} عمود`}
          color="secondary"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${data.execution_time_ms} مللي ثانية`}
          color="info"
          variant="outlined"
        />
      </Box>

      {data.data.length === 0 ? (
        <Alert severity="warning">
          لا توجد نتائج تطابق الشروط المحددة
        </Alert>
      ) : (
        <Paper elevation={1} sx={{ overflow: 'hidden' }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {data.columns.map((column) => (
                  <TableCell key={column.field} sx={{ fontWeight: 'bold' }}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  {data.columns.map((column) => (
                    <TableCell key={column.field}>
                      {formatCellValue(row[column.field])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {data.total_count > data.data.length && (
        <Alert severity="info" sx={{ mt: 2 }}>
          هذه معاينة من النتائج. العدد الإجمالي للنتائج: {data.total_count.toLocaleString('ar-SA')} صف
        </Alert>
      )}

      {onRefresh && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            تحديث المعاينة
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ReportPreview;
