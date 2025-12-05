# Transaction Field Mapping - Visual Guide

## Legacy Single-Row → New Multi-Line Model

### Visual Representation

```
LEGACY MODEL (Single Row)
┌─────────────────────────────────────────────────────────┐
│ transactions                                            │
├─────────────────────────────────────────────────────────┤
│ id: UUID                                                │
│ entry_number: "JE-202501-0001"                         │
│ entry_date: "2025-01-29"                               │
│ description: "Office supplies purchase"                 │
│ debit_account_id: "acc-123" ← LEGACY                   │
│ credit_account_id: "acc-456" ← LEGACY                  │
│ amount: 1000.00 ← LEGACY                               │
│ org_id: "org-789"                                      │
│ project_id: "proj-101"                                 │
│ is_posted: false                                       │
└─────────────────────────────────────────────────────────┘
```

**Converts to:**

```
NEW MODEL (Header + Lines)
┌─────────────────────────────────────────────────────────┐
│ transactions (HEADER)                                   │
├─────────────────────────────────────────────────────────┤
│ id: UUID                                                │
│ entry_number: "JE-202501-0001"                         │
│ entry_date: "2025-01-29"                               │
│ description: "Office supplies purchase"                 │
│ org_id: "org-789"                                      │
│ project_id: "proj-101"                                 │
│ is_posted: false                                       │
│ has_line_items: true ← NEW                            │
│ line_items_count: 2 ← NEW                             │
│ total_debits: 1000.00 ← NEW                           │
│ total_credits: 1000.00 ← NEW                          │
│ debit_account_id: NULL ← DEPRECATED                    │
│ credit_account_id: NULL ← DEPRECATED                   │
│ amount: NULL ← DEPRECATED                              │
└─────────────────────────────────────────────────────────┘
                        │
                        │ ONE-TO-MANY
                        ▼
┌─────────────────────────────────────────────────────────┐
│ transaction_lines (LINE 1)                              │
├─────────────────────────────────────────────────────────┤
│ id: UUID                                                │
│ transaction_id: [parent UUID]                          │
│ line_no: 1                                             │
│ account_id: "acc-123" ← FROM debit_account_id          │
│ debit_amount: 1000.00 ← FROM amount                    │
│ credit_amount: 0.00                                    │
│ description: "Office supplies"                          │
│ org_id: "org-789"                                      │
│ project_id: "proj-101"                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ transaction_lines (LINE 2)                              │
├─────────────────────────────────────────────────────────┤
│ id: UUID                                                │
│ transaction_id: [parent UUID]                          │
│ line_no: 2                                             │
│ account_id: "acc-456" ← FROM credit_account_id         │
│ debit_amount: 0.00                                     │
│ credit_amount: 1000.00 ← FROM amount                   │
│ description: "Cash payment"                             │
│ org_id: "org-789"                                      │
│ project_id: "proj-101"                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Logic

### Step 1: For Each Legacy Transaction

```sql
SELECT 
  id,
  debit_account_id,
  credit_account_id,
  amount,
  org_id,
  project_id,
  cost_center_id,
  work_item_id,
  analysis_work_item_id,
  classification_id,
  sub_tree_id
FROM transactions
WHERE debit_account_id IS NOT NULL
  AND credit_account_id IS NOT NULL
  AND amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transaction_lines 
    WHERE transaction_id = transactions.id
  );
```

### Step 2: Create Line 1 (Debit)

```sql
INSERT INTO transaction_lines (
  transaction_id,
  line_no,
  account_id,
  debit_amount,
  credit_amount,
  description,
  org_id,
  project_id,
  cost_center_id,
  work_item_id,
  analysis_work_item_id,
  classification_id,
  sub_tree_id
) VALUES (
  [transaction.id],
  1,
  [transaction.debit_account_id],
  [transaction.amount],
  0,
  'Migrated from legacy - Debit',
  [transaction.org_id],
  [transaction.project_id],
  [transaction.cost_center_id],
  [transaction.work_item_id],
  [transaction.analysis_work_item_id],
  [transaction.classification_id],
  [transaction.sub_tree_id]
);
```

### Step 3: Create Line 2 (Credit)

```sql
INSERT INTO transaction_lines (
  transaction_id,
  line_no,
  account_id,
  debit_amount,
  credit_amount,
  description,
  org_id,
  project_id,
  cost_center_id,
  work_item_id,
  analysis_work_item_id,
  classification_id,
  sub_tree_id
) VALUES (
  [transaction.id],
  2,
  [transaction.credit_account_id],
  0,
  [transaction.amount],
  'Migrated from legacy - Credit',
  [transaction.org_id],
  [transaction.project_id],
  [transaction.cost_center_id],
  [transaction.work_item_id],
  [transaction.analysis_work_item_id],
  [transaction.classification_id],
  [transaction.sub_tree_id]
);
```

### Step 4: Update Header Aggregates

```sql
UPDATE transactions SET
  has_line_items = true,
  line_items_count = 2,
  total_debits = amount,
  total_credits = amount,
  debit_account_id = NULL,  -- Clear legacy field
  credit_account_id = NULL, -- Clear legacy field
  amount = NULL             -- Clear legacy field
