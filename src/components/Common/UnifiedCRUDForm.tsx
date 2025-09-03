import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  Info,
  Star,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import styles from './UnifiedCRUDForm.module.css';
import SearchableSelect, { type SearchableSelectOption } from './SearchableSelect';
import FormLayoutControls from './FormLayoutControls';

// Lightweight validation types to keep this component standalone
export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

// Field Types
export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'select' 
  | 'searchable-select'
  | 'checkbox' 
  | 'textarea' 
  | 'date' 
  | 'tel'
  | 'url';

// Field Configuration
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SearchableSelectOption[];
  // Dynamically compute options based on current form data (overrides static options when provided)
  optionsProvider?: (formData: Record<string, unknown>) => SearchableSelectOption[];
  validation?: (value: unknown) => ValidationError | null;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  helpText?: string;
  icon?: React.ReactNode;
  dependsOn?: string; // Field ID that this field depends on
  // Reset this field when any of these fields change
  dependsOnAny?: string[];
  conditionalLogic?: (formData: Record<string, unknown>) => boolean; // Show/hide field based on other fields
  isClearable?: boolean; // For select fields
  defaultValue?: unknown; // Default value for any field type
  searchable?: boolean; // For searchable-select fields
  clearable?: boolean; // For searchable-select fields
  colSpan?: number; // Column span for layout
  position?: { row: number; col: number }; // Field position in custom layout
  /** Optional hierarchical options for opening a drilldown modal to select from a tree */
  drilldownOptions?: SearchableSelectOption[];
}

// Form Configuration
export type FormConfig = {
  title: string;
  subtitle?: string;
  formId?: string; // Used to scope persisted preferences per-form
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  customValidator?: (data: Record<string, unknown>) => ValidationResult;
  autoFillLogic?: (data: Record<string, unknown>) => Record<string, unknown>;
  layout?: {
    columns?: number; // Number of columns (1, 2, or 3)
    columnBreakpoints?: { field: string; newColumn?: boolean; fullWidth?: boolean }[];
    responsive?: boolean; // Auto-adjust columns based on panel size
  };
}

// Props Interface
export interface UnifiedCRUDFormProps {
  config: FormConfig;
  initialData?: Record<string, unknown>;
  /**
   * Controls whether the form should reset when initialData changes.
   * Default is true (current behavior). Set to false to preserve current entries
   * across parent re-renders (useful to prevent clearing user selections).
   */
  resetOnInitialDataChange?: boolean;
  isLoading?: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  showAutoFillNotification?: boolean;
}

// Exposed handle for external controls (e.g., panel header Save)
export type UnifiedCRUDFormHandle = { submit: () => void; hasUnsavedChanges: () => boolean };

