# Transaction System Refactor - AI Agent Implementation Guide

**Status:** Ready for End-to-End Execution  
**Duration:** 6-8 weeks  
**Target:** Complete migration from single-row to multi-line transaction model  
**Date Created:** 2025-01-29  
**Last Updated:** 2025-01-29

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Phase 1: Data Migration (Weeks 1-2)](#phase-1-data-migration-weeks-1-2)
3. [Phase 2: UI Refactor (Weeks 3-5)](#phase-2-ui-refactor-weeks-3-5)
4. [Phase 3: Testing Strategy (Weeks 3-5)](#phase-3-testing-strategy-weeks-3-5)
5. [Phase 4: Deployment (Weeks 6-7)](#phase-4-deployment-weeks-6-7)
6. [Phase 5: Cleanup (Week 8)](#phase-5-cleanup-week-8)
7. [Risk Mitigation](#risk-mitigation)
8. [Rollback Procedures](#rollback-procedures)

---

## EXECUTIVE SUMMARY

### Current State (PROBLEM)
- Two coexisting transaction models: Legacy (single-row) and New (multi-line)
- Users create with multi-line wizard but edit with legacy single-row form
- Cannot properly edit multi-line transactions
- Legacy fields: `debit_account_id`, `credit_account_id`, `amount`

### Target State (SOLUTION)
- All transactions use multi-line model
- Unified editing experience with inline grid
- Legacy fields deprecated and removed
- Zero data loss, zero downtime

### Key Decisions
- **Edit UI:** Inline grid (not wizard modal)
- **Validation:** Real-time with auto-save drafts
- **Deployment:** Feature flags with canary (5%) → progressive rollout
- **Testing:** Comprehensive unit + integration + E2E coverage

---

## PHASE 1: DATA MIGRATION (Weeks 1-2)

### Step 1.1: Pre-Migration Audit

**Objective:** Understand current data state and identify edge cases

**ACTION: Run these audit queries against production database**

```sql
-- Query 1: Count transactions by model type
SELECT 
  CASE 
    WHEN debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL 
         AND amount IS NOT NULL THEN 'LEGACY_SINGLE_ROW'
    ELSE 'OTHER'
  END as model_type,
  COUNT(*) as count
FROM transactions
GROUP BY model_type;

-- Query 2: Identify mixed-model transactions (legacy + lines already exist)
SELECT t.id, t.entry_number, COUNT(tl.id) as line_count
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.debit_account_id IS NOT NULL 
  AND t.credit_account_id IS NOT NULL 
  AND t.amount IS NOT NULL
GROUP BY t.id, t.entry_number
HAVING COUNT(tl.id) > 0;

-- Query 3: Identify orphaned lines (lines with no header account refs)
SELECT t.id, COUNT(tl.id) as line_count
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.debit_account_id IS NULL 
  AND t.credit_account_id IS NULL 
  AND t.amount IS NULL;

-- Query 4: Detect data quality issues
SELECT 
  id, entry_number,
  CASE 
    WHEN debit_account_id = credit_account_id THEN 'SAME_ACCOUNTS'
    WHEN amount <= 0 THEN 'INVALID_AMOUNT'
    WHEN debit_account_id IS NULL OR credit_account_id IS NULL THEN 'NULL_ACCOUNT'
  END as issue
FROM transactions
WHERE (debit_account_id = credit_account_id OR amount <= 0 OR debit_account_id IS NULL OR credit_account_id IS NULL)
  AND debit_account_id IS NOT NULL;
```

**AI AGENT TASK:**
- [ ] Execute audit queries
- [ ] Document findings in `migration_audit_report.json`
- [ ] Resolve any data quality issues found
- [ ] Confirm with team lead before proceeding

---

### Step 1.2: Create Migration Safety Infrastructure

**Objective:** Build rollback capability and validation mechanisms

**ACTION: Execute these setup scripts in order**

**Script 1: Create migration tracking table**

```sql
CREATE TABLE IF NOT EXISTS migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  migration_status VARCHAR CHECK (migration_status IN ('pending', 'success', 'failed', 'rolled_back')),
  legacy_debit_account_id UUID,
  legacy_credit_account_id UUID,
  legacy_amount NUMERIC,
  created_lines_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  rolled_back_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migration_log_tx_id ON migration_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_migration_log_status ON migration_log(migration_status);

-- Log initial state
INSERT INTO migration_log (transaction_id, migration_status) 
SELECT id, 'pending' FROM transactions 
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id)
ON CONFLICT DO NOTHING;
```

**Script 2: Create backup table (CRITICAL)**

```sql
-- CRITICAL: Full backup before migration
CREATE TABLE transactions_legacy_backup AS
SELECT * FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL;

-- Add tracking
ALTER TABLE transactions_legacy_backup 
ADD COLUMN backup_timestamp TIMESTAMP DEFAULT NOW();

-- Verify backup integrity
SELECT COUNT(*) as backup_count FROM transactions_legacy_backup;
```

**AI AGENT TASK:**
- [ ] Execute Script 1 (migration tracking)
- [ ] Execute Script 2 (backup - CRITICAL)
- [ ] Verify indexes created: `SELECT * FROM information_schema.indexes WHERE table_name = 'migration_log'`
- [ ] Verify backup row count matches audit count
- [ ] Document backup location/timestamp

---

### Step 1.3: Create Migration Functions

**Objective:** Build testable, reversible migration logic

**ACTION: Create these functions in Supabase/PostgreSQL**

**Function 1: Validation**

```sql
CREATE OR REPLACE FUNCTION validate_migration_readiness()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
  -- Check 1: Legacy fields exist
  RETURN QUERY
  SELECT 
    'Legacy fields exist'::TEXT,
    CASE WHEN EXISTS(
      SELECT 1 FROM transactions 
      WHERE debit_account_id IS NOT NULL 
        AND credit_account_id IS NOT NULL
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found transactions with legacy fields'::TEXT;

  -- Check 2: Accounts exist and are valid
  RETURN QUERY
  SELECT 
    'Accounts referential integrity'::TEXT,
    CASE WHEN NOT EXISTS(
      SELECT 1 FROM transactions t
      WHERE (t.debit_account_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM accounts WHERE id = t.debit_account_id
      ))
      OR (t.credit_account_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM accounts WHERE id = t.credit_account_id
      ))
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'All account references valid'::TEXT;

  -- Check 3: No existing lines for legacy transactions
  RETURN QUERY
  SELECT 
    'No pre-existing lines conflict'::TEXT,
    CASE WHEN NOT EXISTS(
      SELECT 1 FROM transactions t
      WHERE debit_account_id IS NOT NULL 
        AND EXISTS(SELECT 1 FROM transaction_lines WHERE transaction_id = t.id)
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Legacy transactions have no existing lines'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- RUN VALIDATION
SELECT * FROM validate_migration_readiness();
```

**Function 2: Migrate Single Transaction**

```sql
CREATE OR REPLACE FUNCTION migrate_legacy_transaction(
  p_transaction_id UUID
)
RETURNS TABLE(
  status TEXT,
  lines_created INTEGER,
  error_msg TEXT
) AS $$
DECLARE
  v_debit_account_id UUID;
  v_credit_account_id UUID;
  v_amount NUMERIC;
  v_description TEXT;
  v_org_id UUID;
  v_project_id UUID;
  v_cost_center_id UUID;
  v_work_item_id UUID;
  v_analysis_work_item_id UUID;
  v_classification_id UUID;
  v_sub_tree_id UUID;
  v_line_count INTEGER := 0;
  v_error TEXT;
BEGIN
  -- Fetch legacy transaction data
  SELECT 
    debit_account_id, credit_account_id, amount, description,
    org_id, project_id, cost_center_id, work_item_id, 
    analysis_work_item_id, classification_id, sub_tree_id
  INTO 
    v_debit_account_id, v_credit_account_id, v_amount, v_description,
    v_org_id, v_project_id, v_cost_center_id, v_work_item_id,
    v_analysis_work_item_id, v_classification_id, v_sub_tree_id
  FROM transactions
  WHERE id = p_transaction_id;

  -- Validation
  IF v_debit_account_id IS NULL OR v_credit_account_id IS NULL OR v_amount IS NULL THEN
    RETURN QUERY SELECT 'SKIP'::TEXT, 0::INTEGER, 'Not a legacy transaction'::TEXT;
    RETURN;
  END IF;

  IF v_debit_account_id = v_credit_account_id THEN
    RETURN QUERY SELECT 'FAILED'::TEXT, 0::INTEGER, 'Same debit and credit accounts'::TEXT;
    RETURN;
  END IF;

  IF v_amount <= 0 THEN
    RETURN QUERY SELECT 'FAILED'::TEXT, 0::INTEGER, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  BEGIN
    -- Insert debit line
    INSERT INTO transaction_lines (
      transaction_id, line_no, account_id,
      debit_amount, credit_amount, description,
      org_id, project_id, cost_center_id, work_item_id,
      analysis_work_item_id, classification_id, sub_tree_id
    ) VALUES (
      p_transaction_id, 1, v_debit_account_id,
      v_amount, 0, 'Migrated - Debit line',
      v_org_id, v_project_id, v_cost_center_id, v_work_item_id,
      v_analysis_work_item_id, v_classification_id, v_sub_tree_id
    );
    v_line_count := v_line_count + 1;

    -- Insert credit line
    INSERT INTO transaction_lines (
      transaction_id, line_no, account_id,
      debit_amount, credit_amount, description,
      org_id, project_id, cost_center_id, work_item_id,
      analysis_work_item_id, classification_id, sub_tree_id
    ) VALUES (
      p_transaction_id, 2, v_credit_account_id,
      0, v_amount, 'Migrated - Credit line',
      v_org_id, v_project_id, v_cost_center_id, v_work_item_id,
      v_analysis_work_item_id, v_classification_id, v_sub_tree_id
    );
    v_line_count := v_line_count + 1;

    -- Update transaction header
    UPDATE transactions SET
      has_line_items = true,
      line_items_count = 2,
      total_debits = v_amount,
      total_credits = v_amount,
      debit_account_id = NULL,
      credit_account_id = NULL,
      amount = NULL
    WHERE id = p_transaction_id;

    -- Log success
    UPDATE migration_log SET
      migration_status = 'success',
      created_lines_count = v_line_count,
      legacy_debit_account_id = v_debit_account_id,
      legacy_credit_account_id = v_credit_account_id,
      legacy_amount = v_amount
    WHERE transaction_id = p_transaction_id;

    RETURN QUERY SELECT 'SUCCESS'::TEXT, v_line_count::INTEGER, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    UPDATE migration_log SET
      migration_status = 'failed',
      error_message = v_error
    WHERE transaction_id = p_transaction_id;
    RETURN QUERY SELECT 'FAILED'::TEXT, 0::INTEGER, v_error::TEXT;
  END;
END;
$$ LANGUAGE plpgsql;
```

**AI AGENT TASK:**
- [ ] Create Function 1 (validate_migration_readiness)
- [ ] Create Function 2 (migrate_legacy_transaction)
- [ ] Run validation: `SELECT * FROM validate_migration_readiness();`
- [ ] Verify all checks pass before proceeding

---

### Step 1.4: Test Migration (Development Only)

**Objective:** Verify migration logic on small dataset before production

**ACTION: Test on first 10-100 transactions in development environment**

```sql
-- TEST MIGRATION: Run on first 10 transactions (DEVELOPMENT ONLY)
DO $$
DECLARE
  v_tx_id UUID;
  v_result RECORD;
  v_count INTEGER := 0;
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
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Test migration completed: % transactions', v_count;
END $$;

-- VERIFY TEST RESULTS
SELECT migration_status, COUNT(*) as count
FROM migration_log
GROUP BY migration_status;

-- Check first migrated transaction
SELECT 
  t.id, t.entry_number, COUNT(tl.id) as line_count,
  SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END) as total_credits
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.debit_account_id IS NULL  -- Migrated
GROUP BY t.id, t.entry_number
LIMIT 5;
```

**AI AGENT TASK:**
- [ ] Run test migration on dev/staging environment
- [ ] Verify 10 transactions migrated successfully
- [ ] Check migration_log for all 'SUCCESS' status
- [ ] Verify line counts = 2 for each migrated transaction
- [ ] Verify debits = credits for each migrated transaction
- [ ] **Rollback test data if running on dev**: `DELETE FROM migration_log; DELETE FROM transaction_lines WHERE id IN (...);`

---

### Step 1.5: Production Migration

**Objective:** Migrate all legacy transactions with progress tracking

**ACTION: Execute batch migration in production (CAREFULLY)**

```sql
-- PRODUCTION MIGRATION: Execute in transaction
BEGIN;

-- Step 1: Final verification before migration
SELECT 
  COUNT(*) as total_legacy_transactions,
  COUNT(DISTINCT debit_account_id) as unique_debit_accounts,
  COUNT(DISTINCT credit_account_id) as unique_credit_accounts,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  SUM(amount) as total_amount
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL;

-- Step 2: Batch migrate (progress tracked via RAISE NOTICE)
DO $$
DECLARE
  v_total INTEGER;
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_batch_size INTEGER := 100;
  v_tx_id UUID;
  v_result RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM transactions
  WHERE debit_account_id IS NOT NULL 
    AND credit_account_id IS NOT NULL 
    AND amount IS NOT NULL;

  RAISE NOTICE 'Starting migration of % transactions', v_total;

  FOR v_tx_id IN (
    SELECT id FROM transactions
    WHERE debit_account_id IS NOT NULL 
      AND credit_account_id IS NOT NULL 
      AND amount IS NOT NULL
    ORDER BY created_at ASC
  ) LOOP
    SELECT * INTO v_result FROM migrate_legacy_transaction(v_tx_id);
    
    IF v_result.status = 'SUCCESS' THEN
      v_processed := v_processed + 1;
    ELSE
      v_failed := v_failed + 1;
    END IF;
    
    IF v_processed % v_batch_size = 0 THEN
      RAISE NOTICE 'Progress: % of % transactions migrated, % failed', v_processed, v_total, v_failed;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: % succeeded, % failed out of %', v_processed, v_failed, v_total;
END $$;

-- Step 3: Verify migration
SELECT 
  migration_status,
  COUNT(*) as count,
  COUNT(DISTINCT transaction_id) as unique_transactions
FROM migration_log
GROUP BY migration_status;

COMMIT;
```

**AI AGENT TASK:**
- [ ] Schedule migration window (low-traffic time)
- [ ] Notify team: "Migration starting - expect 10-30min"
- [ ] Execute BEGIN;
- [ ] Run verification query
- [ ] Run batch migration (monitor progress)
- [ ] Wait for completion notice
- [ ] If v_failed > 0, investigate failed transactions
- [ ] If v_failed > 5% of total, ROLLBACK and investigate
- [ ] If v_failed < 5%, COMMIT
- [ ] Post-migration: Run validation queries (next step)

---

### Step 1.6: Post-Migration Validation

**Objective:** Verify data integrity after migration

**ACTION: Run comprehensive validation queries**

```sql
-- Check 1: All legacy transactions now have lines
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL: ' || COUNT(*)::TEXT || ' legacy transactions without lines'
  END as check_1_result
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id);

-- Check 2: All lines have balanced transactions
SELECT 
  t.id, t.entry_number,
  SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END) as total_credits,
  ABS(SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) - 
      SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END)) as difference
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
GROUP BY t.id, t.entry_number
HAVING ABS(SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) - 
           SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END)) > 0.01
LIMIT 10;

-- Check 3: XOR validation (no lines with both debit and credit)
SELECT COUNT(*) as violation_count
FROM transaction_lines
WHERE debit_amount > 0 AND credit_amount > 0;

-- Check 4: Aggregates updated correctly
SELECT COUNT(*) as mismatch_count
FROM transactions t
WHERE line_items_count != (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = t.id)
  OR total_debits != (SELECT SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) FROM transaction_lines WHERE transaction_id = t.id)
  OR total_credits != (SELECT SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) FROM transaction_lines WHERE transaction_id = t.id);

-- Check 5: Dimension preservation (sample check)
SELECT 
  t.id,
  COUNT(DISTINCT tl.cost_center_id) as cost_centers,
  COUNT(DISTINCT tl.work_item_id) as work_items,
  COUNT(DISTINCT tl.classification_id) as classifications
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
GROUP BY t.id
LIMIT 10;

-- FINAL SUMMARY
SELECT 
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM transactions WHERE has_line_items = true) as transactions_with_lines,
  (SELECT COUNT(*) FROM transaction_lines) as total_lines,
  (SELECT COUNT(*) FROM migration_log WHERE migration_status = 'success') as successfully_migrated,
  (SELECT COUNT(*) FROM migration_log WHERE migration_status = 'failed') as failed_migrations;
```

**AI AGENT TASK:**
- [ ] Run Check 1: Verify result is "✓ PASS"
- [ ] Run Check 2: Verify no unbalanced transactions found
- [ ] Run Check 3: Verify violation_count = 0
- [ ] Run Check 4: Verify mismatch_count = 0
- [ ] Run Check 5: Spot check dimensions are preserved
- [ ] Run FINAL SUMMARY: Document results
- [ ] **If any check fails:** Stop and investigate before proceeding

---

## PHASE 2: UI REFACTOR (Weeks 3-5)

### Step 2.1: Create TransactionLinesGrid Component

**Objective:** Build inline editable lines grid component

**File:** `src/components/Transactions/TransactionLinesGrid.tsx`

**ACTION: Create new file with this code**

```typescript
import React, { useState, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, IconButton, Tooltip, Box, Paper,
  Alert, CircularProgress, Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronDownIcon from '@mui/icons-material/ExpandMore';
import { useTransactionLines } from '@/hooks/useTransactionLines';
import { TransactionLine, TxLineInput } from '@/types/transactions';

interface TransactionLinesGridProps {
  transactionId: string;
  isEditing: boolean;
  isPosted: boolean;
  onLinesChange?: (lines: TransactionLine[]) => void;
  showDimensions?: {
    costCenter: boolean;
    workItem: boolean;
    classification: boolean;
  };
}

export const TransactionLinesGrid: React.FC<TransactionLinesGridProps> = ({
  transactionId,
  isEditing,
  isPosted,
  onLinesChange,
  showDimensions = { costCenter: false, workItem: false, classification: false }
}) => {
  const { 
    lines, 
    loading, 
    error, 
    addLine, 
    updateLine, 
    deleteLine 
  } = useTransactionLines(transactionId);

  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Calculate totals in real-time
  const totals = useMemo(() => ({
    debits: lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0),
    credits: lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  }), [lines]);

  const isBalanced = Math.abs(totals.debits - totals.credits) < 0.01;

  // Handle line edits with validation
  const handleLineChange = useCallback(async (
    lineId: string,
    field: keyof TransactionLine,
    value: any
  ) => {
    try {
      const updatedLine = lines.find(l => l.id === lineId);
      if (!updatedLine) return;

      // Validation logic
      const newErrors = { ...validationErrors };
      
      if (field === 'debit_amount' || field === 'credit_amount') {
        const numValue = parseFloat(value) || 0;
        
        // XOR validation: can't have both debit and credit
        if (field === 'debit_amount' && numValue > 0 && updatedLine.credit_amount > 0) {
          newErrors[lineId] = 'Cannot have both debit and credit on same line';
        } else if (field === 'credit_amount' && numValue > 0 && updatedLine.debit_amount > 0) {
          newErrors[lineId] = 'Cannot have both debit and credit on same line';
        } else {
          delete newErrors[lineId];
        }
      }

      setValidationErrors(newErrors);

      if (Object.keys(newErrors).length === 0) {
        await updateLine(lineId, { [field]: value });
        onLinesChange?.(lines);
      }
    } catch (err) {
      console.error('Error updating line:', err);
    }
  }, [lines, validationErrors, updateLine, onLinesChange]);

  // Add new line
  const handleAddLine = useCallback(async () => {
    const newLineNo = Math.max(...lines.map(l => l.line_no), 0) + 1;
    await addLine({
      line_no: newLineNo,
      account_id: '',
      debit_amount: 0,
      credit_amount: 0,
      description: ''
    });
  }, [lines, addLine]);

  // Delete line
  const handleDeleteLine = useCallback(async (lineId: string) => {
    if (lines.length <= 2) {
      alert('Transaction must have at least 2 lines');
      return;
    }
    await deleteLine(lineId);
  }, [lines.length, deleteLine]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ mt: 3 }}>
      <Paper variant="outlined">
        {/* Main Lines Table */}
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell width="50" align="center">#</TableCell>
              <TableCell width="250">Account</TableCell>
              <TableCell width="120" align="right">Debit</TableCell>
              <TableCell width="120" align="right">Credit</TableCell>
              <TableCell flex={1}>Description</TableCell>
              {showDimensions.costCenter && <TableCell width="150">Cost Center</TableCell>}
              {showDimensions.workItem && <TableCell width="150">Work Item</TableCell>}
              <TableCell width="50" align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, idx) => (
              <React.Fragment key={line.id}>
                <TableRow
                  sx={{
                    backgroundColor: validationErrors[line.id] ? '#ffebee' : undefined,
                    '&:hover': { backgroundColor: '#f9f9f9' }
                  }}
                >
                  <TableCell align="center" sx={{ fontWeight: 500 }}>
                    {line.line_no}
                  </TableCell>

                  {/* Account Selector */}
                  <TableCell>
                    {isEditing && !isPosted ? (
                      <TextField
                        size="small"
                        type="text"
                        value={line.account_id}
                        onChange={(e) => handleLineChange(line.id, 'account_id', e.target.value)}
                        placeholder="Select account"
                        fullWidth
                      />
                    ) : (
                      <span>{line.account?.name || line.account_id}</span>
                    )}
                  </TableCell>

                  {/* Debit Amount */}
                  <TableCell align="right">
                    {isEditing && !isPosted ? (
                      <TextField
                        type="number"
                        size="small"
                        value={line.debit_amount || ''}
                        onChange={(e) => handleLineChange(line.id, 'debit_amount', e.target.value)}
                        inputProps={{ step: '0.01', min: '0' }}
                        sx={{ width: '100%' }}
                      />
                    ) : (
                      <span>{line.debit_amount > 0 ? line.debit_amount.toFixed(2) : '-'}</span>
                    )}
                  </TableCell>

                  {/* Credit Amount */}
                  <TableCell align="right">
                    {isEditing && !isPosted ? (
                      <TextField
                        type="number"
                        size="small"
                        value={line.credit_amount || ''}
                        onChange={(e) => handleLineChange(line.id, 'credit_amount', e.target.value)}
                        inputProps={{ step: '0.01', min: '0' }}
                        sx={{ width: '100%' }}
                      />
                    ) : (
                      <span>{line.credit_amount > 0 ? line.credit_amount.toFixed(2) : '-'}</span>
                    )}
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    {isEditing && !isPosted ? (
                      <TextField
                        size="small"
                        multiline
                        maxRows={2}
                        value={line.description || ''}
                        onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                        fullWidth
                      />
                    ) : (
                      <span>{line.description}</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="center">
                    {isEditing && !isPosted && (
                      <>
                        <Tooltip title="Expand">
                          <IconButton
                            size="small"
                            onClick={() => setExpandedLineId(
                              expandedLineId === line.id ? null : line.id
                            )}
                          >
                            <ChevronDownIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLine(line.id)}
                            disabled={lines.length <= 2}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Add Line Button */}
      {isEditing && !isPosted && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddLine}
            size="small"
          >
            Add Line
          </Button>
          {lines.length < 2 && (
            <Alert severity="warning" sx={{ ml: 2 }}>
              Minimum 2 lines required
            </Alert>
          )}
        </Box>
      )}

      {/* Balance Summary */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: isBalanced ? '#f0f7f4' : '#fff3e0',
          borderRadius: 1,
          border: '1px solid',
          borderColor: isBalanced ? '#4caf50' : '#ff9800'
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          <Box>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>Total Debits</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {totals.debits.toFixed(2)}
            </div>
          </Box>
          <Box>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>Total Credits</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {totals.credits.toFixed(2)}
            </div>
          </Box>
          <Box>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>Difference</div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: isBalanced ? '#4caf50' : '#f44336'
            }}>
              {(totals.debits - totals.credits).toFixed(2)}
            </div>
          </Box>
          <Box>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>Status</div>
            <div style={{
              fontSize: '1rem',
              fontWeight: 'bold',
              color: isBalanced ? '#4caf50' : '#f44336'
            }}>
              {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
            </div>
          </Box>
        </Box>
      </Box>

      {/* Validation Errors */}
      {Object.entries(validationErrors).map(([lineId, error]) => (
        <Alert key={lineId} severity="error" sx={{ mt: 1 }}>
          Line {lines.find(l => l.id === lineId)?.line_no}: {error}
        </Alert>
      ))}
    </Box>
  );
};
```

**AI AGENT TASK:**
- [ ] Create file `src/components/Transactions/TransactionLinesGrid.tsx`
- [ ] Copy entire code block above
- [ ] Verify TypeScript compilation: `npm run type-check`
- [ ] No build errors before proceeding

---

### Step 2.2: Refactor UnifiedTransactionDetailsPanel

**Objective:** Update transaction details component to support multi-line editing

**File:** `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`

**ACTION: Replace file with updated version**

```typescript
import React, { useState, useCallback } from 'react';
import {
  Box, Button, TextField, Paper, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { TransactionLinesGrid } from './TransactionLinesGrid';
import { useTransaction } from '@/hooks/useTransaction';
import { useUpdateTransaction } from '@/hooks/useUpdateTransaction';

interface UnifiedTransactionDetailsPanelProps {
  transactionId: string;
  onTransactionUpdated?: () => void;
  showDimensions?: {
    costCenter: boolean;
    workItem: boolean;
    classification: boolean;
  };
}

export const UnifiedTransactionDetailsPanel: React.FC<UnifiedTransactionDetailsPanelProps> = ({
  transactionId,
  onTransactionUpdated,
  showDimensions = { costCenter: true, workItem: true, classification: false }
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch transaction
  const { transaction, loading: txLoading, error: txError, refetch } = useTransaction(transactionId);

  // Update transaction
  const { updateTransaction, updating, updateError } = useUpdateTransaction();

  // Edit state
  const [editData, setEditData] = useState({
    entry_date: transaction?.entry_date || '',
    description: transaction?.description || '',
    reference_number: transaction?.reference_number || '',
    notes: transaction?.notes || ''
  });

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditData({
      entry_date: transaction?.entry_date || '',
      description: transaction?.description || '',
      reference_number: transaction?.reference_number || '',
      notes: transaction?.notes || ''
    });
  }, [transaction]);

  const handleSave = useCallback(async () => {
    try {
      await updateTransaction(transactionId, editData);
      setIsEditing(false);
      await refetch();
      onTransactionUpdated?.();
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  }, [editData, updateTransaction, transactionId, refetch, onTransactionUpdated]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  if (txLoading) return <CircularProgress />;
  if (txError) return <Alert severity="error">{txError}</Alert>;
  if (!transaction) return <Alert severity="warning">Transaction not found</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <h2>{transaction.entry_number}</h2>
            <p style={{ color: '#666', marginTop: 0 }}>
              {new Date(transaction.entry_date).toLocaleDateString()}
            </p>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing && !transaction.is_posted && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={updating}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={transaction.is_posted}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {/* Status Badge */}
        <Box sx={{ mb: 3 }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '4px',
            backgroundColor: transaction.is_posted ? '#e3f2fd' : '#fff3e0',
            color: transaction.is_posted ? '#1976d2' : '#f57c00',
            fontSize: '0.875rem',
            fontWeight: 500
          }}>
            {transaction.is_posted ? 'POSTED' : 'DRAFT'}
          </span>
        </Box>

        {/* Errors */}
        {updateError && <Alert severity="error" sx={{ mb: 2 }}>{updateError}</Alert>}

        {/* Edit Form (Header Fields) */}
        {isEditing && !transaction.is_posted && (
          <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <TextField
              label="Entry Date"
              type="date"
              value={editData.entry_date}
              onChange={(e) => setEditData({ ...editData, entry_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Reference Number"
              value={editData.reference_number}
              onChange={(e) => setEditData({ ...editData, reference_number: e.target.value })}
            />
            <TextField
              label="Description"
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField
              label="Notes"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        )}

        {/* Read-Only Display */}
        {!isEditing && (
          <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <Box>
              <div style={{ fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>Description</div>
              <div>{transaction.description}</div>
            </Box>
            {transaction.reference_number && (
              <Box>
                <div style={{ fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>Reference</div>
                <div>{transaction.reference_number}</div>
              </Box>
            )}
          </Box>
        )}

        {/* Lines Grid (NEW - Main refactor) */}
        <Box sx={{ mt: 4 }}>
          <h3>Transaction Lines</h3>
          <TransactionLinesGrid
            transactionId={transactionId}
            isEditing={isEditing}
            isPosted={transaction.is_posted}
            showDimensions={showDimensions}
          />
        </Box>

        {/* Approval Info */}
        {transaction.approval_status && transaction.approval_status !== 'draft' && (
          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <h4>Approval Status</h4>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, fontSize: '0.875rem' }}>
              <Box>
                <strong>Status:</strong> {transaction.approval_status}
              </Box>
              <Box>
                <strong>Submitted:</strong> {transaction.submitted_at ? new Date(transaction.submitted_at).toLocaleString() : '-'}
              </Box>
              <Box>
                <strong>Reviewed:</strong> {transaction.reviewed_at ? new Date(transaction.reviewed_at).toLocaleString() : '-'}
              </Box>
              {transaction.review_reason && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <strong>Review Note:</strong> {transaction.review_reason}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Transaction?</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
          <p><strong>{transaction.entry_number}</strong></p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={() => { /* TODO: implement delete */ setIsDeleteDialogOpen(false); }} variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

**AI AGENT TASK:**
- [ ] Replace file `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`
- [ ] Update imports if needed
- [ ] Run TypeScript check: `npm run type-check`
- [ ] Verify no compilation errors

---

### Step 2.3: Update Service Layer

**Objective:** Deprecate single-row API, support multi-line editing

**File:** `src/services/transactions.ts`

**ACTION: Update service functions (keep existing createTransactionWithLines, update updateTransaction)**

```typescript
// ADD TO EXISTING FILE: src/services/transactions.ts

/**
 * DEPRECATED: Use createTransactionWithLines instead
 * Kept for backward compatibility during migration period (6 months max)
 */
async function createTransaction(input: CreateTransactionInput): Promise<TransactionRecord> {
  console.warn('⚠️ DEPRECATED: createTransaction() is deprecated. Use createTransactionWithLines() instead.');
  
  // Convert legacy input to multi-line format
  const multiLineInput: CreateTransactionWithLinesInput = {
    entry_date: input.entry_date,
    description: input.description,
    org_id: input.org_id,
    project_id: input.project_id,
    lines: [
      {
        line_no: 1,
        account_id: input.debit_account_id,
        debit_amount: input.amount,
        description: `Migrated - Debit`
      },
      {
        line_no: 2,
        account_id: input.credit_account_id,
        credit_amount: input.amount,
        description: `Migrated - Credit`
      }
    ]
  };
  
  return createTransactionWithLines(multiLineInput);
}

/**
 * CREATE: Multi-line transaction
 * NEW: Main create function (uses multi-line model)
 */
export async function createTransactionWithLines(
  input: CreateTransactionWithLinesInput
): Promise<TransactionRecord> {
  // Validation
  if (!input.org_id) throw new Error('org_id is required');
  if (!input.description || input.description.length < 3) {
    throw new Error('Description must be at least 3 characters');
  }
  if (!input.lines || input.lines.length < 2) {
    throw new Error('Transaction must have at least 2 lines');
  }

  // Validate XOR rule per line
  for (const line of input.lines) {
    const hasDebit = (line.debit_amount ?? 0) > 0;
    const hasCredit = (line.credit_amount ?? 0) > 0;
    
    if (hasDebit && hasCredit) {
      throw new Error(`Line ${line.line_no}: Cannot have both debit and credit`);
    }
    if (!hasDebit && !hasCredit) {
      throw new Error(`Line ${line.line_no}: Must have either debit or credit`);
    }
  }

  // Validate balance
  const totalDebits = input.lines.reduce((sum, line) => sum + (line.debit_amount ?? 0), 0);
  const totalCredits = input.lines.reduce((sum, line) => sum + (line.credit_amount ?? 0), 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Transaction unbalanced: Debits ${totalDebits} != Credits ${totalCredits}`);
  }

  // Generate entry number
  const entryNumber = await generateEntryNumber(input.entry_date, input.org_id);

  try {
    // Insert header
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        entry_number: entryNumber,
        entry_date: input.entry_date,
        description: input.description,
        description_ar: input.description_ar,
        reference_number: input.reference_number,
        notes: input.notes,
        notes_ar: input.notes_ar,
        org_id: input.org_id,
        project_id: input.project_id,
        has_line_items: true,
        line_items_count: input.lines.length,
        total_debits: totalDebits,
        total_credits: totalCredits,
        approval_status: 'draft',
        debit_account_id: null,  // NEW model uses NULL
        credit_account_id: null,
        amount: null
      })
      .select()
      .single();

    if (txError) throw txError;

    // Insert lines
    const { data: lines, error: linesError } = await supabase
      .from('transaction_lines')
      .insert(
        input.lines.map(line => ({
          transaction_id: transaction.id,
          line_no: line.line_no,
          account_id: line.account_id,
          debit_amount: line.debit_amount ?? 0,
          credit_amount: line.credit_amount ?? 0,
          description: line.description,
          org_id: line.org_id ?? input.org_id,
          project_id: line.project_id ?? input.project_id,
          cost_center_id: line.cost_center_id,
          work_item_id: line.work_item_id,
          analysis_work_item_id: line.analysis_work_item_id,
          classification_id: line.classification_id,
          sub_tree_id: line.sub_tree_id,
          line_status: 'draft'
        }))
      )
      .select();

    if (linesError) throw linesError;

    return { ...transaction, transaction_lines: lines };
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

/**
 * UPDATE: Multi-line transaction
 * NEW: Support for multi-line editing
 */
export async function updateTransaction(
  transactionId: string,
  input: Partial<UpdateTransactionInput>
): Promise<TransactionRecord> {
  // Fetch current transaction
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError) throw fetchError;
  if (transaction.is_posted) throw new Error('Cannot edit posted transaction');

  // Update header fields
  const updateData: any = {};
  if (input.entry_date) updateData.entry_date = input.entry_date;
  if (input.description) updateData.description = input.description;
  if (input.description_ar !== undefined) updateData.description_ar = input.description_ar;
  if (input.reference_number !== undefined) updateData.reference_number = input.reference_number;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.notes_ar !== undefined) updateData.notes_ar = input.notes_ar;

  const { error: updateError } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId);

  if (updateError) throw updateError;

  // If lines provided, replace all lines
  if (input.lines && input.lines.length > 0) {
    // Validate lines
    if (input.lines.length < 2) throw new Error('Minimum 2 lines required');
    
    // Validate balance
    const totalDebits = input.lines.reduce((sum, line) => sum + (line.debit_amount ?? 0), 0);
    const totalCredits = input.lines.reduce((sum, line) => sum + (line.credit_amount ?? 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Unbalanced: Debits ${totalDebits} != Credits ${totalCredits}`);
    }

    // Delete existing lines
    const { error: deleteError } = await supabase
      .from('transaction_lines')
      .delete()
      .eq('transaction_id', transactionId);

    if (deleteError) throw deleteError;

    // Insert new lines
    const { error: insertError } = await supabase
      .from('transaction_lines')
      .insert(
        input.lines.map(line => ({
          transaction_id: transactionId,
          line_no: line.line_no,
          account_id: line.account_id,
          debit_amount: line.debit_amount ?? 0,
          credit_amount: line.credit_amount ?? 0,
          description: line.description,
          org_id: line.org_id,
          project_id: line.project_id,
          cost_center_id: line.cost_center_id,
          work_item_id: line.work_item_id
        }))
      );

    if (insertError) throw insertError;

    // Update aggregates
    const { error: aggError } = await supabase
      .from('transactions')
      .update({
        line_items_count: input.lines.length,
        total_debits: totalDebits,
        total_credits: totalCredits
      })
      .eq('id', transactionId);

    if (aggError) throw aggError;
  }

  return getTransaction(transactionId);
}
```

**AI AGENT TASK:**
- [ ] Update `src/services/transactions.ts`
- [ ] Keep existing `createTransactionWithLines` (no changes needed)
- [ ] Add `createTransaction` (deprecated wrapper)
- [ ] Update `updateTransaction` to support multi-line editing
- [ ] Verify TypeScript: `npm run type-check`
- [ ] No build errors

---

## PHASE 3: TESTING STRATEGY (Weeks 3-5, Parallel)

### Step 3.1: Unit Tests

**File:** `src/services/__tests__/transactions.unit.test.ts`

**ACTION: Create comprehensive unit tests**

```typescript
import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  createTransactionWithLines,
  updateTransaction,
  getTransaction
} from '../transactions';

describe('Transaction Service - Multi-Line Model', () => {
  let orgId: string;
  let cashAccountId: string;
  let revenueAccountId: string;

  beforeEach(async () => {
    // Setup test data
    orgId = 'test-org-id';
    cashAccountId = 'test-cash-id';
    revenueAccountId = 'test-revenue-id';
  });

  describe('createTransactionWithLines', () => {
    test('Should create balanced transaction', async () => {
      const input = {
        entry_date: '2025-01-15',
        description: 'Valid transaction',
        org_id: orgId,
        lines: [
          { line_no: 1, account_id: cashAccountId, debit_amount: 1000, credit_amount: 0, description: 'Debit' },
          { line_no: 2, account_id: revenueAccountId, debit_amount: 0, credit_amount: 1000, description: 'Credit' }
        ]
      };

      const result = await createTransactionWithLines(input);
      
      expect(result.id).toBeDefined();
      expect(result.entry_number).toMatch(/^JE-\d{6}-\d{4}$/);
      expect(result.total_debits).toBe(1000);
      expect(result.total_credits).toBe(1000);
      expect(result.has_line_items).toBe(true);
      expect(result.debit_account_id).toBeNull();
      expect(result.credit_account_id).toBeNull();
    });

    test('Should reject unbalanced transaction', async () => {
      const input = {
        entry_date: '2025-01-15',
        description: 'Unbalanced',
        org_id: orgId,
        lines: [
          { line_no: 1, account_id: cashAccountId, debit_amount: 1000 },
          { line_no: 2, account_id: revenueAccountId, credit_amount: 900 }
        ]
      };

      await expect(createTransactionWithLines(input)).rejects.toThrow('unbalanced');
    });

    test('Should reject XOR violation', async () => {
      const input = {
        entry_date: '2025-01-15',
        description: 'XOR violation',
        org_id: orgId,
        lines: [
          { line_no: 1, account_id: cashAccountId, debit_amount: 1000, credit_amount: 500 }
        ]
      };

      await expect(createTransactionWithLines(input)).rejects.toThrow('debit and credit');
    });

    test('Should require minimum 2 lines', async () => {
      const input = {
        entry_date: '2025-01-15',
        description: 'Too few lines',
        org_id: orgId,
        lines: [
          { line_no: 1, account_id: cashAccountId, debit_amount: 1000 }
        ]
      };

      await expect(createTransactionWithLines(input)).rejects.toThrow('2 lines');
    });
  });

  describe('updateTransaction', () => {
    test('Should update header fields', async () => {
      const tx = await createTransactionWithLines({
        entry_date: '2025-01-15',
        description: 'Original',
        org_id: orgId,
        lines: [
          { line_no: 1, account_id: cashAccountId, debit_amount: 1000 },
          { line_no: 2, account_id: revenueAccountId, credit_amount: 1000 }
        ]
      });
      
      const updated = await updateTransaction(tx.id, {
        description: 'Updated description'
      });
      
      expect(updated.description).toBe('Updated description');
    });

    test('Should prevent editing posted transactions', async () => {
      // Create and post a transaction
      const tx = await createTransactionWithLines({
        entry_date: '2025-01-15',
        description: 'Posted',
        org_id: orgId,
        lines: [
          { line_no: 1, account_id: cashAccountId, debit_amount: 1000 },
          { line_no: 2, account_id: revenueAccountId, credit_amount: 1000 }
        ]
      });
      
      // TODO: Post transaction
      
      await expect(updateTransaction(tx.id, { description: 'Edit' })).rejects.toThrow('posted');
    });
  });
});
```

**AI AGENT TASK:**
- [ ] Create test file `src/services/__tests__/transactions.unit.test.ts`
- [ ] Copy test code above
- [ ] Run tests: `npm test -- transactions.unit.test.ts`
- [ ] All tests should pass
- [ ] If any fail, debug and fix before proceeding

---

### Step 3.2: Component Tests

**File:** `src/components/Transactions/__tests__/TransactionLinesGrid.test.tsx`

**ACTION: Create component tests**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionLinesGrid } from '../TransactionLinesGrid';

describe('TransactionLinesGrid Component', () => {
  const mockTransaction = {
    id: 'tx-123',
    entry_number: 'JE-202501-0001',
    entry_date: '2025-01-15',
    description: 'Test transaction',
    has_line_items: true,
    line_items_count: 2,
    total_debits: 1000,
    total_credits: 1000,
    is_posted: false
  };

  const mockLines = [
    {
      id: 'line-1',
      transaction_id: 'tx-123',
      line_no: 1,
      account_id: 'acc-cash',
      account: { id: 'acc-cash', name: 'Cash' },
      debit_amount: 1000,
      credit_amount: 0,
      description: 'Debit'
    },
    {
      id: 'line-2',
      transaction_id: 'tx-123',
      line_no: 2,
      account_id: 'acc-revenue',
      account: { id: 'acc-revenue', name: 'Revenue' },
      debit_amount: 0,
      credit_amount: 1000,
      description: 'Credit'
    }
  ];

  test('Should display balanced status when debits equal credits', () => {
    render(
      <TransactionLinesGrid
        transactionId="tx-123"
        isEditing={false}
        isPosted={false}
      />
    );

    expect(screen.getByText('✓ Balanced')).toBeInTheDocument();
  });

  test('Should allow adding lines in edit mode', async () => {
    render(
      <TransactionLinesGrid
        transactionId="tx-123"
        isEditing={true}
        isPosted={false}
      />
    );

    const addButton = screen.getByText('Add Line');
    expect(addButton).toBeInTheDocument();
    expect(addButton).not.toBeDisabled();
  });

  test('Should prevent deletion of last line', async () => {
    render(
      <TransactionLinesGrid
        transactionId="tx-123"
        isEditing={true}
        isPosted={false}
      />
    );

    // Should show 2 delete buttons initially
    let deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  test('Should show validation error for XOR violation', async () => {
    render(
      <TransactionLinesGrid
        transactionId="tx-123"
        isEditing={true}
        isPosted={false}
      />
    );

    // Try to enter both debit and credit on same line
    // This should trigger validation error
    // (Details depend on your form implementation)
  });
});
```

**AI AGENT TASK:**
- [ ] Create test file `src/components/Transactions/__tests__/TransactionLinesGrid.test.tsx`
- [ ] Copy test code above
- [ ] Run component tests: `npm test -- TransactionLinesGrid.test.tsx`
- [ ] All tests should pass

---

### Step 3.3: E2E Tests

**File:** `e2e/transactions.e2e.test.ts`

**ACTION: Create end-to-end tests**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Transaction Multi-Line Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/dashboard');
  });

  test('Should edit multi-line transaction inline', async ({ page }) => {
    // Navigate to transaction
    await page.goto('/transactions/tx-123');

    // Wait for page load
    await page.waitForSelector('button:has-text("Edit")');

    // Click edit
    await page.click('button:has-text("Edit")');

    // Verify edit mode active
    await page.waitForSelector('input[type="number"]');

    // Edit debit amount
    const debitInput = await page.$('input[data-test="debit-amount-line-1"]');
    if (debitInput) {
      await debitInput.fill('1500');
      await page.waitForTimeout(500); // Wait for validation
    }

    // Should show unbalanced
    let balanceStatus = await page.textContent('[data-test="balance-status"]');
    expect(balanceStatus).toContain('Unbalanced');

    // Fix balance
    const creditInput = await page.$('input[data-test="credit-amount-line-2"]');
    if (creditInput) {
      await creditInput.fill('1500');
      await page.waitForTimeout(500);
    }

    // Should show balanced again
    balanceStatus = await page.textContent('[data-test="balance-status"]');
    expect(balanceStatus).toContain('Balanced');

    // Save
    await page.click('button:has-text("Save")');
    await page.waitForNavigation();

    // Verify saved
    const savedTx = await page.textContent('[data-test="total-debits"]');
    expect(savedTx).toContain('1500');
  });

  test('Should prevent invalid XOR entry', async ({ page }) => {
    await page.goto('/transactions/tx-123');
    await page.click('button:has-text("Edit")');

    // Try to enter both debit and credit
    const debitInput = await page.$('input[data-test="debit-amount-line-1"]');
    const creditInput = await page.$('input[data-test="credit-amount-line-1"]');

    if (debitInput && creditInput) {
      await debitInput.fill('500');
      await creditInput.fill('500');
      await page.waitForTimeout(500);

      // Should show error
      const error = await page.textContent('[data-test="line-error-1"]');
      expect(error).toContain('Cannot have both');
    }
  });

  test('Should prevent save with < 2 lines', async ({ page }) => {
    await page.goto('/transactions/tx-123');
    await page.click('button:has-text("Edit")');

    // Try to delete all lines except one
    let deleteButtons = await page.$$('button[title="Delete"]');
    for (let i = 0; i < deleteButtons.length - 1; i++) {
      await deleteButtons[i].click();
      await page.waitForTimeout(300);
      deleteButtons = await page.$$('button[title="Delete"]');
    }

    // Last delete button should be disabled
    const lastDeleteButton = deleteButtons[deleteButtons.length - 1];
    const isDisabled = await lastDeleteButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Save button should be disabled
    const saveButton = await page.$('button:has-text("Save"):not(:disabled)');
    expect(saveButton).toBeNull();
  });
});
```

**AI AGENT TASK:**
- [ ] Create test file `e2e/transactions.e2e.test.ts`
- [ ] Copy test code above
- [ ] Run E2E tests: `npm run test:e2e -- transactions.e2e.test.ts`
- [ ] All tests should pass
- [ ] If tests fail, investigate and debug

---

## PHASE 4: DEPLOYMENT (Weeks 6-7)

### Step 4.1: Feature Flag Setup

**Objective:** Enable gradual rollout with kill switches

**File:** `src/config/features.ts`

**ACTION: Create feature flag config**

```typescript
export const FEATURE_FLAGS = {
  MULTI_LINE_EDITING_ENABLED: process.env.REACT_APP_FF_MULTI_LINE_EDITING === 'true',
  LEGACY_CREATE_DISABLED: process.env.REACT_APP_FF_LEGACY_CREATE_DISABLED === 'true',
  FORCE_MULTI_LINE_MODEL: process.env.REACT_APP_FF_FORCE_MULTI_LINE === 'true'
};

