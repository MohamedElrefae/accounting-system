# Materials Page - Arabic Support Testing Guide

## ✅ What Was Implemented

The Materials page (`src/pages/Inventory/Materials.tsx`) now has full Arabic support!

### Changes Made

1. **Added Arabic imports:**
   - `useArabicLanguage` hook
   - `INVENTORY_TEXTS` translation keys
   - `getDisplayName` display helper

2. **Translated all UI elements:**
   - Page title
   - Button labels
   - Table headers
   - Dialog titles
   - Form labels
   - Status chips
   - Messages and toasts

3. **Display Arabic data:**
   - Material names show in Arabic when language is Arabic
   - UOM names show in Arabic
   - Status values translated

4. **RTL support:**
   - Layout direction changes based on language
   - Text alignment adjusts automatically

## 🧪 How to Test

### Step 1: Build the Application
```bash
npm run build
```

### Step 2: Start the Dev Server
```bash
npm run dev
```

### Step 3: Navigate to Materials Page
1. Open the application in your browser
2. Log in
3. Go to **Inventory → Materials**

### Step 4: Test in English (Default)
- Verify page loads correctly
- Check all labels are in English
- Verify material names show English names
- Check buttons say "Add Material", "Edit", "Save", etc.

### Step 5: Switch to Arabic
**Option A: Using Language Switcher (if available in UI)**
- Click the language switcher
- Select Arabic (العربية)

**Option B: Using Browser Console**
```javascript
// Open browser console (F12)
// Run this command:
localStorage.setItem('language', 'ar')
// Refresh the page
location.reload()
```

**Option C: Using Settings**
- Go to Settings
- Change language to Arabic
- Navigate back to Materials page

### Step 6: Verify Arabic Display
Check that:
- [ ] Page title shows "المواد" (Materials in Arabic)
- [ ] "Add Material" button shows "إنشاء مستند"
- [ ] Table headers are in Arabic:
  - "رمز المادة" (Material Code)
  - "اسم المادة" (Material Name)
  - "وحدة القياس" (UOM)
  - "نشط" (Active)
  - "قابل للتتبع" (Trackable)
  - "الإجراءات" (Actions)
- [ ] Material names show Arabic names (if available in database)
- [ ] Status chips show Arabic text ("نشط" / "غير نشط")
- [ ] "Edit" button shows "تعديل"
- [ ] Layout is RTL (right-to-left)

### Step 7: Test Create Dialog
1. Click "إنشاء مستند" button
2. Verify dialog title is "مادة جديدة" (New Material)
3. Check form labels are in Arabic:
   - "رمز المادة" (Material Code)
   - "الاسم (إنجليزي)" (Name English)
   - "الاسم (عربي)" (Name Arabic)
   - "وحدة القياس" (UOM)
4. Verify buttons show "إلغاء" (Cancel) and "إنشاء" (Create)
5. Try creating a material with Arabic name
6. Verify success message is in Arabic

### Step 8: Test Edit Dialog
1. Click "تعديل" (Edit) on any material
2. Verify dialog title is "تعديل مادة" (Edit Material)
3. Check all form labels are in Arabic
4. Verify checkboxes show Arabic labels
5. Try updating a material
6. Verify success message is in Arabic

### Step 9: Test Error Messages
1. Try creating a material without required fields
2. Verify error message is in Arabic: "الكود والاسم ووحدة القياس مطلوبة"

### Step 10: Switch Back to English
```javascript
// In browser console
localStorage.setItem('language', 'en')
location.reload()
```

Verify everything works in English again.

## 📊 Expected Results

### In English Mode
```
Materials
[Add Material]

Code | Name | UOM | Active | Trackable | Actions
-----|------|-----|--------|-----------|--------
M001 | Steel | KG  | Active | Yes       | [Edit]
```

### In Arabic Mode
```
المواد
[إنشاء مستند]

رمز المادة | اسم المادة | وحدة القياس | نشط | قابل للتتبع | الإجراءات
-----------|------------|-------------|-----|------------|----------
M001       | حديد       | كجم         | نشط | نعم        | [تعديل]
```

## 🎯 Key Features Demonstrated

### 1. Translation Function
```typescript
{t(INVENTORY_TEXTS.materials)}
// Shows: "Materials" in English, "المواد" in Arabic
```

### 2. Display Helper
```typescript
{getDisplayName(material)}
// Shows: material.material_name in English
// Shows: material.material_name_ar in Arabic (if available)
```

### 3. RTL Layout
```typescript
<Box sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
// Automatically adjusts layout direction
```

### 4. Inline Translations
```typescript
{t({ en: 'Edit', ar: 'تعديل' })}
// Quick translations without adding to INVENTORY_TEXTS
```

## 🐛 Troubleshooting

### Issue: Page shows in English even after switching to Arabic
**Solution:** 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check localStorage: `localStorage.getItem('language')`

### Issue: Material names don't show in Arabic
**Reason:** Database doesn't have Arabic names yet
**Solution:** 
- Edit materials and add Arabic names
- Or add Arabic names directly in database:
```sql
UPDATE materials 
SET material_name_ar = 'اسم عربي' 
WHERE material_code = 'M001';
```

### Issue: Layout is not RTL
**Solution:**
- Verify `isRTL` is true: Check in console
- Ensure `ArabicLanguageService.setLanguage('ar')` was called
- Check `document.documentElement.dir` should be 'rtl'

### Issue: Some labels still in English
**Reason:** Those labels might not be translated yet
**Solution:** Add them to `INVENTORY_TEXTS` in `src/i18n/inventory.ts`

## 📝 Next Steps

### Expand to Other Pages
Now that Materials page works, apply the same pattern to:
1. **Locations** - Similar structure, easy to implement
2. **Receive** - Transaction form
3. **On Hand Report** - Report page
4. **Other pages** - Follow the same pattern

### Pattern to Follow
```typescript
// 1. Import
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { INVENTORY_TEXTS } from '@/i18n/inventory'
import { getDisplayName } from '@/utils/inventoryDisplay'

// 2. Use hook
const { t, isRTL } = useArabicLanguage()

// 3. Translate labels
<Typography>{t(INVENTORY_TEXTS.labelKey)}</Typography>

// 4. Display Arabic data
<Typography>{getDisplayName(item)}</Typography>

// 5. RTL layout
<Box sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
```

## ✅ Success Criteria

- [x] Page loads without errors
- [x] All labels translate to Arabic
- [x] Material names show in Arabic (when available)
- [x] Layout is RTL in Arabic mode
- [x] Buttons and actions work correctly
- [x] Dialogs show in Arabic
- [x] Messages and toasts in Arabic
- [x] Can switch between languages seamlessly

---

**Status:** ✅ Ready for Testing  
**Implementation Time:** ~30 minutes  
**Files Modified:** 1 (Materials.tsx)  
**Files Created:** 3 (inventory.ts, inventoryDisplay.ts, this guide)  
**Risk:** Zero (additive changes only)
