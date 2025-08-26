import { User, Mail, Lock, Phone, Building, Briefcase, Globe, UserCheck } from 'lucide-react';
import type { FormConfig, FormField } from '../Common/UnifiedCRUDForm';

// Validation types
export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

// User interface
export interface UserRecord {
  id?: string;
  email: string;
  password?: string;
  confirm_password?: string;
  first_name: string;
  last_name: string;
  full_name_ar?: string;
  department?: string;
  job_title?: string;
  custom_job_title?: string;
  phone?: string;
  role_id?: string;
  is_active: boolean;
  send_invite?: boolean;
  require_password_change?: boolean;
  avatar_url?: string;
}

// Role interface
export interface Role {
  id: number;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
}

// Predefined departments
const DEPARTMENTS = [
  { value: 'accounting', label: 'المحاسبة', label_en: 'Accounting' },
  { value: 'sales', label: 'المبيعات', label_en: 'Sales' },
  { value: 'hr', label: 'الموارد البشرية', label_en: 'Human Resources' },
  { value: 'it', label: 'تقنية المعلومات', label_en: 'Information Technology' },
  { value: 'operations', label: 'العمليات', label_en: 'Operations' },
  { value: 'marketing', label: 'التسويق', label_en: 'Marketing' },
  { value: 'finance', label: 'المالية', label_en: 'Finance' },
  { value: 'customer_service', label: 'خدمة العملاء', label_en: 'Customer Service' },
  { value: 'warehouse', label: 'المستودع', label_en: 'Warehouse' },
  { value: 'management', label: 'الإدارة', label_en: 'Management' }
];

// Job titles
const JOB_TITLES = [
  { value: 'manager', label: 'مدير', label_en: 'Manager' },
  { value: 'assistant_manager', label: 'مساعد مدير', label_en: 'Assistant Manager' },
  { value: 'supervisor', label: 'مشرف', label_en: 'Supervisor' },
  { value: 'accountant', label: 'محاسب', label_en: 'Accountant' },
  { value: 'senior_accountant', label: 'محاسب أول', label_en: 'Senior Accountant' },
  { value: 'sales_rep', label: 'مندوب مبيعات', label_en: 'Sales Representative' },
  { value: 'hr_specialist', label: 'أخصائي موارد بشرية', label_en: 'HR Specialist' },
  { value: 'it_specialist', label: 'أخصائي تقنية', label_en: 'IT Specialist' },
  { value: 'developer', label: 'مطور', label_en: 'Developer' },
  { value: 'analyst', label: 'محلل', label_en: 'Analyst' },
  { value: 'coordinator', label: 'منسق', label_en: 'Coordinator' },
  { value: 'admin', label: 'إداري', label_en: 'Administrator' },
  { value: 'clerk', label: 'موظف', label_en: 'Clerk' },
  { value: 'other', label: 'أخرى', label_en: 'Other' }
];

// Validators
const validateEmail = (email: string): ValidationError | null => {
  if (!email || !email.trim()) {
    return { field: 'email', message: 'البريد الإلكتروني مطلوب' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'البريد الإلكتروني غير صحيح' };
  }
  return null;
};

const validatePassword = (password: string): ValidationError | null => {
  if (!password || !password.trim()) {
    return { field: 'password', message: 'كلمة المرور مطلوبة' };
  }
  if (password.length < 6) {
    return { field: 'password', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  }
  return null;
};

const validateFirstName = (firstName: string): ValidationError | null => {
  if (!firstName || !firstName.trim()) {
    return { field: 'first_name', message: 'الاسم الأول مطلوب' };
  }
  if (firstName.length < 2) {
    return { field: 'first_name', message: 'الاسم الأول يجب أن يكون حرفين على الأقل' };
  }
  return null;
};

const validateLastName = (lastName: string): ValidationError | null => {
  if (!lastName || !lastName.trim()) {
    return { field: 'last_name', message: 'اسم العائلة مطلوب' };
  }
  if (lastName.length < 2) {
    return { field: 'last_name', message: 'اسم العائلة يجب أن يكون حرفين على الأقل' };
  }
  return null;
};

const validatePhone = (phone: string): ValidationError | null => {
  if (!phone || !phone.trim()) {
    return null; // Phone is optional
  }
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return { field: 'phone', message: 'رقم الهاتف غير صحيح' };
  }
  return null;
};

const validateCustomJobTitle = (customJobTitle: string, jobTitle: string): ValidationError | null => {
  if (jobTitle === 'other' && (!customJobTitle || !customJobTitle.trim())) {
    return { field: 'custom_job_title', message: 'يرجى تحديد المسمى الوظيفي' };
  }
  return null;
};

