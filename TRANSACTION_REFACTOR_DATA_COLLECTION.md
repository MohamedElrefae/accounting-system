# Transaction System Refactor - Data Collection Report

**Date:** January 29, 2025  
**Purpose:** Comprehensive analysis for refactoring unified transaction details from single-row to multi-line model  
**Status:** Data Collection Phase - DO NOT REFACTOR YET

---

## Executive Summary

This document collects ALL relevant information about the transaction system to support a future refactor from the legacy single-row model to the modern header+lines model.

### Current State
- **Legacy Model:** Single-row transactions with `debit_account_id`, `credit_account_id`, `amount`
- **New Model:** Header (`transactions`) + Multiple lines (`transaction_lines`)
- **Status:** Both models coexist; need to complete migration

### Key Findings
1. ✅ New multi-line infrastructure exists (`transaction_lines` table, services, UI)
2. ⚠️ Legacy single-row fields still present in `transactions` table
3. ⚠️ `UnifiedTransactionDetailsPanel` component uses legacy single-row model
4. ✅ `TransactionWizard` component uses new multi-line model
5. ⚠️ Mixed usage across codebase

---

## 1. DATABASE SCHEMA COLLECTION

### 1.1 Legacy Single-Row Model

#### `transactions` Table (Legacy Fields)
Based on code analysis, the legacy single-row model includes:

**Legacy Columns (to be deprecated):**
```sql
-- Single-row transaction fields (LEGACY)
debit_account_id UUID REFERENCES accounts(id)
credit_account_id UUID REFERENCES accounts(id)  
amount NUMERIC(15,2)
```

**Purpose:** These fields represented a simple single-line transaction where:
- One debit account
- One credit account  
- One amount
- No support for complex multi-line journal entries



### 1.2 New Header + Lines Model

#### `transactions` Table (Header - Current Schema)

**Core Header Fields:**
```typescript
// From src/services/transactions.ts - TransactionRecord interface
id: string (UUID, PRIMARY KEY)
entry_number: string (NOT NULL, UNIQUE) // Auto-generated: JE-YYYYMM-NNNN
entry_date: string (DATE, NOT NULL)
description: string (TEXT, NOT NULL)
description_ar: string | null (TEXT)
reference_number: string | null (VARCHAR)
notes: string | null (TEXT)
notes_ar: string | null (TEXT)

// Organization & Project
org_id: string | null (UUID, REFERENCES organizations)
project_id: string | null (UUID, REFERENCES projects)

// Posting Status
is_posted: boolean (DEFAULT false)
posted_at: string | null (TIMESTAMP)
posted_by: string | null (UUID, REFERENCES user_profiles)

// Approval Workflow
approval_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | 'cancelled'
submitted_at: string | null
submitted_by: string | null (UUID)
reviewed_at: string | null
reviewed_by: string | null (UUID)
review_action: 'approved' | 'rejected' | 'revision_requested' | null
review_reason: string | null

// Aggregates from Lines (computed/cached)
has_line_items: boolean
line_items_total: number | null
line_items_count: number | null
total_debits: number | null
total_credits: number | null

// Legacy Fields (DEPRECATED - kept for compatibility)
debit_account_id: string | null
credit_account_id: string | null
amount: number | null

// Dimension Placeholders (header-level, optional)
classification_id: string | null (UUID)
sub_tree_id: string | null (UUID)
work_item_id: string | null (UUID)
analysis_work_item_id: string | null (UUID)
cost_center_id: string | null (UUID)

// Audit
created_by: string | null (UUID)
created_at: string (TIMESTAMP, DEFAULT NOW())
updated_at: string (TIMESTAMP, DEFAULT NOW())
```

**Business Rules (from code):**
1. `entry_number` must be unique and auto-generated
2. `description` minimum 3 characters
3. `org_id` is required for new transactions
4. Cannot post if not approved
5. Cannot edit/delete if posted
6. Aggregates updated via triggers/views



#### `transaction_lines` Table (Detail Lines - Current Schema)

**From:** `src/services/transaction-lines.ts`

