import { Hash, FileText, Calendar, DollarSign, Receipt, MessageSquare, Building2, FolderOpen, Tag, Layers } from 'lucide-react';
import type { FormConfig, FormField } from '../Common/UnifiedCRUDForm';
import type { Account, TransactionRecord, Project } from '../../services/transactions';
import type { Organization } from '../../types';
import type { TransactionClassification } from '../../services/transaction-classification';
import type { ExpensesCategoryRow } from '../../types/sub-tree';
import type { WorkItemRow } from '../../types/work-items';
import { toWorkItemOptions } from '../../services/work-items';
import { listAnalysisWorkItems } from '../../services/analysis-work-items';
import type { SearchableSelectOption } from '../Common/SearchableSelect';
import { transactionValidator } from '../../services/transaction-validation';

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
  
  console.log('🌳 createTransactionFormConfig called with:', {
    isEditing,
    accountsCount: accounts.length,
    projectsCount: projects.length,
    organizationsCount: organizations.length,
    classificationsCount: classifications.length,
    expensesCategoriesCount: expensesCategories.length,
    workItemsCount: workItems.length,
    costCentersCount: costCenters.length,
    existingTransaction: !!existingTransaction
  });
  
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
  // Helper to build union options for selected debit/credit accounts and organization
  const getCategoryOptionsForSelection = (form: Record<string, unknown>) => {
    const orgId = (form as { organization_id?: string })?.organization_id || '';
    const debitId = (form as { debit_account_id?: string })?.debit_account_id || '';
    const creditId = (form as { credit_account_id?: string })?.credit_account_id || '';
    
    console.log('🌳 getCategoryOptionsForSelection called with:', { 
      orgId, 
      debitId: debitId ? debitId.substring(0, 8) + '...' : '', 
      creditId: creditId ? creditId.substring(0, 8) + '...' : '', 
      totalCategories: expensesCategories.length,
      activeCategoriesCount: activeCategories.length
    });
    
    // If no organization selected, return empty options with helper text
    if (!orgId) {
      console.log('🌳 No org selected, returning helper text');
      return [{ value: '', label: 'اختر المؤسسة أولاً لعرض عقد الشجرة الفرعية', searchText: '' }];
    }
    
    // Filter expenses categories by organization first
    const orgCategories = activeCategories.filter(ec => 
      ec.org_id === orgId
    );
    
    console.log('🌳 Org categories found:', orgCategories.length, 'for org:', orgId);
    if (orgCategories.length > 0) {
      console.log('🌳 Sample categories:', orgCategories.slice(0, 3).map(c => ({ id: c.id, code: c.code, desc: c.description })));
    }
    
    if (orgCategories.length === 0) {
      console.log('🌳 No categories for org, returning no items message');
      console.log('🌳 Available org IDs in all categories:', [...new Set(activeCategories.map(c => c.org_id))]);
      return [{ value: '', label: 'لا توجد عقد شجرة فرعية للمؤسسة المختارة', searchText: '' }];
    }
    
    // If accounts are selected, filter by linked accounts too
    if (debitId || creditId) {
      const filteredByAccount = orgCategories.filter(ec => 
        ec.linked_account_id && (
          ec.linked_account_id === debitId || 
          ec.linked_account_id === creditId
        )
      );
      
      if (filteredByAccount.length > 0) {
        const options = filteredByAccount.map(ec => ({
          value: ec.id,
          label: `${ec.code} - ${ec.description}`,
          searchText: `${ec.code} ${ec.description}`.toLowerCase()
        }));
        options.sort((a, b) => a.label.localeCompare(b.label));
        return [{ value: '', label: 'بدون عقدة شجرة فرعية', searchText: '' }, ...options];
      } else {
        // No categories linked to selected accounts, show all org categories
        const allOptions = orgCategories.map(ec => ({
          value: ec.id,
          label: `${ec.code} - ${ec.description}`,
          searchText: `${ec.code} ${ec.description}`.toLowerCase()
        }));
        allOptions.sort((a, b) => a.label.localeCompare(b.label));
        return [{ value: '', label: 'بدون عقدة شجرة فرعية', searchText: '' }, ...allOptions];
      }
    } else {
      // No accounts selected, show all org categories
      const allOptions = orgCategories.map(ec => ({
        value: ec.id,
        label: `${ec.code} - ${ec.description}`,
        searchText: `${ec.code} ${ec.description}`.toLowerCase()
      }));
      allOptions.sort((a, b) => a.label.localeCompare(b.label));
      return [{ value: '', label: 'بدون عقدة شجرة فرعية', searchText: '' }, ...allOptions];
    }
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
      position: { row: 8, col: 1 }
    },
    {
      id: 'sub_tree_id',
      type: 'searchable-select',
      label: 'الشجرة الفرعية',
      required: false,
      options: [{ value: '', label: 'تحميل عقد الشجرة الفرعية...', searchText: '' }],
      optionsProvider: (form) => {
        console.log('🌳 sub_tree_id optionsProvider called with form data:', { orgId: (form as any)?.organization_id, hasCategories: expensesCategories.length });
        const result = getCategoryOptionsForSelection(form);
        console.log('🌳 sub_tree_id optionsProvider returning:', result.length, 'options');
        return result;
      },
      icon: <Tag size={16} />,
      helpText: 'يتم تصفية عقد الشجرة حسب المؤسسة والحساب المدين/الدائن المحدد',
      searchable: true,
      clearable: true,
      placeholder: 'اختر عقدة الشجرة الفرعية...',
      dependsOnAny: ['organization_id', 'debit_account_id', 'credit_account_id'],
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
      position: { row: 8, col: 2 }
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
  // Debug: Log final form configuration
  const finalConfig = {
    title: isEditing ? '✐️ تعديل المعاملة' : '➕ معاملة جديدة',
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
        sub_tree_id?: string;
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

      // Smart validation using the safe validation wrapper
      if (fd.debit_account_id && fd.credit_account_id && amountVal > 0) {
        try {
          const validationValidator = transactionValidator.createCustomValidator();
          // Run asynchronously but do not block the sync validator contract
          void validationValidator(data).then((smartValidation) => {
            try {
              if (smartValidation.errors) {
                // Surface via console for now; UI can display on submit
                console.warn('Async validation errors', smartValidation.errors)
              }
              if (smartValidation.warnings) {
                console.info('Async validation warnings', smartValidation.warnings)
              }
            } catch {}
          }).catch(() => {})
        } catch (validationError) {
          console.error('Transaction validation failed:', validationError);
          // Add a warning that validation service is unavailable
          warnings.push({
            field: 'description',
            message: '⚠️ نظام التحقق الذكي من المعاملات غير متوفر حالياً'
          });
        }
      }

      // Require expenses category if either side is an expense account (both sides rule)
      const debit = accounts.find(a => a.id === fd.debit_account_id);
      const credit = accounts.find(a => a.id === fd.credit_account_id);
      const isExpense = (acc?: Account) => {
        const c = (acc?.category || '').toLowerCase();
        return c === 'expense' || c === 'expenses';
      };
      if ((isExpense(debit) || isExpense(credit)) && (!fd.sub_tree_id || String(fd.sub_tree_id).trim() === '')) {
        errors.push({
          field: 'sub_tree_id',
          message: 'عقدة الشجرة الفرعية مطلوبة عند اختيار حساب مصروف على أي من الجانبين'
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
        { field: 'debit_account_id' },
        { field: 'credit_account_id' },
        { field: 'amount' },
        { field: 'reference_number' },
        { field: 'organization_id' },
        { field: 'project_id' },
        { field: 'classification_id' },
        { field: 'cost_center_id' },
        { field: 'work_item_id' },
        { field: 'analysis_work_item_id' },
        { field: 'sub_tree_id' },
        { field: 'notes' }
      ]
    }
  };
  
  // Debug: Log final configuration details
  console.log('🌳 Final form config created:', {
    title: finalConfig.title,
    fieldsCount: finalConfig.fields.length,
    fieldIds: finalConfig.fields.map(f => f.id),
    hasSubTreeField: finalConfig.fields.some(f => f.id === 'sub_tree_id'),
    layoutFieldsCount: finalConfig.layout?.columnBreakpoints?.length,
    layoutFields: finalConfig.layout?.columnBreakpoints?.map(b => b.field)
  });
  
  const subTreeField = finalConfig.fields.find(f => f.id === 'sub_tree_id');
  if (subTreeField) {
    console.log('🌳 sub_tree_id field details:', {
      id: subTreeField.id,
      type: subTreeField.type,
      label: subTreeField.label,
      hasOptionsProvider: !!subTreeField.optionsProvider,
      hasOptions: !!subTreeField.options,
      position: subTreeField.position,
      dependsOnAny: subTreeField.dependsOnAny
    });
  } else {
    console.error('🌳 ERROR: sub_tree_id field NOT FOUND in final config!');
  }
  
  return finalConfig;
};