// Main Component
const UnifiedCRUDForm = React.forwardRef<UnifiedCRUDFormHandle, UnifiedCRUDFormProps>((props, ref) => {
  const {
    config,
    initialData = {},
    resetOnInitialDataChange = true,
    isLoading = false,
    onSubmit,
    onCancel,
    showAutoFillNotification = false,
  } = props;
  const { showToast } = useToast();
  // State Management
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  // removed unused fieldStates to satisfy noUnusedLocals
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [showPasswordFields, setShowPasswordFields] = useState<{[key: string]: boolean}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const storageKeyPrefix = React.useMemo(() => {
    const base = config.formId || config.title || 'default';
    return `unifiedForm:${base}:`;
  }, [config.formId, config.title]);

  const [_showOnlyInvalid] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKeyPrefix + '_showOnlyInvalid') === 'true'; } catch { return false; }
  });
  // Layout controls: columns and full-width overrides
  const [columnOverride, setColumnOverride] = useState<'auto' | 1 | 2 | 3>(() => {
    try {
      const v = localStorage.getItem(storageKeyPrefix + 'columns');
      if (v === '1' || v === '2' || v === '3') return Number(v) as 1|2|3;
      return 'auto';
    } catch { return 'auto'; }
  });
  const [fullWidthOverrides, setFullWidthOverrides] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKeyPrefix + 'fullWidth');
      const arr = raw ? JSON.parse(raw) as string[] : [];
      return new Set(arr);
    } catch { return new Set(); }
  });
  const [fieldOrder, setFieldOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKeyPrefix + 'fieldOrder');
      const arr = raw ? JSON.parse(raw) as string[] : [];
      return arr.length > 0 ? arr : config.fields.map(f => f.id);
    } catch { return config.fields.map(f => f.id); }
  });
  const [visibleFields, setVisibleFields] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKeyPrefix + 'visibleFields');
      const arr = raw ? JSON.parse(raw) as string[] : [];
      return arr.length > 0 ? new Set(arr) : new Set(config.fields.map(f => f.id));
    } catch { return new Set(config.fields.map(f => f.id)); }
  });
  const [layoutControlsOpen, setLayoutControlsOpen] = useState(false);

  // Load saved layout configuration on component mount
  useEffect(() => {
    // Initialize default field order if not set
    const defaultOrder = config.fields.map(f => f.id);
    if (fieldOrder.length === 0 || fieldOrder.length !== defaultOrder.length) {
      setFieldOrder(defaultOrder);
    }
    
    try {
      const savedLayoutKey = `form-layout-${config.title || 'default'}`;
      const savedLayout = localStorage.getItem(savedLayoutKey);
      if (savedLayout) {
        const layoutConfig = JSON.parse(savedLayout);
        if (layoutConfig.columnCount && layoutConfig.columnCount !== 'auto') {
          setColumnOverride(layoutConfig.columnCount);
        }
        if (layoutConfig.fullWidthFields && Array.isArray(layoutConfig.fullWidthFields)) {
          setFullWidthOverrides(new Set(layoutConfig.fullWidthFields));
        }
        if (layoutConfig.fieldOrder && Array.isArray(layoutConfig.fieldOrder) && layoutConfig.fieldOrder.length === defaultOrder.length) {
          // Only restore field order if it matches current form fields
          const validOrder = layoutConfig.fieldOrder.filter((id: string) => defaultOrder.includes(id));
          if (validOrder.length === defaultOrder.length) {
            setFieldOrder(layoutConfig.fieldOrder);
          }
        }
      }
    } catch {
      // Silently handle layout loading errors
      void 0;
    }
  }, [config.title, config.fields]);

  // Initialize form data
  useEffect(() => {
    // Only reset when explicitly allowed (default true to preserve existing consumers)
    if (resetOnInitialDataChange) {
      setFormData(initialData);
      setValidationErrors([]);
      setAutoFilledFields([]);
      setTouchedFields(new Set());
    }
  }, [initialData, resetOnInitialDataChange]);

  // On first mount, always seed the form data from initialData
  useEffect(() => {
    setFormData(initialData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist preferences
  useEffect(() => {
    try { localStorage.setItem(storageKeyPrefix + '_showOnlyInvalid', _showOnlyInvalid ? 'true' : 'false'); } catch { void 0; }
  }, [_showOnlyInvalid, storageKeyPrefix]);
  useEffect(() => {
    try { localStorage.setItem(storageKeyPrefix + 'columns', String(columnOverride)); } catch { void 0; }
  }, [columnOverride, storageKeyPrefix]);
  useEffect(() => {
    try { localStorage.setItem(storageKeyPrefix + 'fullWidth', JSON.stringify(Array.from(fullWidthOverrides))); } catch { void 0; }
  }, [fullWidthOverrides, storageKeyPrefix]);
  useEffect(() => {
    try { localStorage.setItem(storageKeyPrefix + 'fieldOrder', JSON.stringify(fieldOrder)); } catch { void 0; }
  }, [fieldOrder, storageKeyPrefix]);
  useEffect(() => {
    try { localStorage.setItem(storageKeyPrefix + 'visibleFields', JSON.stringify(Array.from(visibleFields))); } catch { void 0; }
  }, [visibleFields, storageKeyPrefix]);

  // Auto-fill logic - runs when formData changes or initially when config has auto-fill
  useEffect(() => {
    if (config.autoFillLogic) {
      const autoFilledData = config.autoFillLogic(formData);
      if (Object.keys(autoFilledData).length > 0) {
        // Only apply auto-fill if the field is empty or undefined
        const fieldsToFill: Record<string, unknown> = {};
        const fieldsAutoFilled: string[] = [];
        
        Object.entries(autoFilledData).forEach(([key, value]) => {
          const current = (formData as Record<string, unknown>)[key];
          const isUnset = current === undefined || current === null || (typeof current === 'string' && current === '');
          if (isUnset) {
            (fieldsToFill as Record<string, unknown>)[key] = value as unknown;
            fieldsAutoFilled.push(key);
          }
        });
        
        if (Object.keys(fieldsToFill).length > 0) {
          setFormData((prev) => ({ ...prev, ...fieldsToFill }));
          setAutoFilledFields(prev => Array.from(new Set([...prev, ...fieldsAutoFilled])));
        }
      }
    }
  }, [config.autoFillLogic, formData.parent_id, formData.code]); // Only trigger on parent or code changes

  // Get field error
  const getFieldError = (fieldId: string): ValidationError | null => {
    return validationErrors.find(error => error.field === fieldId) || null;
  };

  // Get field value
  const getFieldValue = (fieldId: string): unknown => {
    return formData[fieldId] ?? '';
  };

  // Check if field is required
  const isFieldRequired = (field: FormField): boolean => {
    return field.required === true;
  };

  // Check if field should be shown
  const shouldShowField = (field: FormField): boolean => {
    // Check visibility setting first
    if (!visibleFields.has(field.id)) {
      return false;
    }
    // Then check conditional logic
    if (field.conditionalLogic) {
      return field.conditionalLogic(formData);
    }
    return true;
  };

  // Handle field change
  const handleFieldChange = (fieldId: string, value: unknown, field: FormField) => {
    const updatedFormData = { ...formData, [fieldId]: value };
    setFormData(updatedFormData);

    // Mark field as touched
    setTouchedFields(prev => new Set(Array.from(prev).concat([fieldId])));

    // Live validation: required + custom
    const newErrors: ValidationError[] = [];
    if (isFieldRequired(field)) {
      const empty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
      if (empty) newErrors.push({ field: fieldId, message: `${field.label} مطلوب` });
    }
    if (field.validation && value) {
      const customErr = field.validation(value);
      if (customErr) newErrors.push(customErr);
    }
    setValidationErrors(prev => {
      const filtered = prev.filter(e => e.field !== fieldId);
      return [...filtered, ...newErrors];
    });

    // Handle dependent fields
    config.fields.forEach((f: FormField) => {
      const depends = f.dependsOn === fieldId;
      const dependsAny = Array.isArray(f.dependsOnAny) && f.dependsOnAny.includes(fieldId);
      if (depends || dependsAny) {
        // Reset dependent field value if needed
        if (updatedFormData[f.id] !== undefined) {
          updatedFormData[f.id] = '';
        }
      }
    });

    if (updatedFormData !== formData) {
      setFormData(updatedFormData);
    }
  };

  // Validate form
  const validateForm = (): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate each field
    config.fields.forEach((field: FormField) => {
      if (!shouldShowField(field)) return;

      const value = getFieldValue(field.id);

      // Required field validation
      if (isFieldRequired(field) && (!value || (typeof value === 'string' && !value.trim()))) {
        errors.push({
          field: field.id,
          message: `${field.label} مطلوب`
        });
      }

      // Custom field validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          errors.push(error);
        }
      }
    });

    // Custom form validation
    if (config.customValidator) {
      const customValidation = config.customValidator(formData);
      errors.push(...customValidation.errors);
    }

    setValidationErrors(errors);
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const scrollToField = (fieldId: string) => {
    const el = document.getElementById(fieldId) as HTMLElement | null;
    if (el) {
      el.focus();
      try { (el as HTMLInputElement | HTMLTextAreaElement).select?.(); } catch {}
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      // Mark all fields as touched to show validation errors
      const allFieldIds = config.fields.map((f: FormField) => f.id);
      setTouchedFields(new Set(allFieldIds));
      // Focus and scroll to the first invalid field
      const firstInvalid = validation.errors[0]?.field;
      if (firstInvalid) {
        scrollToField(firstInvalid);
      }
      try { showToast?.(`يوجد ${validation.errors.length} خطأ — تم الانتقال لأول حقل غير صالح`, { severity: 'error' }); } catch { void 0; }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: unknown) {
      // If submitter throws fieldErrors, surface them
      const maybe = err as { fieldErrors?: unknown } | null;
      if (maybe && Array.isArray(maybe.fieldErrors)) {
        setValidationErrors(maybe.fieldErrors as ValidationError[]);
        const allFieldIds = config.fields.map((f: FormField) => f.id);
        setTouchedFields(new Set(allFieldIds));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute unsaved changes by shallow compare against initialData for configured fields
  const hasUnsavedChangesInternal = React.useCallback(() => {
    try {
      const fieldIds = new Set(config.fields.map(f => f.id).concat(['is_active','allow_transactions','level','parent_id']));
      for (const key of fieldIds) {
        const cur = (formData as Record<string, unknown>)[key];
        const init = (initialData as Record<string, unknown>)[key];
        const norm = (v: unknown) => typeof v === 'string' ? v.trim() : v;
        if (norm(cur) !== norm(init)) return true;
      }
      return false;
    } catch {
      return true; // be safe
    }
  }, [config.fields, formData, initialData]);

  // Expose submit() and hasUnsavedChanges() to parent
  React.useImperativeHandle(ref, () => ({
    submit: () => {
      const formEl = document.getElementById('unified-crud-form') as HTMLFormElement | null;
      if (formEl) {
        // Programmatically submit the form
        formEl.requestSubmit();
      }
    },
    hasUnsavedChanges: () => hasUnsavedChangesInternal()
  }));

  // Toggle password visibility
  const togglePasswordVisibility = (fieldId: string) => {
    setShowPasswordFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // Get column layout configuration
  const getColumnConfig = () => {
    // If columnOverride is manually set (not 'auto'), use it directly without responsive logic
    if (columnOverride !== 'auto') {
      return columnOverride;
    }
    
    const defaultColumns = config.layout?.columns || 1;
    const isResponsive = config.layout?.responsive !== false; // Default to true;
    
    // Auto-adjust columns based on form width if responsive and in auto mode
    if (isResponsive) {
      // Assume we can estimate form width - in a real scenario, you might use ResizeObserver
      const estimatedWidth = window.innerWidth;
      if (estimatedWidth > 800 && defaultColumns === 1) return 2;
      if (estimatedWidth > 1200 && defaultColumns <= 2) return 3;
    }
    
    return Math.min(Math.max(defaultColumns, 1), 3); // Ensure between 1-3 columns
  };

  // Organize fields into columns
  const organizeFieldsIntoColumns = () => {
    // Get visible fields in the specified order
    const allVisibleFields = config.fields.filter(shouldShowField);
    const orderedFields = fieldOrder.length > 0 
      ? fieldOrder.map(id => allVisibleFields.find(f => f.id === id)).filter(Boolean) as FormField[]
      : allVisibleFields;
    
    const columns = getColumnConfig();
    const breakpoints = (config.layout?.columnBreakpoints || []).map(bp => ({...bp}));
    // Apply runtime full-width overrides
    for (const bp of breakpoints) {
      if (fullWidthOverrides.has(bp.field)) bp.fullWidth = true;
    }
    // Also ensure overrides exist even if not in breakpoints
    orderedFields.forEach(f => {
      if (fullWidthOverrides.has(f.id) && !breakpoints.find(bp => bp.field === f.id)) {
        breakpoints.push({ field: f.id, fullWidth: true });
      }
    });
    
    if (columns === 1) {
      return [orderedFields];
    }
    
    const result: FormField[][] = Array.from({ length: columns }, () => []);
    let currentColumn = 0;
    
    orderedFields.forEach((field: FormField) => {
      // Check for breakpoint
      const breakpoint = breakpoints.find((bp: { field: string; newColumn?: boolean; fullWidth?: boolean }) => bp.field === field.id);
      if (breakpoint?.newColumn && currentColumn < columns - 1) {
        currentColumn++;
      }
      
      result[currentColumn].push(field);
      
      // Move to next column for balanced distribution
      if (!breakpoint?.fullWidth) {
        currentColumn = (currentColumn + 1) % columns;
      }
    });
    
    return result.filter(column => column.length > 0);
  };

  // Render field based on type
  const renderField = (field: FormField) => {
    if (!shouldShowField(field)) return null;

    const value = getFieldValue(field.id);
    const error = getFieldError(field.id);
    // const isAutoFilled = autoFilledFields.includes(field.id);
    const isTouched = touchedFields.has(field.id);
    const showError = error && isTouched;
    const showSuccess = isTouched && !error;

    // Resolve options: prefer dynamic optionsProvider when present
    const fieldOptions = field.optionsProvider ? (field.optionsProvider(formData) || []) : (field.options || []);
    
    // Check if this field should span full width
    // const isFullWidth = _breakpoint?.fullWidth;

    const inputClasses = [
      styles.inputBase,
      showError ? styles.inputError : '',
      showSuccess ? styles.inputSuccess : '',
    ].filter(Boolean).join(' ');

    if (field.type === 'select') {
      return (
        <select
          id={field.id}
          name={field.id}
          value={value as string}
          onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
          disabled={field.disabled || isLoading}
          required={isFieldRequired(field)}
          className={[inputClasses, styles.inputSelect, (field.disabled || isLoading) ? styles.inputDisabled : ''].filter(Boolean).join(' ')}
        >
          <option value="">{field.placeholder || `اختر ${field.label}`}</option>
          {fieldOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'searchable-select') {
      return (
        <SearchableSelect
          id={field.id}
          value={value as string}
          options={fieldOptions}
          onChange={(selectedValue) => handleFieldChange(field.id, selectedValue, field)}
          placeholder={field.placeholder}
          disabled={field.disabled || isLoading}
          clearable={field.isClearable !== false}
          required={isFieldRequired(field)}
          error={!!showError}
          // Drilldown modal support (if provided by field)
          showDrilldownModal={!!field.drilldownOptions}
          treeOptions={field.drilldownOptions}
        />
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
          <input
            type="checkbox"
            id={field.id}
            name={field.id}
            checked={Boolean(value)}
            onChange={(e) => handleFieldChange(field.id, e.target.checked, field)}
            disabled={field.disabled || isLoading}
            style={{
              transform: 'scale(1.2)',
              accentColor: 'var(--primary-blue)'
            }}
          />
          <span style={{ 
            color: value ? '#10b981' : 'var(--text-secondary)', 
            fontWeight: '600',
            transition: 'color 0.2s ease'
          }}>
            {value ? '✅' : '⬜'} {field.label}
          </span>
        </label>
      );
    }

    if (field.type === 'textarea') {
      // Make textarea fields consistently compact - 1 row for both description and notes
      const defaultRows = 1;
      const actualRows = field.rows || defaultRows;
      return (
        <textarea
          id={field.id}
          name={field.id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
          placeholder={field.placeholder}
          disabled={field.disabled || isLoading}
          required={isFieldRequired(field)}
          rows={actualRows}
          className={[inputClasses, styles.textarea, (field.disabled || isLoading) ? styles.inputDisabled : ''].filter(Boolean).join(' ')}
          style={{
            minHeight: actualRows === 1 ? '48px' : 'auto',
            height: actualRows === 1 ? '48px' : 'auto',
            resize: 'vertical',
            lineHeight: '1.4',
            overflow: 'hidden'
          }}
        />
      );
    }

    if (field.type === 'password') {
      return (
        <div className={styles.passwordWrapper}>
          <input
            type={showPasswordFields[field.id] ? 'text' : 'password'}
            id={field.id}
            name={field.id}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
            placeholder={field.placeholder}
            disabled={field.disabled || isLoading}
            required={isFieldRequired(field)}
            autoComplete={field.autoComplete}
            className={[inputClasses, styles.passwordInput, (field.disabled || isLoading) ? styles.inputDisabled : ''].filter(Boolean).join(' ')}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility(field.id)}
            className={styles.passwordToggle}
          >
            {showPasswordFields[field.id] ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      );
    }

    // Default input field
    return (
      <input
        type={field.type}
        id={field.id}
        name={field.id}
        value={typeof value === 'number' || typeof value === 'string' ? value : ''}
        onChange={(e) => {
          const inputValue = field.type === 'number' ? (e.target.value === '' ? '' : (Number.isNaN(Number(e.target.value)) ? '' : Number(e.target.value))) : e.target.value;
          handleFieldChange(field.id, inputValue, field);
        }}
        placeholder={field.placeholder}
        disabled={field.disabled || isLoading}
        required={isFieldRequired(field)}
        autoComplete={field.autoComplete}
        min={field.min}
        max={field.max}
        step={field.step}
        className={[
          inputClasses,
          (field.type === 'number' || field.id === 'code') ? styles.inputMonospace : '',
          (field.disabled || isLoading) ? styles.inputDisabled : ''
        ].filter(Boolean).join(' ')}
      />
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Auto-fill notification */}
      {showAutoFillNotification && autoFilledFields.length > 0 && (
        <div className={styles.autoFillBadge}>
          <Lightbulb size={14} />
          ✅ تم تعبئة البيانات المقترحة تلقائياً
        </div>
      )}
      
      <form id="unified-crud-form" onSubmit={handleSubmit} className={styles.form}>
        {/* Form Header */}
        <div className={styles.headerRow}>
          <div>
            <h3 className={styles.headerTitle}>
              {config.title}
            </h3>
            {config.subtitle && (
              <p className={styles.headerSubtitle}>
                {config.subtitle}
              </p>
            )}
          </div>
          {validationErrors.length > 0 && (
            <div className={styles.errorChip}>
              <AlertCircle size={14} />
              🚨 {validationErrors.length} خطأ في البيانات
            </div>
          )}
        </div>

        {/* Layout Controls */}
        <FormLayoutControls
          fields={config.fields}
          fieldOrder={fieldOrder}
          columnCount={getColumnConfig()}
          onColumnCountChange={(count) => setColumnOverride(count)}
          onFieldOrderChange={(newOrder) => setFieldOrder(newOrder)}
          fullWidthFields={fullWidthOverrides}
          onFullWidthToggle={(fieldId) => {
            setFullWidthOverrides(prev => {
              const newSet = new Set(prev);
              if (newSet.has(fieldId)) {
                newSet.delete(fieldId);
              } else {
                newSet.add(fieldId);
              }
              return newSet;
            });
          }}
          visibleFields={visibleFields}
          onVisibilityToggle={(fieldId) => {
            setVisibleFields(prev => {
              const newSet = new Set(prev);
              if (newSet.has(fieldId)) {
                newSet.delete(fieldId);
              } else {
                newSet.add(fieldId);
              }
              return newSet;
            });
          }}
          onSaveLayout={() => {
            try {
              const layoutConfig = {
                formType: config.title || 'default',
                columnCount: getColumnConfig(),
                fullWidthFields: Array.from(fullWidthOverrides),
                fieldOrder: fieldOrder,
                timestamp: new Date().toISOString()
              };
              localStorage.setItem(`form-layout-${config.title || 'default'}`, JSON.stringify(layoutConfig));
              showToast?.('تم حفظ إعدادات التخطيط بنجاح', { severity: 'success' });
            } catch {
              showToast?.('فشل في حفظ إعدادات التخطيط', { severity: 'error' });
            }
          }}
          onResetLayout={() => {
            setColumnOverride('auto');
            setFullWidthOverrides(new Set());
            setFieldOrder(config.fields.map(f => f.id));
            try {
              localStorage.removeItem(`form-layout-${config.title || 'default'}`);
              showToast?.('تم إعادة تعيين إعدادات التخطيط', { severity: 'info' });
            } catch {
              // Silently handle error - user already gets toast notification
              void 0;
            }
          }}
          isOpen={layoutControlsOpen}
          onToggle={() => setLayoutControlsOpen(!layoutControlsOpen)}
        />
        
        {/* Form Fields with Column Layout */}
        {(() => {
          const fieldColumns = organizeFieldsIntoColumns();
          const actualColumnCount = getColumnConfig(); // Use actual column config, not fieldColumns.length
          const breakpoints = config.layout?.columnBreakpoints || [];
          
          // Check for any full-width fields that need special handling
          const fullWidthFields = config.fields.filter((field: FormField) => {
            // Check both config breakpoints AND runtime overrides
            const isInBreakpoints = breakpoints.find((bp: { field: string; newColumn?: boolean; fullWidth?: boolean }) => bp.field === field.id)?.fullWidth;
            const isInOverrides = fullWidthOverrides.has(field.id);
            return isInBreakpoints || isInOverrides;
          });
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {/* Full-width fields first */}
              {fullWidthFields.map(field => shouldShowField(field) && (
                <div key={`full-${field.id}`} className={styles.fullWidthBlock}>
                  {/* Field Label */}
                  {field.type !== 'checkbox' && (
                    <label htmlFor={field.id} className={styles.labelRow}>
                      {field.icon && <span>{field.icon}</span>}
                      <span>{field.label}</span>
                      {field.helpText && (
                        <span 
                          style={{ 
                            color: '#64748b', 
                            fontSize: '11px', 
                            marginLeft: '6px',
                            fontWeight: '400',
                            opacity: '0.8'
                          }}
                          title={field.helpText}
                        >
                          ({field.helpText.length > 30 ? field.helpText.substring(0, 30) + '...' : field.helpText})
                        </span>
                      )}
                      {touchedFields.has(field.id) && !getFieldError(field.id) && (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} />
                        </span>
                      )}
                      {isFieldRequired(field) && (
                        <span className={styles.requiredStar}>
                          <Star size={12} fill="currentColor" />
                        </span>
                      )}
                      {autoFilledFields.includes(field.id) && (
                        <span className={styles.autoFilledPill}>
                          تم التعبئة تلقائياً
                        </span>
                      )}
                    </label>
                  )}
                  
                  {/* Field Input */}
                  {renderField(field)}
                  
                  {/* Field Error */}
                  {getFieldError(field.id) && touchedFields.has(field.id) && (
                    <div className={styles.errorText}>
                      <AlertCircle size={12} />
                      {getFieldError(field.id)?.message}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Column Layout for remaining fields */}
              <div
                className={styles.gridContainer}
                data-columns={actualColumnCount}
                style={{ gridTemplateColumns: actualColumnCount === 1 ? '1fr' : actualColumnCount === 2 ? '1fr 1fr' : '1fr 1fr 1fr' }}
              >
                {fieldColumns.map((column, columnIndex) => (
                  <div key={`column-${columnIndex}`} className={styles.columnContainer}>
                    {column
                      .filter((field: FormField) => {
                        const isInBreakpoints = breakpoints.find((bp: { field: string; newColumn?: boolean; fullWidth?: boolean }) => bp.field === field.id)?.fullWidth;
                        const isInOverrides = fullWidthOverrides.has(field.id);
                        return !(isInBreakpoints || isInOverrides);
                      })
                      .map((field: FormField) => (
                      <div key={field.id} className={styles.fieldBlock} style={{ minHeight: 'fit-content' }}>
                        {/* Field Label */}
                        {field.type !== 'checkbox' && (
                          <label htmlFor={field.id} className={styles.labelRow}>
                            {field.icon && <span>{field.icon}</span>}
                            <span>{field.label}</span>
                            {field.helpText && (
                              <span 
                                style={{ 
                                  color: '#64748b', 
                                  fontSize: '11px', 
                                  marginLeft: '6px',
                                  fontWeight: '400',
                                  opacity: '0.8'
                                }}
                                title={field.helpText}
                              >
                                ({field.helpText.length > 30 ? field.helpText.substring(0, 30) + '...' : field.helpText})
                              </span>
                            )}
                            {touchedFields.has(field.id) && !getFieldError(field.id) && (
                              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={14} />
                              </span>
                            )}
                            {isFieldRequired(field) && (
                              <span className={styles.requiredStar}>
                                <Star size={12} fill="currentColor" />
                              </span>
                            )}
                            {autoFilledFields.includes(field.id) && (
                              <span className={styles.autoFilledPill}>
                                تم التعبئة تلقائياً
                              </span>
                            )}
                          </label>
                        )}
                        
                        {/* Field Input */}
                        {renderField(field)}
                        
                        {/* Field Error */}
                        {getFieldError(field.id) && touchedFields.has(field.id) && (
                          <div style={{ 
                            color: '#ef4444', 
                            fontSize: '12px', 
                            marginTop: '4px', 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertCircle size={12} />
                            {getFieldError(field.id)?.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Column Layout Info */}
              {actualColumnCount > 1 && (
                <div style={{
                  marginTop: '16px',
                  padding: '8px 12px',
                  background: 'var(--info-bg)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid var(--border-light)'
                }}>
                  <Info size={14} />
                  📊 عرض متوازي: {actualColumnCount} أعمدة • {fullWidthFields.length} حقل كامل العرض • تصميم مرن وتفاعلي
                </div>
              )}
            </div>
          );
        })()}
        
        {/* Validation Errors Summary */}
        {validationErrors.length > 0 && (
          <div className={styles.errorSummary}>
            <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} />
              🚨 يرجى تصحيح الأخطاء التالية:
            </div>
            <ul className={styles.listReset}>
              {validationErrors.map((error, index) => (
                <li key={index} className={styles.listItem}>
                  <button type="button" onClick={() => scrollToField(error.field)} className={styles.errorLink}>
                    {error.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className={styles.actionsRow}>
          <button 
            type="submit" 
            disabled={isLoading || isSubmitting}
            className={`ultimate-btn ultimate-btn-add ${styles.btnGrow}`}
          >
            <div className="btn-content">
              <div className={`btn-icon ${isSubmitting ? 'spinning' : ''}`}>
                {isSubmitting ? (
                  <Loader2 size={16} />
                ) : (
                  <Save size={16} />
                )}
              </div>
              <span className="btn-text">
                {config.submitLabel || (isSubmitting ? 'جاري الحفظ...' : '💾 حفظ البيانات')}
              </span>
            </div>
          </button>
          
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
            className={`ultimate-btn ultimate-btn-delete ${styles.btnGrow}`}
          >
            <div className="btn-content">
              <X size={16} />
              <span className="btn-text">{config.cancelLabel || '❌ إلغاء'}</span>
            </div>
          </button>
        </div>
      </form>
      
    </div>
  );
});

export default UnifiedCRUDForm;
