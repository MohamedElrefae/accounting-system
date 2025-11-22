# UnifiedCRUDForm Quick Reference Guide

## What's New

### 🔗 Field Dependencies
Fields can now depend on other fields and automatically disable/enable based on their state.

```typescript
{
  id: 'sub_account',
  dependsOn: 'main_account',
  showDependencyIndicator: true,
  dependencyErrorMessage: 'اختر الحساب الرئيسي أولاً'
}
```

### 📋 Field Sections
Organize fields into logical groups for better UX.

```typescript
{
  id: 'amount',
  section: 'التفاصيل',
  priority: 1
}
```

### 💡 Better Help Text
Help text now displays below labels with proper styling.

```typescript
{
  id: 'email',
  helpText: 'سيتم استخدامه لتسجيل الدخول'
}
```

### ⚡ Async Options Loading
Options can be loaded dynamically with loading indicators.

```typescript
{
  id: 'sub_account',
  optionsProvider: async (formData) => {
    const response = await fetch(`/api/accounts/${formData.main_account}`);
    return response.json();
  }
}
```

### ✨ Auto-Fill Indicators
Auto-filled fields show clear visual feedback.

```typescript
{
  id: 'department',
  autoFillLogic: (data) => ({
    department: 'IT'
  })
}
```

## Field Types

| Type | Usage | Example |
|------|-------|---------|
| `text` | Simple text input | Name, email |
| `email` | Email validation | Email address |
| `password` | Hidden password input | Password field |
| `number` | Numeric input | Amount, quantity |
| `select` | Basic dropdown | Category selection |
| `searchable-select` | Searchable dropdown | Account selection |
| `checkbox` | Boolean toggle | Is active, is reconciled |
| `textarea` | Multi-line text | Description, notes |
| `date` | Date picker | Transaction date |
| `tel` | Phone number | Contact number |
| `url` | URL input | Website link |

## Common Patterns

### Pattern 1: Cascading Selects
```typescript
// Main account → Sub account
{
  id: 'sub_account',
  dependsOn: 'main_account',
  optionsProvider: async (formData) => {
    if (!formData.main_account) return [];
    const res = await fetch(`/api/accounts/${formData.main_account}`);
    return res.json();
  }
}
```

### Pattern 2: Conditional Fields
```typescript
{
  id: 'other_details',
  conditionalLogic: (formData) => {
    return formData.type === 'other';
  }
}
```

### Pattern 3: Cross-Field Validation
```typescript
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
```

### Pattern 4: Field-Level Validation
```typescript
{
  id: 'amount',
  validation: (value) => {
    const num = Number(value);
    if (num <= 0) {
      return { field: 'amount', message: 'المبلغ يجب أن يكون موجباً' };
    }
    return null;
  }
}
```

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.form` | Main form container |
| `.formSection` | Section container |
| `.sectionTitle` | Section header |
| `.fieldBlock` | Individual field wrapper |
| `.labelRow` | Field label row |
| `.inputBase` | Base input styling |
| `.inputError` | Error state styling |
| `.inputSuccess` | Success state styling |
| `.errorText` | Error message styling |
| `.infoText` | Info/help text styling |
| `.autoFilledPill` | Auto-fill indicator |
| `.fullWidthBlock` | Full-width field container |

## Props Reference

### UnifiedCRUDFormProps
```typescript
{
  config: FormConfig;                    // Form configuration
  initialData?: Record<string, unknown>; // Initial form values
  resetOnInitialDataChange?: boolean;    // Reset on data change (default: true)
  isLoading?: boolean;                   // Loading state
  onSubmit: (data) => Promise<void>;     // Submit handler
  onCancel: () => void;                  // Cancel handler
  showAutoFillNotification?: boolean;    // Show auto-fill badge
  hideDefaultActions?: boolean;          // Hide Save/Cancel buttons
}
```

### FormField Properties
```typescript
{
  id: string;                            // Unique field ID
  type: FieldType;                       // Field type
  label: string;                         // Display label
  placeholder?: string;                  // Placeholder text
  required?: boolean;                    // Is required
  disabled?: boolean;                    // Is disabled
  options?: SearchableSelectOption[];    // Static options
  optionsProvider?: (data) => Promise;   // Dynamic options
  validation?: (value) => ValidationError | null;
  helpText?: string;                     // Help text below label
  icon?: React.ReactNode;                // Icon before label
  dependsOn?: string;                    // Depends on field ID
  dependsOnAny?: string[];               // Depends on multiple fields
  conditionalLogic?: (data) => boolean;  // Show/hide logic
  section?: string;                      // Section name
  priority?: number;                     // Order in section
  showDependencyIndicator?: boolean;     // Show dependency badge
  dependencyErrorMessage?: string;       // Custom dependency message
  defaultValue?: unknown;                // Default value
  drilldownOptions?: SearchableSelectOption[]; // Tree options
}
```

## Styling Customization

### CSS Variables
```css
--content-bg          /* Form background */
--text-primary        /* Primary text color */
--border-light        /* Light border color */
--primary-blue        /* Primary accent color */
--error               /* Error color */
--success             /* Success color */
--input-bg            /* Input background */
--border-color        /* Border color */
```

### Override Styles
```css
.form {
  background-color: var(--content-bg);
  border-radius: 12px;
  padding: 24px;
}

.fieldBlock {
  margin-bottom: 16px;
}

.labelRow {
  font-weight: 600;
  margin-bottom: 8px;
}
```

## Common Issues & Solutions

### Issue: Field not showing
**Solution**: Check `visibleFields` in localStorage or `conditionalLogic`

### Issue: Dependent field not updating
**Solution**: Ensure `dependsOn` field ID is correct and `optionsProvider` is async

### Issue: Validation not triggering
**Solution**: Make sure field is marked as `touched` before showing errors

### Issue: Auto-fill not working
**Solution**: Check `autoFillLogic` returns correct field IDs and `showAutoFillNotification` is true

### Issue: Options not loading
**Solution**: Check `optionsProvider` returns array and handles errors properly

## Performance Tips

1. **Memoize validators**: Expensive validation functions should be memoized
2. **Use async options**: For large datasets, use `optionsProvider` instead of static options
3. **Debounce searches**: SearchableSelect handles this internally
4. **Lazy load sections**: Consider lazy loading for forms with many sections
5. **Avoid deep nesting**: Keep form structure flat for better performance

## Accessibility

- All fields have proper labels
- Error messages are clear and actionable
- Keyboard navigation fully supported
- Screen reader friendly
- High contrast colors for visibility
- Arabic language support

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Next Steps

1. Review `CRUD_FORM_IMPROVEMENTS.md` for detailed changes
2. Check `CRUD_FORM_IMPLEMENTATION_EXAMPLES.md` for code examples
3. Test with your specific use cases
4. Customize CSS variables for your theme
5. Add custom validators for your business logic
