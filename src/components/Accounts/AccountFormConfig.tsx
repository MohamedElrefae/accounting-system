import { Hash, FileText, Globe, BarChart3, Folder, Link, Activity } from 'lucide-react';
import type { FormConfig, FormField } from '../Common/UnifiedCRUDForm';

// Minimal types for demo parity
export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

// Simple validators adapted from old app
const isValidAccountCode = (code: string) => {
  if (!code) return false;
  const parts = code.split('-');
  if (parts.length < 1 || parts.length > 4) return false;
  return parts.every(p => /^\d{1,4}$/.test(p));
};

const validateAccountCode = (code: string): ValidationError | null => {
  if (!code || !code.trim()) return { field: 'code', message: 'كود الحساب مطلوب' };
  if (!isValidAccountCode(code)) {
    return { field: 'code', message: 'كود الحساب غير صحيح - يُسمح بصيغ مثل: 1 أو 5-1 أو 1100' };
  }
  const segments = code.split('-');
  if (segments.length > 4) return { field: 'code', message: 'كود الحساب لا يمكن أن يتجاوز 4 أجزاء مفصولة بشرطة' };
  for (const s of segments) {
    if (!/^\d{1,4}$/.test(s)) return { field: 'code', message: 'كل جزء من كود الحساب يجب أن يكون رقماً من 1-4 أرقام' };
  }
  return null;
};

const validateArabicName = (name: string): ValidationError | null => {
  if (!name || !name.trim()) return { field: 'name_ar', message: 'اسم الحساب بالعربية مطلوب' };
  if (name.length < 2) return { field: 'name_ar', message: 'اسم الحساب يجب أن يكون حرفين على الأقل' };
  if (name.length > 100) return { field: 'name_ar', message: 'اسم الحساب لا يمكن أن يتجاوز 100 حرف' };
  if (!(/[\u0600-\u06FF]/.test(name))) return { field: 'name_ar', message: 'اسم الحساب يجب أن يحتوي على أحرف عربية' };
  return null;
};

export type AccountLite = {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string | null;
  level: number;
  account_type: string;
  statement_type: string;
  parent_id?: string | null;
  is_active: boolean;
  allow_transactions?: boolean;
};

const calculateLevelFromCode = (code: string): number => (code ? code.split('-').length : 1);
const getLevelDescription = (level: number) => level === 1 ? 'رئيسي - Main' : level === 2 ? 'فرعي - Sub' : level === 3 ? 'تفصيلي - Detailed' : 'نهائي - Final';

const generateSubAccountCode = (accounts: AccountLite[], parentId: string | null): string => {
  if (!parentId) return '1';
  const parent = accounts.find(a => a.id === parentId);
  if (!parent) return '1';
  const siblings = accounts.filter(a => a.parent_id === parentId);

  if (siblings.length === 0) {
    // Default to numeric style when no siblings exist (e.g., parent 5 -> 51)
    return `${parent.code}1`;
  }

  const dashSibs = siblings.filter(s => s.code.includes('-') && s.code.startsWith(parent.code + '-'));
  const numericSibs = siblings.filter(s => !s.code.includes('-') && s.code.startsWith(parent.code));

  if (numericSibs.length > dashSibs.length) {
    // Numeric style, e.g., 51, 52 or 5100, 5200
    const rawSuffixes = numericSibs
      .map(s => s.code.substring(parent.code.length))
      .filter(s => /^\d+$/.test(s));

    const maxLen = rawSuffixes.length ? Math.max(...rawSuffixes.map(s => s.length || 1)) : 1;
    const trailingZeroPow10 = (s: string) => {
      const m = s.match(/0+$/);
      return m ? m[0].length : 0;
    };
    const stepPow = rawSuffixes.length ? Math.max(...rawSuffixes.map(trailingZeroPow10)) : 0;
    const step = Math.pow(10, stepPow);
    const maxSuffix = rawSuffixes.length ? Math.max(...rawSuffixes.map(s => parseInt(s || '0', 10))) : 0;
    const next = maxSuffix + (step || 1);
    const nextStr = String(next).padStart(maxLen, '0');
    return `${parent.code}${nextStr}`;
  }

  // Dash style, e.g., 5-1, 5-2
  const nums = dashSibs.map(s => parseInt((s.code.split('-').pop() || '0'), 10));
  const maxChild = nums.length ? Math.max(...nums) : 0;
  return `${parent.code}-${maxChild + 1}`;
};

