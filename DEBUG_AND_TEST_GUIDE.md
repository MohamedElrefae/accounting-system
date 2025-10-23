# Testing & Debugging Guide for Dual-Table Transactions Page

## 🚀 Quick Start: Testing Draft Transactions & Lines Table

### Step 1: Clear Browser Storage & Reset
```javascript
// Copy and paste this into browser console (F12 → Console tab)
localStorage.removeItem('transactions_approval_filter');
localStorage.removeItem('transactions_table_wrap');
localStorage.removeItem('transactions_lines_table_wrap');
localStorage.removeItem('transactions_table');
localStorage.removeItem('transactions_lines_table');
location.reload();
```

### Step 2: Monitor Console During Testing
1. Open browser DevTools: Press **F12**
2. Go to **Console** tab
3. Keep console visible while testing
4. Look for these debug messages:
   - 🚀 `Reload triggered with filters`
   - 📊 `Response from getTransactions`
   - 🔍 `Transaction row clicked`
   - 🔄 `useEffect triggered, selectedTransactionId`
   - ✅ `Lines fetched successfully`

### Step 3: Test Flow
1. **Create a Draft Transaction:**
   - Click "+ معاملة جديدة" button
   - Fill in transaction details
   - Click "حفظ" (Save) button
   - **Check Console:** Should show `📊 Response from getTransactions` with draft included
   - **In UI:** New draft should appear at top of transactions table with "مسودة" status

2. **Select Transaction & View Lines:**
   - Click on the draft transaction row
   - **Check Console:** Should show `🔍 Transaction row clicked` and `🔄 useEffect triggered`
   - **In UI:** Lines table below should populate with line items
   - **Check Console:** Should show `✅ Lines fetched successfully`

3. **Test Action Buttons:**
   - Hover over transaction row → Should see action buttons (Edit, Delete, Details, Documents, etc.)
   - Click on line item → Should highlight and populate edit form
   - Line item should have Edit/Delete buttons

---

## 📋 What to Report If Issues Occur

### Issue 1: Draft Transaction Not Appearing
**Console Check:**
- Look for `📊 Response from getTransactions:` message
- Expand it and check if `data.rows` contains your draft
- If draft is in response but not in UI → **State update issue**
- If draft is NOT in response → **Server/filter issue**

**To Report:**
```
Draft transaction not visible.
Console shows: [paste the Response message]
Draft in data.rows: YES/NO
Error message: [if any]
```

### Issue 2: Empty Lines Table
**Console Check:**
- Click on a transaction with known line items
- Look for `🔄 useEffect triggered, selectedTransactionId:` message
- Look for `✅ Lines fetched successfully:` message
- Check if array has items or is empty

**To Report:**
```
Lines table empty for transaction [ID/entry_number].
Console shows selectedTransactionId: [value]
Console shows lines fetched: [YES/NO/EMPTY ARRAY]
Error message: [if any]
```

### Issue 3: Missing Action Buttons
**Visual Check:**
- Hover over transaction row in headers table
- Look for buttons on the right side of the row
- Check if line items in lines table have Edit/Delete buttons

**To Report:**
```
Action buttons missing in: HEADERS/LINES/BOTH table
Type of buttons expected: EDIT, DELETE, DETAILS, DOCUMENTS, etc.
Buttons visible: YES/NO
Location: [describe where they should be]
```

---

## 🔧 Manual Testing Checklist

- [ ] localStorage cleared and page reloaded
- [ ] Create new draft transaction
- [ ] Draft appears in transactions table with "مسودة" status
- [ ] Select draft transaction (row highlights)
- [ ] Lines table populates with line items (if transaction has lines)
- [ ] Click on a line item
- [ ] Line item highlights
- [ ] Can edit line properties
- [ ] Can delete line
- [ ] Can see action buttons on both headers and lines rows
- [ ] Column configuration modal opens for both tables
- [ ] Wrap mode toggle works independently per table
- [ ] Filters work correctly (approval status, date range, etc.)
- [ ] Page remains responsive on mobile viewport

---

## 💡 Common Issues & Solutions

### Issue: Still seeing old data after clearing localStorage
**Solution:** 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Close all tabs of the application
3. Open fresh tab and reload

### Issue: Console shows no debug messages
**Solution:**
1. Check if logged in and have permissions
2. Verify no errors in browser console (red messages)
3. Try creating a new transaction to trigger reload()

### Issue: Lines table shows loading indefinitely
**Solution:**
1. Check network tab in DevTools (F12 → Network)
2. Look for request to `transaction_lines` table
3. Check if request completes with data or error

---

## 📞 When Reporting Issues

Include:
1. **Browser & OS:** e.g., "Chrome 120 on Windows 11"
2. **Steps to reproduce:** "Cleared localStorage → Created draft → Selected it → ..."
3. **Expected result:** "Should see 5 line items in lines table"
4. **Actual result:** "Lines table empty"
5. **Console output:** Paste relevant debug messages
6. **Error messages:** Any red text in console
7. **Screenshot:** If visual issue

---

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Draft transactions appear immediately after creation
2. ✅ Selecting a transaction shows its lines in the bottom table
3. ✅ Action buttons are visible and clickable on both tables
4. ✅ Column configs can be set independently per table
5. ✅ No errors in browser console
6. ✅ All console debug messages appear in expected order

---

## 🎯 Next Steps

1. **Test the flow above** while monitoring console
2. **Report any console messages** that show errors or unexpected values
3. **Share the console output** when reporting issues
4. **Verify responsive layout** by resizing browser to tablet/mobile sizes
5. **Test filters and pagination** to ensure all features work

Good luck! 🚀
