# 🔍 Debugging Stack Depth Error - Guide

**Status:** Debugging mode activated  
**Date:** 2025-10-29

---

## 🎯 **What We're Trying to Find**

The "stack depth limit exceeded" error is still occurring, which means there's either:
1. **Infinite recursion** - a function calling itself endlessly
2. **Circular reference** - an object referencing itself
3. **Very deep nesting** - too many nested function calls

We need to find out **WHERE** exactly this is happening.

---

## ✅ **What I've Added**

### **1. Step-by-Step Logging**

Added detailed console.log statements at every critical point:

```typescript
🚀 [STEP 1] Starting handleSubmit...
🚀 [STEP 2] Validating header...
🚀 [STEP 3] Validating lines...
✅ [STEP 3] Validation passed!
🚀 [STEP 4] Cleaning header data...
🚀 [STEP 5] Cleaning lines data...
🚀 [STEP 6] Calling createTransactionWithLines...
  Lines count: X

🔷 [SERVICE 1] Entered createTransactionWithLines
🔷 [SERVICE 2] Validating header...
🔷 [SERVICE 3] Validating lines...
🔷 [SERVICE 4] Preparing header payload...
🔷 [SERVICE 5] Inserting transaction header to database...
✅ [SERVICE 6] Transaction header created, ID: XXX
🔷 [SERVICE 7] Preparing line payloads...
🔷 [SERVICE 8] Calling replaceTransactionLines...
  Transaction ID: XXX
  Lines count: X
✅ [SERVICE 9] Transaction created successfully!

✅ [STEP 7] Transaction created! ID: XXX
🏁 [FINALLY] Cleaning up submission state
```

### **2. Submission Guard**

Added a flag to prevent multiple simultaneous submissions:

```typescript
if (isSubmitting || submitAttempted) {
  console.warn('⚠️ Submission already in progress, ignoring...')
  return
}
```

### **3. Safe Error Handling**

Wrapped ALL error handling in try-catch blocks to prevent errors in error handling itself.

---

## 📋 **How to Debug**

### **Step 1: Open Browser Console**

1. Press `F12` or `Right-click → Inspect`
2. Go to **Console** tab
3. Clear the console (trash icon)

### **Step 2: Try Creating a Transaction**

1. Click "+ معاملة جديدة"
2. Fill in:
   - Entry Date
   - Description
   - At least 2 balanced lines
3. Click "حفظ المعاملة"

### **Step 3: Watch the Console**

The console will show a numbered log trail like:
```
🚀 [STEP 1] Starting handleSubmit...
🚀 [STEP 2] Validating header...
🚀 [STEP 3] Validating lines...
...
```

**THE LAST LOG MESSAGE BEFORE THE ERROR** will tell us exactly where it's failing!

### **Step 4: Take a Screenshot**

- Take a screenshot of the ENTIRE console output
- Make sure we can see:
  - All the 🚀/🔷/✅ log messages
  - The error message
  - The last successful step

---

## 🎯 **What to Look For**

### **Scenario 1: Stops at STEP 2-3 (Validation)**
```
🚀 [STEP 2] Validating header...
❌ ERROR
```
**Meaning:** The error is in the validation functions themselves.

### **Scenario 2: Stops at STEP 6 (Calling Service)**
```
🚀 [STEP 6] Calling createTransactionWithLines...
❌ ERROR
```
**Meaning:** The error happens when preparing to call the service.

### **Scenario 3: Stops at SERVICE 5 (Database Insert)**
```
🔷 [SERVICE 5] Inserting transaction header to database...
❌ ERROR
```
**Meaning:** The error is in the Supabase database operation.

### **Scenario 4: Stops at SERVICE 8 (Lines Insert)**
```
🔷 [SERVICE 8] Calling replaceTransactionLines...
❌ ERROR
```
**Meaning:** The error is when inserting transaction lines.

### **Scenario 5: Infinite Loop**
```
🚀 [STEP 1] Starting handleSubmit...
🚀 [STEP 1] Starting handleSubmit...
🚀 [STEP 1] Starting handleSubmit...
... (repeats many times)
```
**Meaning:** Something is triggering handleSubmit repeatedly (infinite loop).

---

## 📸 **PLEASE PROVIDE**

1. **Screenshot of browser console** showing:
   - All log messages
   - The error
   - Stack trace (if visible)

2. **Last successful step number** (e.g., "stopped at STEP 6")

3. **Any additional error messages** in the console

---

## 🔧 **Quick Test Cases**

### **Test 1: Minimal Transaction**
- Entry Date: Today
- Description: "Test"
- Line 1: Any account, Debit: 100
- Line 2: Any account, Credit: 100

### **Test 2: Check Console Before Clicking Save**
Before clicking "حفظ المعاملة", check:
- Are there any errors already in the console?
- Any warnings about circular references?

---

## 🚀 **Ready to Test!**

**Instructions:**
1. ✅ Refresh browser (Ctrl + Shift + R)
2. ✅ Open console (F12)
3. ✅ Clear console
4. ✅ Try creating transaction
5. ✅ Screenshot console output
6. ✅ Report last step number

**The logs will tell us exactly where the problem is!** 🎯