// Password strength calculator
// const _calculatePasswordStrength = (password: string): number => {
// const calculatePasswordStrength = (password: string): number => {
//   let strength = 0;
// if (password.length >= 8) strength++;
// if (password.length >= 12) strength++;
// if (/[a-z]/.test(password)) strength++;
// if (/[A-Z]/.test(password)) strength++;
// if (/[0-9]/.test(password)) strength++;
// if (/[^a-zA-Z0-9]/.test(password)) strength++;
// return Math.min(100, (strength / 6) * 100);
// };

// Auto-fill logic
const createUserAutoFillLogic = (_roles: Role[]) => (formData: any) => {
  const auto: Partial<any> = {};
  
  // Auto-fill full name in Arabic if not provided
  if (formData.first_name && formData.last_name && !formData.full_name_ar) {
    auto.full_name_ar = `${formData.first_name} ${formData.last_name}`;
  }
  
  // Suggest department-related job titles
  if (formData.department && !formData.job_title) {
    const suggestions: Record<string, string> = {
      'accounting': 'accountant',
      'sales': 'sales_rep',
      'hr': 'hr_specialist',
      'it': 'it_specialist',
      'marketing': 'coordinator',
      'finance': 'analyst'
    };
    if (suggestions[formData.department]) {
      auto.job_title = suggestions[formData.department];
    }
  }
  
  // Default values for new users
  if (formData.is_active === undefined) {
    auto.is_active = true;
  }
  
  if (formData.send_invite === undefined) {
    auto.send_invite = true;
  }
  
  if (formData.require_password_change === undefined) {
    auto.require_password_change = true;
  }
  
  return auto;
};

