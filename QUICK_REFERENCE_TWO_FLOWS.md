# 🎯 Quick Reference - Two Modal Flows

## Flow 1: Click "Review" on Line
```
TransactionLinesTable
    ↓
Click "Review" button
    ↓
EnhancedLineReviewModalV2 opens
    ├─ Location 1: Line Details
    └─ Location 2: Approval Audit Trail
```

**Component**: `EnhancedLineReviewModalV2`  
**State**: `lineDetailModalOpen`  
**For**: ONE specific line  

---

## Flow 2: Select Transaction
```
TransactionHeaderTable
    ↓
Click on transaction
    ↓
Dialog with EnhancedLineReviewsTable opens
    ├─ Shows all lines
    ├─ Each line expandable
    └─ Click expand → Opens Flow 1
```

**Component**: `EnhancedLineReviewsTable`  
**State**: `linesTableModalOpen`  
**For**: ALL lines of transaction  

---

## Do This Now

```bash
npm run dev
Ctrl+Shift+R
```

Then test:
1. Click "Review" on a line → Should open line detail modal
2. Click on transaction → Should open lines table modal

---

**Status**: ✅ READY TO TEST