const createAccountAutoFillLogic = (parentAccounts: AccountLite[]) => (formData: any) => {
  const auto: Partial<AccountLite & { level_display?: string; name_en?: string; name_ar?: string; code?: string; allow_transactions?: boolean }> = {};

  // Parent-driven level (authoritative)
  if (formData.parent_id && formData.parent_id !== '') {
    const parent = parentAccounts.find(a => a.id === formData.parent_id);
    if (parent) {
      auto.level = parent.level + 1;
      if (formData.allow_transactions === undefined) {
        auto.allow_transactions = (auto.level || 1) >= 3;
      }
      auto.level_display = `المستوى ${auto.level} - ${getLevelDescription(auto.level || 1)}`;

      if (!formData.code || formData.code === '') {
        const suggested = generateSubAccountCode(parentAccounts, formData.parent_id);
        auto.code = suggested;
      }

      auto.account_type = parent.account_type;
      auto.statement_type = parent.statement_type;
      if (!formData.name_ar || formData.name_ar === '') auto.name_ar = `حساب فرعي جديد لـ ${parent.name_ar}`;
      if (!formData.name_en || formData.name_en === '') auto.name_en = `New Sub-account for ${parent.name_en || parent.name_ar}`;
    }
  } else if (formData.code) {
    // Root-level only: if no parent selected, derive a display-only level from code formatting (optional)
    const lvl = calculateLevelFromCode(formData.code);
    auto.level = Math.min(lvl, 4);
    if (formData.allow_transactions === undefined) {
      auto.allow_transactions = (auto.level || 1) >= 3;
    }
    auto.level_display = `المستوى ${auto.level} - ${getLevelDescription(auto.level || 1)}`;
  }

  if (formData.is_active === undefined) auto.is_active = true;
  return auto;
};

