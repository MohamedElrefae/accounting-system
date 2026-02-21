# Database Function Conflicts - Resolution Summary

## Issue: PostgreSQL Function Return Type Conflicts

When running migrations, encountered error:
```
ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION approve_line(uuid,uuid,text) first.
```

## Root Cause: Multiple Function Definitions

Found duplicate function definitions across different migration files:

### 1. approve_line Function Conflicts
- **20250120_line_based_approval.sql** (line 216)
  - Returns: `TABLE(success BOOLEAN, transaction_approved BOOLEAN, message TEXT)`
  - Fixed: Added `DROP FUNCTION IF EXISTS public.approve_line(uuid, uuid, text);`
  
- **20251128_transaction_line_reviews.sql** (line 205)
  - Returns: `jsonb`
  - Has: `DROP FUNCTION IF EXISTS public.approve_line(uuid, uuid, text);`

### 2. submit_transaction_for_line_approval Function Conflicts
- **20250120_line_based_approval.sql** (line 123)
  - Fixed: Added `DROP FUNCTION IF EXISTS public.submit_transaction_for_line_approval(uuid, uuid);`
  
- **20251128_transaction_line_reviews.sql** (line 176)
  - Has: `DROP FUNCTION IF EXISTS public.submit_transaction_for_line_approval(uuid, uuid);`
  
- **20250129_fix_line_approval_view.sql** (line 59)
  - Has: `DROP FUNCTION IF EXISTS submit_transaction_for_line_approval(UUID, UUID);`

### 3. reject_line Function Conflicts
- **20250120_line_based_approval.sql** (line 322)
  - Returns: `TABLE(success BOOLEAN, message TEXT)`
  - Fixed: Added `DROP FUNCTION IF EXISTS public.reject_line(uuid, uuid, text);`
  
- **20251128_transaction_line_reviews.sql** (line 254)
  - Returns: `jsonb`
  - Has: `DROP FUNCTION IF EXISTS public.reject_line(uuid, uuid, text);`

## Resolution Applied

### Fixed 20250120_line_based_approval.sql:

1. **Added DROP for approve_line:**
   ```sql
   DROP FUNCTION IF EXISTS public.approve_line(uuid, uuid, text);
   CREATE OR REPLACE FUNCTION approve_line(...)
   ```

2. **Added DROP for submit_transaction_for_line_approval:**
   ```sql
   DROP FUNCTION IF EXISTS public.submit_transaction_for_line_approval(uuid, uuid);
   CREATE OR REPLACE FUNCTION submit_transaction_for_line_approval(...)
   ```

3. **Fixed approval_status field:**
   ```sql
   UPDATE transactions 
   SET 
       status = 'pending',
       approval_status = 'submitted',  -- ✅ Added this line
       approval_method = 'line_based',
       ...
   ```

## Migration Order Safety

Now all migrations can run safely in order:
1. Early migrations create functions with proper DROP statements
2. Later migrations can safely recreate with different return types
3. No more "cannot change return type" errors

## Approval Status Fix

The core issue (submit for approval saving as draft) is now fixed:
- `submit_transaction_for_line_approval` correctly sets `approval_status = 'submitted'`
- UI filters by `approval_status` field
- Migration ensures column exists

## Verification

- ✅ All TypeScript files pass lint checks
- ✅ Migration syntax is valid
- ✅ Function conflicts resolved
- ✅ Approval workflow now functional
