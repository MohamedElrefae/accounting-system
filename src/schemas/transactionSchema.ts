import { z } from 'zod';

/**
 * Schema for a single transaction line
 */
export const transactionLineSchema = z.object({
  line_no: z.number().int().positive(),
  account_id: z.string().uuid('الحساب مطلوب'),
  debit_amount: z.number().min(0, 'المبلغ المدين لا يمكن أن يكون سالباً').max(999999999.99, 'المبلغ أكبر من الحد المسموح'),
  credit_amount: z.number().min(0, 'المبلغ الدائن لا يمكن أن يكون سالباً').max(999999999.99, 'المبلغ أكبر من الحد المسموح'),
  description: z.string().optional(),
  org_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional().nullable(),
  cost_center_id: z.string().uuid().optional().nullable(),
  work_item_id: z.string().uuid().optional().nullable(),
  analysis_work_item_id: z.string().uuid().optional().nullable(),
  classification_id: z.string().uuid().optional().nullable(),
  sub_tree_id: z.string().uuid().optional().nullable(),
}).refine(data => data.debit_amount === 0 || data.credit_amount === 0, {
  message: 'لا يمكن إدخال مدين ودائن معاً في نفس السطر',
  path: ['debit_amount'],
}).refine(data => data.debit_amount > 0 || data.credit_amount > 0, {
  message: 'يجب إدخال مبلغ مدين أو دائن',
  path: ['debit_amount'],
});

/**
 * Schema for transaction header data (transactions table)
 */
export const transactionHeaderSchema = z.object({
  entry_date: z.string().min(1, 'تاريخ القيد مطلوب').refine(val => {
    const date = new Date(val);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return date >= oneYearAgo && date <= oneYearFromNow;
  }, {
    message: 'تاريخ القيد يجب أن يكون ضمن نطاق سنة واحدة',
  }),
  description: z.string()
    .min(3, 'الوصف مطلوب (3 أحرف على الأقل)')
    .max(500, 'الوصف لا يمكن أن يتجاوز 500 حرف'),
  description_ar: z.string().max(500, 'الوصف العربي لا يمكن أن يتجاوز 500 حرف').optional().nullable(),
  org_id: z.string().uuid('المؤسسة مطلوبة'),
  project_id: z.string().uuid().optional().nullable(),
  classification_id: z.string().uuid().optional().nullable(),
  reference_number: z.string().max(100, 'الرقم المرجعي لا يمكن أن يتجاوز 100 حرف').optional().nullable(),
  notes: z.string().max(1000, 'الملاحظات لا يمكن أن تتجاوز 1000 حرف').optional().nullable(),
  notes_ar: z.string().max(1000, 'الملاحظات العربية لا يمكن أن تتجاوز 1000 حرف').optional().nullable(),
  // Optional defaults for propagating to lines
  default_cost_center_id: z.string().uuid().optional().nullable(),
  default_work_item_id: z.string().uuid().optional().nullable(),
  default_sub_tree_id: z.string().uuid().optional().nullable(),
});

/**
 * Complete transaction form schema (header + lines)
 */
export const transactionFormSchema = z.object({
  // Merge header fields
  ...transactionHeaderSchema.shape,
  
  // Lines array
  lines: z.array(transactionLineSchema).min(1, 'يجب إضافة سطر واحد على الأقل'),
}).refine(data => {
  // Validate that total debits equal total credits
  const totalDebits = data.lines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + line.credit_amount, 0);
  return Math.abs(totalDebits - totalCredits) < 0.01;
}, {
  message: 'إجمالي المدين يجب أن يساوي إجمالي الدائن',
  path: ['lines'],
});

/**
 * TypeScript types inferred from schemas
 */
export type TransactionLineData = z.infer<typeof transactionLineSchema>;
export type TransactionHeaderData = z.infer<typeof transactionHeaderSchema>;
export type TransactionFormData = z.infer<typeof transactionFormSchema>;

/**
 * Helper function to create default line data
 */
export const createDefaultLine = (lineNo: number, defaults?: Partial<TransactionLineData>): TransactionLineData => ({
  line_no: lineNo,
  account_id: '',
  debit_amount: 0,
  credit_amount: 0,
  description: '',
  ...defaults,
});

/**
 * Helper function to create default form data
 */
export const createDefaultFormData = (defaults?: Partial<TransactionFormData>): TransactionFormData => {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    entry_date: today,
    description: '',
    description_ar: null,
    org_id: '',
    project_id: null,
    classification_id: null,
    reference_number: null,
    notes: null,
    notes_ar: null,
    default_cost_center_id: null,
    default_work_item_id: null,
    default_sub_tree_id: null,
    lines: [
      createDefaultLine(1),
      createDefaultLine(2),
    ],
    ...defaults,
  };
};