```typescript
// TxLineInput interface
id: string (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
transaction_id: string (UUID, NOT NULL, REFERENCES transactions(id) ON DELETE CASCADE)
line_no: number (INTEGER, NOT NULL) // Line sequence number
account_id: string (UUID, NOT NULL, REFERENCES accounts(id))
debit_amount: number (NUMERIC(15,2), DEFAULT 0)
credit_amount: number (NUMERIC(15,2), DEFAULT 0)
description: string | null (TEXT)

// Line-level dimensions
org_id: string | null (UUID, REFERENCES organizations)
project_id: string | null (UUID, REFERENCES projects)
cost_center_id: string | null (UUID, REFERENCES cost_centers)
work_item_id: string | null (UUID, REFERENCES work_items)
analysis_work_item_id: string | null (UUID, REFERENCES analysis_work_items)
classification_id: string | null (UUID, REFERENCES transaction_classification)
sub_tree_id: string | null (UUID, REFERENCES sub_tree) // expenses_category

// Approval workflow (line-level)
line_status: 'draft' | 'pending' | 'approved' | 'rejected' | null
assigned_approver_id: string | null (UUID)
approved_by: string | null (UUID)
approved_at: string | null (TIMESTAMP)
rejected_by: string | null (UUID)
rejected_at: string | null (TIMESTAMP)
rejection_reason: string | null

// Audit
created_at: string (TIMESTAMP, DEFAULT NOW())
updated_at: string (TIMESTAMP, DEFAULT NOW())
```

**Constraints (from code analysis):**
1. **XOR Rule:** Either `debit_amount > 0` OR `credit_amount > 0` (not both, not neither)
2. **Non-negative:** Both amounts must be >= 0
3. **Balance Rule:** Sum of all debits must equal sum of all credits for a transaction
4. **Minimum Lines:** At least 2 lines required per transaction
5. **Cascade Delete:** Lines deleted when parent transaction deleted

**Triggers (inferred from code):**
- Update parent transaction totals on line insert/update/delete
- Enforce balance check
- Sync `org_id` from header if not specified
- Update `line_items_count`, `total_debits`, `total_credits` in header



### 1.3 Lookup / Reference Tables

#### `accounts` (Chart of Accounts)
```typescript
id: string (UUID)
code: string (VARCHAR, UNIQUE)
name: string (VARCHAR)
name_ar: string | null
is_postable: boolean (or allow_transactions)
allow_posting: boolean
category: string | null
parent_id: string | null (UUID, self-reference)
level: number
org_id: string | null (UUID)
status: 'active' | 'inactive'
```

#### `organizations`
```typescript
id: string (UUID)
code: string
name: string
name_ar: string | null
status: 'active' | 'inactive'
```

#### `projects`
```typescript
id: string (UUID)
code: string
name: string
description: string | null
status: 'active' | 'inactive' | 'completed'
start_date: string | null
end_date: string | null
budget_amount: number | null
org_id: string | null
```

#### `cost_centers`
```typescript
id: string (UUID)
code: string
name: string
name_ar: string | null
project_id: string | null
level: number
is_active: boolean
```

#### `work_items`
```typescript
id: string (UUID)
code: string
name: string
description: string | null
status: 'active' | 'inactive'
```

#### `analysis_work_items`
```typescript
id: string (UUID)
code: string
name: string
```

#### `transaction_classification`
```typescript
id: string (UUID)
code: string
name: string
name_ar: string | null
```

#### `sub_tree` (Expenses Categories)
```typescript
id: string (UUID)
code: string
name: string
name_ar: string | null
parent_id: string | null
level: number
```

---

## 2. SERVICE / API LAYER INVENTORY

### 2.1 Legacy Single-Row Services

**File:** `src/services/transactions.ts`

#### `createTransaction(input: CreateTransactionInput)`
**Status:** LEGACY - Single-row model

**Input Model:**
```typescript
interface CreateTransactionInput {
  entry_number: string
  entry_date: string
  description: string
  reference_number?: string
  debit_account_id: string  // LEGACY
  credit_account_id: string // LEGACY
  amount: number            // LEGACY
  notes?: string
  classification_id?: string
  sub_tree_id?: string
  work_item_id?: string
  analysis_work_item_id?: string
  cost_center_id?: string
  project_id?: string
  org_id?: string
}
```

**Business Logic:**
- Validates debit != credit account
- Validates amount > 0
- Auto-generates entry_number if not provided
- Formats date for Supabase
- Inserts single row into `transactions` table
- Uses legacy fields: `debit_account_id`, `credit_account_id`, `amount`

**Usage:** Called by legacy forms/components



### 2.2 New Header + Lines Services

**File:** `src/services/transactions.ts`

#### `createTransactionWithLines(input: CreateTransactionWithLinesInput)`
**Status:** NEW - Multi-line model

