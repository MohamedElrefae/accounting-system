import React, { useState, useCallback } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { TableView as ExcelIcon } from '@mui/icons-material';

interface DynamicExcelExportProps {
  data: any[];
  filename?: string;
  sheetName?: string;
  title?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  children?: React.ReactNode;
}

const DynamicExcelExport: React.FC<DynamicExcelExportProps> = ({
  data,
  filename = 'export.xlsx',
  sheetName = 'Sheet1',
  title = 'Export Excel',
  onExportStart,
  onExportComplete,
  onExportError,
  children
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      onExportStart?.();

      // Dynamic import of heavy Excel library
      const XLSX = await import('xlsx');

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate and download file
      XLSX.writeFile(workbook, filename);

      onExportComplete?.();
    } catch (error) {
      console.error('Excel export failed:', error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  }, [data, filename, sheetName, onExportStart, onExportComplete, onExportError]);

  if (children) {
    return (
      <div onClick={handleExport} style={{ cursor: isExporting ? 'wait' : 'pointer' }}>
        {children}
      </div>
    );
  }

  return (
    <Button
      variant="outlined"
      startIcon={isExporting ? <CircularProgress size={16} /> : <ExcelIcon />}
      onClick={handleExport}
      disabled={isExporting || !data.length}
    >
      {isExporting ? 'Exporting...' : title}
    </Button>
  );
};

export default DynamicExcelExport;