# 🚀 Transaction Migration - Step-by-Step Execution Guide

**Estimated Time:** 30-45 minutes  
**Method:** Supabase Dashboard SQL Editor

---

## 📋 Pre-Flight Checklist

Before starting:
- [ ] Backup your database (Supabase Dashboard → Database → Backups)
- [ ] Ensure you have admin access to Supabase Dashboard
- [ ] Close any running transactions in your app (optional but recommended)
- [ ] Have this guide open alongside Supabase Dashboard

---

## 🎯 PHASE 1: Audit (5 minutes)

### What This Does:
Shows you the current state and what needs migration.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor** (left sidebar)
   - Click **New Query**

2. **Copy and Run This SQL:**

```sql
-- ============================================
-- PHASE 1: PRE-MIGRATION AUDIT
-- ============================================

-- 1. Count transactions in old table
SELECT 
  'Old Transactions Table' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected_count
FROM transactions;

-- 2. Count transactions in new table
SELECT 
  'New Transactions Table' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM transactions_with_pending_lines;

-- 3. Sample old transactions to migrate
SELECT 
  id,
  transaction_number,
  approval_status,
  created_at
FROM transactions
WHERE id NOT IN (
  SELECT old_transaction_id 
  FROM transactions_with_pending_lines 
  WHERE old_transaction_id IS NOT NULL
)
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check for data issues
SELECT 
  'Missing Required Fields' as issue_type,
  COUNT(*) as count
FROM transactions
WHERE transaction_number IS NULL 
   OR org_id IS NULL;
```

3. **Click "Run"**

4. **Review Results:**
   - ✅ Old transactions count should be > 0
   - ✅ New transactions count should be 0 or low
   - ✅ Data issues should be 0
   - ✅ Sample transactions should look valid

5. **Write down these numbers:**
   - Old transactions: ______
   - New transactions: ______
   - To migrate: ______

---

## 🏗️ PHASE 2: Infrastructure Setup (2 minutes)

### What This Does:
Creates backup tables and migration tracking.

### Steps:

1. **Click "New Query" in SQL Editor**

2. **Copy and Run This SQL:**

```sql
-- ============================================
-- PHASE 2: INFRASTRUCTURE SETUP
-- ============================================

-- Create backup table for old transactions
CREATE TABLE IF NOT EXISTS transactions_backup AS 
SELECT * FROM transactions;

-- Create migration log table
CREATE TABLE IF NOT EXISTS migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  action TEXT NOT NULL,
  records_affected INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log infrastructure setup
INSERT INTO migration_log (phase, action, records_affected, status)
VALUES ('infrastructure', 'backup_created', (SELECT COUNT(*) FROM transactions_backup), 'success');

-- Verify backup
SELECT 
  'Backup Verification' as check_type,
  (SELECT COUNT(*) FROM transactions) as original_count,
  (SELECT COUNT(*) FROM transactions_backup) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM transactions) = (SELECT COUNT(*) FROM transactions_backup)
    THEN '✅ Backup successful'
    ELSE '❌ Backup mismatch'
  END as status;
```

3. **Click "Run"**

4. **Verify Results:**
   - ✅ Should see "Backup successful"
   - ✅ Original count = Backup count

---

## ⚙️ PHASE 3: Deploy Migration Functions (3 minutes)

### What This Does:
Installs the migration logic that will move data safely.

### Steps:

1. **Click "New Query"**

2. **Copy and Run This SQL:**

