import { format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

export interface LanguageTexts {
  // Navigation and Headers
  fiscalManagement: {
    en: string
    ar: string
  }
  openingBalanceImport: {
    en: string
    ar: string
  }
  fiscalYearDashboard: {
    en: string
    ar: string
  }
  fiscalPeriodManager: {
    en: string
    ar: string
  }
  fiscalYearManagement: {
    en: string
    ar: string
  }
  
  // Construction Accounting Terms
  constructionTerms: {
    fiscalYear: { en: string; ar: string }
    fiscalPeriod: { en: string; ar: string }
    openingBalance: { en: string; ar: string }
    closingBalance: { en: string; ar: string }
    workInProgress: { en: string; ar: string }
    projectCost: { en: string; ar: string }
    costCenter: { en: string; ar: string }
    construction: { en: string; ar: string }
    subcontractor: { en: string; ar: string }
    materialCost: { en: string; ar: string }
    laborCost: { en: string; ar: string }
    equipmentCost: { en: string; ar: string }
    projectPhase: { en: string; ar: string }
    milestone: { en: string; ar: string }
    retention: { en: string; ar: string }
    progressBilling: { en: string; ar: string }
    totalRevenue: { en: string; ar: string }
    totalExpenses: { en: string; ar: string }
    netProfit: { en: string; ar: string }
  }
  
  // Common UI Terms
  common: {
    save: { en: string; ar: string }
    cancel: { en: string; ar: string }
    delete: { en: string; ar: string }
    edit: { en: string; ar: string }
    view: { en: string; ar: string }
    search: { en: string; ar: string }
    filter: { en: string; ar: string }
    export: { en: string; ar: string }
    import: { en: string; ar: string }
    validate: { en: string; ar: string }
    approve: { en: string; ar: string }
    reject: { en: string; ar: string }
    submit: { en: string; ar: string }
    close: { en: string; ar: string }
    open: { en: string; ar: string }
    locked: { en: string; ar: string }
    completed: { en: string; ar: string }
    pending: { en: string; ar: string }
    failed: { en: string; ar: string }
    success: { en: string; ar: string }
    loading: { en: string; ar: string }
    error: { en: string; ar: string }
    warning: { en: string; ar: string }
  }
  
  // Import Process Terms
  importProcess: {
    uploadFile: { en: string; ar: string }
    validateData: { en: string; ar: string }
    processImport: { en: string; ar: string }
    importComplete: { en: string; ar: string }
    importFailed: { en: string; ar: string }
    downloadTemplate: { en: string; ar: string }
    fileFormat: { en: string; ar: string }
    totalRows: { en: string; ar: string }
    successRows: { en: string; ar: string }
    failedRows: { en: string; ar: string }
    balanceEquation: { en: string; ar: string }
    validationResults: { en: string; ar: string }
  }
  
  // Period Closing Terms
  periodClosing: {
    closingChecklist: { en: string; ar: string }
    bankReconciliation: { en: string; ar: string }
    projectCostReview: { en: string; ar: string }
    vatCompliance: { en: string; ar: string }
    closePeriod: { en: string; ar: string }
    lockPeriod: { en: string; ar: string }
    unlockPeriod: { en: string; ar: string }
    closingNotes: { en: string; ar: string }
    approvalRequired: { en: string; ar: string }
  }
}

export const ARABIC_TEXTS: LanguageTexts = {
  fiscalManagement: {
    en: 'Fiscal Management',
    ar: 'إدارة السنة المالية'
  },
  openingBalanceImport: {
    en: 'Opening Balance Import',
    ar: 'استيراد الأرصدة الافتتاحية'
  },
  fiscalYearDashboard: {
    en: 'Fiscal Year Dashboard',
    ar: 'لوحة تحكم السنة المالية'
  },
  fiscalPeriodManager: {
    en: 'Fiscal Period Manager',
    ar: 'مدير الفترات المالية'
  },
  fiscalYearManagement: {
    en: 'Fiscal Year Management',
    ar: 'إدارة السنوات المالية'
  },
  
  constructionTerms: {
    fiscalYear: { en: 'Fiscal Year', ar: 'السنة المالية' },
    fiscalPeriod: { en: 'Fiscal Period', ar: 'الفترة المالية' },
    openingBalance: { en: 'Opening Balance', ar: 'الرصيد الافتتاحي' },
    closingBalance: { en: 'Closing Balance', ar: 'الرصيد الختامي' },
    workInProgress: { en: 'Work in Progress', ar: 'أعمال تحت التنفيذ' },
    projectCost: { en: 'Project Cost', ar: 'تكلفة المشروع' },
    costCenter: { en: 'Cost Center', ar: 'مركز التكلفة' },
    construction: { en: 'Construction', ar: 'الإنشاءات' },
    subcontractor: { en: 'Subcontractor', ar: 'المقاول الفرعي' },
    materialCost: { en: 'Material Cost', ar: 'تكلفة المواد' },
    laborCost: { en: 'Labor Cost', ar: 'تكلفة العمالة' },
    equipmentCost: { en: 'Equipment Cost', ar: 'تكلفة المعدات' },
    projectPhase: { en: 'Project Phase', ar: 'مرحلة المشروع' },
    milestone: { en: 'Milestone', ar: 'معلم رئيسي' },
    retention: { en: 'Retention', ar: 'الاستبقاء' },
    progressBilling: { en: 'Progress Billing', ar: 'فوترة التقدم' },
    totalRevenue: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
    totalExpenses: { en: 'Total Expenses', ar: 'إجمالي المصروفات' },
    netProfit: { en: 'Net Profit', ar: 'صافي الربح' }
  },
  
  common: {
    save: { en: 'Save', ar: 'حفظ' },
    cancel: { en: 'Cancel', ar: 'إلغاء' },
    delete: { en: 'Delete', ar: 'حذف' },
    edit: { en: 'Edit', ar: 'تعديل' },
    view: { en: 'View', ar: 'عرض' },
    search: { en: 'Search', ar: 'البحث' },
    filter: { en: 'Filter', ar: 'تصفية' },
    export: { en: 'Export', ar: 'تصدير' },
    import: { en: 'Import', ar: 'استيراد' },
    validate: { en: 'Validate', ar: 'التحقق' },
    approve: { en: 'Approve', ar: 'الموافقة' },
    reject: { en: 'Reject', ar: 'رفض' },
    submit: { en: 'Submit', ar: 'إرسال' },
    close: { en: 'Close', ar: 'إغلاق' },
    open: { en: 'Open', ar: 'مفتوح' },
    locked: { en: 'Locked', ar: 'مقفل' },
    completed: { en: 'Completed', ar: 'مكتمل' },
    pending: { en: 'Pending', ar: 'معلق' },
    failed: { en: 'Failed', ar: 'فشل' },
    success: { en: 'Success', ar: 'نجح' },
    loading: { en: 'Loading...', ar: 'جاري التحميل...' },
    error: { en: 'Error', ar: 'خطأ' },
    warning: { en: 'Warning', ar: 'تحذير' }
  },
  
  importProcess: {
    uploadFile: { en: 'Upload File', ar: 'رفع الملف' },
    validateData: { en: 'Validate Data', ar: 'التحقق من البيانات' },
    processImport: { en: 'Process Import', ar: 'معالجة الاستيراد' },
    importComplete: { en: 'Import Complete', ar: 'اكتمل الاستيراد' },
    importFailed: { en: 'Import Failed', ar: 'فشل الاستيراد' },
    downloadTemplate: { en: 'Download Template', ar: 'تحميل النموذج' },
    fileFormat: { en: 'File Format', ar: 'تنسيق الملف' },
    totalRows: { en: 'Total Rows', ar: 'إجمالي الصفوف' },
    successRows: { en: 'Success Rows', ar: 'الصفوف الناجحة' },
    failedRows: { en: 'Failed Rows', ar: 'الصفوف الفاشلة' },
    balanceEquation: { en: 'Balance Equation', ar: 'معادلة التوازن' },
    validationResults: { en: 'Validation Results', ar: 'نتائج التحقق' }
  },
  
  periodClosing: {
    closingChecklist: { en: 'Closing Checklist', ar: 'قائمة الإغلاق' },
    bankReconciliation: { en: 'Bank Reconciliation', ar: 'تسوية البنك' },
    projectCostReview: { en: 'Project Cost Review', ar: 'مراجعة تكاليف المشروع' },
    vatCompliance: { en: 'VAT Compliance', ar: 'امتثال ضريبة القيمة المضافة' },
    closePeriod: { en: 'Close Period', ar: 'إغلاق الفترة' },
    lockPeriod: { en: 'Lock Period', ar: 'قفل الفترة' },
    unlockPeriod: { en: 'Unlock Period', ar: 'إلغاء قفل الفترة' },
    closingNotes: { en: 'Closing Notes', ar: 'ملاحظات الإغلاق' },
    approvalRequired: { en: 'Approval Required', ar: 'يتطلب الموافقة' }
  }
}

export class ArabicLanguageService {
  private static currentLanguage: 'en' | 'ar' = 'en'
  
  static setLanguage(language: 'en' | 'ar'): void {
    this.currentLanguage = language
    // Update document direction (only in browser environment)
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
  }
  
  static getCurrentLanguage(): 'en' | 'ar' {
    return this.currentLanguage
  }
  
  static isRTL(): boolean {
    return this.currentLanguage === 'ar'
  }
  
  static getText(textObj: { en: string; ar: string } | undefined): string {
    if (!textObj) {
      console.warn('getText called with undefined textObj')
      return '[Missing Translation]'
    }
    return textObj[this.currentLanguage] || textObj.en || '[Translation Error]'
  }
  
  static formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const locale = this.currentLanguage === 'ar' ? 'ar-SA' : 'en-US'
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(value)
  }
  
  static formatCurrency(value: number, currency: string = 'SAR'): string {
    const locale = this.currentLanguage === 'ar' ? 'ar-SA' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  static formatDate(date: string | Date, formatStr?: string): string {
    // Handle null, undefined, or empty string dates
    if (!date || (typeof date === 'string' && date.trim() === '')) {
      return '--/--/----'
    }
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    // Check if the parsed date is valid
    if (isNaN(dateObj.getTime())) {
      return '--/--/----'
    }
    
    const locale = this.currentLanguage === 'ar' ? ar : undefined
    
    try {
      if (formatStr) {
        return format(dateObj, formatStr, { locale })
      }
      
      // Default format based on language
      const defaultFormat = this.currentLanguage === 'ar' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'
      return format(dateObj, defaultFormat, { locale })
    } catch (error) {
      // If format still fails, return a fallback
      return '--/--/----'
    }
  }
  
  static formatDateTime(date: string | Date): string {
    // Handle null, undefined, or empty string dates
    if (!date || (typeof date === 'string' && date.trim() === '')) {
      return '--/--/---- - --:--'
    }
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    // Check if the parsed date is valid
    if (isNaN(dateObj.getTime())) {
      return '--/--/---- - --:--'
    }
    
    const locale = this.currentLanguage === 'ar' ? ar : undefined
    
    try {
      const formatStr = this.currentLanguage === 'ar' 
        ? 'dd/MM/yyyy - HH:mm' 
        : 'MM/dd/yyyy - HH:mm'
      
      return format(dateObj, formatStr, { locale })
    } catch (error) {
      return '--/--/---- - --:--'
    }
  }
  
  static getMonthName(month: number): string {
    const monthNames = {
      en: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ],
      ar: [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ]
    }
    
    return monthNames[this.currentLanguage][month - 1] || monthNames.en[month - 1]
  }
  
  static getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'open': '#4caf50',
      'مفتوح': '#4caf50',
      'locked': '#ff9800', 
      'مقفل': '#ff9800',
      'closed': '#f44336',
      'مغلق': '#f44336',
      'completed': '#2196f3',
      'مكتمل': '#2196f3',
      'pending': '#ff9800',
      'معلق': '#ff9800',
      'failed': '#f44336',
      'فشل': '#f44336',
      'success': '#4caf50',
      'نجح': '#4caf50'
    }
    
    return statusColors[status.toLowerCase()] || '#757575'
  }
  
  static getDirectionalStyle(isRTL?: boolean): React.CSSProperties {
    const rtl = isRTL ?? this.isRTL()
    return {
      direction: rtl ? 'rtl' : 'ltr',
      textAlign: rtl ? 'right' : 'left'
    }
  }
  
  static getFlexDirection(isReverse?: boolean): 'row' | 'row-reverse' {
    const shouldReverse = isReverse ?? this.isRTL()
    return shouldReverse ? 'row-reverse' : 'row'
  }
  
  static getMarginDirection(margin: number): React.CSSProperties {
    const isRTL = this.isRTL()
    return isRTL 
      ? { marginRight: margin }
      : { marginLeft: margin }
  }
  
  static getPaddingDirection(padding: number): React.CSSProperties {
    const isRTL = this.isRTL()
    return isRTL
      ? { paddingRight: padding }
      : { paddingLeft: padding }
  }
}

