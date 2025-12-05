# Transaction Migration - Execution Guide

**Status:** Ready for Execution  
**Date:** January 29, 2025  
**Phase:** Phase 1 - Data Migration

---

## 📋 PRE-EXECUTION CHECKLIST

Before running any migration scripts, verify:

- [ ] Database backup completed
- [ ] Team notified of migration window
- [ ] Low-traffic time scheduled
- [ ] Rollback procedure reviewed
- [ ] All migration files created:
  - [ ] `migration_audit_queries.sql`
  - [ ] `supabase/migrations/20250129_migration_infrastructure.sql`
  - [ ] `supabase/migrations/20250129_migration_functions.sql`
  - [ ] `migration_validation_queries.sql`

---

## 🚀 EXECUTION STEPS

### Step 1: Run Pre-Migration Audit

**Purpose:** Understand current data state

```bash
# Execute audit queries
psql -f migration_audit_queries.sql > audit_report.txt

# Review the output
cat audit_report.txt
```

**Expected Output:**
- Count of legacy vs multi-line transactions
- Any data quality issues
- Total transactions needing migration

**Decision Point:** If data quality issues found, fix them before proceeding.

---

### Step 2: Deploy Migration Infrastructure

**Purpose:** Create tracking tables and backup

```bash
# Deploy to Supabase
supabase db push

# Or execute directly
psql -f supabase/migrations/20250129_migration_infrastructure.sql
```

**Verify:**
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('migration_log', 'transactions_legacy_backup');

-- Check backup row count
SELECT COUNT(*) FROM transactions_legacy_backup;

-- Check migration log initialized
SELECT migration_status, COUNT(*) FROM migration_log GROUP BY migration_status;
```

**Expected:** 
- `migration_log` table exists with 'pending' entries
- `transactions_legacy_backup` table exists with backup data

---

### Step 3: Deploy Migration Functions

**Purpose:** Create migration logic

```bash
# Deploy functions
psql -f supabase/migrations/20250129_migration_functions.sql
```

**Verify:**
```sql
-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
  'validate_migration_readiness',
  'migrate_legacy_transaction',
  'migrate_all_legacy_transactions'
);
```

---

### Step 4: Run Validation

**Purpose:** Verify system is ready

```sql
-- Run validation
SELECT * FROM validate_migration_readiness();
```

**Expected Output:**
```
check_name                          | status | details
------------------------------------|--------|------------------
Legacy fields exist                 | PASS   | X transactions...
Accounts referential integrity      | PASS   | All account...
No pre-existing lines conflict      | PASS   | 0 legacy...
Backup table exists                 | PASS   | Backup table...
Migration log ready                 | PASS   | X transactions...
```

**Decision Point:** All checks must be PASS before proceeding. If any FAIL, investigate and fix.

---

### Step 5: Test Migration (Development/Staging Only)

**Purpose:** Test on small dataset first

```sql
-- Test on first 10 transactions
DO $$
DECLARE
  v_tx_id UUID;
  v_result RECORD;
BEGIN
  FOR v_tx_id IN (
    SELECT id FROM transactions
    WHERE debit_account_id IS NOT NULL 
      AND credit_account_id IS NOT NULL 
      AND amount IS NOT NULL
    LIMIT 10
  ) LOOP
    SELECT * INTO v_result FROM migrate_legacy_transaction(v_tx_id);
    RAISE NOTICE 'TX %: Status %, Lines %', v_tx_id, v_result.status, v_result.lines_created;
  END LOOP;
END $$;

-- Check results
SELECT migration_status, COUNT(*) FROM migration_log GROUP BY migration_status;

-- Verify first migrated transaction
SELECT 
  t.id, t.entry_number, 
  t.has_line_items, t.line_items_count,
  t.total_debits, t.total_credits,
  COUNT(tl.id) as actual_line_count
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.debit_account_id IS NULL  -- Migrated
GROUP BY t.id, t.entry_number, t.has_line_items, t.line_items_count, t.total_debits, t.total_credits
LIMIT 5;
```

**Expected:** All 10 transactions show 'success' status with 2 lines each.

---

### Step 6: Production Migration

**⚠️ CRITICAL: Only execute in production after successful testing**

```sql
-- PRODUCTION MIGRATION
BEGIN;

