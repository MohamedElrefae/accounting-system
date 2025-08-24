/**
 * Universal Export Manager for the entire application
 * Provides comprehensive export functionality with Arabic RTL support
 * Handles PDF, Excel, CSV, and other export formats consistently
 * Based on the proven working exportUtils.ts approach
 * 
 * PDF Export: Uses HTML-based pdfExport.ts for better Arabic text rendering
 * Excel Export: Uses Universal system for better Arabic support
 * CSV Export: Uses Universal system with proper UTF-8 encoding
 * HTML/JSON Export: Uses Universal system for modern web compatibility
 */

import { 
  arabicEngine, 
  formatForExport
} from './ArabicTextEngine';
import type { ArabicTextOptions, ExportOptions } from './ArabicTextEngine';
import { utils as XLSXUtils, writeFile } from 'xlsx';

// (Removed unused jspdf-autotable type declarations)

export interface UniversalExportOptions {
  title: string;
  subtitle?: string;
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeFooter?: boolean;
  fontSize?: number;
  fontFamily?: string;
  useArabicNumerals?: boolean;
  rtlLayout?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  styling?: {
    primaryColor?: string;
    secondaryColor?: string;
    headerBg?: string;
    footerBg?: string;
  };
}

export interface UniversalTableColumn {
  key: string;
  header: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'percentage';
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  currency?: string;
  visible?: boolean;
}

export interface UniversalTableData {
  columns: UniversalTableColumn[];
  rows: any[];
  summary?: {
    totals?: { [key: string]: number };
    counts?: { [key: string]: number };
    averages?: { [key: string]: number };
  };
  metadata?: {
    source?: string;
    generatedAt?: Date;
    filters?: any;
    userInfo?: any;
  };
}

export class UniversalExportManager {
  private static instance: UniversalExportManager;
  private arabicEngine: typeof arabicEngine;

  private constructor() {
    this.arabicEngine = arabicEngine;
  }

  public static getInstance(): UniversalExportManager {
    if (!UniversalExportManager.instance) {
      UniversalExportManager.instance = new UniversalExportManager();
    }
    return UniversalExportManager.instance;
  }

