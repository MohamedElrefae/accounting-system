# Transaction Entry Form - Implementation Guide

## 🎯 Overview

This guide outlines the complete refactoring of the multi-step `TransactionWizard` into a world-class, single-page `TransactionEntryForm` with dynamic layout configuration, full RTL and Arabic support, and seamless Supabase integration.

---

## ✅ Completed Components

### 1. **Zod Validation Schemas** (`src/schemas/transactionSchema.ts`)
- ✅ `transactionLineSchema` - Validates individual transaction lines with XOR logic for debit/credit
- ✅ `transactionHeaderSchema` - Validates transaction header fields
- ✅ `transactionFormSchema` - Complete form schema with balance validation
- ✅ Helper functions: `createDefaultLine()`, `createDefaultFormData()`

**Key Features:**
- Ensures debit and credit are mutually exclusive per line
- Validates total debits equal total credits (within 0.01 tolerance)
- Arabic error messages
- Date range validation (within 1 year)

### 2. **Supabase RPC Function** (`supabase-create-transaction-function.sql`)
- ✅ Atomic transaction creation with `create_transaction_with_lines` function
- ✅ Handles header insertion into `transactions` table
- ✅ Handles bulk line insertion into `transaction_lines` table
- ✅ Automatic user tracking (`created_by`, `updated_by`)
- ✅ Proper error handling and rollback

**To Deploy:**
```sql
-- Run this SQL in your Supabase SQL Editor
-- See: supabase-create-transaction-function.sql
```

### 3. **Form Layout Settings** (`src/components/Transactions/FormLayoutSettings.tsx`)
- ✅ Modal dialog with 3 tabs: Columns, Fields, Ordering
- ✅ Drag-and-drop field reordering
- ✅ Toggle field visibility and full-width mode
- ✅ Live layout preview
- ✅ Persistent configuration in localStorage
- ✅ MUI-based, fully RTL-compatible

**Features:**
- Choose 1, 2, or 3 column layouts
- Drag fields to reorder
- Toggle visibility (required fields cannot be hidden)
- Toggle full-width mode for fields like descriptions

### 4. **Totals Footer** (`src/components/Transactions/TotalsFooter.tsx`)
- ✅ Fixed bottom position with sticky behavior
- ✅ Live calculation of totals (debits, credits, difference)
- ✅ Visual balance indicator (✅/❌)
- ✅ Primary "Save Transaction" button
- ✅ Optional "Save as Draft" button
- ✅ Loading state during submission
- ✅ Auto-disable when unbalanced or validation errors

### 5. **Transaction Entry Form** (`src/components/Transactions/TransactionEntryForm.tsx`)
- ✅ Single-page form with 2 main sections:
  - Header Section: Dynamic field rendering based on layout config
  - Lines Section: Interactive grid with inline editing
- ✅ Full `react-hook-form` integration with `useForm` and `useFieldArray`
- ✅ Zod validation with `zodResolver`
- ✅ Real-time totals calculation with `watch()`
- ✅ Auto-propagation of header defaults to lines
- ✅ Keyboard shortcuts (Cmd/Ctrl+S to save)
- ✅ Auto-clear opposite amount (debit/credit XOR)
- ✅ Filtered dropdowns (projects by org, categories by org)
- ✅ Supabase RPC submission
- ✅ Success/error notifications with Snackbar
- ✅ Full MUI theming with dark mode support

---

## 🔧 Integration Steps

### Step 1: Run Schema Query (Optional - for reference)
```bash
# Copy the SQL from schema-queries.sql and run in Supabase SQL Editor
# This is for getting fresh schema info if needed
```

### Step 2: Deploy Supabase RPC Function (REQUIRED)
```sql
-- IMPORTANT: Run this SQL in Supabase SQL Editor
-- File: supabase-create-transaction-function.sql
-- This creates the RPC function for atomic transaction creation
```

**Verification SQL:**
```sql
-- Get schema for transactions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Get schema for transaction_lines table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transaction_lines'
ORDER BY ordinal_position;
```

### Step 3: Update Imports
Wherever `TransactionWizard` is currently used (likely in `src/pages/Transactions/Transactions.tsx`), update the import:

```typescript
// OLD
import TransactionWizard from '../components/Transactions/TransactionWizard';

// NEW
import TransactionEntryForm from '../components/Transactions/TransactionEntryForm';
```

### Step 4: Update Component Usage
Replace the `TransactionWizard` component with `TransactionEntryForm`:

```tsx
// OLD
<TransactionWizard
  open={wizardOpen}
  onClose={() => setWizardOpen(false)}
  onSubmit={handleTransactionSubmit}
  accounts={accounts}
  projects={projects}
  organizations={organizations}
  classifications={classifications}
  categories={categories}
  workItems={workItems}
  costCenters={costCenters}
/>

// NEW
<TransactionEntryForm
  open={formOpen}
  onClose={() => setFormOpen(false)}
  onSuccess={handleTransactionSuccess} // Changed from onSubmit
  accounts={accounts}
  projects={projects}
  organizations={organizations}
  classifications={classifications}
  categories={categories}
  workItems={workItems}
  costCenters={costCenters}
/>
```