**Input Model:**
```typescript
interface CreateTransactionWithLinesInput {
  // Header fields
  entry_date: string
  description: string
  description_ar?: string | null
  reference_number?: string | null
  notes?: string | null
  notes_ar?: string | null
  project_id?: string | null
  org_id?: string | null
  
  // Lines
  lines: TxLineInput[]
}

interface TxLineInput {
  line_no: number
  account_id: string
  debit_amount?: number
  credit_amount?: number
  description?: string | null
  org_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  classification_id?: string | null
  sub_tree_id?: string | null
}
```

**Business Logic:**
1. Validates description (min 3 chars)
2. Validates org_id required
3. Validates minimum 2 lines
4. Validates each line has debit XOR credit
5. Validates balance (total debits = total credits)
6. Auto-generates entry_number
7. Creates header in `transactions` table (legacy fields set to NULL)
8. Creates lines in `transaction_lines` table
9. Rollback header if lines fail

**File:** `src/services/transaction-lines.ts`

#### `replaceTransactionLines(transactionId, lines)`
- Deletes existing lines
- Inserts new lines
- Validates balance
- Validates XOR rule

#### `addTransactionLine(transactionId, line)`
- Adds single line
- Validates XOR rule

#### `getTransactionLines(transactionId)`
- Fetches all lines for a transaction
- Orders by line_no



### 2.3 Shared Services

#### `getTransactions(options)` - List transactions
- Works with both models
- Filters by scope, status, dates, amounts, accounts, dimensions
- Pagination support
- Patches aggregates from `v_tx_line_items_agg` view

#### `getTransactionById(id)` - Get single transaction
- Returns header only
- Works with both models

#### `getTransactionWithLines(id)` - Get header + lines
- Returns `{ header, lines }`
- NEW model support

#### `updateTransaction(id, updates)` - Update header
- Whitelist of allowed fields
- Formats dates
- Works with both models

#### `deleteTransaction(id, opts)` - Delete transaction
- Calls RPC `sp_delete_transaction_cascade`
- Cascades to lines
- Optional renumbering
- Force delete for admins

#### `postTransaction(id)` - Post transaction
- Calls RPC `post_transaction`
- Marks as posted
- Immutable after posting

#### Approval Workflow Services
- `submitTransaction(id, note)` - Submit for line-based approval
- `approveTransaction(id, reason)`
- `rejectTransaction(id, reason)`
- `requestRevision(id, reason)`
- `cancelSubmission(id, reason)`

---

## 3. FRONTEND / UI COMPONENTS INVENTORY

### 3.1 Legacy Single-Row Form

**Component:** `UnifiedTransactionDetailsPanel`  
**File:** `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`  
**Status:** LEGACY - Uses single-row model

**Purpose:**
- View/edit transaction details in a draggable panel
- Shows transaction header, audit, approval history
- Edit mode uses `UnifiedCRUDForm` with legacy fields

**Key Features:**
- Draggable/resizable panel
- View/Edit modes
- Approval workflow actions
- Document attachments
- Transaction line items section (read-only view)
- Layout configuration (column visibility, order)

**Data Model Used:**
```typescript
// Edit form uses legacy fields
{
  entry_number, entry_date, description, description_ar,
  debit_account_id,  // LEGACY
  credit_account_id, // LEGACY
  amount,            // LEGACY
  reference_number, notes, notes_ar,
  classification_id, sub_tree_id, work_item_id,
  analysis_work_item_id, cost_center_id,
  org_id, project_id
}
```

**Services Called:**
- `createTransactionFormConfig()` - Generates form config with legacy fields
- `onUpdate()` callback - Updates transaction header
- `getTransactionLines()` - Loads lines for read-only display

**Usage:**
- Opened from transaction list when clicking a row
- Used in "My Transactions", "Pending", "All" views
- Edit mode for draft/revision_requested transactions



### 3.2 New Header + Multi-Line UI

**Component:** `TransactionWizard`  
**File:** `src/components/Transactions/TransactionWizard.tsx`  
**Status:** NEW - Uses multi-line model

**Purpose:**
- Create new transactions with multiple lines
- Step-by-step wizard interface
- Full support for line-level dimensions

**Steps:**
1. **Basic Info** - Header data (date, description, org, project)
2. **Lines** - Add/edit multiple transaction lines
3. **Review** - Review and submit

**Data Model Used:**
```typescript
// Header
{
  entry_date, description, description_ar,
  org_id, project_id,
  reference_number, notes, notes_ar,
  // Defaults to propagate to lines
  default_cost_center_id,
  default_work_item_id,
  default_sub_tree_id,
  classification_id
}

// Lines (array)
[{
  line_no, account_id,
  debit_amount, credit_amount,
  description,
  org_id, project_id, cost_center_id,
  work_item_id, analysis_work_item_id,
  classification_id, sub_tree_id
}]
```

