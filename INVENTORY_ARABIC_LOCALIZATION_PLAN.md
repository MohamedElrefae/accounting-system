# Inventory Module - Arabic Localization Plan

## Overview

Convert all inventory module data display to Arabic, including:
- UI labels and buttons
- Table headers and columns
- Form fields and placeholders
- Status badges and indicators
- Error messages and notifications
- Date and number formatting

## Implementation Strategy

### Phase 1: Database Schema (Already Complete ✅)

The database already has Arabic columns:
- `material_name_ar` in materials table
- `location_name_ar` in inventory_locations table
- `description_ar` in materials table
- `notes_ar` in inventory_documents table

### Phase 2: Service Layer Enhancement

Update services to return Arabic data based on language preference:

```typescript
// src/services/inventory/materials.ts
export async function listMaterials(orgId: string, language: 'en' | 'ar' = 'en'): Promise<MaterialRow[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('org_id', orgId)
    .order('material_code', { ascending: true })
  
  if (error) throw error
  
  // Transform data based on language
  return (data || []).map(material => ({
    ...material,
    display_name: language === 'ar' && material.material_name_ar 
      ? material.material_name_ar 
      : material.material_name,
    display_description: language === 'ar' && material.description_ar
      ? material.description_ar
      : material.description
  })) as MaterialRow[]
}
```

### Phase 3: UI Components

#### A. Use Existing ArabicLanguageService

The app already has `ArabicLanguageService` - leverage it:

```typescript
import { ArabicLanguageService } from '@/services/ArabicLanguageService'
import useAppStore from '@/store/useAppStore'

const MyComponent = () => {
  const { language } = useAppStore()
  
  // Get localized text
  const materialLabel = language === 'ar' ? 'المواد' : 'Materials'
  
  // Use service for data display
  const displayName = ArabicLanguageService.getLocalizedField(
    material,
    'material_name',
    'material_name_ar'
  )
}
```

#### B. Create Inventory Translation File

```typescript
// src/i18n/inventory.ts
export const inventoryTranslations = {
  en: {
    // Master Data
    materials: 'Materials',
    locations: 'Locations',
    materialCode: 'Material Code',
    materialName: 'Material Name',
    locationCode: 'Location Code',
    locationName: 'Location Name',
    
    // Transactions
    receive: 'Receive',
    issue: 'Issue',
    transfer: 'Transfer',
    adjust: 'Adjust',
    returns: 'Returns',
    
    // Status
    draft: 'Draft',
    approved: 'Approved',
    posted: 'Posted',
    void: 'Void',
    
    // Actions
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    approve: 'Approve',
    post: 'Post',
    cancel: 'Cancel',
    save: 'Save',
    
    // Reports
    onHand: 'On Hand',
    movements: 'Movements',
    valuation: 'Valuation',
    ageing: 'Stock Ageing',
  },
  ar: {
    // Master Data
    materials: 'المواد',
    locations: 'المواقع',
    materialCode: 'رمز المادة',
    materialName: 'اسم المادة',
    locationCode: 'رمز الموقع',
    locationName: 'اسم الموقع',
    
    // Transactions
    receive: 'استلام',
    issue: 'صرف',
    transfer: 'نقل',
    adjust: 'تسوية',
    returns: 'مرتجعات',
    
    // Status
    draft: 'مسودة',
    approved: 'معتمد',
    posted: 'مرحّل',
    void: 'ملغى',
    
    // Actions
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    approve: 'اعتماد',
    post: 'ترحيل',
    cancel: 'إلغاء',
    save: 'حفظ',
    
    // Reports
    onHand: 'الرصيد المتاح',
    movements: 'الحركات',
    valuation: 'التقييم',
    ageing: 'التقادم',
  }
}

export const useInventoryTranslation = () => {
  const { language } = useAppStore()
  return inventoryTranslations[language] || inventoryTranslations.en
}
```

### Phase 4: Component Updates

#### Example: Materials Page

