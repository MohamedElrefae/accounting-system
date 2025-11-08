# Transaction Entry Form - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Deploy Supabase Function (CRITICAL!)
Copy and run the SQL from `supabase-create-transaction-function.sql` in your Supabase SQL Editor.

```bash
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Copy entire contents of supabase-create-transaction-function.sql
# 4. Click "Run"
# 5. Verify: "Success. No rows returned"
```

### Step 2: Run These SQL Queries to Verify Schema

```sql
-- Copy these 3 queries and run them in Supabase SQL Editor
-- This ensures your database schema matches what the form expects
```

**Query 1: Get transactions schema**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;
```

**Query 2: Get transaction_lines schema**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transaction_lines'
ORDER BY ordinal_position;
```

**Query 3: Verify RPC function exists**
```sql
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'create_transaction_with_lines';
```

### Step 3: Install Dependencies (if needed)

Check if these packages are installed:
```bash
npm list react-hook-form @hookform/resolvers zod
```

If missing, install them:
```bash
npm install react-hook-form @hookform/resolvers zod
```

### Step 4: Update Your Parent Component

Find where `TransactionWizard` is used (probably `src/pages/Transactions/Transactions.tsx`) and make these changes:

**Change 1: Import**
```typescript
// Replace this line:
import TransactionWizard from '../components/Transactions/TransactionWizard';

// With this:
import TransactionEntryForm from '../components/Transactions/TransactionEntryForm';
```

**Change 2: State variable name (optional but recommended)**
```typescript
// Old:
const [wizardOpen, setWizardOpen] = useState(false);

// New:
const [formOpen, setFormOpen] = useState(false);
```

**Change 3: Handler function**
```typescript
// Replace complex handleTransactionSubmit with this simple version:
const handleTransactionSuccess = () => {
  fetchTransactions(); // Refresh the list
  // The form shows its own success message
};
```

**Change 4: Component JSX**
```tsx
{/* Replace TransactionWizard with: */}
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
```

**Change 5: Button to open form**
```tsx
<Button onClick={() => setFormOpen(true)}>
  + معاملة جديدة
</Button>
```

### Step 5: Test It!

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test the form:**
   - ✅ Click "+ معاملة جديدة"
   - ✅ Fill required fields (date, org, description)
   - ✅ Click settings ⚙️ to customize layout
   - ✅ Add lines and enter amounts
   - ✅ Watch totals update in footer
   - ✅ Save and verify success

3. **Keyboard shortcut:**
   - Press **Cmd+S** (Mac) or **Ctrl+S** (Windows) to submit

---

## ✅ What Changed?

### Before (TransactionWizard)
- ❌ 3-step wizard flow
- ❌ Complex submission logic
- ❌ Fixed layout

### After (TransactionEntryForm)
- ✅ Single-page form
- ✅ Atomic RPC submission
- ✅ Customizable layout
- ✅ Keyboard shortcuts
- ✅ Live validation

---

## 🐛 Common Issues

**"Function does not exist"** → Run the SQL in `supabase-create-transaction-function.sql`

**"onSubmit is not a function"** → Change `onSubmit` prop to `onSuccess`

**Layout not saving** → Check browser localStorage is enabled

---

## 📚 Need More?

See `TRANSACTION_FORM_IMPLEMENTATION_GUIDE.md` for complete details.

---

**Questions?** Check the full implementation guide!
