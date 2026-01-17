# � Covmplete Inventory Setup Guide - Arabic Ready

## 📋 Overview

This guide will walk you through setting up the complete inventory system with:
- ✅ Arabic/English bilingual support
- ✅ Sample data for testing
- ✅ Full CRUD operations
- ✅ RTL layout for Arabic

**Time Required:** 10-15 minutes  
**Difficulty:** Easy  
**Prerequisites:** Access to Supabase dashboard

---

## 🎯 Step-by-Step Setup

### Step 1: Get Your Organization ID (2 minutes)

1. Open your application in the browser
2. Press **F12** to open Developer Console
3. Go to **Console** tab
4. Run this command:
   ```javascript
   localStorage.getItem('org_id')
   ```
5. **Copy the ID** - you'll need it for the next steps
   - Example: `'550e8400-e29b-41d4-a716-446655440000'`

**Screenshot Location:** Top-right corner of console output

---

### Step 2: Open Supabase SQL Editor (1 minute)

1. Go to your **Supabase Dashboard**
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

---

### Step 3: Add Units of Measure (UOMs) (2 minutes)

Copy and paste this SQL, **replacing `'YOUR-ORG-ID'` with your actual org_id**:

```sql
-- Add Units of Measure with Arabic names
INSERT INTO uoms (org_id, code, name, name_ar, is_active, created_by)
VALUES 
  ('YOUR-ORG-ID', 'KG', 'Kilogram', 'كيلوجرام', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'TON', 'Ton', 'طن', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'M3', 'Cubic Meter', 'متر مكعب', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'M', 'Meter', 'متر', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'M2', 'Square Meter', 'متر مربع', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'PCS', 'Pieces', 'قطعة', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'L', 'Liter', 'لتر', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)),
  ('YOUR-ORG-ID', 'BAG', 'Bag', 'كيس', true, (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1))
ON CONFLICT (org_id, code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  is_active = EXCLUDED.is_active;
```

Click **Run** (or press Ctrl+Enter)

**Expected Result:** `Success. No rows returned`

---

### Step 4: Add Sample Materials (3 minutes)

Copy and paste this SQL, **replacing `'YOUR-ORG-ID'`**:

```sql
-- Add Sample Materials with Arabic names
INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  description,
  description_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method,
  created_by
)
VALUES 
  -- Construction Materials
  (
    'YOUR-ORG-ID',
    'M001',
    'Steel Rebar 12mm',
    'حديد تسليح 12 ملم',
    'Steel reinforcement bars for concrete',
    'قضبان حديد التسليح للخرسانة',
    (SELECT id FROM uoms WHERE code = 'KG' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M002',
    'Portland Cement',
    'أسمنت بورتلاند',
    'Type I Portland cement for general construction',
    'أسمنت بورتلاند من النوع الأول للبناء العام',
    (SELECT id FROM uoms WHERE code = 'TON' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M003',
    'Washed Sand',
    'رمل مغسول',
    'Clean washed sand for concrete mixing',
    'رمل نظيف مغسول لخلط الخرسانة',
    (SELECT id FROM uoms WHERE code = 'M3' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M004',
    'Crushed Gravel',
    'حصى مكسر',
    'Crushed stone aggregate for concrete',
    'ركام حجري مكسر للخرسانة',
    (SELECT id FROM uoms WHERE code = 'M3' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M005',
    'Red Bricks',
    'طوب أحمر',
    'Standard red clay bricks',
    'طوب طيني أحمر قياسي',
    (SELECT id FROM uoms WHERE code = 'PCS' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M006',
    'Concrete Blocks',
    'بلوك خرساني',
    'Hollow concrete blocks 20x20x40cm',
    'بلوك خرساني مفرغ 20×20×40 سم',
    (SELECT id FROM uoms WHERE code = 'PCS' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M007',
    'White Paint',
    'دهان أبيض',
    'Interior white paint - 20L bucket',
    'دهان داخلي أبيض - جردل 20 لتر',
    (SELECT id FROM uoms WHERE code = 'L' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M008',
    'Ceramic Tiles',
    'بلاط سيراميك',
    'Floor ceramic tiles 60x60cm',
    'بلاط أرضيات سيراميك 60×60 سم',
    (SELECT id FROM uoms WHERE code = 'M2' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M009',
    'Gypsum Powder',
    'جبس بودرة',
    'Gypsum powder for plastering',
    'جبس بودرة للتلييس',
    (SELECT id FROM uoms WHERE code = 'BAG' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'M010',
    'PVC Pipes 4 inch',
    'أنابيب بي في سي 4 بوصة',
    'PVC drainage pipes 4 inch diameter',
    'أنابيب صرف بي في سي قطر 4 بوصة',
    (SELECT id FROM uoms WHERE code = 'M' AND org_id = 'YOUR-ORG-ID' LIMIT 1),
    true,
    true,
    'material',
    'moving_average',
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  )
ON CONFLICT (org_id, material_code) DO UPDATE SET
  material_name_ar = EXCLUDED.material_name_ar,
  description_ar = EXCLUDED.description_ar,
  is_active = EXCLUDED.is_active;
```