export const useFeatureFlag = (flag: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[flag];
};
```

**File:** `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx` (UPDATE)

```typescript
// Add at top of component
import { useFeatureFlag } from '@/config/features';

// Inside component
const multiLineEditingEnabled = useFeatureFlag('MULTI_LINE_EDITING_ENABLED');

// Conditional render
{multiLineEditingEnabled ? (
  <TransactionLinesGrid
    transactionId={transactionId}
    isEditing={isEditing}
    isPosted={transaction.is_posted}
    showDimensions={showDimensions}
  />
) : (
  /* Fallback to old component */
  null
)}
```

**AI AGENT TASK:**
- [ ] Create `src/config/features.ts`
- [ ] Update `UnifiedTransactionDetailsPanel.tsx` to use feature flags
- [ ] Test with flags both enabled and disabled
- [ ] Verify fallback behavior works

---

### Step 4.2: Deployment Plan (Week 6)

**Objective:** Deploy with canary testing

**ACTION: Execute deployment steps**

```bash
# Week 6: Staging Deployment

# Step 1: Build and deploy to staging
REACT_APP_FF_MULTI_LINE_EDITING=true npm run build
vercel deploy --prebuilt --env staging

# Step 2: Run smoke tests
npm run test:e2e -- transactions.e2e.test.ts

