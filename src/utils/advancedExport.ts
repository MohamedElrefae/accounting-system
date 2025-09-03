import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { ReportResult } from '../types/reports';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Export report data to Excel (XLSX) format
 */
export function exportToExcel(result: ReportResult, filename: string = 'custom_report'): void {
  if (!result.data || result.data.length === 0) {
    throw new Error('No data to export');
  }

  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Prepare data with headers
    const headers = result.columns.map(col => col.label);
    const data = result.data.map(row => 
      result.columns.map(col => {
        const value = row[col.field];
        // Format different data types appropriately
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
        if (typeof value === 'number') return value;
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
      })
    );

    // Combine headers and data
    const wsData = [headers, ...data];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size columns
    const colWidths = headers.map((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[index] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Cap at 50 characters
    });
    ws['!cols'] = colWidths;

    // Add metadata sheet
    const metadataWs = XLSX.utils.aoa_to_sheet([
      ['تفاصيل التقرير', ''],
      ['عدد الصفوف', result.total_count.toLocaleString('ar-SA')],
      ['عدد الأعمدة', result.columns.length.toString()],
      ['وقت التنفيذ', `${result.execution_time_ms} مللي ثانية`],
      ['تاريخ التصدير', new Date().toLocaleString('ar-SA')],
      ['', ''],
      ['الأعمدة المصدرة', ''],
      ...result.columns.map(col => [col.label, col.type])
    ]);

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
    XLSX.utils.book_append_sheet(wb, metadataWs, 'تفاصيل التقرير');

    // Write and download file
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    console.log(`✅ Excel file exported: ${filename}.xlsx`);
  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    throw new Error(`Failed to export to Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export report data to PDF format with Arabic support
 */
export function exportToPDF(result: ReportResult, filename: string = 'custom_report'): void {
  if (!result.data || result.data.length === 0) {
    throw new Error('No data to export');
  }

  try {
    // Create PDF document
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table display

    // Add Arabic font support (you may need to add an Arabic font)
    // For now, we'll use the default font but this should be enhanced with proper Arabic font
    doc.setFont('helvetica');
    
    // Add title
    doc.setFontSize(16);
    doc.text('Custom Report', 20, 20);
    doc.text(`تقرير مخصص`, 20, 30);
    
    // Add metadata
    doc.setFontSize(10);
    doc.text(`Number of rows: ${result.total_count.toLocaleString()}`, 20, 45);
    doc.text(`Execution time: ${result.execution_time_ms}ms`, 20, 50);
    doc.text(`Export date: ${new Date().toLocaleString()}`, 20, 55);
    
    // Prepare table data
    const headers = result.columns.map(col => col.label);
    const rows = result.data.map(row => 
      result.columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return value.toLocaleString();
        if (typeof value === 'string' && value.includes('T')) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          } catch {
            // Fall through to return as string
          }
        }
        return String(value);
      })
    );

    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 65,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [66, 135, 245],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 65, right: 20, bottom: 20, left: 20 },
      didDrawPage: function (data: any) {
        // Add page numbers
        doc.setFontSize(8);
        doc.text(
          'Page ' + data.pageNumber,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });

    // Save the PDF
    doc.save(`${filename}.pdf`);
    
    console.log(`✅ PDF file exported: ${filename}.pdf`);
  } catch (error) {
    console.error('❌ Error exporting to PDF:', error);
    throw new Error(`Failed to export to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced CSV export with BOM for proper Arabic display
 */
export function exportToCSVWithBOM(result: ReportResult, filename: string = 'custom_report'): void {
  if (!result.data || result.data.length === 0) {
    throw new Error('No data to export');
  }

  try {
    // Create CSV content
    const headers = result.columns.map(col => col.label).join(',');
    const rows = result.data.map(row => 
      result.columns.map(col => {
        const value = row[col.field];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
        if (typeof value === 'number') return value.toString();
        return value || '';
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    
    // Add BOM for proper Unicode support
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Create and download file
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ CSV file exported: ${filename}.csv`);
  } catch (error) {
    console.error('❌ Error exporting to CSV:', error);
    throw new Error(`Failed to export to CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export report data in JSON format for API integrations
 */
export function exportToJSON(result: ReportResult, filename: string = 'custom_report'): void {
  if (!result.data || result.data.length === 0) {
    throw new Error('No data to export');
  }

  try {
    const exportData = {
      metadata: {
        total_count: result.total_count,
        columns_count: result.columns.length,
        execution_time_ms: result.execution_time_ms,
        export_date: new Date().toISOString(),
        columns: result.columns
      },
      data: result.data
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Create and download file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ JSON file exported: ${filename}.json`);
  } catch (error) {
    console.error('❌ Error exporting to JSON:', error);
    throw new Error(`Failed to export to JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Copy report data to clipboard in tab-separated format
 */
export async function copyToClipboard(result: ReportResult): Promise<void> {
  if (!result.data || result.data.length === 0) {
    throw new Error('No data to copy');
  }

  try {
    // Create tab-separated content
    const headers = result.columns.map(col => col.label).join('\t');
    const rows = result.data.map(row => 
      result.columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
        return String(value);
      }).join('\t')
    );

    const content = [headers, ...rows].join('\n');
    
    await navigator.clipboard.writeText(content);
    console.log('✅ Data copied to clipboard');
  } catch (error) {
    console.error('❌ Error copying to clipboard:', error);
    throw new Error(`Failed to copy to clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the appropriate file extension for export format
 */
export function getFileExtension(format: 'csv' | 'xlsx' | 'pdf' | 'json'): string {
  switch (format) {
    case 'xlsx':
      return '.xlsx';
    case 'pdf':
      return '.pdf';
    case 'json':
      return '.json';
    default:
      return '.csv';
  }
}

/**
 * Get human-readable format name
 */
export function getFormatName(format: 'csv' | 'xlsx' | 'pdf' | 'json'): string {
  switch (format) {
    case 'xlsx':
      return 'Excel';
    case 'pdf':
      return 'PDF';
    case 'json':
      return 'JSON';
    default:
      return 'CSV';
  }
}