Click **Run**

**Expected Result:** `Success. No rows returned`

---

### Step 5: Add Sample Locations (2 minutes)

Copy and paste this SQL, **replacing `'YOUR-ORG-ID'`**:

```sql
-- Add Sample Inventory Locations with Arabic names
INSERT INTO inventory_locations (
  org_id,
  location_code,
  location_name,
  location_name_ar,
  location_type,
  is_active,
  created_by
)
VALUES 
  (
    'YOUR-ORG-ID',
    'WH-MAIN',
    'Main Warehouse',
    'المستودع الرئيسي',
    'warehouse',
    true,
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'WH-SITE1',
    'Site 1 Storage',
    'مخزن الموقع 1',
    'site',
    true,
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'WH-SITE2',
    'Site 2 Storage',
    'مخزن الموقع 2',
    'site',
    true,
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  ),
  (
    'YOUR-ORG-ID',
    'WH-YARD',
    'Yard Storage',
    'مخزن الساحة',
    'yard',
    true,
    (SELECT id FROM user_profiles WHERE org_id = 'YOUR-ORG-ID' LIMIT 1)
  )
ON CONFLICT (org_id, location_code) DO UPDATE SET
  location_name_ar = EXCLUDED.location_name_ar,
  is_active = EXCLUDED.is_active;
```

Click **Run**

**Expected Result:** `Success. No rows returned`

---

### Step 6: Verify Data (1 minute)

Run this query to verify everything was created:

```sql
-- Verify Materials with Arabic names
SELECT 
  m.material_code,
  m.material_name,
  m.material_name_ar,
  u.code as uom_code,
  u.name as uom_name,
  u.name_ar as uom_name_ar,
  m.is_active
FROM materials m
LEFT JOIN uoms u ON m.base_uom_id = u.id
WHERE m.org_id = 'YOUR-ORG-ID'
ORDER BY m.material_code;
```

**Expected Result:** Table showing 10 materials with Arabic names

---

### Step 7: Test in the Application (3 minutes)

#### 7.1 Refresh the Materials Page

1. Go back to your application
2. Navigate to **Inventory → Materials** (or **المخزون → المواد** in Arabic)
3. Press **Ctrl+Shift+R** to hard refresh

#### 7.2 Test English Mode

You should see:

```
Materials
[Create Document]

┌──────────────┬────────────────────┬─────┬────────┬───────────┬─────────┐
│ Material Code│ Material Name      │ UOM │ Active │ Trackable │ Actions │
├──────────────┼────────────────────┼─────┼────────┼───────────┼─────────┤
│ M001         │ Steel Rebar 12mm   │ KG  │ Active │ Yes       │ [Edit]  │
│ M002         │ Portland Cement    │ TON │ Active │ Yes       │ [Edit]  │
│ M003         │ Washed Sand        │ M3  │ Active │ Yes       │ [Edit]  │
│ ...          │ ...                │ ... │ ...    │ ...       │ ...     │
└──────────────┴────────────────────┴─────┴────────┴───────────┴─────────┘
```

