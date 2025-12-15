# 🚀 Quick Start - Test Arabic Materials Page

## ⚡ 3-Step Quick Test (2 minutes)

### Step 1: Open Materials Page
```
http://localhost:3000/inventory/materials
```

### Step 2: Switch to Arabic
**Press F12 (open console) and run:**
```javascript
localStorage.setItem('language', 'ar')
location.reload()
```

### Step 3: Verify
✅ Page title shows: **المواد**  
✅ Button shows: **إنشاء مستند**  
✅ Table headers in Arabic  
✅ Layout is RTL (right-to-left)

---

## 🎯 What to Look For

### ✅ Correct (Arabic Mode)
```
المواد                                    ← Page title
[إنشاء مستند]                             ← Button

Table (RTL):
الإجراءات | قابل للتتبع | نشط | وحدة القياس | اسم المادة | رمز المادة
[تعديل]   | نعم         | نشط | كجم         | حديد       | M001
```

### ❌ Wrong (If Still English)
```
Materials                                 ← Should be المواد
[Create Document]                         ← Should be إنشاء مستند

Table (LTR):
Material Code | Material Name | UOM | Active | Trackable | Actions
M001         | Steel         | KG  | Active | Yes       | [Edit]
```

---

## 🔄 Switch Back to English
```javascript
localStorage.setItem('language', 'en')
location.reload()
```

---

## 🧪 Full Test (6 minutes)

### 1. Visual Test (2 min)
- [ ] Page loads without errors
- [ ] All labels in Arabic
- [ ] Layout is RTL
- [ ] Status chips show Arabic text

### 2. Create Test (2 min)
- [ ] Click "إنشاء مستند"
- [ ] Dialog opens in Arabic
- [ ] Fill form with Arabic name
- [ ] Save - success message in Arabic

### 3. Edit Test (2 min)
- [ ] Click "تعديل" on any material
- [ ] Dialog opens in Arabic
- [ ] Update material
- [ ] Save - success message in Arabic

---

## 📊 Expected Results

### English Mode
| Material Code | Material Name | UOM | Active | Trackable | Actions |
|--------------|---------------|-----|--------|-----------|---------|
| M001         | Steel         | KG  | Active | Yes       | [Edit]  |

### Arabic Mode (RTL)
| الإجراءات | قابل للتتبع | نشط | وحدة القياس | اسم المادة | رمز المادة |
|----------|------------|-----|------------|-----------|-----------|
| [تعديل]  | نعم        | نشط | كجم        | حديد      | M001      |

---

## 🐛 Quick Fixes

### Issue: Still showing English
```javascript
// Clear everything and try again
localStorage.clear()
localStorage.setItem('language', 'ar')
location.reload(true)
```

### Issue: Layout not RTL
```javascript
// Check direction
console.log(document.documentElement.dir)  // Should be 'rtl'
```

### Issue: Material names not in Arabic
**Reason:** Database doesn't have Arabic names yet  
**Solution:** Edit materials and add Arabic names using the form

---

## ✅ Success Criteria

**Test passes if:**
1. ✅ Page loads in Arabic
2. ✅ All UI labels translated
3. ✅ Layout is RTL
4. ✅ Dialogs work in Arabic
5. ✅ Can switch between languages

---

## 📚 More Info

- **Full Test Guide:** `INVENTORY_ARABIC_TEST_RESULTS.md`
- **Visual Comparison:** `INVENTORY_ARABIC_VISUAL_COMPARISON.md`
- **Complete Summary:** `INVENTORY_ARABIC_COMPLETE_SUMMARY.md`
- **Interactive Test:** Open `test-arabic-materials.html` in browser

---

## 🎯 Current Status

✅ **Dev Server:** Running at http://localhost:3000  
✅ **Materials Page:** http://localhost:3000/inventory/materials  
✅ **Implementation:** Complete  
✅ **Documentation:** Ready  
🧪 **Testing:** Ready to start  

---

**🚀 Ready to test! Just 3 steps and 2 minutes!**