```sql
-- ============================================
-- PHASE 3: MIGRATION FUNCTIONS
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS migrate_transaction_to_new_table(UUID);

-- Create migration function
CREATE OR REPLACE FUNCTION migrate_transaction_to_new_table(p_transaction_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_transaction_id UUID;
  v_old_transaction RECORD;
  v_line_item RECORD;
  v_new_line_id UUID;
BEGIN
  -- Get old transaction
  SELECT * INTO v_old_transaction
  FROM transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  -- Check if already migrated
  IF EXISTS (
    SELECT 1 FROM transactions_with_pending_lines 
    WHERE old_transaction_id = p_transaction_id
  ) THEN
    RAISE NOTICE 'Transaction % already migrated', p_transaction_id;
    RETURN NULL;
  END IF;

  -- Insert into new table
  INSERT INTO transactions_with_pending_lines (
    transaction_number,
    transaction_date,
    description,
    notes,
    status,
    org_id,
    created_by,
    created_at,
    updated_at,
    old_transaction_id
  )
  VALUES (
    v_old_transaction.transaction_number,
    v_old_transaction.transaction_date,
    v_old_transaction.description,
    v_old_transaction.notes,
    COALESCE(v_old_transaction.approval_status, 'pending'),
    v_old_transaction.org_id,
    v_old_transaction.created_by,
    v_old_transaction.created_at,
    v_old_transaction.updated_at,
    p_transaction_id
  )
  RETURNING id INTO v_new_transaction_id;

  -- Migrate line items
  FOR v_line_item IN
    SELECT * FROM transaction_line_items
    WHERE transaction_id = p_transaction_id
  LOOP
    INSERT INTO transaction_line_items (
      transaction_id,
      account_id,
      debit,
      credit,
      description,
      cost_center_id,
      project_id,
      analysis_id,
      approval_status,
      position,
      org_id,
      created_at,
      updated_at
    )
    VALUES (
      v_new_transaction_id,
      v_line_item.account_id,
      v_line_item.debit,
      v_line_item.credit,
      v_line_item.description,
      v_line_item.cost_center_id,
      v_line_item.project_id,
      v_line_item.analysis_id,
      COALESCE(v_line_item.approval_status, 'pending'),
      v_line_item.position,
      v_line_item.org_id,
      v_line_item.created_at,
      v_line_item.updated_at
    )
    RETURNING id INTO v_new_line_id;
  END LOOP;

  -- Log success
  INSERT INTO migration_log (phase, action, records_affected, status)
  VALUES ('migration', 'transaction_migrated', 1, 'success');

  RETURN v_new_transaction_id;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO migration_log (phase, action, status, error_message)
  VALUES ('migration', 'transaction_migration_failed', 'error', SQLERRM);
  RAISE;
END;
$$;

-- Verify function created
SELECT 
  'Function Deployment' as check_type,
  COUNT(*) as function_count,
  '✅ Migration function ready' as status
FROM pg_proc 
WHERE proname = 'migrate_transaction_to_new_table';
```

3. **Click "Run"**

4. **Verify Results:**
   - ✅ Should see "Migration function ready"
   - ✅ Function count = 1

---

## 🧪 PHASE 4: Test Migration (5 minutes)

### What This Does:
Migrates 10 transactions as a test before doing all of them.

### Steps:

1. **Click "New Query"**

2. **Copy and Run This SQL:**

```sql
-- ============================================
-- PHASE 4: TEST MIGRATION (10 transactions)
-- ============================================

DO $$
DECLARE
  v_transaction RECORD;
  v_count INTEGER := 0;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
BEGIN
  -- Migrate first 10 transactions
  FOR v_transaction IN
    SELECT id 
    FROM transactions
    WHERE id NOT IN (
      SELECT old_transaction_id 
      FROM transactions_with_pending_lines 
      WHERE old_transaction_id IS NOT NULL
    )
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    BEGIN
      PERFORM migrate_transaction_to_new_table(v_transaction.id);
      v_success := v_success + 1;
      v_count := v_count + 1;
      
      RAISE NOTICE 'Migrated transaction % (% of 10)', v_transaction.id, v_count;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'Failed to migrate transaction %: %', v_transaction.id, SQLERRM;
    END;
  END LOOP;

  -- Log test results
  INSERT INTO migration_log (phase, action, records_affected, status)
  VALUES ('test', 'test_migration_complete', v_success, 'success');

  RAISE NOTICE '✅ Test complete: % successful, % failed', v_success, v_failed;
END $$;

-- Verify test results
SELECT 
  'Test Migration Results' as check_type,
  COUNT(*) as migrated_count,
  '✅ Test successful' as status
FROM transactions_with_pending_lines
WHERE old_transaction_id IS NOT NULL;

-- Compare data integrity
SELECT 
  t.id as old_id,
  t.transaction_number as old_number,
  t.approval_status as old_status,
  tw.id as new_id,
  tw.transaction_number as new_number,
  tw.status as new_status,
  CASE 
    WHEN t.transaction_number = tw.transaction_number THEN '✅'
    ELSE '❌'
  END as data_match
FROM transactions t
JOIN transactions_with_pending_lines tw ON tw.old_transaction_id = t.id
LIMIT 10;
```