**Note the API change:**
- `onSubmit` → `onSuccess`
- The form now handles submission internally via Supabase RPC
- `onSuccess` is called after successful save for parent to refresh data

### Step 5: Update Parent Component Handler
```typescript
// OLD
const handleTransactionSubmit = async (data: any) => {
  // Complex submission logic with header + lines
  // Manual Supabase calls
  await supabase.from('transactions').insert(...)
  await supabase.from('transaction_lines').insert(...)
};

// NEW (Much simpler!)
const handleTransactionSuccess = () => {
  // Just refresh the transactions list
  fetchTransactions();
  setSnackbar({ open: true, message: 'تم إضافة المعاملة بنجاح', severity: 'success' });
};
```

---

## 🎨 Key Features

### 1. **Dynamic Layout Engine**
- Users can customize the header section layout
- Choose number of columns (1, 2, or 3)
- Drag to reorder fields
- Toggle field visibility
- Toggle full-width mode for specific fields
- Layout persists in `localStorage` under key `transactionFormLayout`

### 2. **Live Validation**
- Real-time validation with Zod
- Instant feedback on field errors
- Balance validation with visual indicators
- Prevents submission when unbalanced

### 3. **Intelligent Line Management**
- Auto-clear opposite amount (debit/credit XOR)
- Propagate header defaults to new lines
- Minimum 1 line enforced
- Easy add/remove with visual feedback
- Extended fields collapse for cleaner UI

### 4. **Keyboard-First Design**
- **Cmd/Ctrl + S**: Submit form (when valid and balanced)
- **Tab**: Navigate between fields in logical order
- **Enter in last field**: (Future enhancement) Add new line
- All form controls are keyboard accessible

### 5. **RTL & Arabic Support**
- Full RTL layout with `dir="rtl"`
- All labels and messages in Arabic
- Uses unified theme tokens from MUI
- Consistent spacing and alignment

### 6. **Atomic Transactions**
- Single RPC call ensures data integrity
- Automatic rollback on error
- Prevents orphaned records
- User tracking built-in

---

## 📝 Form Fields Configuration

### Header Fields (Configurable)
| Field ID | Label | Required | Default Visible | Default Full Width |
|----------|-------|----------|-----------------|-------------------|
| `entry_date` | تاريخ القيد | ✅ Yes | ✅ Yes | ❌ No |
| `org_id` | المؤسسة | ✅ Yes | ✅ Yes | ❌ No |
| `description` | وصف المعاملة | ✅ Yes | ✅ Yes | ✅ Yes |
| `project_id` | المشروع | ❌ No | ✅ Yes | ❌ No |
| `classification_id` | تصنيف المعاملة | ❌ No | ✅ Yes | ❌ No |
| `reference_number` | الرقم المرجعي | ❌ No | ✅ Yes | ❌ No |
| `default_cost_center_id` | مركز التكلفة (افتراضي) | ❌ No | ✅ Yes | ❌ No |
| `default_work_item_id` | عنصر العمل (افتراضي) | ❌ No | ✅ Yes | ❌ No |
| `default_sub_tree_id` | الشجرة الفرعية (افتراضي) | ❌ No | ✅ Yes | ❌ No |
| `description_ar` | وصف المعاملة بالعربي | ❌ No | ❌ No | ✅ Yes |
| `notes` | ملاحظات | ❌ No | ✅ Yes | ✅ Yes |
| `notes_ar` | ملاحظات بالعربي | ❌ No | ❌ No | ✅ Yes |

### Line Fields (Always Visible)
- **Line Number** (auto-incremented)
- **Account** (required, postable accounts only)
- **Debit Amount** (numeric, XOR with credit)
- **Credit Amount** (numeric, XOR with debit)
- **Description** (optional)
- **Extended Fields** (collapsible row):
  - Project
  - Cost Center
  - Work Item
  - Classification
  - Sub Tree

---

## 🚀 Usage Example

```typescript
// In your parent component (e.g., Transactions.tsx)
import { useState } from 'react';
import TransactionEntryForm from '../components/Transactions/TransactionEntryForm';

function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  
  // ... fetch accounts, projects, etc.

  const handleTransactionSuccess = () => {
    // Refresh transactions list
    fetchTransactions();
    
    // Show success message
    showToast('تم إضافة المعاملة بنجاح');
  };

  return (
    <>
      <Button onClick={() => setFormOpen(true)}>
        + معاملة جديدة
      </Button>

      <TransactionEntryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleTransactionSuccess}
        accounts={accounts}
        projects={projects}
        organizations={organizations}
        classifications={classifications}
        categories={categories}
        workItems={workItems}
        costCenters={costCenters}
      />
    </>
  );
}
```

---

## 🔍 Testing Checklist

