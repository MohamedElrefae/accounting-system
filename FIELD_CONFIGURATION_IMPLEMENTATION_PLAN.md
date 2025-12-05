# Field Configuration Implementation Plan

## Understanding the Requirement

Based on the screenshot analysis, you need:

### Configuration Modal Features:
1. **Column Count Selector** (1, 2, or 3 columns) - at the top
2. **Field List** with for each field:
   - Field name (e.g., "الحساب", "مدين", "دائن")
   - **Visibility checkbox** (عرض) - show/hide field
   - **Details button** (تفاصيل) - configure field width
   - **Drag handle** - reorder fields
3. **Apply button** (تطبيق) - save changes
4. **Cancel button** (إلغاء) - discard changes

## Implementation Strategy

### Phase 1: Define Field Configurations
For each tab, define available fields:
- **Basic Info Tab**: entry_number, entry_date, description, reference_number, org, project, cost_center, classification, etc.
- **Line Items Tab**: line_no, account, debit, credit, description, project, cost_center, etc.
- **Approvals Tab**: step, action, user, date, reason
- **Documents Tab**: filename, type, size, uploaded_by, uploaded_at
- **Audit Trail Tab**: action, user, date, details

### Phase 2: Add Configuration Buttons
In the Settings tab, add a section with buttons to configure each tab:
```
📋 Field Configuration
  [Configure Basic Info Fields]
  [Configure Line Items Fields]
  [Configure Approvals Fields]
  [Configure Documents Fields]
  [Configure Audit Trail Fields]
```

### Phase 3: Integrate ColumnConfiguration Component
- Reuse existing ColumnConfiguration component
- Pass field definitions for each tab
- Handle configuration changes
- Persist to localStorage

### Phase 4: Apply Configurations
- Read field configurations from localStorage
- Apply to InfoGrid components
- Apply to table displays
- Handle visibility, width, and order

## Technical Details

### Field Configuration Interface
```typescript
interface FieldConfig {
  key: string
  label: string
  visible: boolean
  width: number
  minWidth?: number
  maxWidth?: number
  order: number
}
```

### LocalStorage Keys
- `transactionDetails:basicInfoFields`
- `transactionDetails:lineItemsFields`
- `transactionDetails:approvalsFields`
- `transactionDetails:documentsFields`
- `transactionDetails:auditFields`

### Default Configurations
Each tab will have sensible defaults that users can customize.

## Benefits

1. **Full Control** - Users can show/hide any field
2. **Custom Layout** - Users can reorder fields
3. **Optimized Width** - Users can adjust field widths
4. **Persistent** - Configurations saved to localStorage
5. **Per-Tab** - Different configuration for each tab

## Next Steps

1. Define default field configurations for each tab
2. Add Field Configuration section to Settings tab
3. Integrate ColumnConfiguration component
4. Apply configurations to display components
5. Test and verify

Would you like me to proceed with this implementation?
