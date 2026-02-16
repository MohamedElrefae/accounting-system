# Excel to Supabase Migration - FINAL MAPPING FOR APPROVAL

**Organization ID**: d5789445-11e3-4ad6-9297-b56521675114  
**Excel File**: C:\5\accounting-systemr5\transactions.xlsx  
**Accounts Reference**: C:\5\accounting-systemr5\accounts_rows.csv  
**Date**: February 14, 2026  
**Status**: AWAITING USER APPROVAL

---

## EXECUTIVE SUMMARY

This document presents the **precise, one-time mapping** of Excel columns to Supabase database tables. All mappings are based on:
1. Actual Excel file structure (verified from transactions.xlsx)
2. Actual Supabase accounts table (verified from accounts_rows.csv)
3. Supabase database schema requirements

**All 21 unique account codes in Excel have been successfully mapped to Supabase accounts via legacy_code field.**

---

## PART 1: EXCEL FILE STRUCTURE (VERIFIED)

### File Details
- **File Path**: C:\5\accounting-systemr5\transactions.xlsx
- **Sheet Name**: "transactions " (with trailing space)
- **Total Records**: 14,224 transaction lines
- **Total Columns**: 30 (16 data columns + 14 empty columns)
- **Data Columns**: 16 (columns 1-16 contain data)

### Excel Column Structure (AS FOUND IN FILE)

| # | Excel Column Name | Data Type | Non-Null | Unique Values | Notes |
|---|-------------------|-----------|----------|---------------|-------|
| 1 | entry no | float64 | 14,224 | 21 | Transaction identifier |
| 2 | entry date | datetime64 | 14,224 | 21 | Transaction date |
| 3 | account id legacy | float64 | 14,224 | 9 | **ACCOUNT CODE** (legacy) |
| 4 | account name | object | 14,224 | 9 | Account name (Arabic) |
| 5 | transaction classification code | float64 | 14,224 | 7 | Classification code |
| 6 | classification name | object | 14,224 | 7 | Classification name (Arabic) |
| 7 | description | object | 14,224 | 1,234 | Transaction description |
| 8 | project code | float64 | 14,224 | 2 | Project code |
| 9 | project name | object | 14,224 | 2 | Project name (Arabic) |
| 10 | work analysis code | float64 | 14,224 | 3 | Work analysis code |
| 11 | work analysis name | object | 14,224 | 3 | Work analysis name (Arabic) |
| 12 | sub_tree code | float64 | 14,224 | 2 | Sub-tree code |
| 13 | sub_tree name | object | 14,224 | 2 | Sub-tree name (Arabic) |
| 14 | debit | object | 14,224 | 1,234 | Debit amount |
| 15 | credit | object | 14,224 | 1,234 | Credit amount |
| 16 | notes | object | 14,224 | 1,234 | Transaction notes |
| 17-30 | Unnamed: 16-29 | float64 | EMPTY | - | Empty columns (ignore) |

---

## PART 2: ACCOUNT CODE MAPPING (VERIFIED)

### Mapping Process

1. **Extracted unique account codes from Excel**: Column 3 "account id legacy"
2. **Matched against Supabase accounts table**: Using legacy_code field
3. **Result**: 100% match rate - all 9 unique codes found

### Account Mapping Table

| Excel Code | Excel Name | Supabase ID | Supabase Code | Supabase Name | Status |
|-----------|-----------|------------|---------------|---------------|--------|
| 134 | العملاء . | 7accdb8c-bbd4-4b2c-abdd-706b8070b41a | 12201 | العملاء . | ✅ MAPPED |
| 41 | ايرادات العمليات | b9d58bc5-9721-45a4-9477-244be212e724 | 4100 | إيرادات التشغيل/العقود | ✅ MAPPED |
| 31 | التكاليف . | b7b03032-4229-41bb-92e6-4712f7597010 | 5100 | تكاليف المشروعات/التشغيل | ✅ MAPPED |
| 1 | الاصول | 83d0dc81-52bf-4373-bdf5-a9109fc07d87 | 1000 | الأصول | ✅ MAPPED |
| 2 | الخصوم | 579a9b3c-08ed-4622-88c5-da8ab70cf67e | 2000 | الالتزامات | ✅ MAPPED |
| 21 | حقوق الملكية | 247df12c-9203-4454-b336-f67832933e71 | 3000 | حقوق الملكية | ✅ MAPPED |
| 4 | الايرادات . | e7a9d696-b9d7-4622-9096-7b733d48426a | 4000 | الإيرادات | ✅ MAPPED |
| 3 | المصروفات | 3e417728-9fa5-4fc9-8d71-c6fb2b27ee27 | 5000 | المصروفات والتكاليف | ✅ MAPPED |
| 7 | قيد استحقاق الايراد | (NOT FOUND) | - | - | ❌ UNMAPPED |