```typescript
// src/pages/Inventory/Materials.tsx
import { useInventoryTranslation } from '@/i18n/inventory'
import { ArabicLanguageService } from '@/services/ArabicLanguageService'
import useAppStore from '@/store/useAppStore'

const MaterialsPage = () => {
  const t = useInventoryTranslation()
  const { language } = useAppStore()
  const [materials, setMaterials] = useState([])
  
  // Fetch materials with language preference
  useEffect(() => {
    const fetchData = async () => {
      const data = await listMaterials(orgId, language)
      setMaterials(data)
    }
    fetchData()
  }, [orgId, language])
  
  return (
    <Box>
      <Typography variant="h5">
        {t.materials}
      </Typography>
      
      <DataGrid
        columns={[
          {
            field: 'material_code',
            headerName: t.materialCode,
            width: 150
          },
          {
            field: 'display_name',
            headerName: t.materialName,
            width: 250,
            valueGetter: (params) => 
              ArabicLanguageService.getLocalizedField(
                params.row,
                'material_name',
                'material_name_ar'
              )
          }
        ]}
        rows={materials}
      />
    </Box>
  )
}
```

### Phase 5: Number and Date Formatting

```typescript
// src/utils/arabicFormatters.ts
export const formatNumber = (value: number, language: 'en' | 'ar'): string => {
  if (language === 'ar') {
    return new Intl.NumberFormat('ar-SA').format(value)
  }
  return new Intl.NumberFormat('en-US').format(value)
}

export const formatDate = (date: string, language: 'en' | 'ar'): string => {
  const dateObj = new Date(date)
  if (language === 'ar') {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj)
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj)
}
```

## Implementation Checklist

### Database (Already Complete ✅)
- [x] Arabic columns exist in materials table
- [x] Arabic columns exist in locations table
- [x] Arabic columns exist in documents table

### Services Layer
- [ ] Update `materials.ts` to support language parameter
- [ ] Update `locations.ts` to support language parameter
- [ ] Update `documents.ts` to support language parameter
- [ ] Add helper functions for localized field selection

### Translation Files
- [ ] Create `src/i18n/inventory.ts` with all translations
- [ ] Add translations for all UI labels
- [ ] Add translations for status values
- [ ] Add translations for error messages

### UI Components
- [ ] Update Materials page
- [ ] Update Locations page
- [ ] Update Receive page
- [ ] Update Issue page
- [ ] Update Transfer page
- [ ] Update Adjust page
- [ ] Update Returns page
- [ ] Update all report pages
- [ ] Update reconciliation pages

### Formatting
- [ ] Implement Arabic number formatting
- [ ] Implement Arabic date formatting
- [ ] Implement Arabic currency formatting
- [ ] Update all DataGrid columns

### Testing
- [ ] Test language switching
- [ ] Test data display in Arabic
- [ ] Test forms in Arabic
- [ ] Test reports in Arabic
- [ ] Test RTL layout

## Quick Implementation (Minimal Approach)

For immediate results, focus on:

1. **Create translation hook** (30 minutes)
2. **Update 5 main pages** (2 hours)
   - Materials
   - Locations
   - Receive
   - Issue
   - On Hand Report
3. **Add Arabic display logic** (1 hour)

## Full Implementation (Complete Approach)

For comprehensive localization:

1. **All translations** (4 hours)
2. **All 25 pages** (8 hours)
3. **Number/date formatting** (2 hours)
4. **Testing** (4 hours)

**Total: ~18 hours**

## Priority Order

### High Priority (Do First)
1. Materials page - most used
2. Locations page - master data
3. Receive page - common transaction
4. On Hand report - frequently viewed

### Medium Priority
5. Issue page
6. Transfer page
7. Movements report
8. Valuation report

### Low Priority
9. Adjust page
10. Returns page
11. Other reports
12. Settings page

## Example Implementation

Let me create a sample implementation for the Materials page to demonstrate the pattern.

Would you like me to:
1. Create the translation file with all inventory terms?
2. Update a specific page (e.g., Materials) as an example?
3. Create helper utilities for Arabic formatting?
4. All of the above?

## Notes

- The navigation menu already has Arabic translations in `navigation.ts`
- The app already supports RTL layout
- The `ArabicLanguageService` is already available
- Database schema already supports Arabic fields

**The infrastructure is ready - we just need to connect the pieces!**

---

**Status:** Plan created, ready for implementation  
**Estimated Time:** 2-18 hours depending on scope  
**Risk Level:** Low (non-breaking changes)  
**Dependencies:** None (all infrastructure exists)
