import { Hash, FileText, Calendar, DollarSign, Receipt, MessageSquare, Building2, FolderOpen, Tag, Layers } from 'lucide-react';
import type { FormConfig, FormField } from '../Common/UnifiedCRUDForm';
import type { Account, TransactionRecord, Project } from '../../services/transactions';
import type { Organization } from '../../types';
import type { TransactionClassification } from '../../services/transaction-classification';
import type { ExpensesCategoryRow } from '../../types/expenses-categories';
import type { WorkItemRow } from '../../types/work-items';
import { toWorkItemOptions } from '../../services/work-items';
import { listAnalysisWorkItems } from '../../services/analysis-work-items';
import type { SearchableSelectOption } from '../Common/SearchableSelect';
import { transactionValidator, type ValidationWarning } from '../../services/transaction-validation';

import { getCurrentDate, DATE_FORMATS } from '../../utils/dateHelpers';

// Validation types
export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

// Validators  
const validateEntryNumber = (entryNumber: string): ValidationError | null => {
  if (!entryNumber || !entryNumber.trim()) {
    return { field: 'entry_number', message: 'رقم القيد مطلوب' };
  }
  // Format validation: JE-YYYYMM-####
  const pattern = /^JE-\d{6}-\d{4}$/;
  if (!pattern.test(entryNumber)) {
    return { field: 'entry_number', message: 'رقم القيد يجب أن يكون بصيغة: JE-YYYYMM-####' };
  }
  return null;
};

const validateDescription = (description: string): ValidationError | null => {
  if (!description || !description.trim()) {
    return { field: 'description', message: 'وصف المعاملة مطلوب' };
  }
  if (description.length < 3) {
    return { field: 'description', message: 'وصف المعاملة يجب أن يكون 3 أحرف على الأقل' };
  }
  if (description.length > 500) {
    return { field: 'description', message: 'وصف المعاملة لا يمكن أن يتجاوز 500 حرف' };
  }
  return null;
};

const validateAmount = (amount: number): ValidationError | null => {
  if (!amount || amount <= 0) {
    return { field: 'amount', message: 'المبلغ يجب أن يكون أكبر من صفر' };
  }
  if (amount > 999999999.99) {
    return { field: 'amount', message: 'المبلغ أكبر من الحد المسموح' };
  }
  // Check for more than 2 decimal places
  if (Number(amount.toFixed(2)) !== amount) {
    return { field: 'amount', message: 'المبلغ لا يمكن أن يحتوي على أكثر من رقمين عشريين' };
  }
  return null;
};

const validateAccountSelection = (accountId: string, fieldName: string, label: string): ValidationError | null => {
  if (!accountId || accountId.trim() === '') {
    return { field: fieldName, message: `${label} مطلوب` };
  }
  return null;
};

const validateDate = (date: string): ValidationError | null => {
  if (!date) {
    return { field: 'entry_date', message: 'تاريخ القيد مطلوب' };
  }
  const selectedDate = new Date(date);
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  
  if (selectedDate < oneYearAgo) {
    return { field: 'entry_date', message: 'تاريخ القيد لا يمكن أن يكون أكثر من سنة في الماضي' };
  }
  if (selectedDate > oneYearFromNow) {
    return { field: 'entry_date', message: 'تاريخ القيد لا يمكن أن يكون أكثر من سنة في المستقبل' };
  }
  return null;
};

// Auto-fill logic
const createTransactionAutoFillLogic = (accounts: Account[]) => (formData: Record<string, unknown>) => {
  type TransactionFormData = {
    description?: string;
    reference_number?: string;
    debit_account_id?: string;
    credit_account_id?: string;
    notes?: string;
  };
  const fd = formData as TransactionFormData;
  const auto: Record<string, unknown> = {};
  
  // Auto-fill reference number based on description if empty
  if (fd.description && !fd.reference_number) {
    const desc = fd.description.trim();
    if (desc.includes('فاتورة') || desc.includes('invoice')) {
      auto.reference_number = `INV-${Date.now()}`;
    } else if (desc.includes('دفع') || desc.includes('payment')) {
      auto.reference_number = `PAY-${Date.now()}`;
    } else if (desc.includes('استلام') || desc.includes('receipt')) {
      auto.reference_number = `REC-${Date.now()}`;
    }
  }
  
  // Auto-suggest notes based on selected accounts
  if (fd.debit_account_id && fd.credit_account_id && !fd.notes) {
    const debitAccount = accounts.find(a => a.id === fd.debit_account_id);
    const creditAccount = accounts.find(a => a.id === fd.credit_account_id);
    
    if (debitAccount && creditAccount) {
      auto.notes = `تحويل من ${creditAccount.name} إلى ${debitAccount.name}`;
    }
  }
  
  return auto;
};

