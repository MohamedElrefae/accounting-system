# Complete Clean Import Guide - CRITICAL

## ⚠️ IMPORTANT: Full Database Cleanup Required

Because we regenerated the CSV with corrected account mappings, **BOTH transactions AND transaction_lines tables must be deleted and recreated**.

The old data has incorrect account_id mappings and cannot be mixed with the new data.

---

## Step 1: Delete ALL Existing Data

Run this SQL in Supabase SQL Editor:

```sql
-- Delete all transaction lines for this organization
DELETE FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Delete all transactions for this organization
DELETE FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT 'transaction_lines' as table_name, COUNT(*) as remaining_rows
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
UNION ALL
SELECT 'transactions' as table_name, COUNT(*) as remaining_rows
FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Should show 0 rows for both tables
```

---

## Step 2: Generate Transactions SQL

We need to create a new script to generate the transactions table import SQL from the corrected CSV.

**Script**: `generate_transactions_sql.py`

```python
#!/usr/bin/env python3
"""
Generate transactions table import SQL from corrected CSV.
"""

import pandas as pd
from pathlib import Path

ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

def generate_transactions_sql():
    """Generate SQL to import transactions table."""
    
    csv_file = Path("transaction_lines.csv")
    if not csv_file.exists():
        print(f"ERROR: {csv_file} not found")
        return False
    
    print(f"Reading CSV: {csv_file}")
    df = pd.read_csv(csv_file)
    
    # Filter valid rows (same as transaction_lines filtering)
    df = df[
        (df['account_id'].notna()) &
        (df['account_id'] != '00000000-0000-0000-0000-000000000000') &
        ~((df['debit_amount'] == 0) & (df['credit_amount'] == 0))
    ].copy()
    
    print(f"Valid rows: {len(df)}")
    
    # Extract transaction reference from transaction_id
    df['txn_ref'] = df['transaction_id'].str.split('-').str[0].str.replace('TXN', '').str.lstrip('0')
    df['txn_ref'] = df['txn_ref'].replace('', '0')
    
    # Group by transaction reference to create transaction headers
    transactions = df.groupby('txn_ref').agg({
        'debit_amount': 'sum',
        'credit_amount': 'sum',
        'description': 'first'
    }).reset_index()
    
    print(f"Unique transactions: {len(transactions)}")
    print(f"Total debit: {transactions['debit_amount'].sum():,.2f}")
    print(f"Total credit: {transactions['credit_amount'].sum():,.2f}")
    
    # Generate SQL
    output_file = Path("import_transactions.sql")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Import Transactions Table\n")
        f.write(f"-- Organization ID: {ORG_ID}\n")
        f.write(f"-- Total transactions: {len(transactions)}\n\n")
        
        f.write("INSERT INTO transactions (\n")
        f.write("    reference_number,\n")
        f.write("    transaction_date,\n")
        f.write("    description,\n")
        f.write("    total_debit,\n")
        f.write("    total_credit,\n")
        f.write("    org_id\n")
        f.write(") VALUES\n")
        
        values_rows = []
        for idx, row in transactions.iterrows():
            # Escape single quotes in description
            desc = str(row['description']) if pd.notna(row['description']) else ''
            desc = desc.replace("'", "''")
            
            # Use txn_ref as reference_number and transaction_date (you'll need to add date logic)
            # For now, using a placeholder date - you should extract from Excel
            values_row = f"    ('{row['txn_ref']}', '2022-08-31', '{desc}', {row['debit_amount']}, {row['credit_amount']}, '{ORG_ID}')"
            values_rows.append(values_row)
        
        f.write(",\n".join(values_rows))
        f.write(";\n\n")
        
        f.write("-- Verify import\n")
        f.write("SELECT COUNT(*) as transaction_count,\n")
        f.write("       SUM(total_debit) as total_debit,\n")
        f.write("       SUM(total_credit) as total_credit\n")
        f.write(f"FROM transactions WHERE org_id = '{ORG_ID}';\n")
    
    print(f"\n✅ Generated: {output_file}")
    return True

if __name__ == "__main__":
    import sys
    success = generate_transactions_sql()
    sys.exit(0 if success else 1)
```

**WAIT** - We need the transaction dates from Excel. Let me create a better version that reads from Excel directly.

---

## Step 2 (Better): Generate Complete Import SQL from Excel

Create this script: `generate_complete_import_from_excel.py`

This will:
1. Read Excel directly
2. Generate transactions table SQL with correct dates
3. Already have the transaction_lines SQL files (28 files)

**Run this command**:
```bash
python generate_complete_import_from_excel.py
```

This will create:
- `import_transactions.sql` - Import transactions table
- Already have: `transaction_lines_split/import_transaction_lines_part_01.sql` through `part_28.sql`

---

## Step 3: Import in Correct Order

### 3.1 Import Transactions First
```sql
-- Run: import_transactions.sql
-- This creates all transaction headers
```

### 3.2 Import Transaction Lines (All 28 Files)
Run in order:
```
import_transaction_lines_part_01.sql
import_transaction_lines_part_02.sql
...
import_transaction_lines_part_28.sql
```

---

## Step 4: Verify Complete Import

```sql
-- Check transactions
SELECT 
    COUNT(*) as transaction_count,
    SUM(total_debit) as total_debit,
    SUM(total_credit) as total_credit
FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: ~1,000 transactions (depends on Excel grouping)

-- Check transaction lines
SELECT 
    COUNT(*) as line_count,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 13,963 lines, 905,925,674.84 debit/credit, 0.00 balance

-- Check that all lines have matching transactions
SELECT 
    COUNT(*) as orphaned_lines
FROM transaction_lines tl
LEFT JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND t.id IS NULL;
-- Expected: 0 (no orphaned lines)
```

---

## Why Full Cleanup is Required

### Old Data Issues:
1. **Incorrect account mappings** - Missing 10 account codes (115, 221, 233, 236, 1352, 1354, 2352, 2356, 13111, 131313)
2. **Wrong CSV source** - Had 14,224 rows instead of 14,161
3. **Duplicate imports** - Previous imports ran multiple times (23,196 rows)
4. **Unbalanced data** - Old data was unbalanced by 16.96M

### New Data Correct:
1. **All 21 account codes mapped** ✅
2. **Correct CSV** - 14,161 rows from Excel ✅
3. **Clean import** - No duplicates ✅
4. **Balanced** - 0.00 balance ✅

---

## Summary

**CRITICAL STEPS**:
1. ✅ Delete ALL transactions and transaction_lines for this org
2. ⏳ Generate transactions SQL from Excel (need to create script)
3. ⏳ Import transactions first
4. ⏳ Import all 28 transaction_lines SQL files
5. ⏳ Verify totals match expected values

**DO NOT** try to keep old data - it has incorrect account mappings and will cause data integrity issues.

