/**
 * Financial PDF Helper Utilities
 * Common functions to integrate professional PDF generation into financial reports
 */

import { generateFinancialPDF, type PDFTableData, type PDFOptions, type PDFTableColumn } from '../services/pdf-generator';

export interface FinancialReportData {
  title: string;
  subtitle?: string;
  companyName?: string;
  reportDate?: string;
  data: any[];
  mode?: 'range' | 'asof';
  dateFrom?: string;
  dateTo?: string;
  language?: 'ar' | 'en';
  numbersOnly?: boolean;
  currencySymbol?: string;
  projectName?: string;
  filters?: Record<string, any>;
}

export interface ReportColumnConfig {
  key: string;
  headerAr: string;
  headerEn: string;
  width?: string;
  type: 'text' | 'number' | 'currency';
  align?: 'left' | 'center' | 'right';
  showInRange?: boolean;
  showInAsof?: boolean;
}

/**
 * Common column configurations for financial reports
 */
export const COMMON_COLUMNS: Record<string, ReportColumnConfig> = {
  code: {
    key: 'code',
    headerAr: 'رمز الحساب',
    headerEn: 'Account Code',
    width: '100px',
    type: 'text',
    align: 'center',
    showInRange: true,
    showInAsof: true
  },
  name: {
    key: 'name',
    headerAr: 'اسم الحساب',
    headerEn: 'Account Name',
    width: '300px',
    type: 'text',
    align: 'right',
    showInRange: true,
    showInAsof: true
  },
  type: {
    key: 'type',
    headerAr: 'نوع الحساب',
    headerEn: 'Account Type',
    width: '120px',
    type: 'text',
    align: 'center',
    showInRange: true,
    showInAsof: true
  },
  level: {
    key: 'level',
    headerAr: 'المستوى',
    headerEn: 'Level',
    width: '80px',
    type: 'number',
    align: 'center',
    showInRange: true,
    showInAsof: true
  },
  opening_debit: {
    key: 'opening_debit',
    headerAr: 'افتتاحي مدين',
    headerEn: 'Opening Debit',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: false
  },
  opening_credit: {
    key: 'opening_credit',
    headerAr: 'افتتاحي دائن',
    headerEn: 'Opening Credit',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: false
  },
  period_debits: {
    key: 'period_debits',
    headerAr: 'مدين الفترة',
    headerEn: 'Period Debits',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: false
  },
  period_credits: {
    key: 'period_credits',
    headerAr: 'دائن الفترة',
    headerEn: 'Period Credits',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: false
  },
  closing_debit: {
    key: 'closing_debit',
    headerAr: 'مدين ختامي',
    headerEn: 'Closing Debit',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: true
  },
  closing_credit: {
    key: 'closing_credit',
    headerAr: 'دائن ختامي',
    headerEn: 'Closing Credit',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: true
  },
  period_net: {
    key: 'period_net',
    headerAr: 'صافي الفترة',
    headerEn: 'Period Net',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: false
  },
  final_net: {
    key: 'final_net',
    headerAr: 'الصافي الختامي',
    headerEn: 'Final Net',
    width: '120px',
    type: 'currency',
    align: 'right',
    showInRange: true,
    showInAsof: true
  }
};

/**
 * Generate PDF for Trial Balance reports
 */
export async function generateTrialBalancePDF(reportData: FinancialReportData): Promise<void> {
  const columnKeys = ['code', 'name'];
  
  if (reportData.mode === 'range') {
    columnKeys.push('period_debits', 'period_credits');
  } else {
    columnKeys.push('closing_debit', 'closing_credit');
  }

  return generateGenericFinancialPDF(reportData, columnKeys);
}

/**
 * Generate PDF for Balance Sheet reports
 */
export async function generateBalanceSheetPDF(reportData: FinancialReportData): Promise<void> {
  const columnKeys = ['code', 'name', 'closing_debit', 'closing_credit', 'final_net'];
  return generateGenericFinancialPDF(reportData, columnKeys);
}

/**
 * Generate PDF for Profit & Loss reports
 */
export async function generateProfitLossPDF(reportData: FinancialReportData): Promise<void> {
  const columnKeys = ['code', 'name', 'closing_debit', 'closing_credit', 'final_net'];
  return generateGenericFinancialPDF(reportData, columnKeys);
}

/**
 * Generate PDF for Account Explorer reports
 */
export async function generateAccountExplorerPDF(reportData: FinancialReportData): Promise<void> {
  const columnKeys = ['code', 'name', 'type', 'level'];
  
  if (reportData.mode === 'range') {
    columnKeys.push('opening_debit', 'opening_credit', 'period_debits', 'period_credits', 'closing_debit', 'closing_credit', 'period_net', 'final_net');
  } else {
    columnKeys.push('closing_debit', 'closing_credit', 'final_net');
  }

  return generateGenericFinancialPDF(reportData, columnKeys);
}