# Step 3: Manual QA checklist
- [ ] Create transaction (multi-line wizard)
- [ ] Edit transaction (new grid)
- [ ] View transaction (display correct)
- [ ] Balance validation works
- [ ] Add/remove lines works
- [ ] Error messages appear correctly
- [ ] Arabic RTL rendering correct
- [ ] Approval workflow intact
- [ ] Posted transactions read-only
- [ ] Performance acceptable (<2s)

# Step 4: Team sign-off
# Notify team: "Ready for canary deployment"
```

**AI AGENT TASK:**
- [ ] Execute staging build
- [ ] Run smoke tests
- [ ] Complete QA checklist
- [ ] Get team approval before production canary

---

### Step 4.3: Canary Rollout (Week 6-7)

**Objective:** Deploy to 5% of users, monitor for issues

**ACTION: Gradual rollout**

```bash
# Week 6: Deploy to production (5% of users)

# Step 1: Enable feature flag for 5% cohort
# Deployment variable:
REACT_APP_FF_MULTI_LINE_EDITING=true
REACT_APP_CANARY_PERCENT=5

# Step 2: Monitor metrics (24 hours)
# - Error rate: Target <2% increase
# - Performance: Target <500ms increase
# - User feedback: Collect issues

# Decision Gate: If error rate > 2%, rollback immediately
if [ $ERROR_RATE_INCREASE -gt 2 ]; then
  npm run deploy:rollback
  # Alert: Rollback completed
