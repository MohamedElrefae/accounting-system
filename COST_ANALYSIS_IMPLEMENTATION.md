# Cost Analysis Modal Implementation Guide

## ✅ What's Been Done

### 1. Schema Cleanup
- Removed 14 duplicate columns from `transaction_line_items` ✓
- Schema now clean with 13 focused columns ✓
- All cost object fields preserved: `work_item_id`, `analysis_work_item_id`, `sub_tree_id` ✓

### 2. New Components Created

#### `CostAnalysisModal.tsx` (NEW)
Modal for editing cost assignments per line item:
- **3 Dropdowns**: work_item, analysis_work_item, cost_center
- **GL Line Defaults**: Shows defaults from transaction_lines
- **Current Values**: Live display of selections
- **Reset Option**: Revert to GL line defaults

**Features:**
```typescript
- Defaults from transaction_lines
- Override capability per item
- Live label display
- Bilingual (English/Arabic)
- Disabled state during defaults reset
```

### 3. Component Integration

#### `TransactionLineItemsEditor.tsx` (UPDATED)
- Added 💰 button per line item
- Launches CostAnalysisModal
- Updates item with cost assignments
- Persists changes via onChange callback

**Line 32-43:** Cost modal state management  
**Line 307-316:** Cost button added to actions  
**Line 378-399:** Modal integration

### 4. Service Updates

#### `transaction-line-items.ts` (UPDATED)
- Added `work_item_id` to `EditableTxLineItem` interface (Line 39)
- Added `work_item_id` to insert payload (Line 120)
- Added `work_item_id` to update payload (Line 138)

---

## 🔌 Integration Steps (REMAINING)

### Step 1: Pass Data Props to Components
Update the component that renders `TransactionLineItemsEditor`:

```typescript
// Parent component (e.g., UnifiedTransactionDetailsPanel)
<TransactionLineItemsEditor
  transactionLineId={glLineId}
  orgId={orgId}
  items={items}
  onChange={setItems}
  disabled={disabled}
  // ADD THESE PROPS:
  workItems={workItems}
  analysisItems={analysisItemsMap}
  costCenters={costCenters}
  transactionLineDefaults={{
    work_item_id: txLine?.work_item_id,
    analysis_work_item_id: txLine?.analysis_work_item_id,
    sub_tree_id: txLine?.sub_tree_id,
  }}
/>
```

### Step 2: Update TransactionLineItemsEditor Props

```typescript
export interface TransactionLineItemsEditorProps {
  transactionLineId: string
  orgId: string
  items: EditableTxLineItem[]
  onChange: (items: EditableTxLineItem[]) => void
  disabled?: boolean
  
  // ADD THESE:
  workItems?: Array<{ id: string; code: string; name: string }>
  analysisItems?: Record<string, { code: string; name: string }>
  costCenters?: Array<{ id: string; code: string; name: string }>
  transactionLineDefaults?: {
    work_item_id?: string | null
    analysis_work_item_id?: string | null
    sub_tree_id?: string | null
  }
}
```

### Step 3: Remove Placeholder Data in Editor

In `TransactionLineItemsEditor.tsx`, replace placeholder lines 35-43:

```typescript
// REMOVE THESE (currently empty placeholders):
const workItems = [] as Array<...>
const analysisItems = {} as Record<...>
const costCenters = [] as Array<...>
const txLineDefaults = { ... }

// REPLACE WITH:
const workItems = props.workItems || []
const analysisItems = props.analysisItems || {}
const costCenters = props.costCenters || []
const txLineDefaults = props.transactionLineDefaults || {}
```

### Step 4: Update Enhanced Service (Optional)

If using `transactionLineItemsEnhancedService`, update to handle `work_item_id`:

```typescript
// In src/services/transaction-line-items-enhanced.ts
const newItem: EditableTxLineItem = {
  // ... existing fields
  work_item_id: parentItem?.work_item_id,  // Inherit from parent
  analysis_work_item_id: parentItem?.analysis_work_item_id,
  sub_tree_id: parentItem?.sub_tree_id,
}
```

---

## 📊 Data Flow

```
Transaction
  ↓
TransactionLine (GL Line)
  ├─ work_item_id (default)
  ├─ analysis_work_item_id (default)
  └─ sub_tree_id (default)
       ↓
TransactionLineItem (Line Item)
  ├─ quantity, unit_price (transaction-specific)
  ├─ work_item_id (default from GL, can override)
  ├─ analysis_work_item_id (default from GL, can override)
  └─ sub_tree_id (default from GL, can override)
       ↓
CostAnalysisModal
  └─ Shows GL defaults + allows override
```

