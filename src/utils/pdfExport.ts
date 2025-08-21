// PDF Export Utility with Arabic Text Support
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatForExport, processArabicText, formatArabicCurrency, formatArabicDate, cleanArabicText } from './ArabicTextEngine';

// Extend jsPDF interface to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
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
}

export interface TableColumn {
  header: string;
  field: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'currency' | 'date';
}

export interface TableData {
  columns: TableColumn[];
  rows: any[];
}

/**
 * Simple Arabic text formatter for PDF export
 */
const formatSimpleArabicText = (text: string): string => {
  if (!text) return '';
  
  // Remove RTL control characters that cause issues
  let cleaned = text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  
  // Convert Western numerals to Arabic numerals for display
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  cleaned = cleaned.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  
  return cleaned;
};

/**
 * Format text for PDF table cells
 */
const formatForDirectPDFTable = (value: any, type: string = 'text'): string => {
  if (value === null || value === undefined) return '-';
  
  switch (type) {
    case 'currency':
      // Use the same currency formatting as the UI - no Arabic numeral conversion
      if (value === 0) return '-';
      const numericAmount = typeof value === 'string' ? parseFloat(value) : Number(value);
      if (isNaN(numericAmount)) return '-';
      
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Math.abs(numericAmount));
      
      const currencyText = `${formattedAmount} ج.م`;
      return numericAmount < 0 ? `-${currencyText}` : currencyText;
    case 'date':
      return formatArabicDate(value, { forExport: true });
    case 'number':
      return formatSimpleArabicText(String(value));
    case 'text':
    default:
      return formatSimpleArabicText(String(value));
  }
};

/**
 * Export table data to PDF using jsPDF with autoTable
 */
export function exportTableToPDF(data: TableData, options: PDFExportOptions = {}): void {
  const {
    title = 'تقرير',
    subtitle,
    orientation = 'landscape',
    includeHeader = true,
    includeFooter = true,
    fontSize = 10,
    useArabicNumerals = true,
    rtlLayout = true
  } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Set font
  doc.setFont('helvetica', 'normal');
  
  let currentY = 20;

  // Add header if requested
  if (includeHeader) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    // Process title for Arabic display
    const processedTitle = cleanArabicText(title);
    doc.text(processedTitle, doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    
    currentY += 10;
    
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const processedSubtitle = cleanArabicText(subtitle);
      doc.text(processedSubtitle, doc.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 10;
    }
    
    // Add date
    doc.setFontSize(10);
    const dateText = `التاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
    doc.text(dateText, doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    
    currentY += 15;
  }

  // Prepare table headers
  const headers = data.columns.map(col => cleanArabicText(col.header));

  // Prepare table data
  const tableData = data.rows.map(row => {
    return data.columns.map(col => {
      const value = row[col.field];
      return formatForDirectPDFTable(value, col.type);
    });
  });

  // Configure column styles
  const columnStyles: any = {};
  data.columns.forEach((col, index) => {
    columnStyles[index] = {
      halign: rtlLayout ? 'right' : (col.align || 'left'),
      cellWidth: col.width || 'auto',
      direction: rtlLayout ? 'rtl' : 'ltr'
    };
  });

  // Add table using autoTable
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: currentY,
    styles: {
      font: 'helvetica',
      fontSize: fontSize,
      cellPadding: 5,
      overflow: 'linebreak',
      halign: rtlLayout ? 'right' : 'left',
      valign: 'middle',
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: fontSize + 1
    },
    columnStyles: columnStyles,
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: currentY, right: 10, bottom: 20, left: 10 },
    didDrawPage: function(data: any) {
      // Add footer if requested
      if (includeFooter) {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        // Add page number
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const pageNumber = `صفحة ${data.pageNumber}`;
        doc.text(pageNumber, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    }
  });

  // Save the PDF
  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export hierarchical report to PDF (for financial statements)
 */
export function exportHierarchicalReportToPDF(
  data: any,
  reportName: string,
  options: PDFExportOptions = {}
): void {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  // Add header
  let currentY = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanArabicText(reportName), doc.internal.pageSize.width / 2, currentY, { align: 'center' });
  
  currentY += 15;

  // Process sections
  const sections = ['assets', 'liabilities', 'equity', 'revenue', 'expenses'];
  const sectionTitles: { [key: string]: string } = {
    assets: 'الأصول',
    liabilities: 'الالتزامات',
    equity: 'حقوق الملكية',
    revenue: 'الإيرادات',
    expenses: 'المصروفات'
  };

  sections.forEach(section => {
    if (data[section] && data[section].length > 0) {
      // Add section title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sectionTitles[section], doc.internal.pageSize.width - 20, currentY, { align: 'right' });
      currentY += 10;

      // Add section data
      const sectionData = data[section].map((item: any) => {
        const level = item.level || 1;
        const indent = '  '.repeat(level - 1);
        const name = item.account_name_ar || item.account_name_en || '';
        const code = item.account_code || '';
        const balance = item.closing_balance || item.current_balance || 0;
        
        return [
          cleanArabicText(`${indent}${name}`),
          code,
          formatForDirectPDFTable(balance, 'currency')
        ];
      });

      autoTable(doc, {
        head: [['اسم الحساب', 'رمز الحساب', 'الرصيد']],
        body: sectionData,
        startY: currentY,
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 3,
          halign: 'right'
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'right', cellWidth: 100 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 40 }
        },
        margin: { right: 20, left: 20 }
      });

      // Update currentY for next section
      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Check if we need a new page
      if (currentY > doc.internal.pageSize.height - 40) {
        doc.addPage();
        currentY = 20;
      }
    }
  });

  // Save the PDF
  const filename = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Simple export function for basic data
 */
export function exportSimpleToPDF(
  data: any[],
  title: string,
  columns?: { key: string; label: string; type?: string }[]
): void {
  if (!data || data.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  // Auto-detect columns if not provided
  if (!columns) {
    const sampleRow = data[0];
    columns = Object.keys(sampleRow).map(key => ({
      key,
      label: key,
      type: typeof sampleRow[key] === 'number' ? 'number' : 'text'
    }));
  }

  // Convert to TableData format
  const tableData: TableData = {
    columns: columns.map(col => ({
      header: col.label,
      field: col.key,
      type: (col.type as any) || 'text'
    })),
    rows: data
  };

  // Export using the main function
  exportTableToPDF(tableData, { title });
}
