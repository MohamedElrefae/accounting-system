/**
 * Professional PDF Generation Service
 * Generates high-quality PDFs for financial reports using HTML-to-PDF conversion
 * with official styling and complete data capture
 */

export interface PDFOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  reportDate?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter';
  showHeader?: boolean;
  showFooter?: boolean;
  language?: 'ar' | 'en';
  numbersOnly?: boolean;
  currencySymbol?: string;
}

export interface PDFTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'currency';
}

export interface PDFTableData {
  columns: PDFTableColumn[];
  rows: Record<string, any>[];
  groupBy?: string;
  totals?: Record<string, number>;
}

export class PDFGenerator {
  private static readonly BASE_STYLES = `
    /* Professional Financial Report Styles - Compact Layout */
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    body { 
      font-family: 'Arial', 'Tahoma', sans-serif;
      direction: rtl;
      background: white;
      color: #1a202c;
      font-size: 11px;
      line-height: 1.3;
      padding: 12mm;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Force exact color printing for all gradients */
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Compact Header - No separate page, Vibrant UI gradient colors */
    .pdf-header {
      text-align: center;
      margin-bottom: 15px;
      border: 3px solid #026081;
      padding: 16px;
      background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
      border-radius: 12px;
      box-shadow: 0 6px 16px rgba(2, 96, 129, 0.4);
      page-break-after: avoid;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 6px;
      color: white;
      text-transform: uppercase;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .report-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 6px;
      color: white;
      border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      display: inline-block;
      padding-bottom: 2px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .report-subtitle {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    
    .report-meta {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.8);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      background: rgba(0, 0, 0, 0.1);
      margin: 8px -6px -6px -6px;
      padding: 6px 8px;
      border-radius: 0 0 4px 4px;
    }
    
    .meta-item {
      margin: 1px 8px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    }
    
    /* Financial Table Styles - Enhanced Colors */
    .financial-table {
      width: 100%;
      border-collapse: collapse;
      border: 3px solid #026081;
      background: white;
      font-size: 11px;
      margin-bottom: 16px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(2, 96, 129, 0.3);
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .financial-table thead {
      background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
      border-bottom: 3px solid #026081;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .financial-table th {
      padding: 14px 10px;
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      border-right: 2px solid rgba(255, 255, 255, 0.2);
      color: white !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      background: transparent;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .financial-table th:last-child {
      border-right: none;
    }
    
    .financial-table td {
      padding: 7px;
      border-right: 1px solid #e5e7eb;
      border-bottom: 1px solid #f3f4f6;
      color: #374151;
    }
    
    .financial-table td:last-child {
      border-right: none;
    }
    
    .financial-table .group-header {
      background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
      font-weight: bold;
      font-size: 13px;
      color: white !important;
      border-bottom: 3px solid #026081;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 12px 8px;
    }
    
    .financial-table .level-0 { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
      font-weight: bold; 
      color: #92400e;
      border-left: 4px solid #f59e0b;
    }
    .financial-table .level-1 { 
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
      padding-left: 20px;
      border-left: 3px solid #0ea5e9;
    }
    .financial-table .level-2 { 
      background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); 
      padding-left: 40px;
      border-left: 2px solid #6b7280;
    }
    .financial-table .level-3 { 
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); 
      padding-left: 60px;
      border-left: 1px solid #9ca3af;
    }
    
    .account-code {
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-align: center;
      width: 100px;
      color: #3730a3;
    }
    
    .account-name {
      text-align: right;
      font-weight: 500;
      color: #374151;
    }
    
    .amount-cell {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      text-align: right;
      width: 120px;
      color: #065f46;
    }
    
    .amount-debit {
      color: #dc2626;
    }
    
    .amount-credit {
      color: #059669;
    }
    
    /* Enhanced Amount Styling */
    .debit-amount { 
      color: #dc2626;
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      font-weight: bold; 
      text-align: right;
      padding: 4px 6px;
      border-radius: 4px;
      border-left: 3px solid #ef4444;
    }
    
    .credit-amount { 
      color: #059669;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      font-weight: bold; 
      text-align: right;
      padding: 4px 6px;
      border-radius: 4px;
      border-left: 3px solid #10b981;
    }
    
    .balance-amount {
      color: #374151;
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      font-weight: bold;
      text-align: right;
      padding: 4px 6px;
      border-radius: 4px;
      border-left: 3px solid #6b7280;
    }
    
    /* Totals Section - Enhanced Styling with Vibrant Colors */
    .totals-section {
      margin-top: 30px;
      border: 3px solid #026081;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      page-break-inside: avoid;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(2, 96, 129, 0.25);
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .totals-header {
      background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
      color: white !important;
      padding: 18px;
      text-align: center;
      font-weight: bold;
      font-size: 18px;
      border-bottom: 3px solid #026081;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .total-row {
      display: flex;
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
      font-size: 14px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      transition: all 0.2s ease;
    }
    
    .total-row:nth-child(even) {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    }
    
    .total-row:last-child {
      border-bottom: none;
      background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
      border-top: 4px solid #026081;
      font-weight: bold;
      font-size: 16px;
      color: white !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 16px;
    }
    
    .total-label {
      flex: 1;
      color: #1e293b;
      font-weight: 600;
      text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
    }
    
    .total-row:last-child .total-label {
      color: white !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
    
    .total-amount {
      width: 160px;
      text-align: right;
      font-family: 'Courier New', monospace;
      color: #065f46;
      font-weight: bold;
      margin-left: 20px;
      padding: 4px 8px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-radius: 4px;
      border-left: 3px solid #10b981;
    }
    
    .total-row:last-child .total-amount {
      color: white !important;
      background: transparent;
      border-left: none;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
    
    /* Page Break Control - Fixed for integrated layout */
    .page-break-before { page-break-before: always; }
    .page-break-after { page-break-after: always; }
    .page-break-avoid { page-break-inside: avoid; }
    
    /* Ensure header and content stay together */
    .pdf-header + .financial-table {
      page-break-before: avoid;
    }
    
    .content-container {
      page-break-inside: avoid;
    }
    
    /* Footer */
    .pdf-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #6b7280;
      text-align: center;
    }
    
    /* Print Specific - Fixed for integrated layout */
    @media print {
      body { 
        padding: 10mm;
        font-size: 10px;
      }
      .financial-table { 
        font-size: 9px; 
      }
      .pdf-header {
        margin-bottom: 20px;
        padding: 15px;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      .content-container {
        page-break-inside: avoid;
      }
      .financial-table {
        page-break-before: avoid;
      }
      .totals-section {
        page-break-before: avoid;
      }
      @page {
        size: A4;
        margin: 15mm;
      }
    }
    
    /* Landscape Mode */
    .landscape {
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
    }
  `;

