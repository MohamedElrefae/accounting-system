# 🧪 Test New Modal Flows

## Setup

```bash
npm run dev
Ctrl+Shift+R (hard refresh)
```

---

## Test 1: Line Detail Modal (Click "Review")

**Steps:**
1. Go to Transactions page
2. Select a transaction
3. See transaction lines in bottom table
4. Click "Review" button on any line

**Expected:**
- ✅ `EnhancedLineReviewModalV2` opens
- ✅ Shows Location 1: Line details
- ✅ Shows Location 2: Approval audit trail
- ✅ Modal is draggable
- ✅ Modal is resizable

---

## Test 2: Lines Table Modal (Select Transaction)

**Steps:**
1. Go to Transactions page
2. Click on a transaction in header table

**Expected:**
- ✅ Dialog opens with lines table
- ✅ Shows all lines for that transaction
- ✅ Each line has expand arrow
- ✅ Shows line number, account, amounts, status

---

## Test 3: Navigate Between Modals

**Steps:**
1. Lines table modal is open
2. Click expand arrow on any line

**Expected:**
- ✅ Line detail modal opens
- ✅ Shows details for that specific line
- ✅ Can close and open different line

---

## Test 4: Data Consistency

**Steps:**
1. Open lines table modal
2. Note approval status of a line
3. Click expand arrow on that line
4. Check Location 2 for approval history

**Expected:**
- ✅ Approval status matches
- ✅ Approval history shows all actions
- ✅ Data is consistent

---

## Test 5: Modal Features

**Steps:**
1. Open line detail modal
2. Try to drag header
3. Try to resize from corner
4. Refresh page

**Expected:**
- ✅ Can drag modal
- ✅ Can resize modal
- ✅ Position/size saved after refresh

---

## Troubleshooting

If modals don't open:
```bash
# Clear cache and restart
npm cache clean --force
rm -rf node_modules
npm install
npm run dev

# Then in browser:
Ctrl+Shift+Delete (clear cache)
Ctrl+Shift+R (hard refresh)
```

---

**Time to test**: 10 minutes  
**Difficulty**: Easy  
**Status**: READY ✅
