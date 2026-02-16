# Account Mapping Issue - Phase 0 Discovery

## Problem Identified

The migration script has correctly identified that **ALL 14,161 account codes from Excel are unmapped** in Supabase.

### Root Cause

The Supabase `accounts` table does not have `legacy_code` field populated for any accounts in this organization (org_id: d5789445-11e3-4ad6-9297-b565216751141).

### Excel Account Codes Found

21 unique account codes in Excel:
- 31, 41, 56, 115, 116, 117, 131, 132, 134, 211, 221, 232, 233, 234, 236, 1352, 1354, 2352, 2356, 13111, 23111

### Current Status

✅ Script correctly reads Excel file
✅ Script correctly loads Supabase accounts
✅ Script correctly identifies unmapped codes
❌ **BLOCKING ISSUE**: No legacy_code mappings exist in Supabase

## What This Means

According to the design document (Phase 0.4 - Account Code Verification):

> For each Excel account code:
> - Search in accounts.legacy_code
> - If found: Record mapping (excel_code → account_id)
> - If not found: Add to unmapped_codes list

**Current Result**: All 14,161 transaction lines have unmapped account codes.

## Required Action (Phase 0.4)

Before migration can proceed, you must:

### Option A: Populate legacy_code in Supabase (Recommended)

Update the `accounts` table to populate the `legacy_code` field with the Excel account codes:

```sql
UPDATE accounts 
SET legacy_code = '134'
WHERE code = '1341' AND org_id = 'd5789445-11e3-4ad6-9297-b565216751141';

-- Repeat for all 21 account codes...
```

### Option B: Manual Account Mapping

Provide a manual mapping file that maps Excel codes to Supabase account IDs:

```json
{
  "31": "uuid-of-account-31",
  "41": "uuid-of-account-41",
  "56": "uuid-of-account-56",
  ...
}
```

### Option C: Update Column Mapping

If the Excel account codes don't correspond to Supabase account codes, update the column mapping to use a different field for matching.

## Next Steps

1. **Verify Supabase accounts table structure**:
   - Check if `legacy_code` column exists
   - Check if it's populated for any accounts
   - Identify the correct field to use for matching

2. **Decide on mapping strategy**:
   - Option A: Populate legacy_code (recommended)
   - Option B: Provide manual mapping file
   - Option C: Update column mapping

3. **Provide mapping data**:
   - Once decided, provide the mapping information
   - Script will re-run and validate

4. **Re-run migration script**:
   - After mapping is provided, re-run the script
   - It will validate that all codes are mapped
   - Then proceed to generate prepared CSV files

## Design Document Reference

This is **Phase 0.4: Account Code Verification** from the design document:

> **Purpose**: Validate feasibility, gather actual schema, confirm mappings, identify data quality issues BEFORE writing any migration code.

> **Task 0.4**: Account Code Verification
> - Extract 21 unique account codes from Excel ✅
> - Query Supabase for ALL accounts with legacy_code ✅
> - Generate mapping report ✅
> - Identify unmapped codes ✅
> - **IF unmapped codes exist**: Present to user for manual selection, update mapping table, re-verify until 100% mapped ⏳

## Files Generated

- `data/prepared/mapping_report.json` - Shows 0/14161 accounts mapped
- `data/prepared/transactions_prepared.csv` - Contains NULL account_id values
- `data/prepared/transaction_lines_prepared.csv` - Contains NULL account_id values

**Note**: These files are NOT ready for migration until account mapping is resolved.

## Contact

Please provide the account mapping information so the migration can proceed.
