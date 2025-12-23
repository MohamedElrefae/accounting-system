/**
 * Advanced Export Service for Running Balance
 * Provides export functions that include summary data
 */

import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import type { UniversalTableData } from '../../utils/UniversalExportManager'
import type { RunningBalanceSummary } from './runningBalanceService'

interface AdvancedExportConfig {
  title: string
  subtitle?: string
  rtlLayout?: boolean
  useArabicNumerals?: boolean
  orientation?: 'portrait' | 'landscape'
}

/**
 * Export Running Balance with Summary Data to PDF
 */
export async function exportRunningBalanceWithSummaryPDF(
  data: UniversalTableData,
  summary: RunningBalanceSummary | null,
  config: AdvancedExportConfig
): Promise<void> {
  // Enrich data with summary rows
  const enrichedData = enrichDataWithSummary(data, summary)
  
  // Export to PDF
  await exportToPDF(enrichedData, config as any)
}

/**
 * Export Running Balance with Summary Data to Excel
 */
export async function exportRunningBalanceWithSummaryExcel(
  data: UniversalTableData,
  summary: RunningBalanceSummary | null,
  config: AdvancedExportConfig
): Promise<void> {
  // Enrich data with summary rows
  const enrichedData = enrichDataWithSummary(data, summary)
  
  // Export to Excel
  await exportToExcel(enrichedData, config as any)
}

/**
 * Export Running Balance with Summary Data to CSV
 */
export async function exportRunningBalanceWithSummaryCSV(
  data: UniversalTableData,
  summary: RunningBalanceSummary | null,
  config: AdvancedExportConfig
): Promise<void> {
  // Enrich data with summary rows
  const enrichedData = enrichDataWithSummary(data, summary)
  
  // Export to CSV
  await exportToCSV(enrichedData, config as any)
}

/**
 * Enrich table data with summary rows
 * Adds summary data as additional rows at the end of the data
 */
function enrichDataWithSummary(
  data: UniversalTableData,
  summary: RunningBalanceSummary | null
): UniversalTableData {
  if (!summary) {
    return data
  }

  // Create summary rows
  const summaryRows = [
    // Empty row for spacing
    createEmptyRow(data.columns),
    // Summary header
    createSummaryRow(data.columns, 'ملخص البيانات', ''),
    // Summary data rows
    createSummaryRow(data.columns, 'الرصيد الافتتاحي', formatNumber(summary.openingBalance)),
    createSummaryRow(data.columns, 'إجمالي المدين', formatNumber(summary.totalDebits)),
    createSummaryRow(data.columns, 'إجمالي الدائن', formatNumber(summary.totalCredits)),
    createSummaryRow(data.columns, 'صافي التغيير', formatNumber(summary.netChange)),
    createSummaryRow(data.columns, 'الرصيد الختامي', formatNumber(summary.closingBalance)),
    createSummaryRow(data.columns, 'عدد الحركات', summary.transactionCount.toString()),
  ]

  // Combine data rows with summary rows
  return {
    columns: data.columns,
    rows: [...data.rows, ...summaryRows]
  }
}

/**
 * Create an empty row for spacing
 */
function createEmptyRow(columns: any[]): Record<string, any> {
  const row: Record<string, any> = {}
  columns.forEach(col => {
    row[col.key] = ''
  })
  return row
}

/**
 * Create a summary row
 */
function createSummaryRow(
  columns: any[],
  label: string,
  value: string
): Record<string, any> {
  const row: Record<string, any> = {}
  
  // Put label in first column
  if (columns.length > 0) {
    row[columns[0].key] = label
  }
  
  // Put value in last column
  if (columns.length > 1) {
    row[columns[columns.length - 1].key] = value
  }
  
  // Fill other columns with empty strings
  for (let i = 1; i < columns.length - 1; i++) {
    row[columns[i].key] = ''
  }
  
  return row
}

/**
 * Format number for display
 */
function formatNumber(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
