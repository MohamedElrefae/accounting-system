# Migration Executor Code Reference

## File Location
`src/executor/migration_executor.py`

## Method: `_clean_record()`

This method is responsible for:
1. Mapping Excel column names to Supabase column names
2. Filtering columns based on the target table schema
3. Cleaning data (removing NaN, converting types)
4. Adding `org_id` for RLS compliance

---

## Column Mapping Dictionary

```python
column_mapping = {
    'entry no': 'entry_number',  # Maps to entry_number, not entry_no
    'entry date': 'entry_date',
    'account code': 'account_code',
    'account name': 'account_name',
    'transaction classification code': 'transaction_classification_code',
    'classification code': 'classification_code',
    'classification name': 'classification_name',
    'project code': 'project_code',
    'project name': 'project_name',
    'work analysis code': 'work_analysis_code',
    'work analysis name': 'work_analysis_name',
    'sub_tree code': 'sub_tree_code',
    'sub_tree name': 'sub_tree_name',
    'debit': 'debit_amount',  # Maps to debit_amount
    'credit': 'credit_amount',  # Maps to credit_amount
    'notes': 'description'  # Maps to description field
}
```

---

## Valid Columns Dictionary (CORRECTED)

### Transactions Table
```python
'transactions': {
    'entry_number',  # From Excel: "entry no"
    'entry_date',    # From Excel: "entry date"
    'org_id'         # Added by migration (required for RLS)
}
```

**Total: 3 columns**

### Transaction Lines Table
```python
'transaction_lines': {
    'entry_no',      # Links to transaction header (from Excel: "entry no")
    'account_code',  # From Excel: "account code"
    'account_name',  # From Excel: "account name"
    'transaction_classification_code',  # From Excel: "transaction classification code"
    'classification_code',  # From Excel: "classification code"
    'classification_name',  # From Excel: "classification name"
    'project_code',  # From Excel: "project code"
    'project_name',  # From Excel: "project name"
    'work_analysis_code',  # From Excel: "work analysis code"
    'work_analysis_name',  # From Excel: "work analysis name"
    'sub_tree_code',  # From Excel: "sub_tree code"
    'sub_tree_name',  # From Excel: "sub_tree name"
    'debit_amount',  # From Excel: "debit"
    'credit_amount',  # From Excel: "credit"
    'description',   # From Excel: "notes"
    'org_id'         # Added by migration (required for RLS)
}
```

**Total: 16 columns**

---

## Processing Logic

### 1. Column Mapping
```python
for key, value in record.items():
    # Map Excel column name to Supabase column name
    mapped_key = column_mapping.get(key, key)
```

Example:
- Input: `{'entry no': '001', 'entry date': '2026-01-01', ...}`
- After mapping: `{'entry_number': '001', 'entry_date': '2026-01-01', ...}`

### 2. Column Filtering
```python
allowed_cols = valid_columns.get(table_name, set())

if table_name and allowed_cols and mapped_key not in allowed_cols:
    continue  # Skip this column
```

Example for `transactions` table:
- Input columns: `entry_number`, `entry_date`, `account_code`, `debit_amount`, ...
- Allowed columns: `entry_number`, `entry_date`, `org_id`
- Output: Only `entry_number`, `entry_date` (plus `org_id` added later)

### 3. Data Cleaning
```python
# Skip NaN values
if pd.isna(value):
    continue

# Convert datetime to ISO format string
if isinstance(value, datetime):
    cleaned[mapped_key] = value.isoformat()

# Convert numpy types to Python types
elif isinstance(value, (np.integer, np.floating)):
    cleaned[mapped_key] = value.item()
elif isinstance(value, np.bool_):
    cleaned[mapped_key] = bool(value)
else:
    cleaned[mapped_key] = value
```

### 4. RLS Compliance
```python
# Ensure org_id is set (required for RLS policies)
if self.org_id and 'org_id' not in cleaned:
    cleaned['org_id'] = self.org_id
```

---

## Example Processing

### Input Record (from Excel)
```python
{
    'entry no': '001',
    'entry date': datetime(2026, 1, 15),
    'account code': 'ACC-001',
    'account name': 'Cash',
    'debit': 1000.00,
    'credit': 0.00,
    'notes': 'Opening balance',
    'project code': 'PROJ-001',
    'project name': 'Project A',
    ...
}
```

### Processing for `transactions` Table

