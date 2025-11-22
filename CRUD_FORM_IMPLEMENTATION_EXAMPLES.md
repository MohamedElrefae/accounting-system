# UnifiedCRUDForm Implementation Examples

## Example 1: Transaction Form with Dependencies

```typescript
const transactionFormConfig: FormConfig = {
  title: 'إضافة معاملة جديدة',
  subtitle: 'ملء بيانات المعاملة المالية',
  formId: 'transaction-form',
  fields: [
    // Main Account Section
    {
      id: 'main_account',
      type: 'searchable-select',
      label: 'الحساب الرئيسي',
      section: 'الحسابات',
      priority: 1,
      required: true,
      placeholder: 'اختر الحساب الرئيسي',
      helpText: 'اختر الحساب الرئيسي للمعاملة',
      options: mainAccounts,
      showDependencyIndicator: false
    },
    {
      id: 'sub_account',
      type: 'searchable-select',
      label: 'الحساب الفرعي',
      section: 'الحسابات',
      priority: 2,
      required: true,
      placeholder: 'اختر الحساب الفرعي',
      helpText: 'يعتمد على اختيار الحساب الرئيسي',
      dependsOn: 'main_account',
      showDependencyIndicator: true,
      dependencyErrorMessage: 'يرجى اختيار الحساب الرئيسي أولاً',
      optionsProvider: async (formData) => {
        if (!formData.main_account) return [];
        const response = await fetch(`/api/accounts/${formData.main_account}/sub-accounts`);
        return response.json();
      }
    },
    
    // Transaction Details Section
    {
      id: 'transaction_date',
      type: 'date',
      label: 'تاريخ المعاملة',
      section: 'التفاصيل',
      priority: 1,
      required: true,
      helpText: 'تاريخ إجراء المعاملة',
      defaultValue: new Date().toISOString().split('T')[0]
    },
    {
      id: 'amount',
      type: 'number',
      label: 'المبلغ',
      section: 'التفاصيل',
      priority: 2,
      required: true,
      placeholder: '0.00',
      helpText: 'أدخل المبلغ بالعملة المحددة',
      min: 0,
      step: 0.01,
      validation: (value) => {
        const num = Number(value);
        if (num <= 0) {
          return { field: 'amount', message: 'المبلغ يجب أن يكون أكبر من صفر' };
        }
        return null;
      }
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'الوصف',
      section: 'التفاصيل',
      priority: 3,
      placeholder: 'أدخل وصفاً للمعاملة',
      helpText: 'وصف مفصل للمعاملة (اختياري)',
      rows: 1
    },
    
    // Additional Options Section
    {
      id: 'is_reconciled',
      type: 'checkbox',
      label: 'تم التوفيق',
      section: 'خيارات إضافية',
      priority: 1,
      helpText: 'هل تم توفيق هذه المعاملة مع البيانات الخارجية؟'
    },
    {
      id: 'reference_number',
      type: 'text',
      label: 'رقم المرجع',
      section: 'خيارات إضافية',
      priority: 2,
      placeholder: 'رقم المرجع الخارجي',
      helpText: 'رقم المرجع من النظام الخارجي (اختياري)'
    }
  ],
  layout: {
    columns: 2,
    responsive: true
  },
  customValidator: (data) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check if amount is reasonable
    if (Number(data.amount) > 1000000) {
      warnings.push({
        field: 'amount',
        message: 'المبلغ كبير جداً - يرجى التحقق من صحته'
      });
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
};
```

## Example 2: User Profile Form with Auto-Fill

```typescript
const userProfileFormConfig: FormConfig = {
  title: 'ملف المستخدم الشخصي',
  subtitle: 'تحديث معلومات الملف الشخصي',
  formId: 'user-profile-form',
  fields: [
    {
      id: 'full_name',
      type: 'text',
      label: 'الاسم الكامل',
      required: true,
      placeholder: 'أدخل الاسم الكامل',
      helpText: 'الاسم الأول والأخير',
      validation: (value) => {
        const str = String(value).trim();
        if (str.split(' ').length < 2) {
          return { field: 'full_name', message: 'يرجى إدخال الاسم الأول والأخير' };
        }
        return null;
      }
    },
    {
      id: 'email',
      type: 'email',
      label: 'البريد الإلكتروني',
      required: true,
      placeholder: 'example@domain.com',
      helpText: 'سيتم استخدامه لتسجيل الدخول',
      validation: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return { field: 'email', message: 'البريد الإلكتروني غير صحيح' };
        }
        return null;
      }
    },
    {
      id: 'phone',
      type: 'tel',
      label: 'رقم الهاتف',
      placeholder: '+966501234567',
      helpText: 'رقم الهاتف مع رمز الدولة',
      validation: (value) => {
        if (value && !/^\+?[\d\s\-()]+$/.test(String(value))) {
          return { field: 'phone', message: 'رقم الهاتف غير صحيح' };
        }
        return null;
      }
    },
    {
      id: 'department',
      type: 'searchable-select',
      label: 'القسم',
      required: true,
      placeholder: 'اختر القسم',
      helpText: 'القسم الذي تعمل به',
      options: departments
    },
    {
      id: 'role',
      type: 'searchable-select',
      label: 'الدور الوظيفي',
      required: true,
      placeholder: 'اختر الدور',
      helpText: 'دورك الوظيفي في المنظمة',
      dependsOn: 'department',
      showDependencyIndicator: true,
      optionsProvider: async (formData) => {
        if (!formData.department) return [];
        const response = await fetch(`/api/roles?department=${formData.department}`);
        return response.json();
      }
    },
    {
      id: 'bio',
      type: 'textarea',
      label: 'السيرة الذاتية',
      placeholder: 'أخبرنا عن نفسك',
      helpText: 'نبذة قصيرة عنك (اختياري)',
      rows: 1
    }
  ],
  autoFillLogic: (data) => {
    // Auto-fill based on email domain
    if (data.email && String(data.email).includes('@company.com')) {
      return {
        department: 'IT' // Example auto-fill
      };
    }
    return {};
  }
};
```