  static async generateFinancialReportPDF(
    tableData: PDFTableData,
    options: PDFOptions
  ): Promise<void> {
    const html = this.buildFinancialReportHTML(tableData, options);
    
    // Use browser's native print-to-PDF functionality
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load
    setTimeout(() => {
      printWindow.focus();
      
      // Trigger print dialog with PDF option
      printWindow.print();
      
      // Clean up after short delay
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  }

  private static buildFinancialReportHTML(
    tableData: PDFTableData,
    options: PDFOptions
  ): string {
    const isRTL = options.language === 'ar';
    const currentDate = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US');
    
    return `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${options.language || 'ar'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${options.title}</title>
          <style>
            ${this.BASE_STYLES}
            ${options.orientation === 'landscape' ? '.body { } @page { size: A4 landscape; }' : ''}
          </style>
        </head>
        <body class="${options.orientation === 'landscape' ? 'landscape' : ''}">
          <div class="content-container">
            ${this.buildHeader(options, currentDate)}
            ${this.buildFinancialTable(tableData, options)}
            ${this.buildTotalsSection(tableData, options)}
          </div>
          ${options.showFooter ? this.buildFooter(options, currentDate) : ''}
        </body>
      </html>
    `;
  }

  private static buildHeader(options: PDFOptions, currentDate: string): string {
    const isRTL = options.language === 'ar';
    
    return `
      <div class="pdf-header">
        <div class="company-name">${options.companyName || (isRTL ? 'الشركة التجارية' : 'Commercial Company')}</div>
        <div class="report-title">${options.title}</div>
        ${options.subtitle ? `<div class="report-subtitle">${options.subtitle}</div>` : ''}
        <div class="report-meta">
          <span class="meta-item">${isRTL ? 'تاريخ التقرير' : 'Report Date'}: ${options.reportDate || currentDate}</span>
          <span class="meta-item">${isRTL ? 'تاريخ الطباعة' : 'Print Date'}: ${currentDate}</span>
          <span class="meta-item">${isRTL ? 'نوع التقرير' : 'Report Type'}: ${isRTL ? 'تقرير مالي رسمي' : 'Official Financial Report'}</span>
        </div>
      </div>
    `;
  }

  private static buildFinancialTable(tableData: PDFTableData, options: PDFOptions): string {
    let html = `
      <table class="financial-table">
        <thead>
          <tr>
    `;
    
    // Build header
    tableData.columns.forEach(col => {
      html += `<th style="width: ${col.width || 'auto'}; text-align: ${col.align || 'center'};">${col.header}</th>`;
    });
    
    html += `
          </tr>
        </thead>
        <tbody>
    `;
    
    // Build rows
    tableData.rows.forEach((row, _index) => {
      const level = row.level || 0;
      const isGroupHeader = row.isGroupHeader || false;
      const rowClass = isGroupHeader ? 'group-header' : `level-${Math.min(level, 3)}`;
      
      html += `<tr class="${rowClass}">`;
      
      tableData.columns.forEach(col => {
        const value = row[col.key] || '';
        const cellClass = this.getCellClass(col);
        
        let displayValue = value;
        if (col.type === 'currency' && typeof value === 'number') {
          displayValue = this.formatCurrency(value, options.numbersOnly, options.currencySymbol);
        } else if (col.type === 'number' && typeof value === 'number') {
          displayValue = value.toLocaleString(options.language === 'ar' ? 'ar-EG' : 'en-US');
        }
        
        const indentStyle = col.key === 'name' && level > 0 ? `padding-right: ${level * 20}px;` : '';
        
        html += `<td class="${cellClass}" style="${indentStyle}">${displayValue}</td>`;
      });
      
      html += `</tr>`;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    return html;
  }

  private static buildTotalsSection(tableData: PDFTableData, options: PDFOptions): string {
    if (!tableData.totals || Object.keys(tableData.totals).length === 0) {
      return '';
    }
    
    const isRTL = options.language === 'ar';
    
    let html = `
      <div class="totals-section">
        <div class="totals-header">${isRTL ? 'المجاميع العامة' : 'Grand Totals'}</div>
    `;
    
    Object.entries(tableData.totals).forEach(([key, value], index, arr) => {
      const isLastRow = index === arr.length - 1;
      html += `
        <div class="total-row ${isLastRow ? 'final-total' : ''}">
          <div class="total-label">${this.getTotalLabel(key, isRTL)}</div>
          <div class="total-amount">${this.formatCurrency(value, options.numbersOnly, options.currencySymbol)}</div>
        </div>
      `;
    });
    
    html += `</div>`;
    return html;
  }

  private static buildFooter(options: PDFOptions, currentDate: string): string {
    const isRTL = options.language === 'ar';
    
    return `
      <div class="pdf-footer">
        <p>${isRTL ? 'تم إنشاء هذا التقرير آليا بواسطة النظام المحاسبي' : 'This report was generated automatically by the accounting system'}</p>
        <p>${isRTL ? 'تاريخ الإنشاء' : 'Generated on'}: ${currentDate}</p>
      </div>
    `;
  }

  private static getCellClass(col: PDFTableColumn): string {
    const classes = [];
    
    if (col.key === 'code') classes.push('account-code');
    else if (col.key === 'name') classes.push('account-name');
    else if (col.type === 'currency' || col.type === 'number') classes.push('amount-cell');
    
    if (col.key.includes('debit')) classes.push('amount-debit');
    else if (col.key.includes('credit')) classes.push('amount-credit');
    
    return classes.join(' ');
  }

  private static formatCurrency(
    amount: number, 
    numbersOnly?: boolean, 
    currencySymbol?: string
  ): string {
    if (amount === 0) return '—';
    
    const formatted = Math.abs(amount).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    if (numbersOnly || !currencySymbol || currencySymbol === 'none') {
      return formatted;
    }
    
    return `${formatted} ${currencySymbol}`;
  }

  private static getTotalLabel(key: string, isRTL: boolean): string {
    const labels: Record<string, { ar: string; en: string }> = {
      totalDebits: { ar: 'إجمالي المدين', en: 'Total Debits' },
      totalCredits: { ar: 'إجمالي الدائن', en: 'Total Credits' },
      netTotal: { ar: 'الصافي الإجمالي', en: 'Net Total' },
      balanceStatus: { ar: 'حالة التوازن', en: 'Balance Status' }
    };
    
    return labels[key] ? labels[key][isRTL ? 'ar' : 'en'] : key;
  }
}

// Export utility function for easy usage
export const generateFinancialPDF = PDFGenerator.generateFinancialReportPDF.bind(PDFGenerator);
