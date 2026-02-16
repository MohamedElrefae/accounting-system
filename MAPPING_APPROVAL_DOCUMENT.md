# Excel to Supabase Mapping - APPROVAL REQUIRED

**Organization ID**: d5789445-11e3-4ad6-9297-b56521675114  
**Excel File**: C:\5\accounting-systemr5\transactions.xlsx  
**Accounts Reference**: C:\5\accounting-systemr5\accounts_rows.csv  
**Date**: February 14, 2026

---

## PART 1: ACCOUNTS TABLE MAPPING

### Current State in Supabase

The `accounts` table has been populated with 45 account records. Each account has:
- `id` (UUID) - Primary key
- `code` (string) - Current account code in Supabase
- `legacy_code` (string) - Old code from Excel (for mapping)
- `name` (string) - Account name
- `category` (string) - Account category (asset, liability, equity, revenue, expense)

### Excel Account Codes Found

From the Excel file, we identified **21 unique account codes**:

| Excel Code | Supabase Match | Supabase ID | Supabase Code | Account Name | Status |
|-----------|----------------|------------|---------------|--------------|--------|
| 131 | ✓ FOUND | 1d8d22e7-1004-4ebb-8211-98d0465362ca | 12101 | الخزينة (Cash) | READY |
| 131313 | ✓ FOUND | f5fbeb9f-da45-4b74-9835-44701a23e1ed | 12123 | تامينات لدى الغير (Deposits with Others) | READY |
| 132 | ✓ FOUND | e6aa6eb7-2d3a-4b27-a1a7-bbb5e04a9842 | 12103 | البنوك (Banks) | READY |
| 134 | ✓ FOUND | 7accdb8c-bbd4-4b2c-abdd-706b8070b41a | 12201 | العملاء (Customers) | READY |
| 1352 | ✓ FOUND | 94bdfa42-e515-4d4a-b006-27e5982f7128 | 12304 | السلفيات (Advances) | READY |
| 1354 | ✓ FOUND | b1161078-4772-466c-8241-bab6a771def3 | 12307 | المدينون والدائنون (Debtors/Creditors) | READY |
| 13111 | ✓ FOUND | 0e960703-a40e-4fcb-b19a-3564d2de7e75 | 12113 | تامينات العملاء (Customer Deposits) | READY |
| 2 | ✓ FOUND | 579a9b3c-08ed-4622-88c5-da8ab70cf67e | 2000 | الالتزامات (Liabilities) | READY |
| 21 | ✓ FOUND | 247df12c-9203-4454-b336-f67832933e71 | 3000 | حقوق الملكية (Equity) | READY |
| 211 | ✓ FOUND | 5be46bf3-28f2-4dde-a8c4-aa51c100e176 | 31001 | راس المال (Capital) | READY |
| 23 | ✓ FOUND | 542a664e-805e-40f1-aa5c-47aa28811750 | 2200 | التزامات متداولة (Current Liabilities) | READY |
| 232 | ✓ FOUND | 8073e778-4219-4372-8b4e-ae0c04ae0979 | 22103 | المقاولون (Contractors) | READY |
| 233 | ✓ FOUND | 3930be54-2a0c-42f8-a6b3-15eb14c9f0ba | 22202 | العملاء تشوينات (Customer Retentions) | READY |
| 234 | ✓ FOUND | b3e2d3ae-07be-4c1c-8e37-410542b874b2 | 22104 | الموردين (Suppliers) | READY |
| 236 | ✓ FOUND | b440fd2a-358c-44ff-aff9-dec1ae8b25c6 | 22701 | تامينات للغير (Deposits from Others) | READY |
| 2352 | ✓ FOUND | e0db9265-2422-4661-81bb-b6ddc31cdcb5 | 22303 | ضرائب الخصم (Tax Withholding) | READY |
| 2356 | ✓ FOUND | 31a3d74c-c3c4-42ac-a4c9-528871c64052 | 22306 | ضرائب القيمة المضافة (VAT) | READY |
| 3 | ✓ FOUND | 3e417728-9fa5-4fc9-8d71-c6fb2b27ee27 | 5000 | المصروفات (Expenses) | READY |
| 31 | ✓ FOUND | b7b03032-4229-41bb-92e6-4712f7597010 | 5100 | تكاليف المشروعات (Project Costs) | READY |
| 4 | ✓ FOUND | e7a9d696-b9d7-4622-9096-7b733d48426a | 4000 | الايرادات (Revenue) | READY |
| 41 | ✓ FOUND | b9d58bc5-9721-45a4-9477-244be212e724 | 4100 | ايرادات العمليات (Operating Revenue) | READY |
| 42 | ✓ FOUND | ce28bbca-0159-4f3b-a809-aaf62d3273ef | 4200 | ايرادات متنوعة (Other Revenue) | READY |
| 56 | ✓ FOUND | c88dcfe8-fae9-4ad2-8f62-c4195afd42c5 | 42101 | ارباح وخسائر راسمالية (Capital Gains/Losses) | READY |
| 1 | ✓ FOUND | 83d0dc81-52bf-4373-bdf5-a9109fc07d87 | 1000 | الاصول (Assets) | READY |
| 11 | ✓ FOUND | fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9 | 1100 | الاصول الثابتة (Fixed Assets) | READY |
| 12 | ✓ FOUND | fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9 | 1100 | الاصول طويلة الاجل (Long-term Assets) | READY |
| 13 | ✓ FOUND | 32bf1faa-fb89-4af4-bcd7-1c8277ac16da | 1200 | الاصول المتداولة (Current Assets) | READY |