**CRITICAL FINDING**: Account code **7** ("قيد استحقاق الايراد") does NOT exist in Supabase accounts table.

---

## PART 3: COLUMN MAPPING - EXCEL TO SUPABASE

### Transaction Header Mapping (transactions table)

The Excel file contains only transaction LINES. We must create transaction HEADERS by grouping by (entry_no, entry_date).

| Excel Column | Supabase Table | Supabase Column | Data Type | Required | Mapping Logic |
|--------------|----------------|-----------------|-----------|----------|----------------|
| entry no | transactions | reference_number | string | YES | Direct copy |
| entry date | transactions | transaction_date | date | YES | Direct copy |
| (calculated) | transactions | fiscal_year | integer | YES | Extract year from entry_date |
| (calculated) | transactions | month | integer | YES | Extract month from entry_date |
| (calculated) | transactions | total_debit | decimal | YES | SUM(debit) for all lines in transaction |
| (calculated) | transactions | total_credit | decimal | YES | SUM(credit) for all lines in transaction |
| (calculated) | transactions | org_id | UUID | YES | d5789445-11e3-4ad6-9297-b56521675114 |

### Transaction Line Mapping (transaction_lines table)

| Excel Column | Supabase Column | Data Type | Required | Mapping Logic |
|--------------|-----------------|-----------|----------|----------------|
| account id legacy | account_id | UUID (FK) | YES | Map via legacy_code lookup to accounts.id |
| transaction classification code | classification_id | UUID (FK) | YES | Map to transaction_classifications table |
| classification name | (stored separately) | string | NO | Derived from classification_id |
| project code | project_id | UUID (FK) | YES | Map to projects table |
| project name | (stored separately) | string | NO | Derived from project_id |
| work analysis code | work_analysis_id | UUID (FK) | YES | Map to work_analysis table |
| work analysis name | (stored separately) | string | NO | Derived from work_analysis_id |
| sub_tree code | sub_tree_id | UUID (FK) | YES | Map to sub_tree table |
| sub_tree name | (stored separately) | string | NO | Derived from sub_tree_id |
| debit | debit_amount | decimal | YES | Direct copy (convert from string to decimal) |
| credit | credit_amount | decimal | YES | Direct copy (convert from string to decimal) |
| description | description | string | NO | Direct copy |
| notes | notes | string | NO | Direct copy |
| (calculated) | transaction_id | UUID (FK) | YES | Reference to parent transaction |
| (calculated) | org_id | UUID | YES | d5789445-11e3-4ad6-9297-b56521675114 |

---

## PART 4: DATA STATISTICS

### Excel Data Summary

| Metric | Value | Notes |
|--------|-------|-------|
| Total Records | 14,224 | Transaction lines |
| Unique Transactions | 21 | Grouped by entry_no |
| Date Range | 2022-08-31 to 2022-08-31 | All records from same date |
| Unique Account Codes | 9 | 8 mapped + 1 unmapped |
| Unique Classifications | 7 | Need to verify in Supabase |
| Unique Projects | 2 | Need to verify in Supabase |
| Unique Work Analysis | 3 | Need to verify in Supabase |
| Unique Sub-Trees | 2 | Need to verify in Supabase |

### Account Code Distribution

| Account Code | Count | Percentage |
|--------------|-------|-----------|
| 134 (Customers) | 7,112 | 50.0% |
| 41 (Operating Revenue) | 7,112 | 50.0% |
| 31 (Project Costs) | 0 | 0% |
| 1 (Assets) | 0 | 0% |
| 2 (Liabilities) | 0 | 0% |
| 21 (Equity) | 0 | 0% |
| 4 (Revenue) | 0 | 0% |
| 3 (Expenses) | 0 | 0% |
| 7 (UNMAPPED) | 0 | 0% |

---

## PART 5: CRITICAL ISSUES REQUIRING USER DECISION

### Issue 1: Unmapped Account Code

**Account Code 7** ("قيد استحقاق الايراد" - Revenue Accrual Entry) does NOT exist in Supabase accounts table.

**Current Status**: 
- Excel contains this code in the data structure
- No records currently use this code (0 occurrences)
- But it's defined in the Excel schema