#### 7.3 Switch to Arabic

Press **F12** and run:
```javascript
localStorage.setItem('language', 'ar')
location.reload()
```

You should see:

```
المواد
[إنشاء مستند]

┌─────────┬───────────┬────────┬─────┬──────────────────────┬──────────────┐
│ الإجراءات│ قابل للتتبع│  نشط   │ وحدة│    اسم المادة        │  رمز المادة  │
│         │           │        │القياس│                      │              │
├─────────┼───────────┼────────┼─────┼──────────────────────┼──────────────┤
│ [تعديل] │ نعم       │ نشط    │ كجم │ حديد تسليح 12 ملم    │ M001         │
│ [تعديل] │ نعم       │ نشط    │ طن  │ أسمنت بورتلاند       │ M002         │
│ [تعديل] │ نعم       │ نشط    │ م٣  │ رمل مغسول            │ M003         │
│ ...     │ ...       │ ...    │ ... │ ...                  │ ...          │
└─────────┴───────────┴────────┴─────┴──────────────────────┴──────────────┘
```

---

## ✅ Verification Checklist

### Data Verification
- [ ] 8 UOMs created (KG, TON, M3, M, M2, PCS, L, BAG)
- [ ] 10 Materials created with Arabic names
- [ ] 4 Locations created with Arabic names
- [ ] All records have Arabic translations

### UI Verification (English Mode)
- [ ] Materials page loads without errors
- [ ] Table shows 10 materials
- [ ] Material names in English
- [ ] UOM codes displayed correctly
- [ ] Status chips show "Active"
- [ ] Edit buttons work

### UI Verification (Arabic Mode)
- [ ] Page title shows "المواد"
- [ ] Button shows "إنشاء مستند"
- [ ] Table headers in Arabic
- [ ] Material names in Arabic
- [ ] UOM names in Arabic (كجم، طن، م٣)
- [ ] Status chips show "نشط"
- [ ] Layout is RTL (right-to-left)
- [ ] Edit buttons show "تعديل"

---

## 🎯 Test CRUD Operations

### Test 1: Create New Material

**English Mode:**
1. Click "Create Document"
2. Fill in:
   - Material Code: M011
   - Name (English): Electrical Wire
   - Name (Arabic): سلك كهربائي
   - UOM: Select "M - Meter"
3. Click "Create"
4. Verify success message
5. Verify new material appears in table

**Arabic Mode:**
1. Click "إنشاء مستند"
2. Fill in form with Arabic labels
3. Click "إنشاء"
4. Verify success message in Arabic: "تم إنشاء المادة بنجاح"

### Test 2: Edit Material

**English Mode:**
1. Click "Edit" on any material
2. Change the Arabic name
3. Click "Save"
4. Verify success message
5. Switch to Arabic and verify new name displays

**Arabic Mode:**
1. Click "تعديل" on any material
2. Update fields
3. Click "حفظ"
4. Verify success message: "تم تحديث المادة بنجاح"

### Test 3: Language Switching

1. Start in English mode
2. View materials
3. Switch to Arabic: `localStorage.setItem('language', 'ar'); location.reload()`
4. Verify all data shows in Arabic
5. Switch back to English: `localStorage.setItem('language', 'en'); location.reload()`
6. Verify all data shows in English

---

## 🐛 Troubleshooting

### Issue: No data showing after running SQL

**Solution:**
1. Verify org_id is correct:
   ```sql
   SELECT id, name FROM organizations;
   ```
