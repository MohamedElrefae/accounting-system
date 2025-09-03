import { Hash, FileText, DollarSign } from 'lucide-react';
import type { FormConfig, FormField } from '../Common/UnifiedCRUDForm';

// Minimal types for validation
export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

// Validators for transaction classification
const validateCode = (code: number | string): ValidationError | null => {
  const codeNum = typeof code === 'string' ? parseInt(code) : code;
  if (!code || isNaN(codeNum)) {
    return { field: 'code', message: 'كود التصنيف مطلوب' };
  }
  if (codeNum < 1 || codeNum > 9999) {
    return { field: 'code', message: 'كود التصنيف يجب أن يكون بين 1 و 9999' };
  }
  return null;
};

const validateName = (name: string): ValidationError | null => {
  if (!name || !name.trim()) {
    return { field: 'name', message: 'اسم التصنيف مطلوب' };
  }
  if (name.length < 2) {
    return { field: 'name', message: 'اسم التصنيف يجب أن يكون حرفين على الأقل' };
  }
  if (name.length > 100) {
    return { field: 'name', message: 'اسم التصنيف لا يمكن أن يتجاوز 100 حرف' };
  }
  return null;
};

export interface TransactionClassificationFormData {
  id?: string;
  code: number;
  name: string;
  post_to_costs: boolean;
}

export const createTransactionClassificationFormConfig = (
  isEditing: boolean,
  existingClassification?: TransactionClassificationFormData | null
): FormConfig => {
  const fields: FormField[] = [
    {
      id: 'code',
      type: 'number',
      label: 'كود التصنيف',
      placeholder: 'مثال: 1',
      required: true,
      icon: <Hash size={16} />,
      validation: (value: unknown) => validateCode(value as number | string),
      helpText: 'كود فريد لتصنيف المعاملة (رقم من 1 إلى 9999)',
      min: 1,
      max: 9999
    },
    {
      id: 'name',
      type: 'text',
      label: 'اسم التصنيف',
      placeholder: 'مثال: وارد خزينة',
      required: true,
      icon: <FileText size={16} />,
      validation: (value: unknown) => validateName(String(value ?? '')),
      helpText: 'اسم تصنيف المعاملة المالية'
    },
    {
      id: 'post_to_costs',
      type: 'checkbox',
      label: 'ترحيل للتكاليف',
      icon: <DollarSign size={16} />,
      helpText: 'تحديد ما إذا كان هذا التصنيف سيتم ترحيله إلى حسابات التكاليف'
    }
  ];

  return {
    title: isEditing ? '✏️ تعديل تصنيف المعاملة' : '➕ إضافة تصنيف معاملة جديد',
    subtitle: isEditing 
      ? `تعديل بيانات تصنيف المعاملة: ${existingClassification?.name || ''}` 
      : 'إنشاء تصنيف معاملة مالية جديد في النظام',
    formId: 'transaction-classification-form',
    fields,
    submitLabel: isEditing ? '💾 حفظ التعديلات' : '✨ إنشاء التصنيف',
    cancelLabel: '❌ إلغاء',
    customValidator: (data: Record<string, unknown>): ValidationResult => {
      const errors: ValidationError[] = [];
      const d = data as Partial<TransactionClassificationFormData & { code?: number | string; name?: string; post_to_costs?: boolean }>;
      
      // Validate code
      const codeError = validateCode(d.code as number | string);
      if (codeError) errors.push(codeError);
      
      // Validate name
      const nameError = validateName(String(d.name ?? ''));
      if (nameError) errors.push(nameError);
      
      // Ensure post_to_costs has a default value
      if (d.post_to_costs === undefined) {
        (d as Record<string, unknown>).post_to_costs = false;
      }
      
      return { isValid: errors.length === 0, errors };
    },
    autoFillLogic: (formData: Record<string, unknown>) => {
      const auto: Partial<TransactionClassificationFormData> = {};
      
      // Set default values
      if ((formData as Partial<TransactionClassificationFormData>).post_to_costs === undefined) {
        auto.post_to_costs = false;
      }
      
      return auto;
    },
    layout: {
      columns: 2,
      responsive: true,
      columnBreakpoints: [
        { field: 'code' },
        { field: 'name' },
        { field: 'post_to_costs', fullWidth: true }
      ]
    }
  };
};

export default createTransactionClassificationFormConfig;
