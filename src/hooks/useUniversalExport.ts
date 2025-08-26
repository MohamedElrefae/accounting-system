/**
 * Universal Export Hook
 * Provides standardized export functionality for all data tables in the application
 * Ensures consistency in formatting, Arabic support, and user experience
 */

import { useState, useCallback } from 'react';
import { 
  exportToPDF, 
  exportToExcel, 
  exportToCSV, 
  exportToHTML, 
  exportToJSON
} from '../utils/UniversalExportManager';
import type { 
  UniversalTableData, 
  UniversalTableColumn,
  UniversalExportOptions 
} from '../utils/UniversalExportManager';

export interface ExportConfig {
  title: string;
  subtitle?: string;
  useArabicNumerals?: boolean;
  rtlLayout?: boolean;
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeFooter?: boolean;
  fontSize?: number;
}

export interface ExportHookOptions {
  defaultConfig?: Partial<ExportConfig>;
  onExportStart?: (format: string) => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (format: string, error: Error) => void;
}

export interface ExportMethods {
  exportToPDF: (data: UniversalTableData, config?: Partial<ExportConfig>) => Promise<void>;
  exportToExcel: (data: UniversalTableData, config?: Partial<ExportConfig>) => Promise<void>;
  exportToCSV: (data: UniversalTableData, config?: Partial<ExportConfig>) => Promise<void>;
  exportToHTML: (data: UniversalTableData, config?: Partial<ExportConfig>) => Promise<void>;
  exportToJSON: (data: UniversalTableData, config?: Partial<ExportConfig>) => Promise<void>;
  exportAll: (data: UniversalTableData, config?: Partial<ExportConfig>) => Promise<void>;
  isExporting: boolean;
}

export const useUniversalExport = (options: ExportHookOptions = {}): ExportMethods => {
  const [isExporting, setIsExporting] = useState(false);

  const defaultConfig: ExportConfig = {
    title: 'تقرير البيانات',
    useArabicNumerals: true,
    rtlLayout: true,
    orientation: 'landscape',
    includeHeader: true,
    includeFooter: true,
    fontSize: 12,
    ...options.defaultConfig
  };

  const executeExport = useCallback(async (
    exportFunction: (data: UniversalTableData, options: Omit<UniversalExportOptions, 'format'>) => Promise<void>,
    format: string,
    data: UniversalTableData,
    config: Partial<ExportConfig>
  ) => {
    try {
      setIsExporting(true);
      options.onExportStart?.(format);

      const finalConfig = { ...defaultConfig, ...config };
      
      await exportFunction(data, finalConfig);
      options.onExportComplete?.(format);
    } catch (error) {
      options.onExportError?.(format, error as Error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [defaultConfig, options]);

  const exportToPDFMethod = useCallback(async (
    data: UniversalTableData,
    config: Partial<ExportConfig> = {}
  ) => {
    await executeExport(exportToPDF, 'pdf', data, config);
  }, [executeExport]);

  const exportToExcelMethod = useCallback(async (
    data: UniversalTableData,
    config: Partial<ExportConfig> = {}
  ) => {
    await executeExport(exportToExcel, 'excel', data, config);
  }, [executeExport]);

  const exportToCSVMethod = useCallback(async (
    data: UniversalTableData,
    config: Partial<ExportConfig> = {}
  ) => {
    await executeExport(exportToCSV, 'csv', data, config);
  }, [executeExport]);

  const exportToHTMLMethod = useCallback(async (
    data: UniversalTableData,
    config: Partial<ExportConfig> = {}
  ) => {
    await executeExport(exportToHTML, 'html', data, config);
  }, [executeExport]);

  const exportToJSONMethod = useCallback(async (
    data: UniversalTableData,
    config: Partial<ExportConfig> = {}
  ) => {
    await executeExport(exportToJSON, 'json', data, config);
  }, [executeExport]);

  const exportAll = useCallback(async (
    data: UniversalTableData,
    config: Partial<ExportConfig> = {}
  ) => {
    const formats = ['pdf', 'excel', 'csv', 'html', 'json'];
    const finalConfig = { ...defaultConfig, ...config };
    
    for (const format of formats) {
      try {
        const exportFunction = {
          pdf: exportToPDF,
          excel: exportToExcel,
          csv: exportToCSV,
          html: exportToHTML,
          json: exportToJSON
        }[format];

        if (exportFunction) {
          await executeExport(exportFunction, format, data, finalConfig);
        }
      } catch (error) {
        // Silent error handling for batch export
      }
    }
  }, [defaultConfig, executeExport]);

  return {
    exportToPDF: exportToPDFMethod,
    exportToExcel: exportToExcelMethod,
    exportToCSV: exportToCSVMethod,
    exportToHTML: exportToHTMLMethod,
    exportToJSON: exportToJSONMethod,
    exportAll,
    isExporting
  };
};

// Helper function to prepare table data from filtered results
export const prepareTableData = (
  columns: UniversalTableColumn[],
  rows: any[],
  options: {
    splitDebitCredit?: boolean;
    currencyFields?: string[];
    dateFields?: string[];
  } = {}
): UniversalTableData => {
  const { splitDebitCredit = false, currencyFields = [], dateFields: _dateFields = [] } = options;

  let processedColumns = [...columns];
  let processedRows = rows;

  // If splitDebitCredit is enabled, split currency columns into debit/credit
  if (splitDebitCredit) {
    const newColumns: UniversalTableColumn[] = [];
    
    columns.forEach(col => {
      if (currencyFields.includes(col.key)) {
        // Split into debit and credit columns
        newColumns.push({
          ...col,
          key: `${col.key}_debit`,
          header: `${col.header} مدين`,
          type: 'currency'
        });
        newColumns.push({
          ...col,
          key: `${col.key}_credit`,
          header: `${col.header} دائن`,
          type: 'currency'
        });
      } else {
        newColumns.push(col);
      }
    });

    processedColumns = newColumns;

    // Process rows to split currency values
    processedRows = rows.map(row => {
      const newRow: any = {};
      
      columns.forEach(col => {
        if (currencyFields.includes(col.key)) {
          const value = row[col.key] || 0;
          newRow[`${col.key}_debit`] = value >= 0 ? value : 0;
          newRow[`${col.key}_credit`] = value < 0 ? Math.abs(value) : 0;
        } else {
          newRow[col.key] = row[col.key];
        }
      });
      
      return newRow;
    });
  }

  return {
    columns: processedColumns,
    rows: processedRows
  };
};

// Helper function to standardize column definitions
export const createStandardColumns = (
  definitions: Array<{
    key: string;
    header: string;
    type?: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'percentage';
    width?: number;
    align?: 'left' | 'center' | 'right';
    currency?: string;
    visible?: boolean;
  }>
): UniversalTableColumn[] => {
  return definitions.map(def => ({
    type: 'text',
    align: 'right',
    visible: true,
    currency: 'EGP',
    ...def
  }));
};