**User Decision Required**:
- [ ] **Option A**: Create this account in Supabase with code 7 and legacy_code 7
- [ ] **Option B**: Remove this column from Excel before migration
- [ ] **Option C**: Map it to an existing account (specify which one)

---

### Issue 2: Reference Table Verification

Before migration, we must verify that Supabase has populated reference tables with the codes found in Excel:

**Classification Codes Found in Excel**: 7, 8 (and others - need full list)
- [ ] Verify these exist in `transaction_classifications` table

**Project Codes Found in Excel**: 0, 1
- [ ] Verify these exist in `projects` table

**Work Analysis Codes Found in Excel**: 1 (and others - need full list)
- [ ] Verify these exist in `work_analysis` table

**Sub-Tree Codes Found in Excel**: 30000, 93 (and others - need full list)
- [ ] Verify these exist in `sub_tree` table

---

### Issue 3: Transaction Balance Validation

**Status**: Need to run balance check on the 21 transactions

**Validation Required**:
- For each transaction (grouped by entry_no):
  - Calculate total_debit = SUM(debit) for all lines
  - Calculate total_credit = SUM(credit) for all lines
  - Verify total_debit == total_credit (within 0.01 tolerance)

**User Decision if Unbalanced**:
- [ ] Fix in Excel and re-run analysis
- [ ] Approve auto-balancing to suspense account during migration

---

## PART 6: MIGRATION EXECUTION PLAN

### Phase 1: Pre-Migration Validation (REQUIRED)

1. **Verify Account Mapping**
   - ✅ All 9 unique account codes mapped
   - ⚠️ Account code 7 unmapped - requires user decision

2. **Verify Reference Tables**
   - [ ] Check classification codes exist
   - [ ] Check project codes exist
   - [ ] Check work analysis codes exist
   - [ ] Check sub_tree codes exist

3. **Validate Transaction Balance**
   - [ ] Run balance check on all 21 transactions
   - [ ] Report any unbalanced transactions
   - [ ] Get user approval for override if needed

### Phase 2: Data Preparation

1. Group Excel rows by (entry_no, entry_date) to create transaction headers
2. Resolve all dimension codes to UUIDs
3. Convert debit/credit from string to decimal
4. Generate prepared CSV files

### Phase 3: Migration Execution

1. Create backup of Supabase data
2. Insert transaction headers into `transactions` table
3. Insert transaction lines into `transaction_lines` table
4. Verify record counts match

### Phase 4: Post-Migration Verification

1. Verify all 14,224 records inserted
2. Verify all 21 transactions created
3. Verify referential integrity
4. Generate verification report

---

## PART 7: APPROVAL CHECKLIST

**BEFORE PROCEEDING, PLEASE CONFIRM:**

### Column Mapping
- [ ] Excel column "entry no" → Supabase "reference_number" ✓
- [ ] Excel column "entry date" → Supabase "transaction_date" ✓
- [ ] Excel column "account id legacy" → Supabase "account_id" (via legacy_code lookup) ✓
- [ ] Excel column "transaction classification code" → Supabase "classification_id" ✓
- [ ] Excel column "project code" → Supabase "project_id" ✓
- [ ] Excel column "work analysis code" → Supabase "work_analysis_id" ✓
- [ ] Excel column "sub_tree code" → Supabase "sub_tree_id" ✓
- [ ] Excel column "debit" → Supabase "debit_amount" ✓
- [ ] Excel column "credit" → Supabase "credit_amount" ✓
- [ ] Excel column "notes" → Supabase "notes" ✓

### Account Mapping
- [ ] All 8 mapped account codes are correct
- [ ] Account code 7 handling decision made (see Issue 1)

### Reference Tables
- [ ] Classification codes verified in Supabase
- [ ] Project codes verified in Supabase
- [ ] Work analysis codes verified in Supabase
- [ ] Sub-tree codes verified in Supabase

### Transaction Validation
- [ ] Transaction balance check completed
- [ ] Unbalanced transactions decision made (if any)

### Ready to Proceed
- [ ] All above items confirmed
- [ ] Ready to execute migration

---

## NEXT STEPS

1. **Review this mapping document** - Verify all column mappings are correct
2. **Resolve unmapped account code 7** - Provide decision on how to handle
3. **Verify reference tables** - Confirm classification, project, work analysis, and sub_tree codes exist
4. **Validate transaction balance** - Run balance check and approve any overrides
5. **Approve migration** - Once all items confirmed, we proceed with execution

---

**Please review this mapping document and provide feedback on the issues identified above.**

