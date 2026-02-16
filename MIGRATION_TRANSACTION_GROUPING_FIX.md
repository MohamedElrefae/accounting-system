# Migration Transaction Grouping Fix - COMPLETE

## Problem Identified

The migration was treating each of the 14,224 Excel rows as individual transactions instead of grouping them by (entry_no, entry_date) to create 2,164 unique transaction records.

**Phase 0 Discovery (Correct):**
- 2,164 unique transactions (grouped by entry_no + entry_date)
- 14,224 transaction lines (detail rows)

**Previous Migration Behavior (Incorrect):**
- 14,224 transactions (one per row)
- 14,224 transaction lines

---

## Fixes Applied

### 1. Transaction Grouping Logic (migrate.py)
**File**: `migrate.py` - `migrate_command()` method

**Change**: Added grouping before passing to executor
```python
# Group by (entry_no, entry_date) to create unique transaction records
# Phase 0 identified 2,164 unique transactions from 14,224 detail rows
transactions_df = df.groupby(['entry no', 'entry date']).first().reset_index()
logger.info(f"Grouped {len(df)} rows into {len(transactions_df)} unique transactions")
trans_success, trans_batches = executor.migrate_transactions(transactions_df)
```

**Impact**: 
- Transactions table will receive 2,164 records (one per unique entry_no + entry_date)
- Transaction lines table will receive all 14,224 records

### 2. Column Mapping Updates (config/column_mapping_APPROVED.csv)
**Changes**:
- Added `description` column mapping (Excel → Supabase)
- Updated `entry no` mapping: `entry_no` → `entry_number` (for transactions table)
- Updated `debit` mapping: `debit` → `debit_amount`
- Updated `credit` mapping: `credit` → `credit_amount`
- Updated `notes` mapping: `notes` → `description`

### 3. Context-Aware Column Mapping (migration_executor.py)
**File**: `src/executor/migration_executor.py` - `_clean_record()` method

**Change**: Made column mapping context-aware based on table name
```python
'entry no': 'entry_number' if table_name == 'transactions' else 'entry_no'
```

**Reason**: 
- Transactions table uses `entry_number` (header)
- Transaction lines table uses `entry_no` (detail reference)

---

## Column Mapping Summary

### Transactions Table (4 columns)
| Excel Column | Supabase Column | Notes |
|---|---|---|
| entry no | entry_number | Transaction number |
| entry date | entry_date | Transaction date |
| description | description | NOT NULL - Required |
| *(auto)* | org_id | Added by migration |

### Transaction Lines Table (16 columns)
| Excel Column | Supabase Column | Notes |
|---|---|---|
| entry no | entry_no | Links to transaction |
| account code | account_code | Account code |
| account name | account_name | Account name |
| transaction classification code | transaction_classification_code | Classification |
| classification code | classification_code | Classification code |
| classification name | classification_name | Classification name |
| project code | project_code | Project code |
| project name | project_name | Project name |
| work analysis code | work_analysis_code | Work analysis code |
| work analysis name | work_analysis_name | Work analysis name |
| sub_tree code | sub_tree_code | Sub tree code |
| sub_tree name | sub_tree_name | Sub tree name |
| debit | debit_amount | Debit amount |
| credit | credit_amount | Credit amount |
| notes | description | Notes/description |
| *(auto)* | org_id | Added by migration |

---

## Expected Results (Corrected)

```
Transactions: 2,164/2,164 succeeded (grouped by entry_no + entry_date)
Transaction lines: 14,224/14,224 succeeded
Success rate: 100.0%
```

---

## Migration Execution Steps

### Step 1: Disable RLS (Supabase SQL Editor)
```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

### Step 2: Clear Old Data (Optional - if retrying)
```sql
DELETE FROM transaction_lines;
DELETE FROM transactions;
```

### Step 3: Run Migration
```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

### Step 4: Re-enable RLS
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

---

## Files Modified

✅ `migrate.py` - Added transaction grouping logic
✅ `config/column_mapping_APPROVED.csv` - Updated column mappings
✅ `src/executor/migration_executor.py` - Made column mapping context-aware

---

## Verification

After migration completes, verify:

1. **Transaction count**: Should be 2,164 (not 14,224)
   ```sql
   SELECT COUNT(*) FROM transactions WHERE org_id = '731a3a00-6fa6-4282-9bec-8b5a8678e127';
   ```

2. **Transaction lines count**: Should be 14,224
   ```sql
   SELECT COUNT(*) FROM transaction_lines WHERE org_id = '731a3a00-6fa6-4282-9bec-8b5a8678e127';
   ```

3. **Sample transaction with lines**:
   ```sql
   SELECT t.id, t.entry_number, t.entry_date, t.description, COUNT(tl.id) as line_count
   FROM transactions t
   LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
   WHERE t.org_id = '731a3a00-6fa6-4282-9bec-8b5a8678e127'
   GROUP BY t.id, t.entry_number, t.entry_date, t.description
   LIMIT 5;
   ```

---

## Status

✅ **READY FOR EXECUTION**

All fixes applied:
- Transaction grouping logic implemented
- Column mappings corrected
- Context-aware mapping for entry_no/entry_number
- RLS handling documented

Next: Execute migration with RLS disabled, then re-enable RLS.