---

## 🎯 User Flow

1. **Create Transaction** → Create GL Line → Add Line Items
2. **Set GL Line Defaults** (if desired)
3. **For Each Line Item**:
   - Click 💰 button
   - See GL Line defaults (green box)
   - Override as needed
   - Save changes

---

## 📝 API Integration Points

### When User Saves Line Items:
```typescript
// Service sends to API:
{
  id: 'item-uuid',
  transaction_line_id: 'gl-line-uuid',
  quantity: 5,
  unit_price: 100,
  total_amount: 500,
  work_item_id: 'override-work-item',      // NEW
  analysis_work_item_id: 'override-analysis', // NEW
  sub_tree_id: 'override-cost-center',     // NEW
}
```

### Query Example (Get Full Data):
```sql
SELECT 
  tli.*,
  tl.work_item_id as gl_line_work_item,
  tl.analysis_work_item_id as gl_line_analysis,
  tl.sub_tree_id as gl_line_cost_center
FROM transaction_line_items tli
JOIN transaction_lines tl ON tli.transaction_line_id = tl.id;
```

---

## 🔍 Fields Explained

| Field | Scope | Default | Overridable |
|-------|-------|---------|------------|
| `work_item_id` | Line Item | From GL Line | ✅ Yes |
| `analysis_work_item_id` | Line Item | From GL Line | ✅ Yes |
| `sub_tree_id` | Line Item | From GL Line | ✅ Yes |

**Why All Three?**
- **work_item_id**: Budget tracking (WBS element)
- **analysis_work_item_id**: Cost analysis grouping
- **sub_tree_id**: Cost center / profit center allocation

Each line item can have different assignments from GL line.

---

## ✅ Verification Checklist

After integration:

- [ ] CostAnalysisModal component renders correctly
- [ ] 💰 button appears on each line item
- [ ] Modal opens with correct item data
- [ ] GL line defaults display (green box)
- [ ] Dropdowns populate with data
- [ ] Current selection displays correctly
- [ ] "Reset to Defaults" works
- [ ] Save button updates item
- [ ] Updated items persist in UI
- [ ] API receives work_item_id field
- [ ] Database stores values correctly
- [ ] UI displays saved values on reload

---

## 🚀 Deployment

### Step 1: Database (Already Done)
Schema is clean ✅

### Step 2: Backend API
Ensure API endpoints handle `work_item_id` in request bodies

### Step 3: Frontend
1. Update parent component with props
2. Fix TransactionLineItemsEditor props
3. Remove placeholder data
4. Test modal in development
5. Build and deploy

### Step 4: Testing
- Create transaction with GL line
- Add line items
- Click 💰 on item
- Verify defaults load
- Override values
- Save and verify persistence

---

## 📌 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Schema | ✅ Done | 13 clean columns |
| Modal | ✅ Done | CostAnalysisModal.tsx created |
| Editor Integration | ✅ Done | Button & modal wired |
| Service | ✅ Done | work_item_id added |
| Props Passing | ⏳ Pending | Need to update parent |
| Data Fetch | ⏳ Pending | Get dropdowns from context/props |
| API Integration | ⏳ Pending | Backend handling |
| Testing | ⏳ Pending | Full integration test |

---

## 🔧 Configuration

### Customize Modal Appearance
File: `CostAnalysisModal.tsx`

```typescript
// Change modal width
style={{ width: '500px' }} // Line 58, change to desired width

// Change button labels
"Reset to Defaults" // Line 297, change text
"🔄" // Line 295, change emoji
```

### Customize Error Handling
Add validation to `handleSave`:

```typescript
const handleSave = () => {
  // Add validation
  if (!analysisWorkItemId && !workItemId) {
    alert('Please select at least one cost object')
    return
  }
  // ... rest of save logic
}
```

---

## 📞 Support

### Common Issues

**Q: Modal doesn't open**
- Check if `workItems` prop is empty
- Verify item is selected correctly

**Q: Defaults don't show**
- Check `transactionLineDefaults` prop value
- Ensure GL line has assigned values

**Q: Changes don't save**
- Verify `onSave` callback is called
- Check if items are being updated in parent state
- Look for API errors in console

---

## Next Phase (Future)

- [ ] Batch cost assignment (multiple items at once)
- [ ] Template cost assignments (save & apply preset combos)
- [ ] Cost variance reports (GL default vs Item actual)
- [ ] Audit trail of cost changes

---

**Status: Ready for Integration** 🚀

See NEXT_STEPS.md for component prop updates needed.