**Key Features:**
- Stepper UI (3 steps)
- Line editor with grid
- Column configuration (show/hide dimensions)
- Balance validation
- Keyboard shortcuts (Ctrl+Enter)
- Draft save support
- Line attachments
- Transaction attachments

**Services Called:**
- `createTransactionWithLines()` - Creates header + lines
- `replaceTransactionLines()` - Updates lines
- `onSubmit()` callback

**Usage:**
- Opened from "New Transaction" button
- Used for creating all new multi-line transactions



### 3.3 Supporting Components

**Component:** `TransactionLinesTable`  
**File:** `src/pages/Transactions/TransactionLinesTable.tsx`  
**Purpose:** Display transaction lines in a table with approval buttons

**Component:** `TransactionsHeaderTable`  
**File:** `src/pages/Transactions/TransactionsHeaderTable.tsx`  
**Purpose:** Display transactions list with filters and actions

**Component:** `TransactionLineItemsSection`  
**File:** `src/components/line-items/TransactionLineItemsSection.tsx`  
**Purpose:** Display and edit line items within transaction details

**Component:** `UnifiedCRUDForm`  
**File:** `src/components/Common/UnifiedCRUDForm.tsx`  
**Purpose:** Generic form component used by legacy single-row form

**Component:** `TransactionFormConfig`  
**File:** `src/components/Transactions/TransactionFormConfig.ts`  
**Purpose:** Generates form configuration for UnifiedCRUDForm (includes legacy fields)

---

## 4. USAGE & DEPENDENCY MAP

### 4.1 Where Legacy Single-Row Model is Used

**Components:**
1. ✅ `UnifiedTransactionDetailsPanel` - Edit mode uses legacy fields
2. ✅ `TransactionFormConfig` - Includes `debit_account_id`, `credit_account_id`, `amount`
3. ✅ `UnifiedCRUDForm` - Renders legacy fields

**Services:**
1. ✅ `createTransaction()` - Creates single-row transaction
2. ✅ `updateTransaction()` - Updates header (includes legacy fields)

**Database:**
1. ✅ `transactions` table - Has legacy columns
2. ⚠️ Triggers/views may depend on legacy fields

**Pages/Routes:**
- `/transactions` - List view (works with both)
- `/transactions/:id` - Details view (uses `UnifiedTransactionDetailsPanel`)

### 4.2 Where New Multi-Line Model is Used

**Components:**
1. ✅ `TransactionWizard` - Create new multi-line transactions
2. ✅ `TransactionLinesTable` - Display lines
3. ✅ `TransactionLineItemsSection` - Edit lines

**Services:**
1. ✅ `createTransactionWithLines()` - Creates header + lines
2. ✅ `replaceTransactionLines()` - Manages lines
3. ✅ `getTransactionLines()` - Fetches lines

**Database:**
1. ✅ `transaction_lines` table - Stores lines
2. ✅ `v_tx_line_items_agg` view - Aggregates lines

**Pages/Routes:**
- `/transactions/new` - Uses `TransactionWizard`



### 4.3 Mixed Usage Scenarios

**Scenario 1: Create with Wizard, Edit with Legacy Panel**
- User creates transaction with `TransactionWizard` (multi-line)
- User clicks to view/edit → Opens `UnifiedTransactionDetailsPanel` (legacy)
- **Problem:** Edit form shows legacy fields, cannot edit lines

**Scenario 2: Old Transactions with No Lines**
- Transactions created before multi-line migration
- Have `debit_account_id`, `credit_account_id`, `amount` populated
- No rows in `transaction_lines`
- **Problem:** Cannot view/edit as multi-line

**Scenario 3: Reports and Exports**
- May query legacy fields
- May not include line-level data
- **Risk:** Data loss if legacy fields removed

---

## 5. OLD → NEW MODEL MAPPING

### 5.1 Field Mapping Table