WHERE id = [transaction.id];
```

---

## Validation Queries

### Check Migration Success

```sql
-- Count transactions with legacy fields
SELECT COUNT(*) as legacy_count
FROM transactions
WHERE debit_account_id IS NOT NULL
  OR credit_account_id IS NOT NULL
  OR amount IS NOT NULL;

-- Count transactions with lines
SELECT COUNT(*) as with_lines_count
FROM transactions
WHERE has_line_items = true
  AND line_items_count >= 2;

-- Count transactions without lines
SELECT COUNT(*) as without_lines_count
FROM transactions
WHERE has_line_items = false
  OR line_items_count IS NULL
  OR line_items_count < 2;

-- Verify balance for all transactions
SELECT 
  t.id,
  t.entry_number,
  t.total_debits,
  t.total_credits,
  ABS(t.total_debits - t.total_credits) as imbalance
FROM transactions t
WHERE ABS(t.total_debits - t.total_credits) > 0.01;
```

---

## UI Comparison

### Legacy Edit Form (BEFORE)

```
┌─────────────────────────────────────────┐
│ Edit Transaction                        │
├─────────────────────────────────────────┤
│ Entry Number: JE-202501-0001           │
│ Date: [2025-01-29]                     │
│ Description: [Office supplies]          │
│                                         │
│ Debit Account: [Select Account ▼]      │ ← LEGACY
│ Credit Account: [Select Account ▼]     │ ← LEGACY
│ Amount: [1000.00]                      │ ← LEGACY
│                                         │
│ Organization: [Select Org ▼]           │
│ Project: [Select Project ▼]            │
│                                         │
│ [Cancel] [Save]                        │
└─────────────────────────────────────────┘
```

### New Edit Form (AFTER)

```
┌─────────────────────────────────────────────────────────┐
│ Edit Transaction                                        │
├─────────────────────────────────────────────────────────┤
│ Entry Number: JE-202501-0001                           │
│ Date: [2025-01-29]                                     │
│ Description: [Office supplies]                          │
│ Organization: [Select Org ▼]                           │
│ Project: [Select Project ▼]                            │
├─────────────────────────────────────────────────────────┤
│ Transaction Lines                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Line │ Account      │ Debit    │ Credit   │ [Edit] ││
│ ├──────┼──────────────┼──────────┼──────────┼────────┤│
│ │  1   │ 1010 - Cash  │ 1000.00  │    -     │   ✏️   ││
│ │  2   │ 5010 - Exp   │    -     │ 1000.00  │   ✏️   ││
│ └─────────────────────────────────────────────────────┘│
│ [+ Add Line]                                           │
│                                                         │
│ Balance: ✅ Debits (1000.00) = Credits (1000.00)      │
│                                                         │
│ [Cancel] [Save]                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Benefits of New Model

### ✅ Flexibility
- Support for complex multi-line transactions
- Split transactions across multiple accounts
- Line-level dimensions (cost centers, work items, etc.)

### ✅ Accuracy
- Enforced balance validation
- Line-level approval workflow
- Better audit trail

### ✅ Scalability
- Support for any number of lines
- Line-level attachments
- Line-level comments/reviews

### ✅ Compliance
- Proper double-entry bookkeeping
- Detailed transaction breakdown
- Better reporting capabilities

---

**Document Purpose:** Visual reference for migration and refactor  
**Audience:** Developers, DBAs, Business Analysts  
**Status:** Reference Material