-- Step 1: Final count
SELECT 
  COUNT(*) as total_to_migrate,
  SUM(amount) as total_amount
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id);

-- Step 2: Execute migration
SELECT * FROM migrate_all_legacy_transactions(100);

-- Step 3: Check results
SELECT * FROM v_migration_status;

-- Step 4: If success rate > 95%, COMMIT. Otherwise, ROLLBACK.
-- Review failed migrations:
SELECT 
  ml.transaction_id,
  t.entry_number,
  ml.error_message
FROM migration_log ml
INNER JOIN transactions t ON ml.transaction_id = t.id
WHERE ml.migration_status = 'failed'
LIMIT 10;

-- Decision: COMMIT or ROLLBACK
COMMIT;  -- Only if satisfied with results
-- ROLLBACK;  -- If issues found
```

---

### Step 7: Post-Migration Validation

**Purpose:** Verify data integrity

```bash
# Run all validation queries
psql -f migration_validation_queries.sql > validation_report.txt

# Review results
cat validation_report.txt
```

**Expected Results:**
- ✓ Check 1: PASS - All legacy transactions migrated
- ✓ Check 2: No unbalanced transactions
- ✓ Check 3: PASS - No XOR violations
- ✓ Check 4: PASS - All aggregates correct
- ✓ Check 6: 95%+ success rate
- ✓ Check 9: Total amounts match

**Decision Point:** If any check fails, investigate immediately.

---

## 🔄 ROLLBACK PROCEDURE

If critical issues detected:

```sql
-- EMERGENCY ROLLBACK
BEGIN;

-- Step 1: Delete migrated lines
DELETE FROM transaction_lines 
WHERE transaction_id IN (
  SELECT transaction_id FROM migration_log 
  WHERE migration_status = 'success'
);

-- Step 2: Restore legacy fields from backup
UPDATE transactions t SET
  debit_account_id = b.debit_account_id,
  credit_account_id = b.credit_account_id,
  amount = b.amount,
  has_line_items = false,
  line_items_count = NULL,
  total_debits = NULL,
  total_credits = NULL
FROM transactions_legacy_backup b
WHERE t.id = b.id;

-- Step 3: Mark as rolled back
UPDATE migration_log SET
  migration_status = 'rolled_back',
  rolled_back_at = NOW()
WHERE migration_status = 'success';

-- Step 4: Verify rollback
SELECT 
  COUNT(*) as restored_count,
  SUM(amount) as restored_amount
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL;

COMMIT;
```

---

## 📊 SUCCESS CRITERIA

Migration is successful when:

1. ✅ All validation checks pass
2. ✅ Success rate ≥ 95%
3. ✅ No unbalanced transactions
4. ✅ Total amounts match backup
5. ✅ No XOR violations
6. ✅ All aggregates correct
7. ✅ Failed migrations < 5% and documented

---

## 📝 POST-MIGRATION TASKS

After successful migration:

1. [ ] Document migration results
2. [ ] Archive migration logs
3. [ ] Notify team of completion
4. [ ] Update status in project tracker
5. [ ] Proceed to Phase 2 (UI Refactor)

---

## 🆘 TROUBLESHOOTING

### Issue: High failure rate (>5%)

**Solution:**
1. Review error messages in migration_log
2. Identify common patterns
3. Fix data quality issues
4. Rollback and retry

### Issue: Unbalanced transactions

**Solution:**
1. Query specific unbalanced transactions
2. Check source data in backup
3. Manually fix if needed
4. Re-run migration for those transactions

### Issue: Performance slow

**Solution:**
1. Reduce batch size
2. Run during low-traffic hours
3. Add indexes if needed
4. Consider parallel execution

---

**Document Status:** Ready for Execution  
**Next Phase:** Phase 2 - UI Refactor  
**Contact:** Database Administrator / Team Lead