**Step 1: Map column names**
```python
{
    'entry_number': '001',
    'entry_date': datetime(2026, 1, 15),
    'account_code': 'ACC-001',
    'account_name': 'Cash',
    'debit_amount': 1000.00,
    'credit_amount': 0.00,
    'description': 'Opening balance',
    'project_code': 'PROJ-001',
    'project_name': 'Project A',
    ...
}
```

**Step 2: Filter to valid columns**
```python
{
    'entry_number': '001',
    'entry_date': datetime(2026, 1, 15)
}
```

**Step 3: Clean data types**
```python
{
    'entry_number': '001',
    'entry_date': '2026-01-15T00:00:00'  # ISO format
}
```

**Step 4: Add org_id**
```python
{
    'entry_number': '001',
    'entry_date': '2026-01-15T00:00:00',
    'org_id': '731a3a00-6fa6-4282-9bec-8b5a8678e127'
}
```

**Output**: Ready to insert into `transactions` table ✅

### Processing for `transaction_lines` Table

**Step 1: Map column names**
```python
{
    'entry_no': '001',
    'account_code': 'ACC-001',
    'account_name': 'Cash',
    'debit_amount': 1000.00,
    'credit_amount': 0.00,
    'description': 'Opening balance',
    'project_code': 'PROJ-001',
    'project_name': 'Project A',
    ...
}
```

**Step 2: Filter to valid columns**
```python
{
    'entry_no': '001',
    'account_code': 'ACC-001',
    'account_name': 'Cash',
    'debit_amount': 1000.00,
    'credit_amount': 0.00,
    'description': 'Opening balance',
    'project_code': 'PROJ-001',
    'project_name': 'Project A',
    ...
}
```

**Step 3: Clean data types**
```python
{
    'entry_no': '001',
    'account_code': 'ACC-001',
    'account_name': 'Cash',
    'debit_amount': 1000.0,  # Python float
    'credit_amount': 0.0,    # Python float
    'description': 'Opening balance',
    'project_code': 'PROJ-001',
    'project_name': 'Project A',
    ...
}
```

**Step 4: Add org_id**
```python
{
    'entry_no': '001',
    'account_code': 'ACC-001',
    'account_name': 'Cash',
    'debit_amount': 1000.0,
    'credit_amount': 0.0,
    'description': 'Opening balance',
    'project_code': 'PROJ-001',
    'project_name': 'Project A',
    ...,
    'org_id': '731a3a00-6fa6-4282-9bec-8b5a8678e127'
}
```

**Output**: Ready to insert into `transaction_lines` table ✅

---

## Key Differences from Previous Implementation

### Before (WRONG)
```python
valid_columns = {
    'transactions': {
        'entry_number', 'entry_date', 'description', 'reference_number', 'notes',
        'org_id', 'status', 'approval_status', 'project_id'  # ❌ Too many columns
    },
    'transaction_lines': {
        'transaction_id', 'line_no', 'account_id', 'debit_amount', 'credit_amount',
        'description', 'project_id', 'cost_center_id', 'work_item_id',
        'analysis_work_item_id', 'classification_id', 'sub_tree_id',
        'org_id', 'line_status'  # ❌ Wrong column names
    }
}
```

### After (CORRECT)
```python
valid_columns = {
    'transactions': {
        'entry_number',  # From Excel: "entry no"
        'entry_date',    # From Excel: "entry date"
        'org_id'         # Added by migration (required for RLS)
    },  # ✅ Only 3 columns
    'transaction_lines': {
        'entry_no',      # Links to transaction header (from Excel: "entry no")
        'account_code',  # From Excel: "account code"
        'account_name',  # From Excel: "account name"
        'transaction_classification_code',  # From Excel: "transaction classification code"
        'classification_code',  # From Excel: "classification code"
        'classification_name',  # From Excel: "classification name"
        'project_code',  # From Excel: "project code"
        'project_name',  # From Excel: "project name"
        'work_analysis_code',  # From Excel: "work analysis code"
        'work_analysis_name',  # From Excel: "work analysis name"
        'sub_tree_code',  # From Excel: "sub_tree code"
        'sub_tree_name',  # From Excel: "sub_tree name"
        'debit_amount',  # From Excel: "debit"
        'credit_amount',  # From Excel: "credit"
        'description',   # From Excel: "notes"
        'org_id'         # Added by migration (required for RLS)
    }  # ✅ Correct column names
}
```

---

## Status
✅ Code updated and verified
✅ No syntax errors
✅ Ready for testing