export const createAccountFormConfig = (
  isEditing: boolean,
  parentAccounts: AccountLite[],
  existingAccount?: AccountLite | null,
  hideStatementType: boolean = false,
  showStandardToggle: boolean = false
): FormConfig => {

  const fields: FormField[] = [
    { id: 'code', type: 'text', label: 'كود الحساب', placeholder: 'مثال: 1-1 أو 1100', required: true, icon: <Hash size={16} />, validation: validateAccountCode, helpText: 'كود فريد للحساب. في حال اختيار حساب أب، المستوى يُحدد من الأب تلقائياً. يسمح بالتقسيم 5-1 أو أكواد رقمية مثل 1100', autoComplete: 'off' },
    { id: 'name_ar', type: 'text', label: 'اسم الحساب بالعربية', placeholder: 'اسم الحساب باللغة العربية', required: true, icon: <FileText size={16} />, validation: validateArabicName, helpText: 'اسم الحساب الرئيسي باللغة العربية' },
    { id: 'name_en', type: 'text', label: 'اسم الحساب بالإنجليزية', placeholder: 'Account name in English (optional)', icon: <Globe size={16} />, helpText: 'اسم الحساب بالإنجليزية (اختياري)' },
    // Show the editable selector ONLY when there is no parent selected
    { id: 'account_type', type: 'select', label: 'نوع الحساب', required: true, icon: <BarChart3 size={16} />, options: [
      { value: 'assets', label: 'أصول - Assets' },
      { value: 'liabilities', label: 'خصوم - Liabilities' },
      { value: 'equity', label: 'حقوق الملكية - Equity' },
      { value: 'revenue', label: 'إيرادات - Revenue' },
      { value: 'expenses', label: 'مصروفات - Expenses' }
    ], helpText: 'تصنيف الحساب الأساسي — يتم تحديده تلقائياً من الحساب الأب عند اختياره', conditionalLogic: (formData) => {
      // If a parent is selected, force account_type to parent's type and hide the selector
      if (formData.parent_id) {
        const parent = parentAccounts.find(a => a.id === formData.parent_id);
        if (parent && formData.account_type !== parent.account_type) {
          formData.account_type = parent.account_type;
        }
        return false; // hide selector when inherited
      }
      return true;
    } },
    // Read-only display of inherited account type when a parent is selected
    { id: 'account_type_display', type: 'text', label: 'نوع الحساب (موروث)', disabled: true, icon: <BarChart3 size={16} />, helpText: 'هذا الحقل موروث من الحساب الأب ولا يمكن تغييره', conditionalLogic: (formData) => {
      if (!formData.parent_id) return false;
      const opts = [
        { value: 'assets', label: 'أصول - Assets' },
        { value: 'liabilities', label: 'خصوم - Liabilities' },
        { value: 'equity', label: 'حقوق الملكية - Equity' },
        { value: 'revenue', label: 'إيرادات - Revenue' },
        { value: 'expenses', label: 'مصروفات - Expenses' }
      ];
      // ensure main value is synced and show a human-friendly label in display field
      const parent = parentAccounts.find(a => a.id === formData.parent_id);
      if (parent) {
        if (formData.account_type !== parent.account_type) formData.account_type = parent.account_type;
        const label = opts.find(o => o.value === (formData.account_type || ''))?.label || formData.account_type || '';
        if (formData.account_type_display !== label) formData.account_type_display = label;
      }
      return true;
    } },
    { id: 'statement_type', type: 'select', label: 'نوع القائمة المالية', required: true, icon: <Folder size={16} />, options: [
      { value: 'balance_sheet', label: 'ميزانية عمومية - Balance Sheet' },
      { value: 'income_statement', label: 'قائمة الدخل - Income Statement' },
      { value: 'cash_flow', label: 'قائمة التدفق النقدي - Cash Flow' },
      { value: 'equity_statement', label: 'قائمة حقوق الملكية - Equity Statement' }
    ], helpText: 'القائمة المالية التي سيظهر فيها هذا الحساب', conditionalLogic: () => !hideStatementType },
    { id: 'parent_id', type: 'select', label: 'الحساب الأب', icon: <Link size={16} />, options: [
      { value: '', label: '-- لا يوجد حساب أب (حساب رئيسي) --' },
      ...parentAccounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name_ar}` }))
    ], helpText: 'اختر الحساب الأب إذا كان هذا حساباً فرعياً' },
    { id: 'level_display', type: 'text', label: 'مستوى الحساب', disabled: true, icon: <Activity size={16} />, helpText: 'يتم تحديد المستوى تلقائياً من هيكل الشجرة (الأب ← الابن).', conditionalLogic: (formData) => {
      let lvl = 1;
      if (formData.parent_id) {
        const parent = parentAccounts.find(a => a.id === formData.parent_id);
        if (parent) lvl = parent.level + 1;
      }
      if (!formData.parent_id && formData.code) {
        // Fallback for root-only items when no parent selected
        const byCode = calculateLevelFromCode(formData.code || '');
        if (byCode > 0) lvl = Math.min(byCode, 4);
      }
      formData.level = lvl;
      const expected = `المستوى ${lvl} - ${getLevelDescription(lvl)}`;
      if (formData.level_display !== expected) formData.level_display = expected;
      return true;
    } },
    { id: 'is_active', type: 'checkbox', label: 'حساب نشط' },
    { id: 'allow_transactions', type: 'checkbox', label: 'يسمح بالمعاملات', helpText: 'عادة ما تسمح الحسابات من المستوى 3 وما فوق بالمعاملات' }
  ];

  // Admin-only: show is_standard toggle when allowed by caller
  if (showStandardToggle) {
    fields.push({ id: 'is_standard', type: 'checkbox', label: 'حساب قياسي (غير قابل للحذف)', helpText: 'تمييز هذا الحساب كحساب قياسي سيمنع حذفه' });
  }

  return {
    title: isEditing ? '✏️ تعديل الحساب' : '➕ إضافة حساب جديد',
    subtitle: isEditing ? `تعديل بيانات الحساب: ${existingAccount?.name_ar || ''}` : 'إنشاء حساب محاسبي جديد في النظام',
    formId: 'accounts-form',
    fields,
    submitLabel: isEditing ? '💾 حفظ التعديلات' : '✨ إنشاء الحساب',
    cancelLabel: '❌ إلغاء',
    customValidator: (data: any): ValidationResult => {
      const errors: ValidationError[] = [];
      // Normalize level from selected parent first
      if (data.parent_id) {
        const parent = parentAccounts.find(a => a.id === data.parent_id);
        if (parent) data.level = parent.level + 1; else data.level = 1;
      } else {
        data.level = 1;
      }
      // Allow both hyphenated (5-1) and compact (1100) codes
      if (data.code && !isValidAccountCode(data.code)) errors.push({ field: 'code', message: 'كود الحساب غير صحيح' });
      if (!data.name_ar) errors.push({ field: 'name_ar', message: 'اسم الحساب بالعربية مطلوب' });
      // Do not override allow_transactions here; respect user choice and DB value
      return { isValid: errors.length === 0, errors };
    },
    autoFillLogic: createAccountAutoFillLogic(parentAccounts),
    layout: {
      columns: 2,
      responsive: true,
      columnBreakpoints: [
        { field: 'code' },
        { field: 'name_ar' },
        { field: 'name_en' },
        { field: 'account_type' },
        { field: 'statement_type' },
        { field: 'parent_id' },
        { field: 'level_display', fullWidth: true },
        { field: 'is_active' },
        { field: 'allow_transactions' }
      ]
    }
  };
};

export default createAccountFormConfig;
