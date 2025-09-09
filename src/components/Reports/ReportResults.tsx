import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ExportIcon from '@mui/icons-material/GetApp';
import SaveIcon from '@mui/icons-material/Save';
import TableIcon from '@mui/icons-material/TableChart';
import CsvIcon from '@mui/icons-material/FileDownload';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import ExcelIcon from '@mui/icons-material/Description';
import JsonIcon from '@mui/icons-material/FileCopy';
import ClipboardIcon from '@mui/icons-material/ContentCopy';
import type { ReportResultsProps } from '../../types/reports';
import {
  exportToExcel,
  exportToPDF,
  exportToCSVWithBOM,
  exportToJSON,
  copyToClipboard,
} from '../../utils/advancedExport';

const ReportResults: React.FC<ReportResultsProps> = ({
  data,
  loading = false,
  error = null,
  onExport,
  onSave,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

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

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf' | 'json' | 'clipboard') => {
    handleExportMenuClose();
    
    if (!data) return;
    
    try {
      const reportName = `custom_report_${new Date().toISOString().split('T')[0]}`;
      
      switch (format) {
        case 'xlsx':
          exportToExcel(data, reportName);
          break;
        case 'pdf':
          exportToPDF(data, reportName);
          break;
        case 'json':
          exportToJSON(data, reportName);
          break;
        case 'clipboard':
          await copyToClipboard(data);
          // You might want to show a toast notification here
          break;
        default:
          exportToCSVWithBOM(data, reportName);
      }
      
      // Call the original onExport if it exists (for legacy support)
      if (onExport && ['csv', 'xlsx', 'pdf'].includes(format)) {
        onExport(format as 'csv' | 'xlsx' | 'pdf');
      }
    } catch (error) {
      console.error('Export failed:', error);
      // You might want to show an error toast here
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          نتائج التقرير
        </Typography>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            جارٍ تشغيل التقرير...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          نتائج التقرير
        </Typography>
        <Alert severity="error">
          حدث خطأ أثناء تشغيل التقرير: {error}
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          نتائج التقرير
        </Typography>
        <Alert severity="info" icon={<TableIcon />}>
          لم يتم تشغيل التقرير بعد. اذهب إلى تبويب "إنشاء التقرير" لتشغيل التقرير.
        </Alert>
      </Box>
    );
  }

  const paginatedData = data.data.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          نتائج التقرير
        </Typography>
        <Box display="flex" gap={2}>
          {onSave && (
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={onSave}
            >
              حفظ التقرير
            </Button>
          )}
          {onExport && data.data.length > 0 && (
            <>
              <Button
                variant="contained"
                startIcon={<ExportIcon />}
                onClick={handleExportMenuClick}
              >
                تصدير
              </Button>
              <Menu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
              >
                <MenuItem onClick={() => handleExport('csv')}>
                  <ListItemIcon>
                    <CsvIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>CSV</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleExport('xlsx')}>
                  <ListItemIcon>
                    <ExcelIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Excel (.xlsx)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleExport('pdf')}>
                  <ListItemIcon>
                    <PdfIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>PDF</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleExport('json')}>
                  <ListItemIcon>
                    <JsonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>JSON</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleExport('clipboard')}>
                  <ListItemIcon>
                    <ClipboardIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>نسخ للحافظة</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {/* Summary Info */}
      <Box display="flex" gap={2} mb={3}>
        <Chip
          size="medium"
          label={`${data.total_count.toLocaleString('ar-SA')} صف`}
          color="primary"
        />
        <Chip
          size="medium"
          label={`${data.columns.length} عمود`}
          color="secondary"
        />
        <Chip
          size="medium"
          label={`${data.execution_time_ms} مللي ثانية`}
          color="info"
        />
      </Box>

      {data.data.length === 0 ? (
        <Alert severity="warning">
          لا توجد نتائج تطابق الشروط المحددة
        </Alert>
      ) : (
        <Paper elevation={1}>
          <Box sx={{ overflow: 'auto', maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {data.columns.map((column) => (
                    <TableCell 
                      key={column.field} 
                      sx={{ 
                        fontWeight: 'bold',
                        bgcolor: 'grey.50',
                        minWidth: 120,
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row, rowIndex) => (
                  <TableRow key={page * rowsPerPage + rowIndex} hover>
                    {data.columns.map((column) => (
                      <TableCell key={column.field}>
                        {formatCellValue(row[column.field])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={data.total_count}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="عدد الصفوف في الصفحة:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
            }
            getItemAriaLabel={(type) => {
              if (type === 'first') return 'الصفحة الأولى';
              if (type === 'last') return 'الصفحة الأخيرة';
              if (type === 'next') return 'الصفحة التالية';
              return 'الصفحة السابقة';
            }}
          />
        </Paper>
      )}

      {data.total_count > 1000 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>تلميح:</strong> يحتوي التقرير على عدد كبير من النتائج. يمكنك استخدام المرشحات لتقليل النتائج أو تصدير البيانات لتحليلها في برنامج خارجي.
        </Alert>
      )}
    </Box>
  );
};

export default ReportResults;
