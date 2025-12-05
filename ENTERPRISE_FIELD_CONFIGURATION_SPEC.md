# Enterprise Field Configuration - Complete Specification

## Overview
Implement enterprise-level field configuration for all tabs in UnifiedTransactionDetailsPanel with configuration buttons in each tab header.

## Requirements Confirmed

### Scope
- ✅ All tabs: Basic Info, Line Items, Approvals, Documents, Audit Trail
- ✅ Configuration button in each tab's header
- ✅ Field visibility (show/hide)
- ✅ Field width control
- ✅ Field order (drag to reorder)
- ✅ Number of columns in grid layout
- ✅ Enterprise features

## Enterprise Features to Include

### 1. Field Configuration
- Show/hide fields
- Adjust field widths
- Drag to reorder fields
- Column count (1-3 columns)

### 2. Layout Presets
- Save custom layouts
- Load saved layouts
- Share layouts with team
- Export/import layouts

### 3. Field Grouping
- Group related fields
- Collapsible groups
- Custom group names

### 4. Conditional Display
- Show fields based on conditions
- Hide empty fields
- Show only modified fields

### 5. Quick Filters
- Search fields by name
- Filter by visibility
- Filter by type

### 6. Bulk Operations
- Show all fields
- Hide all fields
- Reset to defaults
- Apply to all tabs

## Implementation Plan

### Phase 1: Define Field Configurations (This response)
Create default field configurations for each tab with all available fields.

### Phase 2: Add Configuration Buttons (Next response)
Add "⚙️ Configure Fields" button to each tab header.

### Phase 3: Integrate ColumnConfiguration Component (Next response)
Wire up the existing ColumnConfiguration component for each tab.

### Phase 4: Apply Configurations (Next response)
Apply saved configurations to display components.

### Phase 5: Enterprise Features (Next response)
Add presets, export/import, and advanced features.

## Field Definitions

### Basic Info Tab Fields
```typescript
- entry_number: Entry Number
- entry_date: Date
- description: Description
- reference_number: Reference
- organization: Organization
- project: Project
- cost_center: Cost Center
- classification: Classification
- work_item: Work Item
- analysis_work_item: Analysis Work Item
- category: Category
- status: Status
- approval_status: Approval Status
- created_by: Created By
- created_at: Created At
- total_debits: Total Debits
- total_credits: Total Credits
- balance_status: Balance Status
- notes: Notes
```

### Line Items Tab Fields
```typescript
- line_no: Line Number
- account: Account
- debit: Debit
- credit: Credit
- description: Description
- project: Project
- cost_center: Cost Center
- work_item: Work Item
- classification: Classification
- category: Category
- analysis_work_item: Analysis Work Item
- line_status: Status
```

### Approvals Tab Fields
```typescript
- step: Step
- action: Action
- user: User
- date: Date
- reason: Reason
- status: Status
```

### Documents Tab Fields
```typescript
- filename: File Name
- type: Type
- size: Size
- uploaded_by: Uploaded By
- uploaded_at: Uploaded At
- description: Description
```

### Audit Trail Tab Fields
```typescript
- action: Action
- user: User
- date: Date
- details: Details
- ip_address: IP Address
```

## LocalStorage Keys
- `transactionDetails:basicInfoFields`
- `transactionDetails:lineItemsFields`
- `transactionDetails:approvalsFields`
- `transactionDetails:documentsFields`
- `transactionDetails:auditFields`
- `transactionDetails:fieldPresets` (for saved presets)

## UI Components

### Configuration Button
```
┌─────────────────────────────────┐
│ Basic Info Tab          ⚙️ تخصيص │
├─────────────────────────────────┤
│ [Field content here]            │
└─────────────────────────────────┘
```

### Configuration Modal
```
┌─────────────────────────────────────────┐
│ تخصيص حقول المعلومات الأساسية      ✕    │
├─────────────────────────────────────────┤
│ عدد الأعمدة: ⬜ 1  ⬜ 2  ⬛ 3          │
├─────────────────────────────────────────┤
│ 🔍 بحث في الحقول...                    │
├─────────────────────────────────────────┤
│ ☰ رقم القيد        ☑ عرض  📏 تفاصيل   │
│ ☰ التاريخ          ☑ عرض  📏 تفاصيل   │
│ ☰ الوصف           ☑ عرض  📏 تفاصيل   │
│ ☰ المرجع          ☐ عرض  📏 تفاصيل   │
├─────────────────────────────────────────┤
│ [تطبيق] [إلغاء] [إعادة تعيين]          │
└─────────────────────────────────────────┘
```

## Benefits

1. **Professional** - Enterprise-level customization
2. **Flexible** - Complete control over display
3. **Persistent** - Saved to localStorage
4. **User-Friendly** - Intuitive drag-and-drop
5. **Powerful** - Advanced features like presets
6. **Scalable** - Easy to add more fields

## Next Steps

Due to the complexity and size of this implementation, I'll break it into manageable chunks:

1. **First**: Create field configuration definitions
2. **Second**: Add configuration buttons to tab headers
3. **Third**: Wire up ColumnConfiguration component
4. **Fourth**: Apply configurations to display
5. **Fifth**: Add enterprise features

Would you like me to proceed with Phase 1 (defining field configurations)?
