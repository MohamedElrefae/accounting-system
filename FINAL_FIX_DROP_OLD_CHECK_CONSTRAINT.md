# FINAL FIX - Drop Old Check Constraint

## The Real Problem Found!

The `sub_tree` table has an old check constraint named `expenses_categories_code_numeric_chk` that only allows **numeric codes**!

This is why creation was failing - the code `VERIFY_001` is alphanumeric, not purely numeric.

## The Fix (2 minutes)

**File:** `sql/fix_old_check_constraint.sql`

1. Go to **Supabase Dashboard → SQL Editor**
2. Click **"New Query"**
3. Copy ALL content from: **`sql/fix_old_check_constraint.sql`**
4. Paste into SQL Editor
5. Click **"Run"**

**What it does:**
- Drops the old check constraint `expenses_categories_code_numeric_chk`
- Tests sub_tree creation with alphanumeric code
- Verifies everything works

## Expected Result

```
✅ Old check constraint dropped
✅ Sub tree creation works with alphanumeric code!
✅ All constraints fixed - Sub Tree is ready to use!
```

## Then Test in UI (3 minutes)

1. Clear browser cache (`Ctrl+Shift+Delete`)
2. Go to MainData > SubTree
3. Click "New / جديد"
4. Create a test category:
   - Code: `001` (or any code)
   - Description: `Test Category`
5. Click "Save"
6. Should work! ✅

## Why This Was the Issue

The old `expenses_categories` table had a constraint that only allowed numeric codes. When the table was renamed to `sub_tree`, the constraint wasn't updated or removed. It was still enforcing the old rule.

## Total Time

- Fix: 2 minutes
- Test: 3 minutes
- **Total: ~5 minutes**

## Do This Now

1. Run `sql/fix_old_check_constraint.sql` in Supabase
2. Confirm all checks pass
3. Clear cache and test in UI
4. Done! 🎉