| Old Field (Single-Row) | New Location | Notes |
|------------------------|--------------|-------|
| `id` | `transactions.id` | Same (header ID) |
| `entry_number` | `transactions.entry_number` | Same |
| `entry_date` | `transactions.entry_date` | Same |
| `description` | `transactions.description` | Same |
| `reference_number` | `transactions.reference_number` | Same |
| `notes` | `transactions.notes` | Same |
| `org_id` | `transactions.org_id` | Same (header-level) |
| `project_id` | `transactions.project_id` | Same (header-level) |
| **`debit_account_id`** | **`transaction_lines[0].account_id`** | **LEGACY → Line 1** |
| **`credit_account_id`** | **`transaction_lines[1].account_id`** | **LEGACY → Line 2** |
| **`amount`** | **`transaction_lines[].debit_amount` / `credit_amount`** | **LEGACY → Split to lines** |
| `classification_id` | `transactions.classification_id` OR `transaction_lines[].classification_id` | Can be header or line-level |
| `sub_tree_id` | `transaction_lines[].sub_tree_id` | Now line-level |
| `work_item_id` | `transaction_lines[].work_item_id` | Now line-level |
| `analysis_work_item_id` | `transaction_lines[].analysis_work_item_id` | Now line-level |
| `cost_center_id` | `transaction_lines[].cost_center_id` | Now line-level |
| `is_posted` | `transactions.is_posted` | Same |
| `posted_at` | `transactions.posted_at` | Same |
| `posted_by` | `transactions.posted_by` | Same |
| `approval_status` | `transactions.approval_status` | Same (header-level) |
| N/A | `transaction_lines[].line_no` | NEW - Line sequence |
| N/A | `transaction_lines[].line_status` | NEW - Line-level approval |
| N/A | `transaction_lines[].description` | NEW - Line-level description |

### 5.2 Data Migration Strategy

**For Existing Single-Row Transactions:**

```sql
-- Pseudo-code for migration
FOR EACH transaction WHERE debit_account_id IS NOT NULL:
  -- Create Line 1 (Debit)
  INSERT INTO transaction_lines (
    transaction_id, line_no, account_id,
    debit_amount, credit_amount,
    org_id, project_id, cost_center_id, ...
  ) VALUES (
    transaction.id, 1, transaction.debit_account_id,
    transaction.amount, 0,
    transaction.org_id, transaction.project_id, transaction.cost_center_id, ...
  )
  
  -- Create Line 2 (Credit)
  INSERT INTO transaction_lines (
    transaction_id, line_no, account_id,
    debit_amount, credit_amount,
    org_id, project_id, cost_center_id, ...
  ) VALUES (
    transaction.id, 2, transaction.credit_account_id,
    0, transaction.amount,
    transaction.org_id, transaction.project_id, transaction.cost_center_id, ...
  )
  
  -- Mark as migrated
  UPDATE transactions SET
    has_line_items = true,
    line_items_count = 2,
    total_debits = amount,
    total_credits = amount
  WHERE id = transaction.id
END FOR
```



---

## 6. DATA DICTIONARY

### 6.1 `transactions` Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `entry_number` | VARCHAR | NO | - | Unique transaction number (JE-YYYYMM-NNNN) |
| `entry_date` | DATE | NO | CURRENT_DATE | Transaction date |
| `description` | TEXT | NO | - | Transaction description (English) |
| `description_ar` | TEXT | YES | NULL | Transaction description (Arabic) |
| `reference_number` | VARCHAR | YES | NULL | External reference number |
| `notes` | TEXT | YES | NULL | Additional notes (English) |
| `notes_ar` | TEXT | YES | NULL | Additional notes (Arabic) |
| `org_id` | UUID | YES | NULL | Organization FK |
| `project_id` | UUID | YES | NULL | Project FK |
| `is_posted` | BOOLEAN | NO | false | Posted to GL flag |
| `posted_at` | TIMESTAMP | YES | NULL | Posted timestamp |
| `posted_by` | UUID | YES | NULL | User who posted |
| `approval_status` | VARCHAR | YES | 'draft' | Workflow status |
| `submitted_at` | TIMESTAMP | YES | NULL | Submitted timestamp |
| `submitted_by` | UUID | YES | NULL | User who submitted |
| `reviewed_at` | TIMESTAMP | YES | NULL | Reviewed timestamp |
| `reviewed_by` | UUID | YES | NULL | User who reviewed |
| `review_action` | VARCHAR | YES | NULL | Review action taken |
| `review_reason` | TEXT | YES | NULL | Review reason/notes |
| `has_line_items` | BOOLEAN | YES | false | Has lines flag |
| `line_items_count` | INTEGER | YES | NULL | Count of lines |
| `line_items_total` | NUMERIC | YES | NULL | Total amount |
| `total_debits` | NUMERIC | YES | NULL | Sum of debits |
| `total_credits` | NUMERIC | YES | NULL | Sum of credits |
| **`debit_account_id`** | **UUID** | **YES** | **NULL** | **LEGACY - Debit account** |
| **`credit_account_id`** | **UUID** | **YES** | **NULL** | **LEGACY - Credit account** |
| **`amount`** | **NUMERIC** | **YES** | **NULL** | **LEGACY - Transaction amount** |
| `classification_id` | UUID | YES | NULL | Transaction classification |
| `sub_tree_id` | UUID | YES | NULL | Expenses category (header-level) |
| `work_item_id` | UUID | YES | NULL | Work item (header-level) |
| `analysis_work_item_id` | UUID | YES | NULL | Analysis item (header-level) |
| `cost_center_id` | UUID | YES | NULL | Cost center (header-level) |
| `created_by` | UUID | YES | NULL | User who created |
| `created_at` | TIMESTAMP | NO | NOW() | Created timestamp |
| `updated_at` | TIMESTAMP | NO | NOW() | Updated timestamp |

