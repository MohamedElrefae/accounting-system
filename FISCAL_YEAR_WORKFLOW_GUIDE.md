# Fiscal Year & Opening Balance Workflow Guide

## Correct Workflow

### Step 1: Create Fiscal Years (Dashboard)
Go to `/fiscal/dashboard` and create all the fiscal years you need:

```
┌─────────────────────────────────────┐
│ Fiscal Year Dashboard               │
├─────────────────────────────────────┤
│ [+ New Fiscal Year]                 │
│                                     │
│ ┌─────────────────┐                │
│ │ FY 2023         │                │
│ │ 2023-01-01 to   │                │
│ │ 2023-12-31      │                │
│ │ Status: closed  │                │
│ └─────────────────┘                │
│                                     │
│ ┌─────────────────┐                │
│ │ FY 2024         │                │
│ │ 2024-01-01 to   │                │
│ │ 2024-12-31      │                │
│ │ Status: closed  │                │
│ └─────────────────┘                │
│                                     │
│ ┌─────────────────┐                │
│ │ FY 2025 [Active]│                │
│ │ 2025-01-01 to   │                │
│ │ 2025-12-31      │                │
│ │ Status: active  │                │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

**How to create each year:**
1. Click **"New Fiscal Year"** button
2. Fill in:
   - Year Number: 2023 (or 2024)
   - Start Date: 2023-01-01
   - End Date: 2023-12-31
   - Name (optional): "FY 2023"
3. Click **"Create"**
4. Repeat for each year

### Step 2: Import Opening Balances (Opening Balance Import)
Go to `/fiscal/opening-balance` and import balances for each year:

```
┌─────────────────────────────────────┐
│ Opening Balance Import              │
├─────────────────────────────────────┤
│ Select Fiscal Year: [Dropdown ▼]   │
│   - 2023 - FY 2023                  │
│   - 2024 - FY 2024                  │
│   - 2025 - FY 2025 (Current)        │
│                                     │
│ [Upload Excel File]                 │
│                                     │
│ [Import Opening Balances]           │
└─────────────────────────────────────┘
```

**How to import for each year:**
1. Select fiscal year from dropdown (e.g., 2023)
2. Upload Excel file with opening balances for that year
3. Click **"Import"**
4. Repeat for each year (2024, 2025)

## Current Situation

**Your Database**: Only has FY 2025
```
fiscal_years table:
- 2025 (active)
```

**What You See**:
- Dashboard: Shows only 2025 ✓ (correct)
- Opening Balance Import: Shows only 2025 ✓ (correct)

**What You Need**:
- Create FY 2023 and FY 2024 first
- Then import opening balances for each year

## How to Create Missing Years

### Option 1: Use Dashboard UI (Recommended)

1. Navigate to `/fiscal/dashboard`
2. Click **"New Fiscal Year"** button
3. Create FY 2023:
   ```
   Year Number: 2023
   Start Date: 2023-01-01
   End Date: 2023-12-31
   Name: FY 2023
   ```
4. Click **"Create"**
5. Repeat for FY 2024:
   ```
   Year Number: 2024
   Start Date: 2024-01-01
   End Date: 2024-12-31
   Name: FY 2024
   ```

### Option 2: Use SQL (Advanced)

Run the SQL script in `sql/create_missing_fiscal_years.sql`:

```sql
-- Get your org_id
SELECT id, code, name FROM organizations;

-- Get your user_id
SELECT id, email FROM auth.users LIMIT 1;

-- Create FY 2023
SELECT create_fiscal_year(
  p_org_id := 'YOUR_ORG_ID',
  p_year_number := 2023,
  p_start_date := '2023-01-01',
  p_end_date := '2023-12-31',
  p_user_id := 'YOUR_USER_ID',
  p_create_monthly_periods := true,
  p_name_en := 'FY 2023',
  p_name_ar := 'السنة المالية 2023'
);

-- Create FY 2024
SELECT create_fiscal_year(
  p_org_id := 'YOUR_ORG_ID',
  p_year_number := 2024,
  p_start_date := '2024-01-01',
  p_end_date := '2024-12-31',
  p_user_id := 'YOUR_USER_ID',
  p_create_monthly_periods := true,
  p_name_en := 'FY 2024',
  p_name_ar := 'السنة المالية 2024'
);
```

## After Creating Years

### Dashboard Will Show:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ FY 2023         │  │ FY 2024         │  │ FY 2025 [Active]│
│ 2023-01-01 to   │  │ 2024-01-01 to   │  │ 2025-01-01 to   │
│ 2023-12-31      │  │ 2024-12-31      │  │ 2025-12-31      │
│ Status: closed  │  │ Status: closed  │  │ Status: active  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Opening Balance Import Will Show:
```
Select Fiscal Year: [Dropdown ▼]
  ✓ 2023 - FY 2023
  ✓ 2024 - FY 2024
  ✓ 2025 - FY 2025 (Current)
```

## Best Practices

### 1. Create Years in Order
Create fiscal years from oldest to newest:
- 2023 first
- 2024 second
- 2025 last

### 2. Set Correct Status
- **Past years** (2023, 2024): Status = "closed"
- **Current year** (2025): Status = "active"
- **Future years**: Status = "draft"

### 3. Import Opening Balances in Order
Import opening balances from oldest to newest:
1. Import 2023 opening balances
2. Import 2024 opening balances
3. Import 2025 opening balances

### 4. Set Current Year
Only ONE year should be marked as "current":
- 2023: is_current = false
- 2024: is_current = false
- 2025: is_current = true ✓

## Verification

After creating all years, verify:

```sql
SELECT 
  year_number,
  name_en,
  start_date,
  end_date,
  status,
  is_current
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID'
ORDER BY year_number DESC;
```

Expected result:
```
year_number | name_en  | start_date | end_date   | status | is_current
2025        | FY 2025  | 2025-01-01 | 2025-12-31 | active | true
2024        | FY 2024  | 2024-01-01 | 2024-12-31 | closed | false
2023        | FY 2023  | 2023-01-01 | 2023-12-31 | closed | false
```

## Common Questions

**Q: Can I import opening balances for past years?**
A: Yes! You can import opening balances for any fiscal year, past or present.

**Q: Do I need to create years in order?**
A: No, but it's recommended for clarity.

**Q: Can I have multiple "current" years?**
A: No, only one year should be marked as current at a time.

**Q: What if I already have transactions in 2025?**
A: That's fine. You can still create 2023 and 2024 and import their opening balances separately.

**Q: Will creating past years affect my current data?**
A: No, each fiscal year is independent. Creating 2023 and 2024 won't affect your 2025 data.

## Summary

The system is working correctly! The workflow is:

1. ✅ **Create fiscal years** in dashboard (one-time setup)
2. ✅ **Select fiscal year** in opening balance import
3. ✅ **Import balances** for that specific year

You just need to create the missing years (2023, 2024) first, then you'll be able to select them in the opening balance import dropdown.