2. Check if data was inserted:
   ```sql
   SELECT COUNT(*) FROM materials WHERE org_id = 'YOUR-ORG-ID';
   ```
3. Check browser console for errors (F12)

### Issue: Arabic names not showing

**Solution:**
1. Verify Arabic names in database:
   ```sql
   SELECT material_code, material_name, material_name_ar 
   FROM materials 
   WHERE org_id = 'YOUR-ORG-ID';
   ```
2. Ensure language is set to Arabic:
   ```javascript
   localStorage.getItem('language') // Should return 'ar'
   ```
3. Hard refresh: Ctrl+Shift+R

### Issue: Permission errors

**Solution:**
1. Check RLS policies are enabled
2. Verify user has access to organization
3. Check user_profiles table has correct org_id

---

## 📊 Sample Data Summary

### UOMs Created (8)
| Code | English | Arabic |
|------|---------|--------|
| KG | Kilogram | كيلوجرام |
| TON | Ton | طن |
| M3 | Cubic Meter | متر مكعب |
| M | Meter | متر |
| M2 | Square Meter | متر مربع |
| PCS | Pieces | قطعة |
| L | Liter | لتر |
| BAG | Bag | كيس |

### Materials Created (10)
| Code | English | Arabic |
|------|---------|--------|
| M001 | Steel Rebar 12mm | حديد تسليح 12 ملم |
| M002 | Portland Cement | أسمنت بورتلاند |
| M003 | Washed Sand | رمل مغسول |
| M004 | Crushed Gravel | حصى مكسر |
| M005 | Red Bricks | طوب أحمر |
| M006 | Concrete Blocks | بلوك خرساني |
| M007 | White Paint | دهان أبيض |
| M008 | Ceramic Tiles | بلاط سيراميك |
| M009 | Gypsum Powder | جبس بودرة |
| M010 | PVC Pipes 4 inch | أنابيب بي في سي 4 بوصة |

### Locations Created (4)
| Code | English | Arabic |
|------|---------|--------|
| WH-MAIN | Main Warehouse | المستودع الرئيسي |
| WH-SITE1 | Site 1 Storage | مخزن الموقع 1 |
| WH-SITE2 | Site 2 Storage | مخزن الموقع 2 |
| WH-YARD | Yard Storage | مخزن الساحة |

---

## 🚀 Next Steps

### Immediate
1. ✅ Complete this setup guide
2. ✅ Verify all data displays correctly
3. ✅ Test CRUD operations
4. ✅ Test language switching

### Short Term
1. Add more materials as needed
2. Add more locations
3. Test Locations page (similar to Materials)
4. Test UOMs page

### Medium Term
1. Apply Arabic support to remaining inventory pages:
   - Locations
   - Receive
   - Issue
   - Transfer
   - Adjust
   - Returns
   - Reports

---

## 📚 Related Documentation

- **ARABIC_WORKING_NEEDS_DATA.md** - Proof that Arabic is working
- **FIX_MATERIALS_NO_DATA.md** - Quick fix for no data issue
- **INVENTORY_ARABIC_IMPLEMENTATION_GUIDE.md** - Developer guide
- **INVENTORY_ARABIC_COMPLETE_SUMMARY.md** - Full implementation summary
- **sql/add_sample_materials.sql** - SQL script for sample data

---

## ✅ Success Criteria

You've successfully completed the setup when:

- [x] 8 UOMs with Arabic names in database
- [x] 10 Materials with Arabic names in database
- [x] 4 Locations with Arabic names in database
- [x] Materials page loads without errors
- [x] Data displays in English mode
- [x] Data displays in Arabic mode with RTL layout
- [x] Can create new materials with Arabic names
- [x] Can edit materials
- [x] Can switch between languages seamlessly
- [x] No console errors

---

**🎉 Congratulations! Your inventory system is now fully bilingual! 🎉**

**Status:** ✅ Complete  
**Time:** 10-15 minutes  
**Result:** Fully functional Arabic/English inventory system