/**
 * Generic PDF generation function
 */
export async function generateGenericFinancialPDF(
  reportData: FinancialReportData,
  columnKeys: string[]
): Promise<void> {
  const isRTL = reportData.language === 'ar';
  const mode = reportData.mode || 'asof';
  
  // Build columns
  const pdfColumns: PDFTableColumn[] = columnKeys
    .map(key => {
      const config = COMMON_COLUMNS[key];
      if (!config) return undefined as unknown as PDFTableColumn; // filter below
      
      // Check if column should be shown in current mode
      const shouldShow = mode === 'range' ? config.showInRange : config.showInAsof;
      if (!shouldShow) return null;
      
      return {
        key: config.key,
        header: isRTL ? config.headerAr : config.headerEn,
        width: config.width,
        type: config.type,
        align: config.align
      };
    })
    .filter((col): col is PDFTableColumn => !!col);

  // Build rows
  const pdfRows = reportData.data.map(item => {
    const row: Record<string, any> = {};
    
    columnKeys.forEach(key => {
      const config = COMMON_COLUMNS[key];
      if (!config) return;
      
      const shouldShow = mode === 'range' ? config.showInRange : config.showInAsof;
      if (!shouldShow) return;
      
      // Map data based on common property names
      let value = item[key];
      
      // Handle special mappings
      if (key === 'name' && item.name_ar && isRTL) {
        value = item.name_ar;
      } else if (key === 'name' && !value) {
        value = item.name_ar || item.name;
      } else if (key === 'type' && !value) {
        value = item.category || item.account_type || '—';
      } else if (key === 'period_net') {
        value = (item.period_debits || 0) - (item.period_credits || 0);
      } else if (key === 'final_net') {
        value = (item.closing_debit || 0) - (item.closing_credit || 0);
      }
      
      row[key] = value || 0;
    });
    
    return row;
  });

  // Calculate totals
  const totals: Record<string, number> = {};
  
  const numericColumns = ['opening_debit', 'opening_credit', 'period_debits', 'period_credits', 'closing_debit', 'closing_credit'];
  numericColumns.forEach(col => {
    if (columnKeys.includes(col)) {
      const total = reportData.data.reduce((sum, item) => sum + Number(item[col] || 0), 0);
      if (total !== 0) {
        totals[`total${col.charAt(0).toUpperCase() + col.slice(1)}`] = total;
      }
    }
  });

  // Add net total if applicable
  if (totals.totalClosingDebit !== undefined && totals.totalClosingCredit !== undefined) {
    totals.netTotal = totals.totalClosingDebit - totals.totalClosingCredit;
  }

  const tableData: PDFTableData = {
    columns: pdfColumns,
    rows: pdfRows,
    totals
  };

  const periodText = mode === 'range' 
    ? `${isRTL ? 'من' : 'From'} ${reportData.dateFrom} ${isRTL ? 'إلى' : 'To'} ${reportData.dateTo}`
    : `${isRTL ? 'حتى تاريخ' : 'As of'} ${reportData.dateTo}`;

  const pdfOptions: PDFOptions = {
    title: reportData.title,
    subtitle: reportData.subtitle || periodText,
    companyName: reportData.companyName,
    reportDate: reportData.reportDate || reportData.dateTo,
    orientation: columnKeys.length > 5 ? 'landscape' : 'portrait',
    language: reportData.language || 'ar',
    numbersOnly: reportData.numbersOnly || false,
    currencySymbol: reportData.numbersOnly ? 'none' : (reportData.currencySymbol || 'EGP'),
    showHeader: true,
    showFooter: true
  };

  await generateFinancialPDF(tableData, pdfOptions);
}

/**
 * Create a PDF button component (returns button props)
 */
export function createPDFButtonProps(
  reportData: FinancialReportData,
  generateFunction: (data: FinancialReportData) => Promise<void>,
  uiLang: 'ar' | 'en' = 'ar'
) {
  return {
    type: 'button' as const,
    title: uiLang === 'ar' ? 'تصدير PDF رسمي' : 'Export Official PDF',
    onClick: async () => {
      try {
        await generateFunction(reportData);
      } catch (error) {
        console.error('PDF generation failed:', error);
        alert(uiLang === 'ar' ? 'فشل في إنشاء ملف PDF' : 'Failed to generate PDF');
      }
    },
    style: {
      backgroundColor: '#dc2626',
      color: 'white',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    } as React.CSSProperties,
    onMouseOver: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = '#b91c1c';
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)';
    },
    onMouseOut: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = '#dc2626';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
    }
  };
}
