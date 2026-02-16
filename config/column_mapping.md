# Column Mapping Matrix

**Generated**: 2026-02-13T13:49:20.146873

## Overview

Total columns: 18

## Mapping Details

| # | Excel Column | English Name | Supabase Table | Supabase Column | Data Type | Required | Notes |
|---|--------------|--------------|----------------|-----------------|-----------|----------|-------|
| 1 | العام المالى | fiscal_year | transactions | fiscal_year | integer | Yes | Fiscal year from Excel |
| 2 | الشهر | month | transactions | month | integer | Yes | Month from Excel |
| 3 | entry no | entry_no | transactions | reference_number | string | Yes | Transaction reference number |
| 4 | entry date | entry_date | transactions | transaction_date | date | Yes | Transaction date |
| 5 | account code | account_code | transaction_lines | account_id | uuid (FK) | Yes | Maps to accounts.id via legacy_code |
| 6 | account name | account_name | - | (derived) | string | No | Derived from accounts table |
| 7 | transaction classification code | transaction_classification_code | transaction_lines | classification_id | uuid (FK) | Yes | Maps to classifications table |
| 8 | classification code | classification_code | transaction_lines | classification_code | string | Yes | Classification code |
| 9 | classification name | classification_name | - | (derived) | string | No | Derived from classifications table |
| 10 | project code | project_code | transaction_lines | project_id | uuid (FK) | Yes | Maps to projects table |
| 11 | project name | project_name | - | (derived) | string | No | Derived from projects table |
| 12 | work analysis code | work_analysis_code | transaction_lines | work_analysis_id | uuid (FK) | Yes | Maps to work_analysis table |
| 13 | work analysis name | work_analysis_name | - | (derived) | string | No | Derived from work_analysis table |
| 14 | sub_tree code | sub_tree_code | transaction_lines | sub_tree_id | uuid (FK) | Yes | Maps to sub_tree table |
| 15 | sub_tree name | sub_tree_name | - | (derived) | string | No | Derived from sub_tree table |
| 16 | مدين | debit | transaction_lines | debit_amount | decimal | Yes | Debit amount |
| 17 | دائن | credit | transaction_lines | credit_amount | decimal | Yes | Credit amount |
| 18 | ملاحظات | notes | transaction_lines | notes | string | No | Transaction notes |

## Summary

- **Total Columns**: 18
- **Required**: 12
- **Optional**: 6

## Mapping Strategy

### Transaction Headers

Excel rows are grouped by (entry_no, entry_date) to create transaction headers:

| Excel Column | Supabase Column | Notes |
|--------------|-----------------|-------|
| العام المالى | fiscal_year | Fiscal year from Excel |
| الشهر | month | Month from Excel |
| entry no | reference_number | Transaction reference number |
| entry date | transaction_date | Transaction date |

### Transaction Lines

Each Excel row becomes a transaction line:

| Excel Column | Supabase Column | Notes |
|--------------|-----------------|-------|
| account code | account_id | Maps to accounts.id via legacy_code |
| transaction classification code | classification_id | Maps to classifications table |
| classification code | classification_code | Classification code |
| project code | project_id | Maps to projects table |
| work analysis code | work_analysis_id | Maps to work_analysis table |
| sub_tree code | sub_tree_id | Maps to sub_tree table |
| مدين | debit_amount | Debit amount |
| دائن | credit_amount | Credit amount |
| ملاحظات | notes | Transaction notes |

### Derived Columns

These columns are derived from reference tables:

| Excel Column | Source Table | Notes |
|--------------|--------------|-------|
| account name | (derived) | Derived from accounts table |
| classification name | (derived) | Derived from classifications table |
| project name | (derived) | Derived from projects table |
| work analysis name | (derived) | Derived from work_analysis table |
| sub_tree name | (derived) | Derived from sub_tree table |
