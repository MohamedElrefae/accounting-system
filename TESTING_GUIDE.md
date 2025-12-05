# 🧪 Testing Guide - Transaction Details Refactor

**Date:** 30 نوفمبر 2025  
**Status:** Ready for Testing

---

## 🎯 Testing Objectives

1. Verify all tabs work correctly
2. Verify expandable sections function properly
3. Verify data displays accurately
4. Verify edit mode works
5. Verify responsive design
6. Verify accessibility
7. Verify performance

---

## 🚀 Getting Started

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Navigate to Transactions

1. Open the application in your browser
2. Log in with your credentials
3. Navigate to Transactions page
4. Click on any transaction to open details

---

## ✅ Test Cases

### Test Suite 1: Tab Navigation

#### Test 1.1: Basic Tab Switching
```
✓ Click on each tab
✓ Verify tab becomes active (highlighted)
✓ Verify content changes
✓ Verify URL doesn't change
✓ Verify no console errors
```

**Expected Result:**
- Tab switches smoothly
- Content loads instantly
- Active tab is highlighted with accent color
- Badge numbers are visible

#### Test 1.2: Keyboard Navigation
```
✓ Focus on first tab (Tab key)
✓ Press Arrow Right → moves to next tab
✓ Press Arrow Left → moves to previous tab
✓ Press Enter → activates tab
✓ Press Space → activates tab
```

**Expected Result:**
- Keyboard navigation works smoothly
- Focus indicator is visible
- Tab content updates on activation

#### Test 1.3: Tab Persistence
```
✓ Switch to "القيود" tab
✓ Close the panel
✓ Open another transaction
✓ Verify "القيود" tab is still active
```

**Expected Result:**
- Last active tab is remembered
- Persists across panel opens/closes

---

### Test Suite 2: Expandable Sections

#### Test 2.1: Expand/Collapse
```
✓ Click on section header
✓ Verify section expands/collapses
✓ Verify smooth animation
✓ Verify icon rotates (▶ to ▼)
```

**Expected Result:**
- Section expands smoothly (300ms animation)
- Content slides down
- Icon rotates correctly

#### Test 2.2: Section Persistence
```
✓ Collapse "معلومات المعاملة" section
✓ Switch to another tab
✓ Switch back to "معلومات أساسية" tab
✓ Verify section is still collapsed
```

**Expected Result:**
- Section state is remembered per section
- Persists across tab switches

#### Test 2.3: Multiple Sections
```
✓ Expand all sections
✓ Collapse all sections
✓ Expand only middle section
✓ Verify independent operation
```

**Expected Result:**
- Each section operates independently
- No interference between sections

---

### Test Suite 3: Data Display

#### Test 3.1: Basic Info Tab
```
✓ Verify transaction number displays
✓ Verify date is formatted correctly (ar-EG)
✓ Verify description shows
✓ Verify status badge shows correct status
✓ Verify all fields have labels
```

**Expected Result:**
- All data displays correctly
- Arabic formatting is correct
- No missing or "undefined" values

#### Test 3.2: Lines Tab
```
✓ Verify all lines display in table
✓ Verify account names show correctly
✓ Verify debit/credit amounts are correct
✓ Verify totals calculate correctly
✓ Verify balance status shows (✅ or ❌)
```

**Expected Result:**
- Table displays all lines
- Numbers are formatted with commas
- Totals match sum of lines
- Balance indicator is accurate

#### Test 3.3: Approvals Tab
```
✓ Verify current status displays
✓ Verify approval history shows
✓ Verify user names display
✓ Verify dates are formatted
✓ Verify reasons show when present
```

**Expected Result:**
- All approval data displays
- Timeline is chronological
- User names are resolved

#### Test 3.4: Documents Tab
```
✓ Verify document list displays
✓ Verify upload button works
✓ Verify download works
✓ Verify delete works (if permitted)
```

**Expected Result:**
- Documents component loads
- All document operations work

#### Test 3.5: Audit Tab
```
✓ Verify all actions display
✓ Verify chronological order
✓ Verify user names show
✓ Verify timestamps are correct
```

**Expected Result:**
- Complete audit trail displays
- Most recent actions first
- All data is accurate

---

### Test Suite 4: Edit Mode

#### Test 4.1: Enter Edit Mode
```
✓ Click "تعديل" button
✓ Verify MultiLineEditor appears
✓ Verify existing data loads
✓ Verify all lines show
```

**Expected Result:**
- Edit mode activates
- Current data pre-fills
- Editor is functional

#### Test 4.2: Edit and Save
```
✓ Modify transaction description
✓ Add a new line
✓ Modify line amounts
✓ Click save
✓ Verify changes persist
```

**Expected Result:**
- Changes save successfully
- Returns to view mode
- Updated data displays

#### Test 4.3: Cancel Edit
```
✓ Enter edit mode
✓ Make changes
✓ Click cancel
✓ Verify changes are discarded
```

**Expected Result:**
- Returns to view mode
- No changes saved
- Original data intact

---

### Test Suite 5: Actions

#### Test 5.1: Delete Transaction
```
✓ Click "حذف" button
✓ Verify confirmation modal appears
✓ Click "تأكيد الحذف"
✓ Verify transaction is deleted
✓ Verify panel closes
```

**Expected Result:**
- Confirmation required
- Delete succeeds
- User feedback provided

