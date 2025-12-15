# 🚀 Quick Reference - Inventory Setup

## 📋 Checklist

### Pre-Setup
- [ ] Get org_id: `localStorage.getItem('org_id')`
- [ ] Open Supabase SQL Editor
- [ ] Have org_id ready to paste

### Database Setup (5 min)
- [ ] Run UOMs SQL (8 units)
- [ ] Run Materials SQL (10 items)
- [ ] Run Locations SQL (4 locations)
- [ ] Verify data with SELECT query

### UI Testing (5 min)
- [ ] Refresh Materials page (Ctrl+Shift+R)
- [ ] Verify English mode works
- [ ] Switch to Arabic
- [ ] Verify Arabic mode works
- [ ] Test create material
- [ ] Test edit material

---

## 🔑 Key Commands

### Get Organization ID
```javascript
localStorage.getItem('org_id')
```

### Switch to Arabic
```javascript
localStorage.setItem('language', 'ar')
location.reload()
```

### Switch to English
```javascript
localStorage.setItem('language', 'en')
location.reload()
```

### Hard Refresh
```
Ctrl + Shift + R
```

---

## 📊 Expected Results

### English Mode
```
Materials
[Create Document]

Material Code | Material Name      | UOM | Active | Actions
M001         | Steel Rebar 12mm   | KG  | Active | [Edit]
M002         | Portland Cement    | TON | Active | [Edit]
```

### Arabic Mode
```
المواد
[إنشاء مستند]

الإجراءات | نشط | وحدة القياس | اسم المادة           | رمز المادة
[تعديل]   | نشط | كجم         | حديد تسليح 12 ملم    | M001
[تعديل]   | نشط | طن          | أسمنت بورتلاند       | M002
```

---

## 🐛 Quick Fixes

### No data showing?
1. Check org_id is correct
2. Verify SQL ran successfully
3. Hard refresh (Ctrl+Shift+R)

### Arabic not showing?
1. Check language: `localStorage.getItem('language')`
2. Should return `'ar'`
3. Hard refresh

### Permission errors?
1. Verify user is logged in
2. Check org_id matches user's organization
3. Check RLS policies

---

## 📁 Files

**Main Guide:** `INVENTORY_COMPLETE_SETUP_GUIDE.md`  
**SQL Script:** `sql/add_sample_materials.sql`  
**Troubleshooting:** `FIX_MATERIALS_NO_DATA.md`

---

## ⏱️ Time Estimate

- Get org_id: 2 min
- Add UOMs: 2 min
- Add Materials: 3 min
- Add Locations: 2 min
- Test UI: 3 min
- **Total: 12 minutes**

---

## ✅ Success = All Green

- ✅ 8 UOMs in database
- ✅ 10 Materials in database
- ✅ 4 Locations in database
- ✅ English mode works
- ✅ Arabic mode works
- ✅ RTL layout correct
- ✅ Can create materials
- ✅ Can edit materials
- ✅ No console errors

---

**🎯 Follow: INVENTORY_COMPLETE_SETUP_GUIDE.md**
