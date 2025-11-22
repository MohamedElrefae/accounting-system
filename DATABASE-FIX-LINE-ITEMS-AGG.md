# Fix: Create v_tx_line_items_agg View

## Issue
The Cost Analysis Modal shows a blank page with 404 errors because the database view `v_tx_line_items_agg` is missing.

## Error in Console
```
GET https://bgxknceshxxifwytalex.supabase.co/rest/v1/v_tx_line_items_agg?select=transaction_id%2Cline_items_count%2Cline_items_total&transaction_id=in.%28...%29 404 (Not Found)
```

## Solution

### Option 1: Apply via Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `apply-line-items-agg-view.sql`
4. Paste and run the SQL
5. Verify the view was created (the script includes verification queries)

### Option 2: Apply via Migration File

If you're using Supabase CLI:

```bash
# The migration file is already created at:
# supabase/migrations/20250119_v_tx_line_items_agg.sql

# Apply it using:
supabase db push
```

## What This View Does

The `v_tx_line_items_agg` view aggregates transaction line items data:

- **transaction_id**: The transaction ID
- **line_items_count**: Count of line items for each transaction
- **line_items_total**: Total amount (quantity × unit_price) for all line items

This data is used to show line items summary in the transactions table and the Cost Analysis Modal.

## After Applying

1. Refresh your browser
2. Open a transaction
3. Click "تحليل التكلفة" (Cost Analysis)
4. The modal should now load without 404 errors

## Verification

Run this query in Supabase SQL Editor to verify:

```sql
SELECT * FROM v_tx_line_items_agg LIMIT 10;
```

You should see aggregated data for transactions that have line items.
