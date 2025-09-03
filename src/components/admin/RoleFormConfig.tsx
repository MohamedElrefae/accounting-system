import { Shield, Globe, FileText } from 'lucide-react';
import type { FormConfig, FormField } from '../Common/UnifiedCRUDForm';

// Validation types
export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

// Role interface
export interface RoleRecord {
  id?: number;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  is_system?: boolean;
  permissions?: string[];
}

// Permission interface
export interface Permission {
  name: string;
  nameAr: string;
  descriptionAr: string;
}

// Permission Category interface
export interface PermissionCategory {
  key: string;
  nameAr: string;
  permissions: Permission[];
}

// Validators
const validateName = (name: string): ValidationError | null => {
  if (!name || !name.trim()) {
    return { field: 'name', message: 'اسم الدور بالإنجليزية مطلوب' };
  }
  if (name.length < 2) {
    return { field: 'name', message: 'اسم الدور يجب أن يكون حرفين على الأقل' };
  }
  if (name.length > 50) {
    return { field: 'name', message: 'اسم الدور لا يمكن أن يتجاوز 50 حرف' };
  }
  // Check for valid characters (letters, numbers, underscores, hyphens)
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { field: 'name', message: 'اسم الدور يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط' };
  }
  return null;
};

const validateNameAr = (nameAr: string): ValidationError | null => {
  if (!nameAr || !nameAr.trim()) {
    return { field: 'name_ar', message: 'اسم الدور بالعربية مطلوب' };
  }
  if (nameAr.length < 2) {
    return { field: 'name_ar', message: 'اسم الدور يجب أن يكون حرفين على الأقل' };
  }
  if (nameAr.length > 100) {
    return { field: 'name_ar', message: 'اسم الدور لا يمكن أن يتجاوز 100 حرف' };
  }
  return null;
};

const validateDescription = (description: string): ValidationError | null => {
  if (description && description.length > 500) {
    return { field: 'description', message: 'الوصف لا يمكن أن يتجاوز 500 حرف' };
  }
  return null;
};

const validateDescriptionAr = (descriptionAr: string): ValidationError | null => {
  if (descriptionAr && descriptionAr.length > 500) {
    return { field: 'description_ar', message: 'الوصف بالعربية لا يمكن أن يتجاوز 500 حرف' };
  }
  return null;
};

// Auto-fill logic
const createRoleAutoFillLogic = () => (formData: Record<string, unknown>) => {
  const fd = formData as { name?: string; name_ar?: string; description?: string; description_ar?: string };
  const auto: Record<string, unknown> = {};
  
  // Auto-generate Arabic name suggestions based on common role patterns
  if (fd.name && !fd.name_ar) {
    const nameMap: Record<string, string> = {
      'admin': 'مدير',
      'user': 'مستخدم',
      'manager': 'مدير',
      'supervisor': 'مشرف',
      'accountant': 'محاسب',
      'employee': 'موظف',
      'guest': 'ضيف',
      'viewer': 'مشاهد',
      'editor': 'محرر',
      'moderator': 'مشرف'
    };
    
    const lowerName = fd.name.toLowerCase();
    for (const [en, ar] of Object.entries(nameMap)) {
      if (lowerName.includes(en)) {
        auto.name_ar = ar;
        break;
      }
    }
    
    // If no match found, suggest a generic translation
    if (!auto.name_ar) {
      auto.name_ar = `دور ${fd.name}`;
    }
  }
  
  // Auto-generate description based on name
  if (fd.name && !fd.description) {
    auto.description = `Role for ${fd.name} with specific permissions and access rights.`;
  }
  
  if (fd.name_ar && !fd.description_ar) {
    auto.description_ar = `دور ${fd.name_ar} مع صلاحيات وحقوق وصول محددة.`;
  }
  
  return auto;
};

// Create form configuration
export const createRoleFormConfig = (
  isEditing: boolean,
  _permissionCategories: PermissionCategory[],
  existingRole?: RoleRecord | null
): FormConfig => {
  
  // Default values
  // Default values
  // const defaultValues = isEditing && existingRole ? {
  // name: existingRole.name,
  // name_ar: existingRole.name_ar,
  // description: existingRole.description || '',
  // description_ar: existingRole.description_ar || '',
  // permissions: existingRole.permissions || []
  // } : {
  // name: '',
  // name_ar: '',
  // description: '',
  // description_ar: '',
  // permissions: []
  // };

  const fields: FormField[] = [
    {
      id: 'name',
      type: 'text',
      label: 'اسم الدور (بالإنجليزية)',
      placeholder: 'admin, user, manager, etc.',
      required: true,
      disabled: existingRole?.is_system, // Can't change system role names
      icon: <Shield size={16} />,
      validation: (value: unknown) => validateName(String(value ?? '')),
      helpText: existingRole?.is_system 
        ? 'لا يمكن تغيير اسم الأدوار النظامية' 
        : 'اسم الدور باللغة الإنجليزية (أحرف، أرقام، شرطات فقط)'
    },
    {
      id: 'name_ar',
      type: 'text',
      label: 'اسم الدور (بالعربية)',
      placeholder: 'مدير، مستخدم، مشرف، إلخ',
      required: true,
      icon: <Globe size={16} />,
      validation: (value: unknown) => validateNameAr(String(value ?? '')),
      helpText: 'اسم الدور باللغة العربية'
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'الوصف (بالإنجليزية)',
      placeholder: 'Role description in English (optional)',
      rows: 1,
      icon: <FileText size={16} />,
      validation: (value: unknown) => validateDescription(String(value ?? '')),
      helpText: 'وصف مختصر للدور ومسؤولياته بالإنجليزية'
    },
    {
      id: 'description_ar',
      type: 'textarea',
      label: 'الوصف (بالعربية)',
      placeholder: 'وصف الدور باللغة العربية (اختياري)',
      rows: 1,
      icon: <FileText size={16} />,
      validation: (value: unknown) => validateDescriptionAr(String(value ?? '')),
      helpText: 'وصف مختصر للدور ومسؤولياته بالعربية'
    }
  ];

  // Add permissions section (will be handled separately for now)
  // This is complex UI that doesn't fit well into simple form fields
  // We'll handle it in a custom section

  return {
    title: isEditing ? '✏️ تعديل الدور' : '🛡️ دور جديد',
    subtitle: isEditing 
      ? `تعديل بيانات الدور: ${existingRole?.name_ar || existingRole?.name || ''}`
      : 'إنشاء دور جديد مع تحديد الصلاحيات',
    formId: 'role-form',
    fields,

    submitLabel: isEditing ? '💾 حفظ التعديلات' : '✨ إنشاء الدور',
    cancelLabel: '❌ إلغاء',
    customValidator: (data: Record<string, unknown>): ValidationResult => {
      const errors: ValidationError[] = [];
      
      // Check for duplicate names (this would be handled by backend, but good to check)
      const d = data as { name?: string; name_ar?: string };
      if (!d.name || !d.name.trim()) {
        errors.push({ field: 'name', message: 'اسم الدور بالإنجليزية مطلوب' });
      }
      
      if (!d.name_ar || !d.name_ar.trim()) {
        errors.push({ field: 'name_ar', message: 'اسم الدور بالعربية مطلوب' });
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },
    autoFillLogic: createRoleAutoFillLogic(),
    layout: {
      columns: 2,
      responsive: true,
      columnBreakpoints: [
        { field: 'name' },
        { field: 'name_ar' },
        { field: 'description' },
        { field: 'description_ar' }
      ]
    }
  };
};

export default createRoleFormConfig;
