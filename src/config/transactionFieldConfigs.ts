// Transaction Details Field Configurations
// Defines all configurable fields for each tab in UnifiedTransactionDetailsPanel

import type { ColumnConfig } from '../components/Common/ColumnConfiguration'

// Basic Info Tab Fields
export const DEFAULT_BASIC_INFO_FIELDS: ColumnConfig[] = [
  { key: 'entry_number', label: 'رقم القيد', visible: true, width: 150, minWidth: 100, maxWidth: 250, type: 'text', resizable: true },
  { key: 'entry_date', label: 'التاريخ', visible: true, width: 150, minWidth: 120, maxWidth: 200, type: 'date', resizable: true },
  { key: 'description', label: 'الوصف', visible: true, width: 300, minWidth: 200, maxWidth: 500, type: 'text', resizable: true },
  { key: 'reference_number', label: 'المرجع', visible: true, width: 150, minWidth: 100, maxWidth: 250, type: 'text', resizable: true },
  { key: 'status', label: 'الحالة', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'badge', resizable: true },
  { key: 'organization', label: 'المؤسسة', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'project', label: 'المشروع', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'cost_center', label: 'مركز التكلفة', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'classification', label: 'التصنيف', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'work_item', label: 'عنصر العمل', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'analysis_work_item', label: 'عنصر التحليل', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'category', label: 'الفئة', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'total_debits', label: 'إجمالي المدين', visible: true, width: 150, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
  { key: 'total_credits', label: 'إجمالي الدائن', visible: true, width: 150, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
  { key: 'balance_status', label: 'حالة التوازن', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'badge', resizable: true },
  { key: 'lines_count', label: 'عدد القيود', visible: true, width: 100, minWidth: 80, maxWidth: 150, type: 'number', resizable: true },
  { key: 'created_by', label: 'أنشئ بواسطة', visible: false, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
  { key: 'created_at', label: 'تاريخ الإنشاء', visible: false, width: 180, minWidth: 150, maxWidth: 250, type: 'date', resizable: true },
  { key: 'notes', label: 'ملاحظات', visible: false, width: 300, minWidth: 200, maxWidth: 500, type: 'text', resizable: true },
]

// Line Items Tab Fields
export const DEFAULT_LINE_ITEMS_FIELDS: ColumnConfig[] = [
  { key: 'line_no', label: 'رقم السطر', visible: true, width: 80, minWidth: 60, maxWidth: 120, type: 'number', resizable: true },
  { key: 'account', label: 'الحساب', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
  { key: 'debit', label: 'مدين', visible: true, width: 130, minWidth: 100, maxWidth: 200, type: 'currency', resizable: true },
  { key: 'credit', label: 'دائن', visible: true, width: 130, minWidth: 100, maxWidth: 200, type: 'currency', resizable: true },
  { key: 'description', label: 'البيان', visible: true, width: 250, minWidth: 150, maxWidth: 400, type: 'text', resizable: true },
  { key: 'project', label: 'المشروع', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'cost_center', label: 'مركز التكلفة', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'work_item', label: 'عنصر العمل', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'classification', label: 'التصنيف', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'category', label: 'الفئة', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'analysis_work_item', label: 'عنصر التحليل', visible: false, width: 180, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'line_status', label: 'الحالة', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'badge', resizable: true },
]

// Approvals Tab Fields
export const DEFAULT_APPROVALS_FIELDS: ColumnConfig[] = [
  { key: 'step', label: 'الخطوة', visible: true, width: 100, minWidth: 80, maxWidth: 150, type: 'text', resizable: true },
  { key: 'action', label: 'الإجراء', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'badge', resizable: true },
  { key: 'user', label: 'المستخدم', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
  { key: 'date', label: 'التاريخ', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'date', resizable: true },
  { key: 'reason', label: 'السبب', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
  { key: 'status', label: 'الحالة', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'badge', resizable: true },
]

// Documents Tab Fields
export const DEFAULT_DOCUMENTS_FIELDS: ColumnConfig[] = [
  { key: 'filename', label: 'اسم الملف', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
  { key: 'type', label: 'النوع', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
  { key: 'size', label: 'الحجم', visible: true, width: 100, minWidth: 80, maxWidth: 150, type: 'text', resizable: true },
  { key: 'uploaded_by', label: 'رفع بواسطة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
  { key: 'uploaded_at', label: 'تاريخ الرفع', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'date', resizable: true },
  { key: 'description', label: 'الوصف', visible: false, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
]

// Audit Trail Tab Fields
export const DEFAULT_AUDIT_FIELDS: ColumnConfig[] = [
  { key: 'action', label: 'الإجراء', visible: true, width: 150, minWidth: 120, maxWidth: 250, type: 'text', resizable: true },
  { key: 'user', label: 'المستخدم', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
  { key: 'date', label: 'التاريخ', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'date', resizable: true },
  { key: 'details', label: 'التفاصيل', visible: true, width: 300, minWidth: 200, maxWidth: 500, type: 'text', resizable: true },
  { key: 'ip_address', label: 'عنوان IP', visible: false, width: 150, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
]

// Helper functions to load/save configurations
export const loadFieldConfig = (tabKey: string): ColumnConfig[] | null => {
  try {
    const saved = localStorage.getItem(`transactionDetails:${tabKey}Fields`)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export const saveFieldConfig = (tabKey: string, config: ColumnConfig[]): void => {
  try {
    localStorage.setItem(`transactionDetails:${tabKey}Fields`, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save field configuration:', error)
  }
}

export const getDefaultFieldConfig = (tabKey: string): ColumnConfig[] => {
  switch (tabKey) {
    case 'basicInfo':
      return DEFAULT_BASIC_INFO_FIELDS
    case 'lineItems':
      return DEFAULT_LINE_ITEMS_FIELDS
    case 'approvals':
      return DEFAULT_APPROVALS_FIELDS
    case 'documents':
      return DEFAULT_DOCUMENTS_FIELDS
    case 'audit':
      return DEFAULT_AUDIT_FIELDS
    default:
      return []
  }
}