## Example 3: Compact Form with Sections

```typescript
const compactFormConfig: FormConfig = {
  title: 'نموذج سريع',
  formId: 'compact-form',
  fields: [
    {
      id: 'category',
      type: 'select',
      label: 'الفئة',
      section: 'معلومات أساسية',
      required: true,
      options: categories
    },
    {
      id: 'name',
      type: 'text',
      label: 'الاسم',
      section: 'معلومات أساسية',
      required: true,
      placeholder: 'أدخل الاسم'
    },
    {
      id: 'status',
      type: 'select',
      label: 'الحالة',
      section: 'معلومات إضافية',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' }
      ]
    },
    {
      id: 'notes',
      type: 'textarea',
      label: 'ملاحظات',
      section: 'معلومات إضافية',
      rows: 1,
      placeholder: 'أي ملاحظات إضافية'
    }
  ],
  layout: {
    columns: 1,
    responsive: true
  }
};
```

## Example 4: Using the Form in a Component

```typescript
import UnifiedCRUDForm, { FormConfig } from './UnifiedCRUDForm';

export function TransactionModal() {
  const { showToast } = useToast();
  const formRef = useRef<UnifiedCRUDFormHandle>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      showToast('تم حفظ المعاملة بنجاح', { severity: 'success' });
      // Close modal or reset form
    } catch (error) {
      showToast('فشل في حفظ المعاملة', { severity: 'error' });
    }
  };

  return (
    <UnifiedCRUDForm
      ref={formRef}
      config={transactionFormConfig}
      initialData={{}}
      onSubmit={handleSubmit}
      onCancel={() => {/* close modal */}}
      showAutoFillNotification={true}
    />
  );
}
```

## Example 5: Advanced Validation

```typescript
const advancedFormConfig: FormConfig = {
  title: 'نموذج متقدم',
  fields: [
    {
      id: 'password',
      type: 'password',
      label: 'كلمة المرور',
      required: true,
      helpText: 'يجب أن تكون 8 أحرف على الأقل',
      validation: (value) => {
        const str = String(value);
        if (str.length < 8) {
          return { field: 'password', message: 'كلمة المرور قصيرة جداً' };
        }
        if (!/[A-Z]/.test(str)) {
          return { field: 'password', message: 'يجب أن تحتوي على حرف كبير' };
        }
        if (!/[0-9]/.test(str)) {
          return { field: 'password', message: 'يجب أن تحتوي على رقم' };
        }
        return null;
      }
    },
    {
      id: 'confirm_password',
      type: 'password',
      label: 'تأكيد كلمة المرور',
      required: true,
      helpText: 'أعد إدخال كلمة المرور'
    }
  ],
  customValidator: (data) => {
    const errors: ValidationError[] = [];
    
    if (data.password !== data.confirm_password) {
      errors.push({
        field: 'confirm_password',
        message: 'كلمات المرور غير متطابقة'
      });
    }
    
    return { isValid: errors.length === 0, errors };
  }
};
```

## Tips and Best Practices

1. **Use Sections**: Group related fields using the `section` property for better organization
2. **Set Priorities**: Use `priority` to control field order within sections
3. **Add Help Text**: Always provide helpful hints for complex fields
4. **Use Dependencies**: Leverage `dependsOn` to create cascading selects
5. **Validate Early**: Use field-level validation for immediate feedback
6. **Custom Validators**: Use `customValidator` for cross-field validation
7. **Auto-Fill**: Use `autoFillLogic` to reduce user input
8. **Show Indicators**: Enable `showDependencyIndicator` for dependent fields
9. **Responsive Layout**: Set `responsive: true` for mobile-friendly forms
10. **Error Messages**: Provide clear, actionable error messages in Arabic

## Performance Tips

- Use `optionsProvider` for large option lists instead of static `options`
- Memoize expensive computations in validators
- Use `resetOnInitialDataChange: false` to preserve user input during parent re-renders
- Leverage field-level validation for immediate feedback without form submission
