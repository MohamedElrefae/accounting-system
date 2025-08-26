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
    return { field: 'code', message: 'كود الحساب غير صحيح - يجب أن يكون بصيغة: 1 أو 1-1 أو 1-1-1 أو 1-1-1-1' };
  }
  const segments = code.split('-');
  if (segments.length > 4) return { field: 'code', message: 'كود الحساب لا يمكن أن يتجاوز 4 مستويات' };
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
  const maxChild = Math.max(...siblings.map(s => parseInt((s.code.split('-').pop() || '0'), 10)), 0);
  return `${parent.code}-${maxChild + 1}`;
};

const createAccountAutoFillLogic = (parentAccounts: AccountLite[]) => (formData: any) => {
  const auto: Partial<AccountLite & { level_display?: string; name_en?: string; name_ar?: string; code?: string; allow_transactions?: boolean }> = {};
  if (formData.code) {
    const lvl = calculateLevelFromCode(formData.code);
    auto.level = lvl;
    auto.allow_transactions = lvl >= 3;
    auto.level_display = `المستوى ${lvl} - ${getLevelDescription(lvl)}`;
  }
  if (formData.parent_id && formData.parent_id !== '') {
    const parent = parentAccounts.find(a => a.id === formData.parent_id);
    if (parent) {
      if (!formData.code || formData.code === '') {
        const suggested = generateSubAccountCode(parentAccounts, formData.parent_id);
        auto.code = suggested;
        auto.level = calculateLevelFromCode(suggested);
        auto.allow_transactions = (auto.level || 0) >= 3;
        auto.level_display = `المستوى ${auto.level} - ${getLevelDescription(auto.level || 1)}`;
      }
      auto.account_type = parent.account_type;
      auto.statement_type = parent.statement_type;
      if (!formData.name_ar || formData.name_ar === '') auto.name_ar = `حساب فرعي جديد لـ ${parent.name_ar}`;
      if (!formData.name_en || formData.name_en === '') auto.name_en = `New Sub-account for ${parent.name_en || parent.name_ar}`;
    }
  }
  if (formData.is_active === undefined) auto.is_active = true;
  return auto;
};

export const createAccountFormConfig = (
  isEditing: boolean,
  parentAccounts: AccountLite[],
  existingAccount?: AccountLite | null,
  hideStatementType: boolean = false
): FormConfig => {

  const fields: FormField[] = [
    { id: 'code', type: 'text', label: 'كود الحساب', placeholder: 'مثال: 1-1-1 أو 101', required: true, icon: <Hash size={16} />, validation: validateAccountCode, helpText: 'كود فريد للحساب (1 للمستوى الأول، 1-1 للثاني، وهكذا)', autoComplete: 'off' },
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
    { id: 'level_display', type: 'text', label: 'مستوى الحساب', disabled: true, icon: <Activity size={16} />, helpText: 'يتم حساب المستوى تلقائياً بناءً على كود الحساب', conditionalLogic: (formData) => {
      const lvl = formData.level || calculateLevelFromCode(formData.code || '');
      const expected = `المستوى ${lvl} - ${getLevelDescription(lvl)}`;
      if (formData.level_display !== expected) formData.level_display = expected;
      return true;
    } },
    { id: 'is_active', type: 'checkbox', label: 'حساب نشط' },
    { id: 'allow_transactions', type: 'checkbox', label: 'يسمح بالمعاملات', helpText: 'عادة ما تسمح الحسابات من المستوى 3 وما فوق بالمعاملات' }
  ];

  return {
    title: isEditing ? '✏️ تعديل الحساب' : '➕ إضافة حساب جديد',
    subtitle: isEditing ? `تعديل بيانات الحساب: ${existingAccount?.name_ar || ''}` : 'إنشاء حساب محاسبي جديد في النظام',
    formId: 'accounts-form',
    fields,
    submitLabel: isEditing ? '💾 حفظ التعديلات' : '✨ إنشاء الحساب',
    cancelLabel: '❌ إلغاء',
    customValidator: (data: any): ValidationResult => {
      const errors: ValidationError[] = [];
      // Normalize level from code
      if (data.code) {
        const lvl = calculateLevelFromCode(data.code);
        if (lvl > 4) errors.push({ field: 'code', message: 'كود الحساب لا يمكن أن يتجاوز المستوى 4' });
        // keep in sync
        data.level = lvl;
      }
      // Parent consistency
      if (data.parent_id) {
        const parent = parentAccounts.find(a => a.id === data.parent_id);
        if (parent) {
          if (data.account_type && parent.account_type && data.account_type.toLowerCase() !== parent.account_type.toLowerCase()) {
            errors.push({ field: 'account_type', message: 'نوع الحساب يجب أن يتطابق مع نوع الحساب الأب' });
          }
          // Enforce child level = parent level + 1
          const lvl = calculateLevelFromCode(data.code || '');
          if (lvl && (lvl !== parent.level + 1)) {
            errors.push({ field: 'code', message: 'المستوى يجب أن يكون أعلى بمستوى واحد من الحساب الأب' });
          }
        }
      }
      if (data.code && !isValidAccountCode(data.code)) errors.push({ field: 'code', message: 'كود الحساب غير صحيح' });
      if (!data.name_ar) errors.push({ field: 'name_ar', message: 'اسم الحساب بالعربية مطلوب' });
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
