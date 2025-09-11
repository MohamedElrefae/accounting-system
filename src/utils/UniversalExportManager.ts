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
  pageSize?: 'A4' | 'A3' | 'Letter';
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
  // Excel-specific options
  excel?: {
    currencyFormat?: 'symbol' | 'plain' | 'custom';
    customCurrencyFormat?: string; // e.g., "[$-ar-EG]#,##0.00\" ج.م\""
    useLocaleSeparators?: boolean;
    freezePanes?: boolean;
    autoFilter?: boolean;
    columnFormats?: { [columnKey: string]: string }; // Custom format per column
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
  // Excel-specific column options
  excel?: {
    format?: string; // Custom Excel number format for this column
    currencySymbol?: string; // Custom currency symbol
    locale?: string; // Locale for number formatting (e.g., 'ar-EG', 'en-US')
    alignment?: 'left' | 'center' | 'right';
  };
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
    // Optional: array of rows to prepend before the header in exports (Excel/CSV)
    // Each inner array is a row of cell values; cells beyond provided headers are allowed
    prependRows?: any[][];
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
   * For Excel: returns raw values to maintain data types
   * For other formats: returns formatted strings
   */
  private formatCellValue(value: any, column: UniversalTableColumn, exportOptions: ExportOptions): any {
    if (value === null || value === undefined) return '';

    const arabicOptions: ArabicTextOptions = {
      useArabicNumerals: exportOptions.useWesternNumerals !== true,
      forExport: true,
      applyRTLMarks: exportOptions.format === 'html'
    };

    // For Excel export, return raw values to preserve data types
    if (exportOptions.format === 'excel') {
      switch (column.type) {
        case 'currency':
        case 'number':
          return Number(value) || 0;
        case 'date':
          // Return proper Date object for Excel
          if (value instanceof Date) return value;
          if (typeof value === 'string') {
            const parsedDate = new Date(value);
            return isNaN(parsedDate.getTime()) ? value : parsedDate;
          }
          return value;
        case 'percentage':
          return Number(value) || 0; // Excel will handle percentage formatting
        case 'boolean':
          return Boolean(value);
        default:
          return String(value);
      }
    }

    // For other formats, return formatted strings
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
      // Generate HTML content with full customization support
      const html = this.generateCustomizedHTML(data, options);
      
      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      
      // Set iframe dimensions based on page settings
      const { width, height } = this.getPageDimensions(options);
      iframe.style.width = width;
      iframe.style.height = height;
      
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
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          } catch (error) {
            console.error('Print failed:', error);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
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
      // Starting Excel export with preprocessed data
      
      const workbook = XLSXUtils.book_new();
      
      // Use the already processed headers from preprocessed data
      const headers = data.columns.map(col => col.header);
      
      // Process data rows maintaining proper data types for Excel
      const dataRows = data.rows.map(row => {
        return data.columns.map(col => {
          const value = row[col.key];
          if (value === null || value === undefined) return null;
          
          // Return raw values for Excel to maintain data types
          switch (col.type) {
            case 'currency':
            case 'number':
              return Number(value) || 0;
            case 'date':
              if (value instanceof Date) return value;
              if (typeof value === 'string') {
                const parsedDate = new Date(value);
                return isNaN(parsedDate.getTime()) ? value : parsedDate;
              }
              return value;
            case 'percentage':
              return Number(value) || 0;
            case 'boolean':
              return Boolean(value);
            default:
              return String(value);
          }
        });
      });

      const preRows = Array.isArray(data.metadata?.prependRows) ? (data.metadata!.prependRows as any[][]) : [];
      const preRowsCount = preRows.length;
      
      // Prepare worksheet data (prependRows, headers, then rows)
      const aoa: any[][] = [
        ...preRows,
        headers,
        ...dataRows,
      ];
      const worksheet = XLSXUtils.aoa_to_sheet(aoa);

      // Header styling (bold + shaded background)
      try {
        for (let c = 0; c < data.columns.length; c++) {
          const cellRef = XLSXUtils.encode_cell({ r: preRowsCount, c });
          const cell = (worksheet as any)[cellRef];
          if (!cell) continue;
          const base = cell.s || {};
          // Apply auto filter to the header row if requested
          if (options.excel?.autoFilter) {
            const lastCol = XLSXUtils.encode_col(data.columns.length - 1);
            (worksheet as any)['!autofilter'] = { ref: `A${preRowsCount + 1}:${lastCol}${preRowsCount + 1}` };
          }
          (worksheet as any)[cellRef].s = Object.assign({}, base, {
            font: Object.assign({}, (base as any).font || {}, { bold: true, color: { rgb: '2C3E50' } }),
            fill: { patternType: 'solid', fgColor: { rgb: 'F8F9FA' } },
            alignment: { horizontal: options.rtlLayout ? 'right' : 'left', vertical: 'center' }
          });
        }
      } catch {}

      // Apply freeze panes if requested (account for preheader rows)
      if (options.excel?.freezePanes !== false) {
        try {
          const ySplit = preRowsCount + 1; // header row index (1-based)
          const topLeftCell = `B${ySplit + 1}`; // one row below header
          (worksheet as any)['!freeze'] = { xSplit: 1, ySplit, topLeftCell, activePane: 'bottomRight', state: 'frozen' };
        } catch {}
      }
      
      // Set column widths with intelligent defaults based on data type
      const columnWidths = data.columns.map(col => {
        let width = 15; // default width
        
        if (col.width) {
          width = col.width / 8;
        } else {
          // Auto-size based on column type
          switch (col.type) {
            case 'currency':
            case 'number':
              width = 18; // Wider for numbers with currency symbols
              break;
            case 'date':
              width = 12; // Standard date width
              break;
            case 'percentage':
              width = 10; // Smaller for percentages
              break;
            case 'boolean':
              width = 8; // Small for true/false
              break;
            case 'text':
            default:
              // Calculate width based on header length (Arabic text needs more space)
              const headerLength = col.header ? col.header.length : 10;
              width = Math.max(12, Math.min(30, headerLength * 1.2));
              break;
          }
        }
        
        return { wch: width };
      });
      (worksheet as any)['!cols'] = columnWidths;
      
      // Apply RTL formatting to the worksheet if needed
      if (options.rtlLayout) {
        (worksheet as any)['!dir'] = 'rtl';
      }

      // Apply proper cell formatting based on column types
      try {
        // Define column type indices
        const currencyColIdx: number[] = [];
        const numberColIdx: number[] = [];
        const dateColIdx: number[] = [];
        const percentageColIdx: number[] = [];
        
        data.columns.forEach((col, idx) => {
          switch (col.type) {
            case 'currency':
              currencyColIdx.push(idx);
              break;
            case 'number':
              numberColIdx.push(idx);
              break;
            case 'date':
              dateColIdx.push(idx);
              break;
            case 'percentage':
              percentageColIdx.push(idx);
              break;
          }
        });
        
        // Iterate over data rows (1-based offset in sheet for header)
        for (let r = 0; r < dataRows.length; r++) {
          const sheetRow = preRowsCount + 1 + r; // header at preRowsCount + 1
          const isGroupSubtotal = typeof data.rows[r]?.name === 'string' && (data.rows[r].name as string).startsWith('[مجموعة]');
          
          for (let c = 0; c < data.columns.length; c++) {
            const cellRef = XLSXUtils.encode_cell({ r: sheetRow, c });
            const cell = (worksheet as any)[cellRef];
            if (!cell) continue;
            
            // Apply appropriate number formats based on column type
            const col = data.columns[c];
            const baseStyle = cell.s || {};
            
            if (typeof cell.v === 'number') {
              if (currencyColIdx.includes(c)) {
                // Advanced currency formatting based on options
                const currencyFormat = options.excel?.currencyFormat || 'symbol';
                const customFormat = options.excel?.columnFormats?.[col.key] || col.excel?.format;
                
                if (customFormat) {
                  // Use custom format for this specific column
                  cell.z = customFormat;
                } else if (currencyFormat === 'plain' || col.currency === 'none') {
                  // Plain numeric format
                  cell.z = options.excel?.useLocaleSeparators ? '#,##0.00' : '#,##0.00';
                } else if (currencyFormat === 'custom' && options.excel?.customCurrencyFormat) {
                  // Use global custom currency format
                  cell.z = options.excel.customCurrencyFormat;
                } else {
                  // Default symbol format with proper currency
                  const currencySymbol = col.excel?.currencySymbol || 
                                       (col.currency === 'EGP' ? 'ج.م' : (col.currency || 'ج.م'));
                  
                  // Use locale-aware format if requested
                  if (options.excel?.useLocaleSeparators && col.excel?.locale) {
                    cell.z = `[$-${col.excel.locale}]#,##0.00" ${currencySymbol}"`;
                  } else {
                    cell.z = `#,##0.00" ${currencySymbol}"`;
                  }
                }
                
                // Apply alignment (custom or default)
                const align = col.excel?.alignment || 'right';
                cell.s = Object.assign({}, baseStyle, {
                  alignment: Object.assign({}, baseStyle.alignment || {}, { 
                    horizontal: align, 
                    vertical: 'center' 
                  })
                });
              } else if (numberColIdx.includes(c)) {
                // Custom number formatting
                const customFormat = options.excel?.columnFormats?.[col.key] || col.excel?.format;
                
                if (customFormat) {
                  cell.z = customFormat;
                } else {
                  // Default number format with locale support
                  cell.z = options.excel?.useLocaleSeparators ? '#,##0.00' : '#,##0.00';
                }
                
                // Apply alignment (custom or default)
                const align = col.excel?.alignment || 'right';
                cell.s = Object.assign({}, baseStyle, {
                  alignment: Object.assign({}, baseStyle.alignment || {}, { 
                    horizontal: align, 
                    vertical: 'center' 
                  })
                });
              } else if (percentageColIdx.includes(c)) {
                // Custom percentage formatting
                const customFormat = options.excel?.columnFormats?.[col.key] || col.excel?.format;
                
                if (customFormat) {
                  cell.z = customFormat;
                } else {
                  // Default percentage format
                  cell.z = '0.00%';
                }
                
                cell.t = 'n'; // Ensure it's treated as number
                
                // Apply alignment (custom or default)
                const align = col.excel?.alignment || 'center';
                cell.s = Object.assign({}, baseStyle, {
                  alignment: Object.assign({}, baseStyle.alignment || {}, { 
                    horizontal: align, 
                    vertical: 'center' 
                  })
                });
                // Keep the value as is - Excel will multiply by 100 when displaying as %
              }
            } else if (dateColIdx.includes(c)) {
              // Custom date formatting
              const customFormat = options.excel?.columnFormats?.[col.key] || col.excel?.format;
              
              // Handle different date formats
              if (cell.v instanceof Date) {
                cell.z = customFormat || 'dd/mm/yyyy';
                cell.t = 'd'; // Excel date type
              } else if (typeof cell.v === 'string') {
                // Try to parse string dates
                const parsedDate = new Date(cell.v);
                if (!isNaN(parsedDate.getTime())) {
                  cell.v = parsedDate;
                  cell.z = customFormat || 'dd/mm/yyyy';
                  cell.t = 'd';
                } else {
                  // Keep as text if can't parse as date
                  cell.z = '@'; // Text format
                }
              }
              
              // Apply alignment (custom or default)
              const align = col.excel?.alignment || 'center';
              cell.s = Object.assign({}, baseStyle, {
                alignment: Object.assign({}, baseStyle.alignment || {}, { 
                  horizontal: align, 
                  vertical: 'center' 
                })
              });
            } else {
              // Text and other types
              // Align text based on RTL layout and column specification
              const textAlign = col.align || (options.rtlLayout ? 'right' : 'left');
              cell.s = Object.assign({}, baseStyle, {
                alignment: Object.assign({}, baseStyle.alignment || {}, { 
                  horizontal: textAlign, 
                  vertical: 'center' 
                })
              });
            }
            
            // Bold and shade group subtotal rows (support varies by environment)
            if (isGroupSubtotal) {
              const baseStyle = cell.s || {};
              cell.s = Object.assign({}, baseStyle, {
                font: Object.assign({}, (baseStyle as any).font || {}, { bold: true }),
                fill: { patternType: 'solid', fgColor: { rgb: 'EEEEEE' } }
              });
            }
          }
        }
      } catch {}

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
      // Optional preheader rows (before header)
      const preRows = Array.isArray(data.metadata?.prependRows) ? (data.metadata!.prependRows as any[][]) : [];
      const preRowsLines = preRows.map(r => r.map(cell => this.csvEscape(String(cell ?? ''))).join(','));

      // Prepare CSV content
      const csvContent = [
        // Prepend summary rows if any
        ...preRowsLines,
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
   * Generate customized HTML for export with full settings support
   */
  private generateCustomizedHTML(data: UniversalTableData, options: UniversalExportOptions): string {
    const rtlDir = options.rtlLayout !== false ? 'rtl' : 'ltr';
    const lang = options.rtlLayout !== false ? 'ar' : 'en';
    const fontSize = options.fontSize || 12;
    const margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    
    return `
<!DOCTYPE html>
<html dir="${rtlDir}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: ${options.orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        }
        
        body {
            font-family: ${rtlDir === 'rtl' ? "'Noto Sans Arabic', Arial, sans-serif" : "'Roboto', Arial, sans-serif"};
            direction: ${rtlDir};
            background: white;
            color: #333;
            font-size: ${fontSize}px;
            line-height: 1.4;
        }
        
        .export-container {
            width: 100%;
            margin: 0 auto;
        }
        
        .export-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #2c3e50;
        }
        
        .export-title {
            font-size: ${Math.round(fontSize * 1.8)}px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .export-subtitle {
            font-size: ${Math.round(fontSize * 1.2)}px;
            color: #7f8c8d;
        }
        
        .export-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: ${fontSize}px;
        }
        
        .export-table th,
        .export-table td {
            border: 1px solid #ddd;
            padding: ${Math.max(8, fontSize * 0.8)}px;
            text-align: ${rtlDir === 'rtl' ? 'right' : 'left'};
            direction: ${rtlDir};
            vertical-align: top;
        }
        
        .export-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
            font-size: ${Math.round(fontSize * 0.9)}px;
        }
        
        .export-table tr:nth-child(even) {
            background-color: #fdfdfd;
        }
        
        .export-table tr:hover {
            background-color: #f5f5f5;
        }
        
        .export-footer {
            margin-top: 20px;
            text-align: center;
            font-size: ${Math.round(fontSize * 0.85)}px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }
        
        /* Currency and number alignment */
        .export-table td.number,
        .export-table td.currency {
            text-align: ${rtlDir === 'rtl' ? 'left' : 'right'};
            font-family: 'Roboto', Arial, sans-serif;
        }
        
        /* Print-specific styles */
        @media print {
            body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .export-container {
                max-width: none;
                width: 100%;
            }
            
            .export-table {
                page-break-inside: avoid;
            }
            
            .export-table thead {
                display: table-header-group;
            }
            
            .export-table tbody {
                display: table-row-group;
            }
            
            .export-table tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
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
                    ${data.columns.map(col => {
                      const value = row[col.key] || '';
                      const cellClass = col.type === 'currency' || col.type === 'number' ? ` class="${col.type}"` : '';
                      return `<td${cellClass}>${this.formatValueForHTML(value, col, options)}</td>`;
                    }).join('')}
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${options.includeFooter !== false ? `
        <div class="export-footer">
            <p>تم إنشاء هذا التقرير في ${this.formatDateForLocale(new Date(), options)}</p>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }
  
  /**
   * Get page dimensions based on settings
   */
  private getPageDimensions(options: UniversalExportOptions): { width: string; height: string } {
    const isLandscape = options.orientation === 'landscape';
    
    // Default to A4 if not specified
    let width: string, height: string;
    
    switch (options.pageSize || 'A4') {
      case 'A3':
        width = isLandscape ? '420mm' : '297mm';
        height = isLandscape ? '297mm' : '420mm';
        break;
      case 'Letter':
        width = isLandscape ? '279mm' : '216mm';
        height = isLandscape ? '216mm' : '279mm';
        break;
      case 'A4':
      default:
        width = isLandscape ? '297mm' : '210mm';
        height = isLandscape ? '210mm' : '297mm';
        break;
    }
    
    return { width, height };
  }
  
  /**
   * Format value for HTML display with proper localization
   */
  private formatValueForHTML(value: any, column: UniversalTableColumn, options: UniversalExportOptions): string {
    if (value === null || value === undefined || value === '') return '—';
    
    const useArabicNumerals = options.useArabicNumerals !== false;
    
    switch (column.type) {
      case 'currency':
        const currencyValue = Number(value) || 0;
        let formatted = currencyValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        if (useArabicNumerals) {
          formatted = this.arabicEngine.convertNumerals(formatted, true);
        }
        return formatted;
        
      case 'number':
        const numberValue = Number(value) || 0;
        let numFormatted = numberValue.toLocaleString('en-US');
        if (useArabicNumerals) {
          numFormatted = this.arabicEngine.convertNumerals(numFormatted, true);
        }
        return numFormatted;
        
      case 'date':
        return this.formatDateForLocale(new Date(value), options);
        
      case 'percentage':
        const percentValue = `${(Number(value) * 100).toFixed(2)}%`;
        return useArabicNumerals ? this.arabicEngine.convertNumerals(percentValue, true) : percentValue;
        
      case 'boolean':
        return value ? 'نعم' : 'لا';
        
      default:
        return String(value);
    }
  }
  
  /**
   * Format date for locale
   */
  private formatDateForLocale(date: Date, options: UniversalExportOptions): string {
    if (options.rtlLayout !== false) {
      return date.toLocaleDateString('ar-EG');
    } else {
      return date.toLocaleDateString('en-US');
    }
  }
  
  /**
   * Generate HTML for export (legacy method for compatibility)
   */
  private generateHTML(data: UniversalTableData, options: UniversalExportOptions): string {
    return this.generateCustomizedHTML(data, options);
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
