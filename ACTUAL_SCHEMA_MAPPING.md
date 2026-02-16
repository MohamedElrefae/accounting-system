# Actual Supabase Schema Mapping

## Transactions Table (Header Records)

**Columns that can be inserted from Excel:**
- `entry_no` - Entry/Transaction Number (from Excel: "entry no")
- `entry_date` - Entry Date (from Excel: "entry date")
- `org_id` - Organization ID (added by migration: `731a3a00-6fa6-4282-9bec-8b5a8678e127`)
- `status` - Transaction Status (optional, defaults to 'draft')
- `notes` - Notes (optional)

**Auto-managed columns (not inserted):**
- `id` - Auto-generated primary key
- `created_at` - Auto-set to NOW()
- `updated_at` - Auto-set to NOW()
- `created_by` - Set by trigger/application
- `updated_by` - Set by trigger/application

## Transaction Lines Table (Detail Records)
 
**Columns that can be inserted from Excel:**  all names fetched by orignal table and code  
- `entry_no` - Links to transaction header (from Excel: "entry no")
- `account_code` - Account Code (from Excel: "account code")
- `account_name` - Account Name (from Excel: "account name") no fetch from table data Account
- `transaction_classification_code` - Transaction Classification (from Excel: "transaction classification code")
- `classification_code` - Classification Code (from Excel: "classification code")
- `classification_name` - Classification Name (from Excel: "classification name")
- `project_code` - Project Code (from Excel: "project code")
- `project_name` - Project Name (from Excel: "project name")
- `work_analysis_code` - Work Analysis Code (from Excel: "work analysis code")
- `work_analysis_name` - Work Analysis Name (from Excel: "work analysis name")
- `sub_tree_code` - Sub Tree Code (from Excel: "sub_tree code")
- `sub_tree_name` - Sub Tree Name (from Excel: "sub_tree name")
- `debit` - Debit Amount (from Excel: "debit")
- `credit` - Credit Amount (from Excel: "credit")
- `notes` - Notes (from Excel: "notes")
- `org_id` - Organization ID (added by migration: `731a3a00-6fa6-4282-9bec-8b5a8678e127`)
- `status` - Line Status (optional, defaults to 'draft')
- `line_number` - Line Number (optional)

**Auto-managed columns (not inserted):**
- `id` - Auto-generated primary key
- `created_at` - Auto-set to NOW()
- `updated_at` - Auto-set to NOW()
- `created_by` - Set by trigger/application
- `updated_by` - Set by trigger/application

## Column Filtering Logic

The migration executor now filters columns based on the target table:

### For `transactions` table:
Only these columns from the Excel data are inserted:
- `entry_no`
- `entry_date`
- `org_id` (added by migration)

All other columns are filtered out.

### For `transaction_lines` table:
All line-item columns are inserted:
- All account/classification/project/work analysis/sub-tree fields
- Debit/credit amounts
- Notes
- `entry_no` (to link to transaction header)
- `org_id` (added by migration)

## Migration Flow

1. **Read Excel file** → Get all columns
2. **For each transaction header row**:
   - Extract: `entry_no`, `entry_date`
   - Add: `org_id`
   - Insert into `transactions` table
3. **For each transaction line row**:
   - Extract: `entry_no`, `account_code`, `account_name`, etc.
   - Add: `org_id`
   - Insert into `transaction_lines` table

## RLS (Row Level Security)

Both tables have RLS policies that require:
- User must be a member of the organization (`org_id`)
- User can only see/modify records for their organization

The `org_id` field is critical for RLS to work correctly.