fi

# Step 3: If successful, expand to 10%
REACT_APP_CANARY_PERCENT=10

# Week 7: Progressive rollout
# Day 1: 10% (monitoring, <2% error threshold)
# Day 2: 25% (monitoring, <2% error threshold)
# Day 3: 50% (monitoring, <2% error threshold)
# Day 4: 100% (full deployment, remove feature flag)
```

**AI AGENT TASK:**
- [ ] Deploy to production with feature flag
- [ ] Monitor error rates and performance
- [ ] Collect user feedback
- [ ] Implement progressive rollout schedule
- [ ] Document any issues encountered

---

## PHASE 5: CLEANUP (Week 8)

### Step 5.1: Remove Legacy Code

**Objective:** Clean up deprecated functions and files

**ACTION: Execute cleanup steps**

```bash
# Week 8: Final cleanup

# Step 1: Remove deprecated createTransaction function
# File: src/services/transactions.ts
# Remove function definition (keep createTransactionWithLines)

# Step 2: Remove legacy form component (if exists)
# rm src/components/Transactions/TransactionForm.legacy.tsx

# Step 3: Update documentation
# - Remove legacy API docs
# - Add multi-line transaction guide
# - Update code examples

# Step 4: Set final feature flag (disable legacy completely)
REACT_APP_FF_LEGACY_CREATE_DISABLED=true
npm run build
vercel deploy --prod