3. **Click "Run"**

4. **Review Results:**
   - ✅ Should see "10 successful, 0 failed"
   - ✅ Migrated count = 10
   - ✅ All data_match should show ✅

5. **If any failures:**
   - Note the error message
   - Don't proceed to Phase 5
   - Share the error with me

---

## 🚀 PHASE 5: Production Migration (10-30 minutes)

### What This Does:
Migrates ALL remaining transactions.

### ⚠️ IMPORTANT:
- Only proceed if Phase 4 was 100% successful
- This will take longer depending on transaction count
- Don't close the browser during migration

### Steps:

1. **Click "New Query"**

2. **Copy and Run This SQL:**

```sql
-- ============================================
-- PHASE 5: PRODUCTION MIGRATION (ALL)
-- ============================================

DO $$
DECLARE
  v_transaction RECORD;
  v_total INTEGER;
  v_count INTEGER := 0;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
  v_batch_size INTEGER := 50;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM transactions
  WHERE id NOT IN (
    SELECT old_transaction_id 
    FROM transactions_with_pending_lines 
    WHERE old_transaction_id IS NOT NULL
  );

  RAISE NOTICE 'Starting migration of % transactions...', v_total;

  -- Migrate all remaining transactions
  FOR v_transaction IN
    SELECT id 
    FROM transactions
    WHERE id NOT IN (
      SELECT old_transaction_id 
      FROM transactions_with_pending_lines 
      WHERE old_transaction_id IS NOT NULL
    )
    ORDER BY created_at ASC
  LOOP
    BEGIN
      PERFORM migrate_transaction_to_new_table(v_transaction.id);
      v_success := v_success + 1;
      v_count := v_count + 1;
      
      -- Progress update every 50 transactions
      IF v_count % v_batch_size = 0 THEN
        RAISE NOTICE 'Progress: % of % (%.1f%%)', 
          v_count, v_total, (v_count::FLOAT / v_total * 100);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'Failed transaction %: %', v_transaction.id, SQLERRM;
    END;
  END LOOP;

  -- Log final results
  INSERT INTO migration_log (phase, action, records_affected, status)
  VALUES ('production', 'full_migration_complete', v_success, 'success');

  RAISE NOTICE '✅ Migration complete: % successful, % failed out of % total', 
    v_success, v_failed, v_total;
END $$;
```

3. **Click "Run"**

4. **Wait for completion:**
   - You'll see progress updates every 50 transactions
   - Don't close the browser
   - This may take 10-30 minutes depending on data volume

5. **When complete, you'll see:**
   - "Migration complete: X successful, Y failed"

---

## ✅ PHASE 6: Final Validation (5 minutes)

### What This Does:
Verifies everything migrated correctly.

### Steps:

1. **Click "New Query"**

2. **Copy and Run This SQL:**

