# 🔧 Debug Guide: Fix sub_tree_id Field Missing in CRUD Modal

## Issue
The "الشجرة الفرعية" (sub_tree) dropdown is not appearing in the transaction CRUD form modal.

## Debugging Steps (follow in order)

### Step 1: Clear All Form Preferences
Run this in browser console:
```javascript
// Clear all form localStorage
Object.keys(localStorage).filter(k => 
  k.includes('unifiedForm') || 
  k.includes('transaction') || 
  k.includes('form-layout')
).forEach(k => localStorage.removeItem(k));

// Refresh page
location.reload();
```

### Step 2: Open Transaction Form and Check Console
1. Open the transactions page
2. Click "➕ معاملة جديدة" (Add New Transaction)  
3. Check browser console for these messages:

**Expected Console Messages:**
```
🌳 buildInitialFormDataForCreate - organizations available: X
🌳 Default org found: {id: "...", code: "MAIN", name: "..."}
🌳 Initial form data created with org_id: ...

🌳 Form opened - loading categories for all orgs: X
🌳 Categories loaded for form - total: Y unique: Z

🌳 createTransactionFormConfig called with:
🌳 Final form config created: {hasSubTreeField: true, ...}
🌳 sub_tree_id field details: {...}

🌳 Transaction form detected - ensuring sub_tree_id visibility
🌳 sub_tree_id field should be visible
🌳 Rendering sub_tree_id field - type: searchable-select
```

### Step 3: If Field Still Missing, Check Field Order
Run this in console while form is open:
```javascript
// Check if field is in visible fields
const visibleFields = localStorage.getItem('unifiedForm:➕ معاملة جديدة:visibleFields');
console.log('Visible fields:', JSON.parse(visibleFields || '[]'));

// Force include sub_tree_id
const defaultFields = ['entry_number','entry_date','description','debit_account_id','credit_account_id','amount','reference_number','org_id','project_id','classification_id','cost_center_id','work_item_id','analysis_work_item_id','sub_tree_id','notes'];
localStorage.setItem('unifiedForm:➕ معاملة جديدة:visibleFields', JSON.stringify(defaultFields));
localStorage.setItem('unifiedForm:➕ معاملة جديدة:fieldOrder', JSON.stringify(defaultFields));

// Close and reopen form
```

### Step 4: Check if Field is Rendering but Hidden
1. Open browser Developer Tools
2. In Elements tab, search for "sub_tree_id"
3. Look for field in DOM structure

### Step 5: Manual Field Visibility Override
If field exists in DOM but hidden, run:
```javascript
// Force show all hidden form fields
document.querySelectorAll('[data-field-id="sub_tree_id"]').forEach(el => {
  el.style.display = 'block';
  el.style.visibility = 'visible';
});

// Or find by field name
document.querySelectorAll('*').forEach(el => {
  if (el.id === 'sub_tree_id' || el.name === 'sub_tree_id') {
    el.style.display = 'block';
    el.style.visibility = 'visible';
    console.log('Found sub_tree_id element:', el);
  }
});
```

## What We've Fixed

### ✅ Form Configuration
- Added sub_tree_id to fields array
- Added sub_tree_id to layout.columnBreakpoints  
- Added fallback static options
- Added comprehensive debug logging

### ✅ Form Visibility
- Added auto-include for sub_tree_id in transaction forms
- Added localStorage monitoring
- Fixed field positioning (row 7, col 2)

### ✅ Debug Information
- Console logs at every step
- Field configuration details
- Options provider execution tracking

## Common Issues & Solutions

### Issue: "Field not in fieldOrder"
**Solution:** Run Step 3 above to force field inclusion

### Issue: "Field in DOM but not visible" 
**Solution:** Check CSS styles, run Step 5

### Issue: "optionsProvider not called"
**Solution:** Field might be conditionally hidden, check dependencies

### Issue: "Categories empty"
**Solution:** Check if organizations are loaded, check database data

## Test Scenarios

1. **Create New Transaction**
   - Should show sub_tree_id with fallback text
   - After selecting organization, should show actual options

2. **Edit Existing Transaction**  
   - Should show sub_tree_id field
   - Should show current value if set

3. **Form Layout Controls**
   - Open "⚙️ الإعدادات" in form
   - Check if sub_tree_id is in field list
   - Ensure it's checked as visible

## Final Verification

The field should appear between "عنصر العمل" and "ملاحظات" fields with:
- Label: "الشجرة الفرعية"
- Type: Searchable dropdown
- Placeholder: "اختر عقدة الشجرة الفرعية..."
- Fallback text: "تحميل عقد الشجرة الفرعية..." (if no options)

If still not working, check browser console for any JavaScript errors that might be breaking the form rendering.