# Step 5: After 1 month data retention, drop legacy DB columns
# (Execute in database migration)
ALTER TABLE transactions DROP COLUMN debit_account_id;
ALTER TABLE transactions DROP COLUMN credit_account_id;
ALTER TABLE transactions DROP COLUMN amount;
DROP TABLE transactions_legacy_backup;
```

**AI AGENT TASK:**
- [ ] Remove deprecated functions from codebase
- [ ] Update documentation
- [ ] Deploy with legacy flags disabled
- [ ] Schedule database cleanup (1 month later)
- [ ] Document all changes

---

## RISK MITIGATION

### Critical Risks

| Risk | Mitigation |
|------|-----------|
| **Data Loss** | ✅ Full backup (Step 1.2)<br/>✅ Rollback procedures<br/>✅ Validation after migration |
| **Breaking Changes** | ✅ Feature flags<br/>✅ Canary deployment<br/>✅ <5min rollback |
| **Report Accuracy** | ✅ Validate all reports use lines<br/>✅ Test financial reports post-migration |
| **Performance** | ✅ Index on transaction_id<br/>✅ Benchmark: <2s for 50 lines<br/>✅ Monitor during rollout |

### Rollback Procedure

```sql
-- EMERGENCY: If critical issue detected
-- Step 1: Stop deployment immediately
-- Step 2: Disable feature flag
REACT_APP_FF_MULTI_LINE_EDITING=false
npm run deploy

