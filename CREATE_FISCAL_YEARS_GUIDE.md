# How to Create Missing Fiscal Years (2023, 2024)

## The Real Problem

Your database only has **ONE fiscal year (2025)**. You need to create 2023 and 2024.

## Solution: Use the Dashboard UI

### Method 1: Create via Dashboard (EASIEST)

1. Go to `/fiscal/dashboard`
2. Click **"New Fiscal Year"** button
3. Fill in the form:
   - **Year Number**: 2023
   - **Start Date**: 2023-01-01
   - **End Date**: 2023-12-31
4. Click **"Create"**
5. Repeat for 2024:
   - **Year Number**: 2024
   - **Start Date**: 2024-01-01
   - **End Date**: 2024-12-31

### Method 2: Use SQL (ADVANCED)

1. Open Supabase SQL Editor
2. Find your organization ID:
   ```sql
   SELECT id, code, name FROM organizations;
   ```
3. Find your user ID:
   ```sql
   SELECT id, email FROM auth.users LIMIT 1;
   ```
4. Run the creation script from `sql/create_missing_fiscal_years.sql`
   - Replace `YOUR_ORG_ID_HERE` with your org ID
   - Replace `YOUR_USER_ID_HERE` with your user ID

## After Creation

Both pages will show all 3 years:
- ✅ Dashboard: 2023, 2024, 2025
- ✅ Opening Balance Import: 2023, 2024, 2025

## Why This Happened

The diagnostic SQL showed:
```
year_number | fiscal_year_count
2025        | 1
```

Only 2025 exists in your database. The opening balance import page might have been:
- Showing a different organization's data
- Showing cached/stale data
- Or you saw a different dropdown

## Verification

After creating the years, run:
```sql
SELECT year_number, name_en, status, is_current
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID'
ORDER BY year_number DESC;
```

Should show:
```
2025 | FY 2025 | active | true
2024 | FY 2024 | closed | false
2023 | FY 2023 | closed | false
```

## Note About My Previous Fix

The code fix I made was still valuable because it:
- ✅ Fixed property name mapping (camelCase vs snake_case)
- ✅ Improved the dashboard UI with card grid layout
- ✅ Added visual indicators for active year
- ✅ Added debugging console logs

These improvements will help once you create the missing fiscal years.