**Constraints:**
- UNIQUE (`entry_number`)
- FK (`org_id`) → `organizations(id)`
- FK (`project_id`) → `projects(id)`
- FK (`debit_account_id`) → `accounts(id)` [LEGACY]
- FK (`credit_account_id`) → `accounts(id)` [LEGACY]

**Triggers:**
- Auto-generate `entry_number` on INSERT
- Update `updated_at` on UPDATE
- Validate balance (if using legacy fields)



### 6.2 `transaction_lines` Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `transaction_id` | UUID | NO | - | Parent transaction FK |
| `line_no` | INTEGER | NO | - | Line sequence number |
| `account_id` | UUID | NO | - | Account FK |
| `debit_amount` | NUMERIC(15,2) | NO | 0 | Debit amount |
| `credit_amount` | NUMERIC(15,2) | NO | 0 | Credit amount |
| `description` | TEXT | YES | NULL | Line description |
| `org_id` | UUID | YES | NULL | Organization FK (line-level) |
| `project_id` | UUID | YES | NULL | Project FK (line-level) |
| `cost_center_id` | UUID | YES | NULL | Cost center FK |
| `work_item_id` | UUID | YES | NULL | Work item FK |
| `analysis_work_item_id` | UUID | YES | NULL | Analysis item FK |
| `classification_id` | UUID | YES | NULL | Classification FK |
| `sub_tree_id` | UUID | YES | NULL | Expenses category FK |
| `line_status` | VARCHAR | YES | NULL | Approval status |
| `assigned_approver_id` | UUID | YES | NULL | Assigned approver |
| `approved_by` | UUID | YES | NULL | User who approved |
| `approved_at` | TIMESTAMP | YES | NULL | Approved timestamp |
| `rejected_by` | UUID | YES | NULL | User who rejected |
| `rejected_at` | TIMESTAMP | YES | NULL | Rejected timestamp |
| `rejection_reason` | TEXT | YES | NULL | Rejection reason |
| `created_at` | TIMESTAMP | NO | NOW() | Created timestamp |
| `updated_at` | TIMESTAMP | NO | NOW() | Updated timestamp |

**Constraints:**
- FK (`transaction_id`) → `transactions(id)` ON DELETE CASCADE
- FK (`account_id`) → `accounts(id)`
- CHECK: `(debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)`
- CHECK: `debit_amount >= 0 AND credit_amount >= 0`
- UNIQUE (`transaction_id`, `line_no`)

**Triggers:**
- Enforce XOR rule (debit OR credit, not both)
- Update parent transaction totals
- Enforce balance at transaction level
- Sync `org_id` from header if NULL
- Update `updated_at` on UPDATE

---

## 7. SERVICE MAP

| Service/Function | Path | Model | Purpose | Request | Response |
|------------------|------|-------|---------|---------|----------|
| `createTransaction` | `src/services/transactions.ts` | LEGACY | Create single-row transaction | `CreateTransactionInput` | `TransactionRecord` |
| `createTransactionWithLines` | `src/services/transactions.ts` | NEW | Create header + lines | `CreateTransactionWithLinesInput` | `TransactionRecord` |
| `getTransactions` | `src/services/transactions.ts` | BOTH | List transactions | `ListTransactionsOptions` | `PagedResult<TransactionRecord>` |
| `getTransactionById` | `src/services/transactions.ts` | BOTH | Get single transaction | `id: string` | `TransactionRecord \| null` |
| `getTransactionWithLines` | `src/services/transactions.ts` | NEW | Get header + lines | `id: string` | `{ header, lines }` |
| `updateTransaction` | `src/services/transactions.ts` | BOTH | Update header | `id, updates` | `TransactionRecord` |
| `deleteTransaction` | `src/services/transactions.ts` | BOTH | Delete transaction | `id, opts` | `{ renumber_applied }` |
| `postTransaction` | `src/services/transactions.ts` | BOTH | Post transaction | `id` | `void` |
| `submitTransaction` | `src/services/transactions.ts` | BOTH | Submit for approval | `id, note` | `void` |
| `replaceTransactionLines` | `src/services/transaction-lines.ts` | NEW | Replace all lines | `transactionId, lines[]` | `{ totalDebits, totalCredits }` |
| `addTransactionLine` | `src/services/transaction-lines.ts` | NEW | Add single line | `transactionId, line` | `void` |
| `getTransactionLines` | `src/services/transaction-lines.ts` | NEW | Get all lines | `transactionId` | `TxLine[]` |