```sql
-- ============================================
-- PHASE 6: FINAL VALIDATION
-- ============================================

-- 1. Count comparison
SELECT 
  'Migration Summary' as report_type,
  (SELECT COUNT(*) FROM transactions) as old_table_count,
  (SELECT COUNT(*) FROM transactions_with_pending_lines) as new_table_count,
  (SELECT COUNT(*) FROM transactions_with_pending_lines WHERE old_transaction_id IS NOT NULL) as migrated_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM transactions) = 
         (SELECT COUNT(*) FROM transactions_with_pending_lines WHERE old_transaction_id IS NOT NULL)
    THEN '✅ All transactions migrated'
    ELSE '⚠️ Count mismatch - review needed'
  END as status;

-- 2. Line items validation
SELECT 
  'Line Items Validation' as report_type,
  COUNT(DISTINCT tli_old.transaction_id) as old_transactions_with_lines,
  COUNT(DISTINCT tli_new.transaction_id) as new_transactions_with_lines,
  CASE 
    WHEN COUNT(DISTINCT tli_old.transaction_id) <= COUNT(DISTINCT tli_new.transaction_id)
    THEN '✅ Line items migrated'
    ELSE '⚠️ Line items missing'
  END as status
FROM transaction_line_items tli_old
LEFT JOIN transactions_with_pending_lines tw ON tw.old_transaction_id = tli_old.transaction_id
LEFT JOIN transaction_line_items tli_new ON tli_new.transaction_id = tw.id;

-- 3. Status distribution
SELECT 
  'Status Distribution' as report_type,
  status,
  COUNT(*) as count
FROM transactions_with_pending_lines
GROUP BY status
ORDER BY count DESC;

-- 4. Sample data verification
SELECT 
  'Sample Verification' as report_type,
  t.transaction_number as old_number,
  tw.transaction_number as new_number,
  t.approval_status as old_status,
  tw.status as new_status,
  (SELECT COUNT(*) FROM transaction_line_items WHERE transaction_id = t.id) as old_lines,
  (SELECT COUNT(*) FROM transaction_line_items WHERE transaction_id = tw.id) as new_lines,
  CASE 
    WHEN t.transaction_number = tw.transaction_number 
     AND (SELECT COUNT(*) FROM transaction_line_items WHERE transaction_id = t.id) =
         (SELECT COUNT(*) FROM transaction_line_items WHERE transaction_id = tw.id)
    THEN '✅'
    ELSE '❌'
  END as validation
FROM transactions t
JOIN transactions_with_pending_lines tw ON tw.old_transaction_id = t.id
ORDER BY t.created_at DESC
LIMIT 20;

-- 5. Migration log summary
SELECT 
  phase,
  action,
  SUM(records_affected) as total_records,
  COUNT(*) as operations,
  status
FROM migration_log
GROUP BY phase, action, status
ORDER BY phase, action;
```

3. **Click "Run"**

4. **Review All Results:**

   **Table 1: Migration Summary**
   - ✅ Should show "All transactions migrated"
   - Old count = Migrated count

   **Table 2: Line Items Validation**
   - ✅ Should show "Line items migrated"

   **Table 3: Status Distribution**
   - Shows breakdown of approved/pending/rejected
   - Verify numbers look reasonable

   **Table 4: Sample Verification**
   - All rows should show ✅
   - Numbers should match
   - Line counts should match

   **Table 5: Migration Log**
   - Shows complete audit trail
   - All should show "success"

---

## 🎉 SUCCESS CRITERIA

Migration is complete when:

- ✅ All transactions migrated (old count = new count)
- ✅ All line items migrated
- ✅ Sample verification shows all ✅
- ✅ No errors in migration log
- ✅ Status distribution looks correct

---

## 🔄 If Something Goes Wrong

### Rollback Process:

```sql
-- EMERGENCY ROLLBACK
BEGIN;

-- Delete migrated data
DELETE FROM transaction_line_items 
WHERE transaction_id IN (
  SELECT id FROM transactions_with_pending_lines 
  WHERE old_transaction_id IS NOT NULL
);

DELETE FROM transactions_with_pending_lines 
WHERE old_transaction_id IS NOT NULL;

-- Verify rollback
SELECT 
  'Rollback Status' as check_type,
  (SELECT COUNT(*) FROM transactions_with_pending_lines WHERE old_transaction_id IS NOT NULL) as remaining_migrated,
  CASE 
    WHEN (SELECT COUNT(*) FROM transactions_with_pending_lines WHERE old_transaction_id IS NOT NULL) = 0
    THEN '✅ Rollback successful'
    ELSE '❌ Rollback incomplete'
  END as status;

COMMIT;
```

---

## 📞 Need Help?

If you encounter issues:
1. Don't panic - your data is backed up
2. Note the exact error message
3. Check which phase failed
4. Share the migration_log results
5. We can rollback and try again

---

## 🎯 Next Steps After Migration

Once migration is complete:

1. **Update your application code** to use `transactions_with_pending_lines`
2. **Test the UI** to ensure everything works
3. **Monitor for a few days** before removing old table
4. **Keep backup table** for at least 30 days

---

**Ready to start? Begin with Phase 1!** 🚀
