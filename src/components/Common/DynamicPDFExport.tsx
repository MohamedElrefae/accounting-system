import React, { useState, useCallback } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';

interface DynamicPDFExportProps {
  elementId: string;
  filename?: string;
  title?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  children?: React.ReactNode;
}

const DynamicPDFExport: React.FC<DynamicPDFExportProps> = ({
  elementId,
  filename = 'export.pdf',
  title = 'Export PDF',
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

      // Dynamic import of heavy PDF libraries
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID "${elementId}" not found`);
      }

      // Generate canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);

      onExportComplete?.();
    } catch (error) {
      console.error('PDF export failed:', error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  }, [elementId, filename, onExportStart, onExportComplete, onExportError]);

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
      startIcon={isExporting ? <CircularProgress size={16} /> : <PrintIcon />}
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? 'Exporting...' : title}
    </Button>
  );
};

export default DynamicPDFExport;