---

## 8. UI COMPONENT MAP

| Component | File | Model | Purpose | Planned Role |
|-----------|------|-------|---------|--------------|
| `UnifiedTransactionDetailsPanel` | `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx` | LEGACY | View/edit transaction details | **REFACTOR** to multi-line |
| `TransactionWizard` | `src/components/Transactions/TransactionWizard.tsx` | NEW | Create multi-line transactions | **KEEP** as-is |
| `TransactionLinesTable` | `src/pages/Transactions/TransactionLinesTable.tsx` | NEW | Display lines table | **KEEP** as-is |
| `TransactionsHeaderTable` | `src/pages/Transactions/TransactionsHeaderTable.tsx` | BOTH | Display transactions list | **KEEP** as-is |
| `TransactionLineItemsSection` | `src/components/line-items/TransactionLineItemsSection.tsx` | NEW | Edit line items | **KEEP** as-is |
| `UnifiedCRUDForm` | `src/components/Common/UnifiedCRUDForm.tsx` | BOTH | Generic form component | **KEEP** (used by many) |
| `TransactionFormConfig` | `src/components/Transactions/TransactionFormConfig.ts` | LEGACY | Form config generator | **REFACTOR** to remove legacy fields |
| `TransactionDetails` (page) | `src/pages/Transactions/TransactionDetails.tsx` | BOTH | Transaction details page | **UPDATE** to use refactored panel |

---

## 9. REFACTOR PREPARATION CHECKLIST

### 9.1 Fully Understood ✅

- [x] Database schema for both models
- [x] Service layer architecture
- [x] UI component structure
- [x] Data flow for create/read/update/delete
- [x] Approval workflow integration
- [x] Field mapping between old and new models

### 9.2 Partially Known ⚠️

- [ ] **Database triggers:** Need to verify all triggers on `transactions` and `transaction_lines`
- [ ] **Views:** Need to catalog all views that reference legacy fields
- [ ] **RPC functions:** Need to verify all stored procedures
- [ ] **Reports:** Need to identify reports using legacy fields
- [ ] **Exports:** Need to verify export functionality
- [ ] **Integrations:** Need to check external system integrations
- [ ] **Migration script:** Need to test data migration for existing transactions

### 9.3 Risks & Complexity Hotspots 🔥

#### HIGH RISK
1. **Data Loss:** Removing legacy fields before migration could lose data
2. **Breaking Changes:** Existing transactions without lines cannot be edited
3. **Report Compatibility:** Reports may break if legacy fields removed
4. **Trigger Dependencies:** Complex triggers may depend on legacy fields

#### MEDIUM RISK
1. **UI Consistency:** Need to ensure consistent UX between create and edit
2. **Performance:** Line-based queries may be slower than single-row
3. **Validation:** Need to ensure all validation rules are preserved
4. **Approval Workflow:** Line-level approval adds complexity

#### LOW RISK
1. **Form Configuration:** Can be updated incrementally
2. **Service Layer:** Well-structured, easy to refactor
3. **Component Reuse:** Can reuse `TransactionWizard` patterns



### 9.4 Required Actions Before Refactor

#### Phase 1: Data Migration (CRITICAL)
1. [ ] Create migration script to convert single-row transactions to multi-line
2. [ ] Test migration on copy of production data
3. [ ] Verify all transactions have lines after migration
4. [ ] Backup database before migration
5. [ ] Run migration in maintenance window

#### Phase 2: Database Cleanup
1. [ ] Catalog all triggers referencing legacy fields
2. [ ] Catalog all views referencing legacy fields
3. [ ] Catalog all RPC functions using legacy fields
4. [ ] Update or remove dependencies
5. [ ] Mark legacy columns as deprecated (add comments)