// Create form configuration
export const createUserFormConfig = (
  isEditing: boolean,
  roles: Role[],
  existingUser?: UserRecord | null
): FormConfig => {
  
  // Convert roles to select options
  const roleOptions = [
    { value: '', label: 'بدون دور' },
    ...roles.map(role => ({
      value: role.id.toString(),
      label: role.name_ar
    }))
  ];
  
  // Department options
  const departmentOptions = [
    { value: '', label: '-- اختر القسم --' },
    ...DEPARTMENTS.map(dept => ({
      value: dept.value,
      label: dept.label
    }))
  ];
  
  // Job title options
  const jobTitleOptions = [
    { value: '', label: '-- اختر المسمى الوظيفي --' },
    ...JOB_TITLES.map(title => ({
      value: title.value,
      label: title.label
    }))
  ];
  
  // Default values
  // Default values
  // const defaultValues = isEditing && existingUser ? {
  // email: existingUser.email,
  // first_name: existingUser.first_name,
  // last_name: existingUser.last_name,
  // full_name_ar: existingUser.full_name_ar || '',
  // department: existingUser.department || '',
  // job_title: existingUser.job_title || '',
  // custom_job_title: '',
  // phone: existingUser.phone || '',
  // role_id: existingUser.role_id || '',
  // is_active: existingUser.is_active !== false,
  // send_invite: false,
  // require_password_change: false,
  // password: '',
  // confirm_password: ''
  // } : {
  // email: '',
  // password: '',
  // confirm_password: '',
  // first_name: '',
  // last_name: '',
  // full_name_ar: '',
  // department: '',
  // job_title: '',
  // custom_job_title: '',
  // phone: '',
  // role_id: '',
  // is_active: true,
  // send_invite: true,
  // require_password_change: true
  // };
  // 
  const fields: FormField[] = [
    {
      id: 'email',
      type: 'email',
      label: 'البريد الإلكتروني',
      placeholder: 'user@example.com',
      required: true,
      disabled: isEditing, // Can't change email for existing users
      icon: <Mail size={16} />,
      validation: validateEmail,
      helpText: isEditing ? 'لا يمكن تغيير البريد الإلكتروني بعد إنشاء الحساب' : 'عنوان البريد الإلكتروني للمستخدم'
    }
  ];

  // Password fields for new users only
  if (!isEditing) {
    fields.push(
      {
        id: 'password',
        type: 'password',
        label: 'كلمة المرور',
        placeholder: 'أدخل كلمة مرور قوية',
        required: true,
        icon: <Lock size={16} />,
        validation: validatePassword,
        helpText: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',

      },
      {
        id: 'confirm_password',
        type: 'password',
        label: 'تأكيد كلمة المرور',
        placeholder: 'أعد كتابة كلمة المرور',
        required: true,
        icon: <Lock size={16} />,
        validation: (value: string) => {
          if (!value || !value.trim()) {
            return { field: 'confirm_password', message: 'تأكيد كلمة المرور مطلوب' };
          }
          if (!value) {
            return { field: 'confirm_password', message: 'كلمات المرور غير متطابقة' };
          }
          return null;
        },
        helpText: 'أعد كتابة كلمة المرور للتأكيد'
      }
    );
  }

  // Personal information fields
  fields.push(
    {
      id: 'first_name',
      type: 'text',
      label: 'الاسم الأول',
      placeholder: 'أدخل الاسم الأول',
      required: true,
      icon: <User size={16} />,
      validation: validateFirstName,
      helpText: 'الاسم الأول للمستخدم'
    },
    {
      id: 'last_name',
      type: 'text',
      label: 'اسم العائلة',
      placeholder: 'أدخل اسم العائلة',
      required: true,
      icon: <User size={16} />,
      validation: validateLastName,
      helpText: 'اسم العائلة للمستخدم'
    },
    {
      id: 'full_name_ar',
      type: 'text',
      label: 'الاسم الكامل بالعربية',
      placeholder: 'الاسم الكامل باللغة العربية (اختياري)',
      icon: <Globe size={16} />,
      helpText: 'الاسم الكامل كما يظهر في المستندات الرسمية'
    },
    {
      id: 'department',
      type: 'select',
      label: 'القسم',
      options: departmentOptions,
      icon: <Building size={16} />,
      helpText: 'القسم الذي يعمل به المستخدم'
    },
    {
      id: 'job_title',
      type: 'select',
      label: 'المسمى الوظيفي',
      options: jobTitleOptions,
      icon: <Briefcase size={16} />,
      helpText: 'المنصب أو الوظيفة'
    }
  );

  // Custom job title field (conditional)
  fields.push({
    id: 'custom_job_title',
    type: 'text',
    label: 'المسمى الوظيفي المخصص',
    placeholder: 'أدخل المسمى الوظيفي',
    icon: <Briefcase size={16} />,
    validation: (value: string) => validateCustomJobTitle(value, ''),
    helpText: 'حدد المسمى الوظيفي إذا اخترت "أخرى"',
    conditionalLogic: (formData) => formData.job_title === 'other'
  });

  // Contact and role fields
  fields.push(
    {
      id: 'phone',
      type: 'tel',
      label: 'رقم الهاتف',
      placeholder: '05xxxxxxxx',
      icon: <Phone size={16} />,
      validation: validatePhone,
      helpText: 'رقم الهاتف (اختياري)'
    },
    {
      id: 'role_id',
      type: 'select',
      label: 'الدور',
      options: roleOptions,
      icon: <UserCheck size={16} />,
      helpText: 'دور المستخدم في النظام'
    },
    {
      id: 'is_active',
      type: 'checkbox',
      label: 'حساب نشط',
      helpText: 'هل الحساب نشط ويمكن استخدامه؟'
    }
  );

  // Additional fields for new users
  if (!isEditing) {
    fields.push(
      {
        id: 'send_invite',
        type: 'checkbox',
        label: 'إرسال دعوة بالبريد الإلكتروني',
        helpText: 'إرسال رسالة ترحيب مع تفاصيل تسجيل الدخول'
      },
      {
        id: 'require_password_change',
        type: 'checkbox',
        label: 'مطالبة بتغيير كلمة المرور',
        helpText: 'مطالبة المستخدم بتغيير كلمة المرور عند أول تسجيل دخول'
      }
    );
  }

  return {
    title: isEditing ? '✏️ تعديل بيانات المستخدم' : '👤 مستخدم جديد',
    subtitle: isEditing 
      ? `تعديل بيانات: ${existingUser?.first_name || ''} ${existingUser?.last_name || ''}`
      : 'إضافة مستخدم جديد إلى النظام',
    formId: 'user-form',
    fields,

    submitLabel: isEditing ? '💾 حفظ التعديلات' : '✨ إنشاء المستخدم',
    cancelLabel: '❌ إلغاء',
    customValidator: (data: any) => {
      const errors: ValidationError[] = [];
      
      // Password confirmation check for new users
      if (!isEditing) {
        if (data.password && data.confirm_password && data.password !== data.confirm_password) {
          errors.push({ 
            field: 'confirm_password', 
            message: 'كلمات المرور غير متطابقة' 
          });
        }
      }
      
      // Custom job title validation
      if (data.job_title === 'other' && (!data.custom_job_title || !data.custom_job_title.trim())) {
        errors.push({ 
          field: 'custom_job_title', 
          message: 'يرجى تحديد المسمى الوظيفي المخصص' 
        });
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },
    autoFillLogic: createUserAutoFillLogic(roles),
    layout: {
      columns: 2,
      responsive: true,
      columnBreakpoints: [
        { field: 'email', fullWidth: true },
        // Password fields side by side for new users
        ...(isEditing ? [] : [
          { field: 'password' },
          { field: 'confirm_password' }
        ]),
        { field: 'first_name' },
        { field: 'last_name' },
        { field: 'full_name_ar', fullWidth: true },
        { field: 'department' },
        { field: 'job_title' },
        { field: 'custom_job_title', fullWidth: true },
        { field: 'phone' },
        { field: 'role_id' },
        { field: 'is_active' },
        ...(isEditing ? [] : [
          { field: 'send_invite' },
          { field: 'require_password_change' }
        ])
      ]
    }
  };
};

export default createUserFormConfig;