// Create form configuration
export const createTransactionFormConfig = (
  isEditing: boolean,
  accounts: Account[],
  projects: Project[] = [],
  organizations: Organization[] = [],
  classifications: TransactionClassification[] = [],
  existingTransaction?: TransactionRecord | null,
  expensesCategories: ExpensesCategoryRow[] = [],
  workItems: WorkItemRow[] = [],
  costCenters: Array<{ id: string; code: string; name: string; name_ar?: string | null; project_id?: string | null; level: number }> = []
): FormConfig => {
  
  // Build hierarchical (level-based) options with real tree nodes and level headers
  const byParent: Record<string, Account[]> = {};
  const allById: Record<string, Account> = {};
  const roots: Account[] = [];
  for (const a of accounts) allById[a.id] = a;
  for (const a of accounts) {
    if (a.parent_id && allById[a.parent_id]) {
      if (!byParent[a.parent_id]) byParent[a.parent_id] = [];
      byParent[a.parent_id].push(a);
    } else {
      roots.push(a);
    }
  }
  const sortByCode = (list: Account[]) => list.sort((x, y) => x.code.localeCompare(y.code));
  sortByCode(roots);
  for (const key of Object.keys(byParent)) sortByCode(byParent[key]);

  const levelLabel = (lvl?: number) => {
    switch (lvl) {
      case 1: return '— المستوى 1 —';
      case 2: return '— المستوى 2 —';
      case 3: return '— المستوى 3 —';
      case 4: return '— المستوى 4 —';
      default: return '— مستويات أخرى —';
    }
  };

  const makeNode = (acc: Account): SearchableSelectOption => {
    const children = (byParent[acc.id] || []).map(makeNode);
    return {
      value: acc.id,
      label: acc.is_postable
        ? `${acc.code} - ${acc.name} • قابل للترحيل`
        : `${acc.code} - ${acc.name} (غير قابل للترحيل)`,
      searchText: `${acc.code} ${acc.name}`.toLowerCase(),
      disabled: !acc.is_postable,
      title: acc.is_postable ? 'هذا الحساب قابل للترحيل' : 'هذا الحساب غير قابل للترحيل — اختر حساباً تفصيلياً',
      children: children.length ? children : undefined
    };
  };

  const byLevel: Record<number, Account[]> = {};
  for (const a of roots) {
    const lvl = a.level || 1;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(a);
  }
  // Hierarchical options for drilldown modal (grouped by level with tree children)
  const allAccountOptions: SearchableSelectOption[] = [];
  for (const lvl of [1, 2, 3, 4]) {
    const list = byLevel[lvl] || [];
    if (list.length === 0) continue;
    allAccountOptions.push({
      value: `__level_${lvl}`,
      label: levelLabel(lvl),
      searchText: levelLabel(lvl),
      disabled: true as const,
      title: undefined as string | undefined,
      children: list.map(makeNode)
    });
  }

  // Flat options for dropdown (postable only, no collapse/expand headers)
  const flatPostableOptions: SearchableSelectOption[] = accounts
    .filter(a => a.is_postable)
    .sort((x, y) => x.code.localeCompare(y.code))
    .map(a => ({
      value: a.id,
      label: `${a.code} - ${a.name}`,
      searchText: `${a.code} ${a.name}`.toLowerCase(),
      disabled: false,
    }));

  // Convert projects to select options
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: `${project.code} - ${project.name}`,
    searchText: `${project.code} ${project.name} ${project.description || ''}`.toLowerCase()
  }));

  // Convert organizations to select options
  const organizationOptions = organizations.map(org => ({
    value: org.id,
    label: `${org.code} - ${org.name}`,
    searchText: `${org.code} ${org.name} ${org.description || ''}`.toLowerCase()
  }));

  // Convert classifications to select options
  const classificationOptions = classifications.map(classification => ({
    value: classification.id,
    label: `${classification.code} - ${classification.name}`,
    searchText: `${classification.code} ${classification.name}`.toLowerCase()
  }));

  // Build expenses categories options by linked account for fast filtering
  // Leaf-only, active categories
  const activeCategories = (expensesCategories || []).filter(ec => ec.is_active !== false && (ec.child_count == null || ec.child_count === 0));
  const optionsByAccount: Record<string, { value: string; label: string; searchText?: string }[]> = {};
  for (const ec of activeCategories) {
    if (!ec.linked_account_id) continue;
    const list = optionsByAccount[ec.linked_account_id] || [];
    list.push({ value: ec.id, label: `${ec.code} - ${ec.description}`, searchText: `${ec.code} ${ec.description}`.toLowerCase() });
    optionsByAccount[ec.linked_account_id] = list;
  }
  // Helper to build union options for selected debit/credit accounts
  const getCategoryOptionsForSelection = (form: Record<string, unknown>) => {
    const debitId = (form as { debit_account_id?: string })?.debit_account_id || '';
    const creditId = (form as { credit_account_id?: string })?.credit_account_id || '';
    const res: SearchableSelectOption[] = [];
    const seen = new Set<string>();
    const pushAll = (arr?: { value: string; label: string; searchText?: string }[]) => {
      for (const o of arr || []) { if (!seen.has(o.value)) { seen.add(o.value); res.push(o); } }
    };
    if (debitId) pushAll(optionsByAccount[debitId]);
    if (creditId) pushAll(optionsByAccount[creditId]);
    // Optional: sort by label for stable UX
    res.sort((a, b) => a.label.localeCompare(b.label));
    return res;
  };
  

  const workItemOptions = toWorkItemOptions(workItems);

  // Convert cost centers to select options
  const costCenterOptions = costCenters.map(cc => ({
    value: cc.id,
    label: `${cc.code} - ${cc.name}${cc.project_id ? ' (مشروع محدد)' : ''}`,
    searchText: `${cc.code} ${cc.name} ${cc.name_ar || ''}`.toLowerCase()
  }));

  const fields: FormField[] = [
    {
      id: 'entry_number',
      type: 'text',
      label: 'رقم القيد',
      placeholder: 'سيتم توليده تلقائياً',
      required: false,
      disabled: true, // Auto-generated
      icon: <Hash size={16} />,
      validation: isEditing ? ((value: unknown) => validateEntryNumber(String(value ?? ''))) : undefined, // Only validate when editing
      helpText: isEditing ? 'رقم القيد (لا يمكن تغييره)' : 'رقم القيد سيتم توليده تلقائياً عند الحفظ',
      colSpan: 1,
      position: { row: 1, col: 1 }
    },
    {
      id: 'entry_date',
      type: 'date',
      label: 'تاريخ القيد',
      required: true,
      defaultValue: getCurrentDate(DATE_FORMATS.ISO), // Default to today in ISO format for HTML date input
      icon: <Calendar size={16} />,
      validation: (value: unknown) => validateDate(String(value ?? '')),
      helpText: 'تاريخ إجراء المعاملة',
      colSpan: 1,
      position: { row: 1, col: 2 }
    },
    {
      id: 'description',
      type: 'text',
      label: 'وصف المعاملة',
      placeholder: 'اكتب وصفاً واضحاً للمعاملة...',
      required: true,
      icon: <FileText size={16} />,
      validation: (value: unknown) => validateDescription(String(value ?? '')),
      helpText: 'وصف مفصل يوضح طبيعة المعاملة',
      colSpan: 1,
      position: { row: 2, col: 1 }
    },
    {
      id: 'debit_account_id',
      type: 'searchable-select',
      label: 'الحساب المدين',
      required: true,
      options: [{ value: '', label: 'اختر الحساب المدين...', searchText: '' }, ...flatPostableOptions],
      icon: <Building2 size={16} />,
      validation: (value: unknown) => {
        const val = String(value ?? '');
        const base = validateAccountSelection(val, 'debit_account_id', 'الحساب المدين');
        if (base) return base;
        const selected = accounts.find(a => a.id === val);
        if (selected && !selected.is_postable) {
          return { field: 'debit_account_id', message: 'هذا الحساب غير قابل للترحيل — اختر حساباً تفصيلياً' };
        }
        return null;
      },
      helpText: 'الحساب الذي سيخصم منه المبلغ',
      searchable: true,
      clearable: true,
      placeholder: 'ابحث عن الحساب المدين...',
      // Provide hierarchical options for drilldown modal
      drilldownOptions: allAccountOptions,
      colSpan: 1,
      position: { row: 3, col: 1 }
    },
    {
      id: 'credit_account_id',
      type: 'searchable-select',
      label: 'الحساب الدائن',
      required: true,
      options: [{ value: '', label: 'اختر الحساب الدائن...', searchText: '' }, ...flatPostableOptions],
      icon: <Building2 size={16} />,
      validation: (value: unknown) => {
        const val = String(value ?? '');
        const base = validateAccountSelection(val, 'credit_account_id', 'الحساب الدائن');
        if (base) return base;
        const selected = accounts.find(a => a.id === val);
        if (selected && !selected.is_postable) {
          return { field: 'credit_account_id', message: 'هذا الحساب غير قابل للترحيل — اختر حساباً تفصيلياً' };
        }
        return null;
      },
      helpText: 'الحساب الذي سيضاف إليه المبلغ',
      searchable: true,
      clearable: true,
      placeholder: 'ابحث عن الحساب الدائن...',
      // Provide hierarchical options for drilldown modal
      drilldownOptions: allAccountOptions,
      colSpan: 1,
      position: { row: 3, col: 2 }
    },
    {
      id: 'amount',
      type: 'number',
      label: 'المبلغ',
      placeholder: '0.00',
      required: true,
      min: 0.01,
      step: 0.01,
      icon: <DollarSign size={16} />,
      validation: (value: unknown) => validateAmount(Number(value ?? 0)),
      helpText: 'مبلغ المعاملة بالريال السعودي',
      colSpan: 1,
      position: { row: 4, col: 1 }
    },
    {
      id: 'reference_number',
      type: 'text',
      label: 'الرقم المرجعي',
      placeholder: 'رقم المرجع (اختياري)',
      required: false,
      icon: <Receipt size={16} />,
      helpText: 'رقم الإشارة أو الفاتورة (اختياري)',
      colSpan: 1,
      position: { row: 4, col: 2 }
    },
    {
      id: 'organization_id',
      type: 'searchable-select',
      label: 'المؤسسة',
      required: false,
      options: [{ value: '', label: 'بدون مؤسسة', searchText: '' }, ...organizationOptions],
      icon: <Building2 size={16} />,
      helpText: 'المؤسسة المرتبطة بهذه المعاملة (اختياري)',
      searchable: true,
      clearable: true,
      placeholder: 'ابحث عن المؤسسة...',
      colSpan: 1,
      position: { row: 5, col: 1 }
    },
    {
      id: 'project_id',
      type: 'searchable-select',
      label: 'المشروع',
      required: false,
      options: [{ value: '', label: 'بدون مشروع', searchText: '' }, ...projectOptions],
      icon: <FolderOpen size={16} />,
      helpText: 'المشروع المرتبط بهذه المعاملة (اختياري)',
      searchable: true,
      clearable: true,
      placeholder: 'ابحث عن المشروع...',
      colSpan: 1,
      position: { row: 5, col: 2 }
    },
    {
      id: 'classification_id',
      type: 'searchable-select',
      label: 'تصنيف المعاملة',
      required: false,
      options: [{ value: '', label: 'بدون تصنيف', searchText: '' }, ...classificationOptions],
      icon: <Tag size={16} />,
      helpText: 'تصنيف نوع المعاملة (اختياري)',
      searchable: true,
      clearable: true,
      placeholder: 'ابحث عن تصنيف المعاملة...',
      colSpan: 1,
      position: { row: 6, col: 1 }
    },
    {
      id: 'cost_center_id',
      type: 'searchable-select',
      label: 'مركز التكلفة',
      required: false,
      options: costCenterOptions.length > 0 
        ? [{ value: '', label: 'بدون مركز تكلفة', searchText: '' }, ...costCenterOptions]
        : [{ value: '', label: 'لا يوجد مراكز تكلفة متاحة', searchText: '' }],
      icon: <Layers size={16} />,
      helpText: 'مركز التكلفة (مطلوب عند تصنيفات معينة)',
      searchable: true,
      clearable: true,
      placeholder: costCenterOptions.length > 0 ? 'اختر مركز التكلفة...' : 'لا يوجد مراكز تكلفة',
      colSpan: 1,
      position: { row: 6, col: 2 }
    },
    {
      id: 'work_item_id',
      type: 'searchable-select',
      label: 'عنصر العمل',
      required: false,
      options: [{ value: '', label: 'بدون عنصر', searchText: '' }, ...workItemOptions],
      icon: <Tag size={16} />,
      helpText: 'اختياري — اختر عنصر عمل (كتالوج المؤسسة أو مشروع)',
      searchable: true,
      clearable: true,
      placeholder: 'اختر عنصر العمل...',
      colSpan: 1,
      position: { row: 7, col: 1 }
    },
    {
      id: 'analysis_work_item_id',
      type: 'searchable-select',
      label: 'بند التحليل',
      required: false,
      options: [],
      optionsProvider: async (form) => {
        const orgId = String((form as any)?.organization_id || '')
        const projectId = String((form as any)?.project_id || '') || null
        if (!orgId) return [{ value: '', label: 'اختر المؤسسة أولاً', searchText: '' }]
        const list = await listAnalysisWorkItems({ orgId, projectId, onlyWithTx: false, includeInactive: true })
        const opts = list.map(i => ({ value: i.id, label: `${i.code} - ${i.name}`, searchText: `${i.code} ${i.name} ${(i.name_ar||'')}`.toLowerCase() }))
        return [{ value: '', label: 'بدون بند', searchText: '' }, ...opts]
      },
      icon: <Tag size={16} />,
      helpText: 'اختياري — بند تحليل مرتبط بالمعاملة (يتم تصفيته حسب المشروع) ',
      searchable: true,
      clearable: true,
      placeholder: 'اختر بند التحليل...',
      dependsOnAny: ['organization_id', 'project_id'],
      colSpan: 1,
      position: { row: 7, col: 2 }
    },
    {
      id: 'expenses_category_id',
      type: 'searchable-select',
      label: 'فئة المصروفات',
      required: false,
      options: [],
      optionsProvider: (form) => getCategoryOptionsForSelection(form),
      icon: <Tag size={16} />,
      helpText: 'يتم تصفية الفئات حسب الحساب المدين/الدائن المحدد',
      searchable: true,
      clearable: true,
      placeholder: 'اختر فئة المصروفات...',
      dependsOnAny: ['debit_account_id', 'credit_account_id'],
      colSpan: 1,
      position: { row: 7, col: 2 }
    },
    {
      id: 'notes',
      type: 'text',
      label: 'ملاحظات',
      placeholder: 'ملاحظات إضافية (اختياري)',
      required: false,
      icon: <MessageSquare size={16} />,
      helpText: 'أي ملاحظات إضافية حول المعاملة',
      colSpan: 1,
      position: { row: 8, col: 1 }
    }
  ];

  // Default values for the form
  // Default values for the form
  // const _defaultValues: any = {
    // entry_number: existingTransaction?.entry_number || '',
    // entry_date: existingTransaction?.entry_date || getCurrentDate(DATE_FORMATS.ISO),
    // description: existingTransaction?.description || '',
    // reference_number: existingTransaction?.reference_number || '',
    // debit_account_id: existingTransaction?.debit_account_id || '',
    // credit_account_id: existingTransaction?.credit_account_id || '',
    // amount: existingTransaction?.amount || 0,
    // notes: existingTransaction?.notes || '',
    // project_id: existingTransaction?.project_id || ''
  // };
  return {
    title: isEditing ? '✏️ تعديل المعاملة' : '➕ معاملة جديدة',
    subtitle: isEditing 
      ? `تعديل المعاملة: ${existingTransaction?.entry_number || ''}`
      : 'إضافة معاملة مالية جديدة',
    formId: 'transaction-form',
    fields,
    submitLabel: isEditing ? '💾 حفظ التعديلات' : '✨ إضافة المعاملة',
    cancelLabel: '❌ إلغاء',
    customValidator: async (data: Record<string, unknown>) => {
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      
      // Cross-field validation: Debit and Credit accounts must be different
      const fd = data as { 
        debit_account_id?: string; 
        credit_account_id?: string; 
        amount?: string | number; 
        expenses_category_id?: string;
        classification_id?: string;
        cost_center_id?: string;
        description?: string;
        entry_date?: string;
      };
      if (fd.debit_account_id && fd.credit_account_id && fd.debit_account_id === fd.credit_account_id) {
        errors.push({ 
          field: 'credit_account_id', 
          message: 'الحساب المدين والدائن يجب أن يكونا مختلفين' 
        });
      }
      
      // Amount cross-validation
      const amountVal = typeof fd.amount === 'string' ? parseFloat(fd.amount) : Number(fd.amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        errors.push({ 
          field: 'amount', 
          message: 'يرجى إدخال مبلغ صحيح أكبر من صفر' 
        });
      }

      // Smart validation using the new validation service
      if (fd.debit_account_id && fd.credit_account_id && amountVal > 0 && fd.description) {
        try {
          const validationResult = await transactionValidator.validateTransaction({
            debit_account_id: fd.debit_account_id,
            credit_account_id: fd.credit_account_id,
            amount: amountVal,
            description: fd.description,
            entry_date: fd.entry_date || new Date().toISOString().split('T')[0]
          });

          // Add validation errors
          for (const error of validationResult.errors) {
            errors.push({
              field: error.field,
              message: error.message
            });
          }

          // Add validation warnings (as warnings, not errors)
          for (const warning of validationResult.warnings) {
            warnings.push({
              field: warning.field,
              message: `⚠️ ${warning.message}${warning.details ? ' - ' + warning.details : ''}`
            });
          }
        } catch (validationError) {
          console.error('Transaction validation failed:', validationError);
          // Don't fail form submission due to validation service errors
        }
      }

      // Require expenses category if either side is an expense account (both sides rule)
      const debit = accounts.find(a => a.id === fd.debit_account_id);
      const credit = accounts.find(a => a.id === fd.credit_account_id);
      const isExpense = (acc?: Account) => {
        const c = (acc?.category || '').toLowerCase();
        return c === 'expense' || c === 'expenses';
      };
      if ((isExpense(debit) || isExpense(credit)) && (!fd.expenses_category_id || String(fd.expenses_category_id).trim() === '')) {
        errors.push({
          field: 'expenses_category_id',
          message: 'فئة المصروف مطلوبة عند اختيار حساب مصروف على أي من الجانبين'
        });
      }
      
      // Require cost center if classification requires post_to_costs
      if (fd.classification_id) {
        const selectedClassification = classifications.find(c => c.id === fd.classification_id);
        if (selectedClassification?.post_to_costs && (!fd.cost_center_id || String(fd.cost_center_id).trim() === '')) {
          errors.push({
            field: 'cost_center_id',
            message: 'مركز التكلفة مطلوب عند اختيار تصنيف يتطلب تسجيل التكاليف'
          });
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    },
    autoFillLogic: createTransactionAutoFillLogic(accounts),
    layout: {
      columns: 2,
      responsive: true,
      columnBreakpoints: [
        { field: 'entry_number' },
        { field: 'entry_date' },
        { field: 'description' },
        { field: 'work_item_id' },
        { field: 'analysis_work_item_id' },
        { field: 'debit_account_id' },
        { field: 'credit_account_id' },
        { field: 'amount' },
        { field: 'reference_number' },
        { field: 'organization_id' },
        { field: 'project_id' },
        { field: 'notes' }
      ]
    }
  };
};
