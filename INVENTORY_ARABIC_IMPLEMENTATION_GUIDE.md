# Inventory Arabic Localization - Implementation Guide

## Overview

Converting all inventory data to display in Arabic requires a multi-layered approach:
1. **Database** - Arabic fields already exist (`material_name_ar`, `location_name_ar`, etc.)
2. **UI Labels** - Translation keys for buttons, headers, messages
3. **Display Logic** - Show Arabic data when language is set to Arabic

## Current State

### ✅ Already Implemented
- `ArabicLanguageService` with comprehensive formatting
- `useArabicLanguage()` hook for React components
- RTL theme support
- Date/number/currency formatting
- Database has `_ar` fields for most entities

### ❌ Not Yet Implemented for Inventory
- Inventory-specific translation keys
- Display logic to show Arabic fields
- Arabic labels in inventory pages
- Arabic status translations

## Implementation Strategy

### Phase 1: Translation Keys (15 minutes)

Create `src/i18n/inventory.ts` with all inventory translations:

\`\`\`typescript
export const INVENTORY_TEXTS = {
  // Module Title
  inventory: { en: 'Inventory', ar: 'المخزون' },
  inventoryManagement: { en: 'Inventory Management', ar: 'إدارة المخزون' },
  
  // Master Data
  materials: { en: 'Materials', ar: 'المواد' },
  material: { en: 'Material', ar: 'مادة' },
  materialCode: { en: 'Material Code', ar: 'رمز المادة' },
  materialName: { en: 'Material Name', ar: 'اسم المادة' },
  materialType: { en: 'Material Type', ar: 'نوع المادة' },
  
  locations: { en: 'Locations', ar: 'المواقع' },
  location: { en: 'Location', ar: 'موقع' },
  locationCode: { en: 'Location Code', ar: 'رمز الموقع' },
  locationName: { en: 'Location Name', ar: 'اسم الموقع' },
  locationType: { en: 'Location Type', ar: 'نوع الموقع' },
  
  // Transactions
  receive: { en: 'Receive', ar: 'استلام' },
  issue: { en: 'Issue', ar: 'صرف' },
  transfer: { en: 'Transfer', ar: 'نقل' },
  adjust: { en: 'Adjust', ar: 'تسوية' },
  returns: { en: 'Returns', ar: 'مرتجعات' },
  
  // Document Types
  receipt: { en: 'Receipt', ar: 'إيصال استلام' },
  issueDoc: { en: 'Issue', ar: 'إذن صرف' },
  transferDoc: { en: 'Transfer', ar: 'إذن نقل' },
  adjustment: { en: 'Adjustment', ar: 'تسوية' },
  returnDoc: { en: 'Return', ar: 'إرجاع' },
  
  // Status
  draft: { en: 'Draft', ar: 'مسودة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  posted: { en: 'Posted', ar: 'مرحّل' },
  void: { en: 'Void', ar: 'ملغى' },
  
  // Reports
  onHand: { en: 'On Hand', ar: 'الرصيد المتاح' },
  movements: { en: 'Movements', ar: 'الحركات' },
  valuation: { en: 'Valuation', ar: 'التقييم' },
  ageing: { en: 'Ageing', ar: 'التقادم' },
  
  // Fields
  quantity: { en: 'Quantity', ar: 'الكمية' },
  unitCost: { en: 'Unit Cost', ar: 'تكلفة الوحدة' },
  totalCost: { en: 'Total Cost', ar: 'التكلفة الإجمالية' },
  uom: { en: 'UOM', ar: 'وحدة القياس' },
  documentDate: { en: 'Document Date', ar: 'تاريخ المستند' },
  documentNumber: { en: 'Document Number', ar: 'رقم المستند' },
  reference: { en: 'Reference', ar: 'المرجع' },
  notes: { en: 'Notes', ar: 'ملاحظات' },
  
  // Actions
  createDocument: { en: 'Create Document', ar: 'إنشاء مستند' },
  addLine: { en: 'Add Line', ar: 'إضافة سطر' },
  removeLine: { en: 'Remove Line', ar: 'حذف سطر' },
  approveDocument: { en: 'Approve Document', ar: 'اعتماد المستند' },
  postDocument: { en: 'Post Document', ar: 'ترحيل المستند' },
  voidDocument: { en: 'Void Document', ar: 'إلغاء المستند' },
  
  // Reconciliation
  reconciliation: { en: 'Reconciliation', ar: 'التسوية' },
  physicalCount: { en: 'Physical Count', ar: 'الجرد الفعلي' },
  systemQuantity: { en: 'System Quantity', ar: 'الكمية بالنظام' },
  actualQuantity: { en: 'Actual Quantity', ar: 'الكمية الفعلية' },
  variance: { en: 'Variance', ar: 'الفرق' },
  
  // Valuation Methods
  movingAverage: { en: 'Moving Average', ar: 'المتوسط المتحرك' },
  lastPurchase: { en: 'Last Purchase', ar: 'آخر شراء' },
  standardCost: { en: 'Standard Cost', ar: 'التكلفة المعيارية' },
  manual: { en: 'Manual', ar: 'يدوي' }
}
\`\`\`

### Phase 2: Display Logic Helper (10 minutes)

Create `src/utils/inventoryDisplay.ts`:

\`\`\`typescript
import { ArabicLanguageService } from '@/services/ArabicLanguageService'

export const getDisplayName = (item: {
  material_name?: string
  material_name_ar?: string | null
  location_name?: string
  location_name_ar?: string | null
  name?: string
  name_ar?: string | null
}) => {
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (isArabic) {
    return item.material_name_ar || item.location_name_ar || item.name_ar || 
           item.material_name || item.location_name || item.name || ''
  }
  
  return item.material_name || item.location_name || item.name || ''
}

export const getDisplayDescription = (item: {
  description?: string | null
  description_ar?: string | null
}) => {
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (isArabic) {
    return item.description_ar || item.description || ''
  }
  
  return item.description || ''
}
\`\`\`

### Phase 3: Update Each Page (2-3 hours)

For each inventory page, add Arabic support:

**Example: Materials Page**

\`\`\`typescript
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { INVENTORY_TEXTS } from '@/i18n/inventory'
import { getDisplayName } from '@/utils/inventoryDisplay'

const MaterialsPage = () => {
  const { t, isRTL } = useArabicLanguage()
  const [materials, setMaterials] = useState([])
  
  return (
    <Box>
      <Typography variant="h4">
        {t(INVENTORY_TEXTS.materials)}
      </Typography>
      
      <DataGrid
        rows={materials}
        columns={[
          {
            field: 'material_code',
            headerName: t(INVENTORY_TEXTS.materialCode),
            width: 150
          },
          {
            field: 'material_name',
            headerName: t(INVENTORY_TEXTS.materialName),
            width: 250,
            valueGetter: (params) => getDisplayName(params.row)
          },
          {
            field: 'quantity',
            headerName: t(INVENTORY_TEXTS.quantity),
            width: 120,
            align: isRTL ? 'left' : 'right'
          }
        ]}
      />
    </Box>
  )
}
\`\`\`

## Implementation Checklist

### Translation Keys
- [ ] Create `src/i18n/inventory.ts`
- [ ] Add all inventory-specific translations
- [ ] Add status translations
- [ ] Add error message translations

### Display Helpers
- [ ] Create `src/utils/inventoryDisplay.ts`
- [ ] Add `getDisplayName()` function
- [ ] Add `getDisplayDescription()` function
- [ ] Add `getDisplayStatus()` function

### Page Updates (25 pages)
- [ ] Dashboard - Add translations
- [ ] Materials - Show Arabic names
- [ ] Locations - Show Arabic names
- [ ] Documents - Show Arabic labels
- [ ] Receive - Translate form
- [ ] Issue - Translate form
- [ ] Transfer - Translate form
- [ ] Adjust - Translate form
- [ ] Returns - Translate form
- [ ] On Hand Report - Translate columns
- [ ] Movements - Translate columns
- [ ] Valuation - Translate columns
- [ ] Ageing - Translate columns
- [ ] Movement Summary - Translate
- [ ] Movement Detail - Translate
- [ ] Project Movement Summary - Translate
- [ ] Valuation by Project - Translate
- [ ] Reconciliation - Translate
- [ ] Reconciliation Session - Translate
- [ ] KPI Dashboard - Translate
- [ ] Settings - Translate

### Testing
- [ ] Switch language to Arabic
- [ ] Verify all labels show in Arabic
- [ ] Verify data shows Arabic fields
- [ ] Verify RTL layout works
- [ ] Verify numbers format correctly
- [ ] Verify dates format correctly
- [ ] Verify currency formats correctly

## Quick Win: Minimal Implementation

If you need Arabic support quickly, focus on these high-priority items:

### 1. Create Translation File (5 minutes)
\`\`\`bash
# Create the file
touch src/i18n/inventory.ts
\`\`\`

### 2. Add to One Page (10 minutes)
Pick the most-used page (e.g., Materials) and add Arabic support as a proof of concept.

### 3. Test (5 minutes)
- Switch language to Arabic
- Verify the page shows Arabic text
- Verify RTL layout works

### 4. Expand Gradually
Once the pattern works, apply to other pages incrementally.

## Database Considerations

### Existing Arabic Fields
Most tables already have `_ar` fields:
- `materials.material_name_ar`
- `materials.description_ar`
- `inventory_locations.location_name_ar`
- `uoms.name_ar`

### Missing Arabic Fields
If any fields are missing, add them:
\`\`\`sql
ALTER TABLE table_name 
ADD COLUMN field_name_ar TEXT;
\`\`\`

## Best Practices

### 1. Always Use Translation Keys
\`\`\`typescript
// ❌ Bad
<Typography>Materials</Typography>

// ✅ Good
<Typography>{t(INVENTORY_TEXTS.materials)}</Typography>
\`\`\`

### 2. Always Use Display Helpers
\`\`\`typescript
// ❌ Bad
<TableCell>{material.material_name}</TableCell>

// ✅ Good
<TableCell>{getDisplayName(material)}</TableCell>
\`\`\`

### 3. Always Consider RTL
\`\`\`typescript
// ❌ Bad
<Box sx={{ textAlign: 'left' }}>

// ✅ Good
<Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
\`\`\`

### 4. Use Arabic-Aware Formatting
\`\`\`typescript
// ❌ Bad
{quantity.toFixed(2)}

// ✅ Good
{formatNumber(quantity)}
\`\`\`

## Estimated Effort

| Task | Time | Priority |
|------|------|----------|
| Translation keys | 30 min | High |
| Display helpers | 15 min | High |
| Update 5 key pages | 2 hours | High |
| Update remaining 20 pages | 6 hours | Medium |
| Testing | 2 hours | High |
| **Total** | **~11 hours** | - |

## Phased Rollout

### Week 1: Foundation
- Create translation keys
- Create display helpers
- Update 3 most-used pages

### Week 2: Core Features
- Update all transaction pages (5 pages)
- Update master data pages (2 pages)

### Week 3: Reports
- Update all report pages (8 pages)
- Update reconciliation pages (2 pages)

### Week 4: Polish
- Update remaining pages
- Comprehensive testing
- Bug fixes

## Support & Resources

- **ArabicLanguageService:** `src/services/ArabicLanguageService.ts`
- **Existing Examples:** Check Fiscal pages for Arabic implementation
- **RTL Theme:** `src/themes/rtlTheme.ts`
- **Navigation:** Already has Arabic in `src/data/navigation.ts`

---

**Status:** Implementation guide ready  
**Complexity:** Medium (requires systematic page updates)  
**Risk:** Low (non-breaking, additive changes)  
**Recommendation:** Implement incrementally, starting with most-used pages