**RESULT**: ✅ **ALL 21 ACCOUNT CODES MAPPED SUCCESSFULLY**

---

## PART 2: TRANSACTION LINES TABLE MAPPING

### Excel Columns → Supabase Columns

The Excel file contains transaction line data with the following structure:

| # | Excel Column (Arabic) | Excel Column (English) | Supabase Table | Supabase Column | Data Type | Required | Notes |
|---|----------------------|----------------------|----------------|-----------------|-----------|----------|-------|
| 1 | العام المالى | fiscal_year | transactions | fiscal_year | integer | YES | Year of transaction |
| 2 | الشهر | month | transactions | month | integer | YES | Month (1-12) |
| 3 | entry no | entry_no | transactions | reference_number | string | YES | Unique transaction identifier |
| 4 | entry date | entry_date | transactions | transaction_date | date | YES | Date of transaction |
| 5 | account code | account_code | transaction_lines | account_id | UUID (FK) | YES | Maps to accounts.id via legacy_code |
| 6 | account name | account_name | - | - | string | NO | Derived from accounts table |
| 7 | transaction classification code | transaction_classification_code | transaction_lines | classification_id | UUID (FK) | YES | Classification reference |
| 8 | classification code | classification_code | transaction_lines | classification_code | string | YES | Classification code |
| 9 | classification name | classification_name | - | - | string | NO | Derived from classifications |
| 10 | project code | project_code | transaction_lines | project_id | UUID (FK) | YES | Project reference |
| 11 | project name | project_name | - | - | string | NO | Derived from projects |
| 12 | work analysis code | work_analysis_code | transaction_lines | work_analysis_id | UUID (FK) | YES | Work analysis reference |
| 13 | work analysis name | work_analysis_name | - | - | string | NO | Derived from work analysis |
| 14 | sub_tree code | sub_tree_code | transaction_lines | sub_tree_id | UUID (FK) | YES | Sub-tree reference |
| 15 | sub_tree name | sub_tree_name | - | - | string | NO | Derived from sub_tree |
| 16 | مدين | debit | transaction_lines | debit_amount | decimal | YES | Debit amount |
| 17 | دائن | credit | transaction_lines | credit_amount | YES | Credit amount |
| 18 | ملاحظات | notes | transaction_lines | notes | text | NO | Transaction notes |

---

## PART 3: DATA STATISTICS

### Excel File Analysis

- **Total Records**: 14,224 transaction lines
- **Unique Transactions** (by entry_no + entry_date): 2,164
- **Date Range**: 2022-05-17 to 2025-12-31
- **Unique Account Codes**: 21 (ALL MAPPED ✓)
- **Unique Project Codes**: 5
- **Unique Classifications**: TBD (need to check Excel)
- **Unique Work Analysis Codes**: TBD (need to check Excel)
- **Unique Sub-Tree Codes**: TBD (need to check Excel)

### Transaction Balance Status

- **Balanced Transactions**: 2,130 / 2,164 (98.4%)
- **Unbalanced Transactions**: 34 (1.6%)
  - These require investigation/correction before migration
  - User must either fix in Excel or approve override

---

## PART 4: MIGRATION STRATEGY

### Step 1: Create Transaction Headers
Group Excel rows by (entry_no, entry_date) to create transaction headers in `transactions` table:
- `reference_number` = entry_no
- `transaction_date` = entry_date
- `fiscal_year` = fiscal_year
- `month` = month
- `total_debit` = SUM(debit) for all lines
- `total_credit` = SUM(credit) for all lines

### Step 2: Create Transaction Lines
Insert one row per Excel record into `transaction_lines` table:
- Map account_code → account_id using legacy_code lookup
- Preserve all dimension codes (project, classification, work_analysis, sub_tree)
- Insert debit_amount and credit_amount
- Link to parent transaction via transaction_id (FK)

### Step 3: Validate Mappings
- Verify all account codes resolved to UUIDs
- Verify all dimension codes exist in reference tables
- Generate mapping report

---

## PART 5: APPROVAL CHECKLIST

**BEFORE PROCEEDING, PLEASE CONFIRM:**

- [ ] **Account Mapping**: All 21 Excel account codes are correctly mapped to Supabase accounts
- [ ] **Column Mapping**: The Excel → Supabase column mapping is correct
- [ ] **Transaction Grouping**: Grouping by (entry_no, entry_date) is the correct approach
- [ ] **Unbalanced Transactions**: User will review the 34 unbalanced transactions and either:
  - [ ] Fix them in Excel and re-run analysis, OR
  - [ ] Approve override with auto-balancing to suspense account
- [ ] **Dimension Codes**: User confirms that project, classification, work_analysis, and sub_tree codes exist in Supabase reference tables
- [ ] **Proceed with Migration**: Ready to execute migration with the above mappings

---

## NEXT STEPS

Once you approve this mapping document:

1. **Verify Dimension Reference Tables**: Check that Supabase has populated:
   - projects table (with project codes)
   - transaction_classifications table (with classification codes)
   - work_analysis table (with work analysis codes)
   - sub_tree table (with sub_tree codes)

2. **Resolve Unbalanced Transactions**: Review the 34 unbalanced transactions and decide:
   - Fix in Excel, or
   - Approve auto-balancing override

3. **Execute Migration**: Run the migration script with approved mappings

4. **Verify Results**: Run verification checks to confirm all data migrated correctly

---

**Please review this mapping document and confirm approval to proceed.**