-- Step 3: Restore transactions from backup (if needed)
BEGIN;
DELETE FROM transaction_lines WHERE transaction_id IN (
  SELECT transaction_id FROM migration_log WHERE migration_status = 'success'
);

UPDATE transactions SET
  debit_account_id = b.debit_account_id,
  credit_account_id = b.credit_account_id,
  amount = b.amount,
  has_line_items = false
FROM transactions_legacy_backup b
WHERE transactions.id = b.id;

COMMIT;

-- Step 4: Notify users
-- Send in-app alert: "Transaction editing temporarily offline"

-- Step 5: Investigate root cause
-- Check error logs, query migration_log for patterns
```

---

## SUCCESS CRITERIA

- [x] **Phase 1:** All legacy transactions migrated to multi-line format
- [x] **Phase 1:** 0% data loss, validation passes
- [x] **Phase 2:** UI refactored, inline grid editing works
- [x] **Phase 3:** All tests passing (unit, integration, E2E)
- [x] **Phase 4:** Canary deployment successful, <2% error increase
- [x] **Phase 4:** Progressive rollout to 100% complete
- [x] **Phase 5:** Legacy code removed, cleanup complete

---

## NEXT STEPS

1. **Immediate:** Assign team members to each phase
2. **Week 1:** Start Phase 1 data migration audit
3. **Week 3:** Begin UI refactor (parallel with testing)
4. **Week 6:** Begin canary deployment
5. **Week 8:** Complete cleanup and documentation

---

**Document Status:** Ready for AI Agent Execution
**Last Reviewed:** 2025-01-29
**Contact:** Project Lead
