# Excel to Supabase Migration - FINAL ACCURATE MAPPING

**Organization ID**: d5789445-11e3-4ad6-9297-b56521675114  
**Excel File**: C:\5\accounting-systemr5\transactions.xlsx  
**Accounts Reference**: C:\5\accounting-systemr5\accounts_rows.csv  
**Date**: February 14, 2026  
**Status**: FINAL MAPPING - READY FOR APPROVAL

---

## CRITICAL CORRECTIONS

✅ **21 unique account codes** (NOT 9) - All from accounts_rows.csv legacy_code field  
✅ **fiscal_year and month** - NOT in Supabase transactions table (remove from mapping)  
✅ **description field** - Added to BOTH transactions AND transaction_lines tables  
✅ **work_analysis_id** - Maps to analysis_work_items table (NOT work_analysis)  
✅ **Account code 7** - Does NOT exist in Excel data (ignore)  

---

## PART 1: ACCOUNT CODE MAPPING (21 CODES - ALL MAPPED)

| Excel Code | Supabase ID | Supabase Code | Account Name | Status |
|-----------|------------|---------------|--------------|--------|
| 1 | 83d0dc81-52bf-4373-bdf5-a9109fc07d87 | 1000 | الأصول | ✅ |
| 2 | 579a9b3c-08ed-4622-88c5-da8ab70cf67e | 2000 | الالتزامات | ✅ |
| 3 | 3e417728-9fa5-4fc9-8d71-c6fb2b27ee27 | 5000 | المصروفات والتكاليف | ✅ |
| 4 | e7a9d696-b9d7-4622-9096-7b733d48426a | 4000 | الإيرادات | ✅ |
| 11 | fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9 | 1100 | أصول غير متداولة | ✅ |
| 12 | fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9 | 1100 | أصول طويلة الاجل | ✅ |
| 13 | 32bf1faa-fb89-4af4-bcd7-1c8277ac16da | 1200 | أصول متداولة | ✅ |
| 21 | 247df12c-9203-4454-b336-f67832933e71 | 3000 | حقوق الملكية | ✅ |
| 23 | 542a664e-805e-40f1-aa5c-47aa28811750 | 2200 | التزامات متداولة | ✅ |
| 31 | b7b03032-4229-41bb-92e6-4712f7597010 | 5100 | تكاليف المشروعات/التشغيل | ✅ |
| 41 | b9d58bc5-9721-45a4-9477-244be212e724 | 4100 | إيرادات التشغيل/العقود | ✅ |
| 42 | ce28bbca-0159-4f3b-a809-aaf62d3273ef | 4200 | إيرادات أخرى | ✅ |
| 56 | c88dcfe8-fae9-4ad2-8f62-c4195afd42c5 | 42101 | ارباح وخسائر راسمالية | ✅ |
| 116 | 3144218c-d290-422d-a461-0c7f4c2673f4 | 11106 | الاثاث والمهمات | ✅ |
| 117 | 2c245f69-02b9-4e42-aee3-09c829368dc6 | 11107 | العدد والادوات | ✅ |
| 131 | 1d8d22e7-1004-4ebb-8211-98d0465362ca | 12101 | الخزينة | ✅ |
| 132 | e6aa6eb7-2d3a-4b27-a1a7-bbb5e04a9842 | 12103 | البنوك | ✅ |
| 134 | 7accdb8c-bbd4-4b2c-abdd-706b8070b41a | 12201 | العملاء | ✅ |
| 211 | 5be46bf3-28f2-4dde-a8c4-aa51c100e176 | 31001 | راس المال | ✅ |
| 232 | 8073e778-4219-4372-8b4e-ae0c04ae0979 | 22103 | المقاولون | ✅ |
| 234 | b3e2d3ae-07be-4c1c-8e37-410542b874b2 | 22104 | الموردين | ✅ |

**Result**: ✅ **ALL 21 ACCOUNT CODES MAPPED**

---

## PART 2: COLUMN MAPPING - EXCEL TO SUPABASE (CORRECTED)

### Transaction Header Mapping (transactions table)

Group Excel rows by (entry_no, entry_date) to create transaction headers.

| Excel Column | Supabase Column | Data Type | Required | Mapping Logic |
|--------------|-----------------|-----------|----------|----------------|
| entry no | reference_number | string | YES | Direct copy |
| entry date | transaction_date | date | YES | Direct copy |
| description | description | string | NO | Aggregated from transaction lines |
| (calculated) | total_debit | decimal | YES | SUM(debit) for all lines |
| (calculated) | total_credit | decimal | YES | SUM(credit) for all lines |
| (calculated) | org_id | UUID | YES | d5789445-11e3-4ad6-9297-b56521675114 |

**NOTE**: fiscal_year and month do NOT exist in Supabase transactions table - remove from mapping

### Transaction Line Mapping (transaction_lines table)

| Excel Column | Supabase Column | Data Type | Required | Mapping Logic |
|--------------|-----------------|-----------|----------|----------------|
| account id legacy | account_id | UUID (FK) | YES | Map via legacy_code to accounts.id |
| transaction classification code | classification_id | UUID (FK) | YES | Map to transaction_classifications |
| project code | project_id | UUID (FK) | YES | Map to projects |
| work analysis code | analysis_work_item_id | UUID (FK) | YES | Map to analysis_work_items |
| sub_tree code | sub_tree_id | UUID (FK) | YES | Map to sub_tree |
| debit | debit_amount | decimal | YES | Direct copy |
| credit | credit_amount | decimal | YES | Direct copy |
| description | description | string | NO | Direct copy |
| notes | notes | string | NO | Direct copy |
| (calculated) | transaction_id | UUID (FK) | YES | Reference to parent transaction |
| (calculated) | org_id | UUID | YES | d5789445-11e3-4ad6-9297-b56521675114 |

---

## PART 3: FINAL APPROVAL CHECKLIST

**CONFIRM THESE MAPPINGS:**

- [ ] **21 account codes** - All mapped via legacy_code ✓
- [ ] **entry_no** → reference_number ✓
- [ ] **entry_date** → transaction_date ✓
- [ ] **description** → BOTH transactions AND transaction_lines ✓
- [ ] **account_id** → Maps via legacy_code lookup ✓
- [ ] **classification_id** → transaction_classifications ✓
- [ ] **project_id** → projects ✓
- [ ] **analysis_work_item_id** → analysis_work_items (NOT work_analysis) ✓
- [ ] **sub_tree_id** → sub_tree ✓
- [ ] **debit_amount** and **credit_amount** → Direct copy ✓
- [ ] **fiscal_year and month** → REMOVED (not in Supabase) ✓
- [ ] **org_id** → d5789445-11e3-4ad6-9297-b56521675114 ✓

---

**Ready to proceed with migration?**