  /**
   * Universal export function - handles all export formats
   */
  public async exportData(
    data: UniversalTableData,
    options: UniversalExportOptions
  ): Promise<void> {
    try {
      // Validate and process data
      const processedData = this.preprocessData(data, options);
      
      // Route to appropriate export method
      switch (options.format) {
        case 'pdf':
          await this.exportToPDF(processedData, options);
          break;
        case 'excel':
          await this.exportToExcel(processedData, options);
          break;
        case 'csv':
          await this.exportToCSV(processedData, options);
          break;
        case 'html':
          await this.exportToHTML(processedData, options);
          break;
        case 'json':
          await this.exportToJSON(processedData, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess data for export
   */
  private preprocessData(data: UniversalTableData, options: UniversalExportOptions): UniversalTableData {
    // For PDF export, skip preprocessing and use original data
    // since we're using the original exportUtils functions
    if (options.format === 'pdf') {
      return {
        ...data,
        columns: data.columns.filter(col => col.visible !== false)
      };
    }
    
    // Determine number format based on format type and user preference
    let useWesternNumerals: boolean;
    if (options.format === 'csv') {
      useWesternNumerals = true; // Always use Western numerals for CSV
    } else if (options.format === 'excel') {
      useWesternNumerals = !options.useArabicNumerals; // Use user preference for Excel
    } else {
      useWesternNumerals = false; // Default to Arabic numerals for other formats
    }
    
    const exportOptions: ExportOptions = {
      format: options.format,
      removeRTLMarks: options.format !== 'html',
      useWesternNumerals: useWesternNumerals,
      escapeSpecialChars: options.format === 'html' || options.format === 'csv'
    };

    // Process columns
    const processedColumns = data.columns
      .filter(col => col.visible !== false)
      .map(col => ({
        ...col,
        header: formatForExport(col.header, exportOptions)
      }));

    // Process rows
    const processedRows = data.rows.map(row => {
      const processedRow: any = {};
      processedColumns.forEach(col => {
        const value = row[col.key];
        processedRow[col.key] = this.formatCellValue(value, col, exportOptions);
      });
      return processedRow;
    });

    return {
      ...data,
      columns: processedColumns,
      rows: processedRows
    };
  }

  /**
   * Format cell value based on column type
   */
  private formatCellValue(value: any, column: UniversalTableColumn, exportOptions: ExportOptions): string {
    if (value === null || value === undefined) return '';

    const arabicOptions: ArabicTextOptions = {
      useArabicNumerals: exportOptions.useWesternNumerals !== true,
      forExport: true,
      applyRTLMarks: exportOptions.format === 'html'
    };

    switch (column.type) {
      case 'currency':
        return this.arabicEngine.formatCurrency(
          Number(value) || 0,
          column.currency || 'EGP',
          arabicOptions
        );
      case 'date':
        return this.arabicEngine.formatDate(value, arabicOptions);
      case 'percentage':
        const percentageValue = `${(Number(value) * 100).toFixed(2)}%`;
        if (exportOptions.useWesternNumerals !== true) {
          return this.arabicEngine.convertNumerals(percentageValue, true);
        }
        return percentageValue;
      case 'boolean':
        return formatForExport(value ? 'نعم' : 'لا', exportOptions);
      case 'number':
        const numberValue = String(value);
        if (exportOptions.useWesternNumerals !== true) {
          return this.arabicEngine.convertNumerals(numberValue, true);
        }
        return numberValue;
      case 'text':
      default:
        return formatForExport(String(value), exportOptions);
    }
  }

  /**
   * Export to PDF using HTML-based PDF generation for better Arabic text support
   */
  private async exportToPDF(data: UniversalTableData, options: UniversalExportOptions): Promise<void> {
    try {
      // Generate HTML content
      const html = this.generateHTML(data, options);
      
      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '210mm';  // A4 width
      iframe.style.height = '297mm'; // A4 height
      document.body.appendChild(iframe);
      
      // Write HTML content to iframe
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Could not access iframe document');
      }
      
      doc.open();
      doc.write(html);
      doc.close();
      
      // Wait for content to load and then print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            // Focus the iframe and print
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            // Clean up after a delay
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          } catch (error) {
            console.error('Print failed:', error);
            document.body.removeChild(iframe);
          }
        }, 500);
      };
      
    } catch (error) {
      console.error('PDF export failed:', error);
      // Fallback to downloading as HTML if print fails
      console.log('Falling back to HTML download...');
      await this.exportToHTML(data, options);
    }
  }

  /**
   * Export to Excel using XLSX
   */
  private async exportToExcel(data: UniversalTableData, options: UniversalExportOptions): Promise<void> {
    try {
      console.log('🔍 Excel Export - Starting with preprocessed data');
      console.log('🔍 Excel Export - Options:', options);
      console.log('🔍 Excel Export - Sample row data:', data.rows[0]);
      
      const workbook = XLSXUtils.book_new();
      
      // Use the already processed headers from preprocessed data
      const headers = data.columns.map(col => col.header);
      
      // Use the already processed data rows - no need to reprocess
      const dataRows = data.rows.map(row => {
        return data.columns.map(col => {
          const value = row[col.key];
          console.log('🔍 Excel Export - Final cell value:', col.key, value);
          return value || '';
        });
      });
      
      // Prepare worksheet data
      const worksheetData = [
        headers,
        ...dataRows
      ];

      console.log('🔍 Excel Export - Worksheet data sample:', worksheetData[0], worksheetData[1]);

      // Create worksheet
      const worksheet = XLSXUtils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      const columnWidths = data.columns.map(col => ({
        wch: col.width ? col.width / 8 : 15
      }));
      worksheet['!cols'] = columnWidths;
      
      // Apply RTL formatting to the worksheet if needed
      if (options.rtlLayout) {
        worksheet['!dir'] = 'rtl';
      }

      // Add worksheet to workbook
      XLSXUtils.book_append_sheet(workbook, worksheet, 'تقرير');

      // Save the file
      const filename = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      writeFile(workbook, filename);
    } catch (error) {
      console.error('Excel export failed:', error);
      throw error;
    }
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(data: UniversalTableData, options: UniversalExportOptions): Promise<void> {
    try {
      // Prepare CSV content
      const csvContent = [
        // Header row
        data.columns.map(col => this.csvEscape(col.header)).join(','),
        // Data rows
        ...data.rows.map(row =>
          data.columns.map(col => this.csvEscape(row[col.key] || '')).join(',')
        )
      ].join('\n');

      // Create and download file
      const bom = '\uFEFF'; // UTF-8 BOM for proper Arabic support
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }

  /**
   * Export to HTML
   */
  private async exportToHTML(data: UniversalTableData, options: UniversalExportOptions): Promise<void> {
    try {
      const html = this.generateHTML(data, options);
      
      // Create and download file
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('HTML export failed:', error);
      throw error;
    }
  }

  /**
   * Export to JSON
   */
  private async exportToJSON(data: UniversalTableData, options: UniversalExportOptions): Promise<void> {
    try {
      const jsonData = {
        title: options.title,
        exportDate: new Date().toISOString(),
        columns: data.columns,
        rows: data.rows,
        summary: data.summary,
        metadata: data.metadata
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSON export failed:', error);
      throw error;
    }
  }

  /**
   * Generate HTML for export
   */
  private generateHTML(data: UniversalTableData, options: UniversalExportOptions): string {
    const rtlDir = options.rtlLayout !== false ? 'rtl' : 'ltr';
    const lang = options.rtlLayout !== false ? 'ar' : 'en';
    
    return `
<!DOCTYPE html>
<html dir="${rtlDir}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Noto Sans Arabic', Arial, sans-serif;
            direction: ${rtlDir};
            margin: 20px;
            background: white;
            color: #333;
        }
        
        .export-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .export-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
        }
        
        .export-title {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .export-subtitle {
            font-size: 16px;
            color: #7f8c8d;
        }
        
        .export-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .export-table th,
        .export-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: ${rtlDir === 'rtl' ? 'right' : 'left'};
            direction: ${rtlDir};
        }
        
        .export-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .export-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .export-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 14px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        @media print {
            body { margin: 0; }
            .export-container { max-width: none; }
        }
    </style>
</head>
<body>
    <div class="export-container">
        ${options.includeHeader !== false ? `
        <div class="export-header">
            <h1 class="export-title">${options.title}</h1>
            ${options.subtitle ? `<p class="export-subtitle">${options.subtitle}</p>` : ''}
        </div>
        ` : ''}
        
        <table class="export-table">
            <thead>
                <tr>
                    ${data.columns.map(col => `<th>${col.header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.rows.map(row => `
                <tr>
                    ${data.columns.map(col => `<td>${row[col.key] || ''}</td>`).join('')}
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${options.includeFooter !== false ? `
        <div class="export-footer">
            <p>تم إنشاء هذا التقرير في ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }


  /**
   * Escape CSV values
   */
  private csvEscape(value: string): string {
    if (!value) return '';
    
    // Convert to string and escape quotes
    const stringValue = String(value);
    const escaped = stringValue.replace(/"/g, '""');
    
    // Wrap in quotes if contains comma, newline, or quote
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      return `"${escaped}"`;
    }
    
    return escaped;
  }
}

// Export singleton instance
export const universalExportManager = UniversalExportManager.getInstance();

// Export convenience functions
export const exportUniversalData = (data: UniversalTableData, options: UniversalExportOptions) =>
  universalExportManager.exportData(data, options);

export const exportToPDF = (data: UniversalTableData, options: Omit<UniversalExportOptions, 'format'>) =>
  universalExportManager.exportData(data, { ...options, format: 'pdf' });

export const exportToExcel = (data: UniversalTableData, options: Omit<UniversalExportOptions, 'format'>) =>
  universalExportManager.exportData(data, { ...options, format: 'excel' });

export const exportToCSV = (data: UniversalTableData, options: Omit<UniversalExportOptions, 'format'>) =>
  universalExportManager.exportData(data, { ...options, format: 'csv' });

export const exportToHTML = (data: UniversalTableData, options: Omit<UniversalExportOptions, 'format'>) =>
  universalExportManager.exportData(data, { ...options, format: 'html' });

export const exportToJSON = (data: UniversalTableData, options: Omit<UniversalExportOptions, 'format'>) =>
  universalExportManager.exportData(data, { ...options, format: 'json' });