#### Test 5.2: Submit for Review
```
✓ Click "إرسال للمراجعة"
✓ Enter note
✓ Click "تأكيد الإرسال"
✓ Verify status changes to "مُرسلة"
```

**Expected Result:**
- Modal appears
- Submission succeeds
- Status updates

#### Test 5.3: Approve Transaction
```
✓ Open pending transaction
✓ Click "اعتماد"
✓ Enter reason (optional)
✓ Click "تأكيد"
✓ Verify status changes to "معتمدة"
```

**Expected Result:**
- Approval succeeds
- Status updates
- Approval recorded in history

---

### Test Suite 6: Responsive Design

#### Test 6.1: Desktop (1920x1080)
```
✓ Verify tabs display horizontally
✓ Verify 2-column grid in info sections
✓ Verify table is readable
✓ Verify no horizontal scroll
```

**Expected Result:**
- Optimal layout for large screens
- All content visible
- Good use of space

#### Test 6.2: Tablet (768x1024)
```
✓ Verify tabs still horizontal
✓ Verify grid becomes 1-column
✓ Verify table scrolls horizontally
✓ Verify touch targets are 44px+
```

**Expected Result:**
- Layout adapts appropriately
- Touch-friendly
- Readable content

#### Test 6.3: Mobile (375x667)
```
✓ Verify tabs scroll horizontally
✓ Verify all content is 1-column
✓ Verify table scrolls
✓ Verify buttons are large enough
```

**Expected Result:**
- Mobile-optimized layout
- Easy to use on small screens
- No content cut off

---

### Test Suite 7: Accessibility

#### Test 7.1: Keyboard Navigation
```
✓ Tab through all interactive elements
✓ Verify focus indicators visible
✓ Verify logical tab order
✓ Verify no keyboard traps
```

**Expected Result:**
- All elements keyboard accessible
- Clear focus indicators
- Logical navigation flow

#### Test 7.2: Screen Reader
```
✓ Enable screen reader
✓ Navigate through tabs
✓ Verify ARIA labels read correctly
✓ Verify content is announced
```

**Expected Result:**
- All content accessible
- Proper ARIA labels
- Meaningful announcements

#### Test 7.3: Color Contrast
```
✓ Check text on backgrounds
✓ Verify WCAG AA compliance
✓ Test in high contrast mode
```

**Expected Result:**
- Sufficient contrast ratios
- Readable in all modes

---

### Test Suite 8: Performance

#### Test 8.1: Load Time
```
✓ Open transaction details
✓ Measure time to interactive
✓ Verify < 2 seconds
```

**Expected Result:**
- Fast initial load
- No blocking operations
- Smooth rendering

#### Test 8.2: Tab Switching
```
✓ Switch between tabs rapidly
✓ Measure switch time
✓ Verify < 200ms
```

**Expected Result:**
- Instant tab switches
- No lag or delay
- Smooth transitions

#### Test 8.3: Large Data Sets
```
✓ Open transaction with 50+ lines
✓ Verify table renders quickly
✓ Verify scrolling is smooth
```

**Expected Result:**
- Handles large data well
- No performance degradation
- Smooth scrolling

---

### Test Suite 9: Theme Support

#### Test 9.1: Dark Mode
```
✓ Switch to dark mode
✓ Verify all colors update
✓ Verify readability
✓ Verify no white flashes
```

**Expected Result:**
- Proper dark mode colors
- Good contrast
- Consistent theming

#### Test 9.2: Light Mode
```
✓ Switch to light mode
✓ Verify all colors update
✓ Verify readability
✓ Verify proper contrast
```

**Expected Result:**
- Proper light mode colors
- Good contrast
- Consistent theming

---

### Test Suite 10: Edge Cases

#### Test 10.1: Empty Data
```
✓ Open transaction with no lines
✓ Verify "لا توجد قيود" message
✓ Open transaction with no approvals
✓ Verify appropriate message
```

**Expected Result:**
- Graceful handling of empty data
- Helpful messages
- No errors

#### Test 10.2: Long Text
```
✓ Transaction with very long description
✓ Verify text wraps correctly
✓ Verify no overflow
```

**Expected Result:**
- Text wraps properly
- No layout breaking
- Readable content

#### Test 10.3: Special Characters
```
✓ Transaction with Arabic text
✓ Transaction with numbers
✓ Transaction with symbols
✓ Verify all display correctly
```

**Expected Result:**
- All characters display
- Proper RTL support
- No encoding issues

---

## 🐛 Bug Reporting

If you find any issues, please report with:

```
Bug Title: [Brief description]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Environment:
- Browser: [Chrome/Firefox/Safari]
- Version: [Version number]
- OS: [Windows/Mac/Linux]
- Screen Size: [1920x1080]

Screenshots:
[Attach if applicable]

Console Errors:
[Copy any errors from console]
```

---

## ✅ Sign-Off Checklist

Before marking as complete, verify:

```
☐ All test suites passed
☐ No console errors
☐ No TypeScript errors
☐ Responsive on all devices
☐ Accessible via keyboard
☐ Works in dark/light mode
☐ Performance is acceptable
☐ Data displays accurately
☐ Edit mode works correctly
☐ All actions work
☐ Documentation updated
```

---

**Testing Started:** [Date/Time]  
**Testing Completed:** [Date/Time]  
**Tested By:** [Name]  
**Status:** [Pass/Fail]  
**Issues Found:** [Number]

---