// Hook for using Arabic language service in React components
export const useArabicLanguage = () => {
  const language = ArabicLanguageService.getCurrentLanguage()
  const isRTL = ArabicLanguageService.isRTL()
  
  const t = (textObj: { en: string; ar: string } | undefined) => 
    ArabicLanguageService.getText(textObj)
  
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    ArabicLanguageService.formatNumber(value, options)
    
  const formatCurrency = (value: number, currency?: string) =>
    ArabicLanguageService.formatCurrency(value, currency)
    
  const formatDate = (date: string | Date, formatStr?: string) =>
    ArabicLanguageService.formatDate(date, formatStr)
    
  const formatDateTime = (date: string | Date) =>
    ArabicLanguageService.formatDateTime(date)
  
  const getStatusColor = (status: string) =>
    ArabicLanguageService.getStatusColor(status)
    
  const getDirectionalStyle = (isRTL?: boolean) =>
    ArabicLanguageService.getDirectionalStyle(isRTL)
    
  const getFlexDirection = (isReverse?: boolean) =>
    ArabicLanguageService.getFlexDirection(isReverse)
  
  return {
    language,
    isRTL,
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    formatDateTime,
    getStatusColor,
    getDirectionalStyle,
    getFlexDirection,
    texts: ARABIC_TEXTS
  }
}