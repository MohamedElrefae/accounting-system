# Import Transactions via SQL - Best Approach

Instead of fixing CSV files with placeholder UUIDs, we'll import the data directly via SQL. This approach automatically handles dimension mapping and is much more reliable.

## Why SQL Import is Better

✅ **Automatic dimension mapping** - No need to manually find UUIDs  
✅ **Account code mapping** - Uses the existing 21-account mapping  
✅ **Data validation** - SQL ensures referential integrity  
✅ **Faster execution** - No CSV upload/parsing overhead  
✅ **Error handling** - Clear SQL error messages  

---

## Step-by-Step Process

### Step 1: Get Dimension Information

Run this query in Supabase SQL Editor to see available dimensions:

```sql
-- Copy and paste from: sql/get_dimension_mappings.sql
```

This will show you:
- Available transaction classifications
- Available projects  
- Available analysis work items
- Available sub_tree items
- First available ID from each table

### Step 2: Convert Excel Data to SQL

Instead of CSV, we'll create SQL INSERT statements from your Excel data. You have two options:

#### Option A: Manual Conversion (Small Dataset)
Convert your Excel rows to SQL INSERT statements:

```sql
INSERT INTO temp_excel_transactions VALUES
(1, '2022-08-31', 134, 7054506.00, 0.00, 'مستخلص رقم 3'),
(1, '2022-08-31', 41, 0.00, 7054506.00, 'مستخلص رقم 3'),
-- Add more rows...
```

#### Option B: Python Script (Recommended)
I can create a Python script that reads your existing CSV files and generates the SQL INSERT statements automatically.

### Step 3: Run the Import SQL

Execute the complete import script in Supabase SQL Editor:
- Creates temporary table
- Inserts Excel data
- Maps account codes to UUIDs
- Groups transactions
- Inserts into transactions table
- Inserts into transaction_lines table with proper dimensions

---

## Advantages Over CSV Import

| Aspect | CSV Import | SQL Import |
|--------|------------|------------|
| Dimension IDs | Manual UUID lookup | Automatic mapping |
| Account Mapping | Pre-mapped in CSV | Dynamic SQL mapping |
| Error Handling | Generic CSV errors | Specific SQL errors |
| Data Validation | Post-import validation | Built-in constraints |
| Performance | Upload + parsing | Direct database insert |
| Rollback | Manual cleanup | SQL transaction rollback |

---

## Next Steps

**Choose your preferred approach:**

1. **Quick Test** - I'll create a small SQL script with sample data to test the process
2. **Full Import** - I'll create a Python script to convert your existing CSV files to SQL INSERT statements
3. **Manual Approach** - You convert the Excel data to SQL manually

**Recommendation**: Let me create the Python script to convert your existing `transactions.csv` and `transaction_lines.csv` files into SQL INSERT statements. This gives you the best of both worlds - we keep the work already done on the CSV files, but import via SQL for better dimension handling.

Which approach would you prefer?