### Before Deployment
- [ ] Run Supabase RPC function SQL
- [ ] Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'create_transaction_with_lines';`
- [ ] Test function with sample data (see verification SQL in the function file)

### Functional Tests
- [ ] Open form → Verify all default fields are visible
- [ ] Enter header data → Verify validation messages
- [ ] Add line → Verify new line appears with header defaults
- [ ] Enter debit in line → Verify credit auto-clears
- [ ] Enter credit in line → Verify debit auto-clears
- [ ] Try to save unbalanced → Verify footer shows error
- [ ] Balance transaction → Verify footer shows ✅
- [ ] Save transaction → Verify success message
- [ ] Check Supabase → Verify transaction and lines inserted
- [ ] Open layout settings → Verify all controls work
- [ ] Change column count → Verify layout updates
- [ ] Drag field to reorder → Verify order persists
- [ ] Toggle field visibility → Verify field hides/shows
- [ ] Toggle full-width → Verify field spans columns
- [ ] Save layout → Verify persists after refresh
- [ ] Press Cmd/Ctrl+S → Verify form submits

### Edge Cases
- [ ] Try to delete last line → Verify button is disabled
- [ ] Enter invalid date → Verify validation error
- [ ] Leave required field empty → Verify cannot submit
- [ ] Enter very large amount → Verify validation
- [ ] Select org → Verify projects filter correctly
- [ ] Clear org → Verify project dropdown disables
- [ ] Close form mid-entry → Verify data does not persist (intentional)
- [ ] Submit duplicate reference → Verify database constraint handling

---

## 📦 File Structure

```
accounting-system/
├── src/
│   ├── schemas/
│   │   └── transactionSchema.ts          # ✅ Zod validation schemas
│   └── components/
│       └── Transactions/
│           ├── TransactionEntryForm.tsx   # ✅ Main form component
│           ├── FormLayoutSettings.tsx     # ✅ Layout configuration modal
│           ├── TotalsFooter.tsx          # ✅ Sticky footer with totals
│           └── TransactionWizard.tsx     # ❌ OLD (keep for reference)
├── supabase-create-transaction-function.sql  # ✅ RPC function
├── schema-queries.sql                    # ℹ️ Reference queries
└── TRANSACTION_FORM_IMPLEMENTATION_GUIDE.md  # 📖 This file
```

---

## 🎯 Next Steps (Optional Enhancements)

1. **Enhanced Keyboard Navigation**
   - Press Enter in last field of a line to add new line
   - Arrow keys to navigate between lines
   - Escape to close form

2. **Line Templates**
   - Save common line configurations as templates
   - Quick-apply templates to new lines

3. **Attachments Support**
   - File upload per line
   - Link attachments to transaction_lines via junction table

4. **Draft Functionality**
   - Implement "Save as Draft" button
   - Store drafts in localStorage or separate table
   - Allow resuming drafts

5. **Duplicate Transaction**
   - Add action to duplicate existing transaction
   - Pre-fill form with existing data

6. **Export/Print**
   - Generate PDF preview before saving
   - Print transaction voucher

---

## 📚 Dependencies

### Required Packages (should already be installed)
```json
{
  "react": "^18.0.0",
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.0.0",
  "@mui/material": "^5.0.0",
  "@mui/icons-material": "^5.0.0",
  "lucide-react": "^0.0.0",
  "@supabase/supabase-js": "^2.0.0"
}
```

### If Missing, Install:
```bash
npm install react-hook-form @hookform/resolvers zod
```

---

## 🐛 Troubleshooting

### Issue: "Function create_transaction_with_lines does not exist"
**Solution:** Run the SQL in `supabase-create-transaction-function.sql` in your Supabase SQL Editor.

### Issue: "TypeError: Cannot read property 'account_id' of undefined"
**Solution:** Ensure the form initializes with at least 2 lines (handled by `createDefaultFormData`).

### Issue: Layout settings not persisting
**Solution:** Check browser's localStorage is enabled. Clear `transactionFormLayout` key and try again.

### Issue: Validation errors showing in Arabic but app is English
**Solution:** This is by design per your rules. Update error messages in `transactionSchema.ts` if needed.

### Issue: Totals not updating in real-time
**Solution:** Ensure `watch('lines')` is working correctly. Check React DevTools for re-render issues.

---

## 🎉 Success Criteria

✅ **The refactoring is complete when:**
1. Users can open the form and see a single-page layout (no steps)
2. Users can customize the header layout via settings
3. Users can add/remove transaction lines dynamically
4. Form validates in real-time with Arabic error messages
5. Sticky footer shows live totals and balance status
6. Form submits atomically to Supabase via RPC
7. Success message appears and parent component refreshes
8. Layout preferences persist across sessions

---

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the Zod error messages for validation issues
3. Check browser console for detailed error logs
4. Verify Supabase RPC function is deployed correctly

---

**Built with ❤️ using React, MUI, react-hook-form, Zod, and Supabase**
