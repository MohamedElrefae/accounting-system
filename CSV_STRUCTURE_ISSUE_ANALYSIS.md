# CSV Structure Issue Analysis

## Problem Found
The `transaction_lines_prepared.csv` file has a **malformed header** that spans multiple lines, causing column misalignment.

## Evidence
```
Header (broken across lines):
entry no,entry date,account_id,debit_amount,credit_amount,description,project_code,classification_code,work_analysis_code,analysis_work_item_code,sub_tree_code,org_id

Data row 1:
1.0,2022-08-31 00:00:00,,7054506,,مستخلص رقم 3,0.0,7.0,,,30000.0,d5789445-11e3-4ad6-9297-b56521675114
```

## Analysis
- **Column 3 (account_id)**: Empty in all rows
- **Column 4 (debit_amount)**: Contains values like `7054506`, `30234` - **These look like account codes!**
- **Column 5 (credit_amount)**: Empty
- **Column 12 (org_id)**: Contains org IDs

## Hypothesis
The account codes are NOT in the `account_id` column. They appear to be in either:
1. The `debit_amount` column (unlikely - these are amounts)
2. A different column entirely
3. The CSV structure is completely different than expected

## Next Steps
1. **Verify the actual column containing account codes**
   - Check if there's a separate account code column
   - Check if codes are embedded in description or other fields
   
2. **Understand the data structure**
   - Are the values in debit_amount actually account codes?
   - Or is the CSV completely different from what we expected?

3. **Possible solutions**:
   - Fix the CSV header line
   - Identify the correct column with account codes
   - Rebuild the mapping logic based on actual structure

## Questions for Clarification
1. Where are the account codes actually stored in `transaction_lines_prepared.csv`?
2. Is the CSV header correct, or does it need to be fixed?
3. Should we look at the original Excel file to understand the correct structure?