#### Phase 3: Service Layer Refactor
1. [ ] Deprecate `createTransaction()` function
2. [ ] Update `updateTransaction()` to prevent legacy field updates
3. [ ] Add validation to reject legacy field usage
4. [ ] Update all service tests

#### Phase 4: UI Refactor
1. [ ] Refactor `UnifiedTransactionDetailsPanel` to use multi-line model
2. [ ] Update `TransactionFormConfig` to remove legacy fields
3. [ ] Add line editor to details panel (reuse from `TransactionWizard`)
4. [ ] Update all component tests
5. [ ] Test edit flow end-to-end

#### Phase 5: Validation & Testing
1. [ ] Test create transaction (already works)
2. [ ] Test edit transaction (refactored)
3. [ ] Test delete transaction
4. [ ] Test post transaction
5. [ ] Test approval workflow
6. [ ] Test with various user roles
7. [ ] Test with posted transactions
8. [ ] Test with draft transactions
9. [ ] Test with multi-line transactions (>2 lines)
10. [ ] Test balance validation
11. [ ] Test dimension assignments

#### Phase 6: Deprecation & Removal
1. [ ] Add deprecation warnings to legacy functions
2. [ ] Monitor usage of legacy endpoints
3. [ ] After 30 days, remove legacy functions
4. [ ] After 60 days, drop legacy columns from database
5. [ ] Update documentation

---

## 10. RECOMMENDED REFACTOR APPROACH

### Option A: Big Bang (NOT RECOMMENDED)
- Refactor everything at once
- High risk of breaking changes
- Difficult to test incrementally
- **Risk Level:** 🔥🔥🔥 HIGH

### Option B: Incremental Migration (RECOMMENDED)
1. **Week 1:** Data migration + validation
2. **Week 2:** Service layer updates + deprecation warnings
3. **Week 3:** UI refactor (details panel)
4. **Week 4:** Testing + bug fixes
5. **Week 5:** Soft launch (monitor for issues)
6. **Week 6:** Remove deprecation warnings
7. **Month 3:** Remove legacy code
8. **Month 4:** Drop legacy columns

**Risk Level:** 🟡 MEDIUM

### Option C: Parallel Systems (SAFEST)
- Keep both systems running
- Gradually migrate users to new system
- Monitor for issues
- Rollback capability
- **Risk Level:** 🟢 LOW
- **Timeline:** 3-6 months

---

## 11. NEXT STEPS FOR REFACTOR AGENT

### Immediate Actions
1. ✅ Review this document thoroughly
2. ✅ Verify all database triggers and views
3. ✅ Create detailed migration script
4. ✅ Test migration on sample data
5. ✅ Design refactored `UnifiedTransactionDetailsPanel`

### Design Questions to Answer
1. Should edit mode use wizard-style steps or inline editing?
2. How to handle transactions with >10 lines (performance)?
3. Should we support converting multi-line back to single-row?
4. How to handle partial line approvals in edit mode?
5. Should dimensions be header-level, line-level, or both?

### Technical Decisions Needed
1. Use `TransactionWizard` component or create new edit component?
2. Inline line editing or modal-based?
3. Real-time balance validation or on-save?
4. Auto-save drafts or manual save only?
5. Undo/redo support for line edits?

---

## 12. CONCLUSION

### Summary
- **Current State:** Mixed legacy and new models coexist
- **Goal:** Complete migration to multi-line model
- **Blocker:** `UnifiedTransactionDetailsPanel` uses legacy single-row model
- **Solution:** Refactor details panel to support multi-line editing

### Critical Path
1. Data migration (convert existing single-row to multi-line)
2. Refactor `UnifiedTransactionDetailsPanel` component
3. Update `TransactionFormConfig` to remove legacy fields
4. Test thoroughly
5. Deploy incrementally
6. Remove legacy code after validation period

### Success Criteria
- ✅ All transactions have lines in `transaction_lines` table
- ✅ No usage of legacy `debit_account_id`, `credit_account_id`, `amount` fields
- ✅ Edit mode supports multi-line transactions
- ✅ Balance validation works correctly
- ✅ Approval workflow functions with lines
- ✅ No data loss
- ✅ Performance acceptable
- ✅ User experience improved

---

**Document Status:** ✅ COMPLETE - Ready for Refactor Planning Phase  
**Next Document:** `TRANSACTION_REFACTOR_DESIGN_PLAN.md`  
**Owner:** Refactor Planning Agent

