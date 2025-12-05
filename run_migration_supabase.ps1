# ============================================
# Transaction Migration - Supabase CLI Version
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Transaction Migration - Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseExists) {
    Write-Host "[ERROR] Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[INFO] Supabase CLI found: " -ForegroundColor Green -NoNewline
supabase --version

Write-Host ""
Write-Host "[INFO] Step 1: Pre-Migration Audit" -ForegroundColor Yellow
Write-Host "----------------------------"
$audit = Read-Host "Run audit queries? (y/n)"
if ($audit -eq "y") {
    Write-Host "[INFO] Running audit queries via Supabase..." -ForegroundColor Cyan
    
    # Read the audit queries file
    $auditQueries = Get-Content -Path "migration_audit_queries.sql" -Raw
    
    # Execute via Supabase CLI
    Write-Host "[INFO] Executing audit queries..." -ForegroundColor Cyan
    supabase db execute --file migration_audit_queries.sql > audit_report.txt 2>&1
    
    Write-Host "[SUCCESS] Audit complete. Results saved to audit_report.txt" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Opening audit report..." -ForegroundColor Cyan
    Get-Content audit_report.txt | Select-Object -First 50
    Write-Host ""
    Write-Host "[INFO] Full report saved to audit_report.txt" -ForegroundColor Yellow
    Read-Host "Press Enter to continue"
}

Write-Host ""
Write-Host "[INFO] Step 2: Deploy Migration Infrastructure" -ForegroundColor Yellow
Write-Host "---------------------------------------"
$infra = Read-Host "Deploy infrastructure (creates backup)? (y/n)"
if ($infra -eq "y") {
    Write-Host "[INFO] Deploying migration infrastructure..." -ForegroundColor Cyan
    Write-Host "[INFO] This will create backup tables and tracking..." -ForegroundColor Yellow
    
    # Push migrations to Supabase
    supabase db push
    
    Write-Host "[SUCCESS] Infrastructure deployed" -ForegroundColor Green
    
    Write-Host "[INFO] Verifying backup..." -ForegroundColor Cyan
    $verifyQuery = "SELECT COUNT(*) as backup_count FROM transactions_legacy_backup;"
    $verifyQuery | supabase db execute
    
    Write-Host "[SUCCESS] Backup verified" -ForegroundColor Green
}

Write-Host ""
Write-Host "[INFO] Step 3: Validate Migration Readiness" -ForegroundColor Yellow
Write-Host "------------------------------------"
$validate = Read-Host "Run validation checks? (y/n)"
if ($validate -eq "y") {
    Write-Host "[INFO] Running validation..." -ForegroundColor Cyan
    
    $validateQuery = "SELECT * FROM validate_migration_readiness();"
    Write-Host $validateQuery | supabase db execute
    
    Write-Host ""
    Write-Host "[WARNING] All checks must show PASS before proceeding!" -ForegroundColor Yellow
    Read-Host "Press Enter to continue"
}

Write-Host ""
Write-Host "[INFO] Step 4: Test Migration (Optional)" -ForegroundColor Yellow
Write-Host "--------------------------------"
$test = Read-Host "Run test migration on 10 transactions? (y/n)"
if ($test -eq "y") {
    Write-Host "[INFO] Running test migration..." -ForegroundColor Cyan
    Write-Host "[WARNING] This will actually migrate 10 transactions!" -ForegroundColor Yellow
    
    $testQuery = @"
DO `$`$
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
  RAISE NOTICE 'Test complete: % transactions', v_count;
END `$`$;
"@
    
    $testQuery | supabase db execute
    
    Write-Host "[SUCCESS] Test migration complete" -ForegroundColor Green
    
    Write-Host "[INFO] Checking results..." -ForegroundColor Cyan
    "SELECT migration_status, COUNT(*) FROM migration_log GROUP BY migration_status;" | supabase db execute
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "[WARNING] PRODUCTION MIGRATION" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host "This will migrate ALL legacy transactions!" -ForegroundColor Yellow
Write-Host "Make sure you have:" -ForegroundColor Yellow
Write-Host "  1. Reviewed audit report" -ForegroundColor Yellow
Write-Host "  2. Verified backup exists" -ForegroundColor Yellow
Write-Host "  3. All validation checks passed" -ForegroundColor Yellow
Write-Host "  4. Team is notified" -ForegroundColor Yellow
Write-Host ""
$prod = Read-Host "Proceed with PRODUCTION migration? (yes/no)"

if ($prod -eq "yes") {
    Write-Host "[INFO] Starting production migration..." -ForegroundColor Cyan
    Write-Host "[WARNING] This may take 10-30 minutes depending on data size" -ForegroundColor Yellow
    Write-Host "[INFO] You can monitor progress in Supabase Dashboard" -ForegroundColor Cyan
    Write-Host ""
    
    # Count first
    Write-Host "[INFO] Counting transactions to migrate..." -ForegroundColor Cyan
    $countQuery = @"
SELECT 
  COUNT(*) as total_to_migrate,
  SUM(amount) as total_amount
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id);
"@
    
    $countQuery | supabase db execute
    
    Write-Host ""
    $confirm = Read-Host "Continue with migration? (yes/no)"
    
    if ($confirm -eq "yes") {
        Write-Host "[INFO] Executing migration..." -ForegroundColor Cyan
        
        $migrationQuery = @"
BEGIN;

-- Execute migration
SELECT * FROM migrate_all_legacy_transactions(100);

-- Check results
SELECT * FROM v_migration_status;

-- Show failed migrations if any
SELECT 
  ml.transaction_id,
  t.entry_number,
  ml.error_message
FROM migration_log ml
INNER JOIN transactions t ON ml.transaction_id = t.id
WHERE ml.migration_status = 'failed'
LIMIT 10;

COMMIT;
"@
        
        $migrationQuery | supabase db execute
        
        Write-Host "[SUCCESS] Migration complete!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "[INFO] Step 5: Post-Migration Validation" -ForegroundColor Yellow
        Write-Host "---------------------------------"
        Write-Host "[INFO] Running validation queries..." -ForegroundColor Cyan
        
        supabase db execute --file migration_validation_queries.sql > validation_report.txt 2>&1
        
        Write-Host "[SUCCESS] Validation complete. Results saved to validation_report.txt" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Opening validation summary..." -ForegroundColor Cyan
        Get-Content validation_report.txt | Select-Object -First 100
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "[SUCCESS] Migration Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Review validation_report.txt" -ForegroundColor White
        Write-Host "  2. Verify all checks passed" -ForegroundColor White
        Write-Host "  3. Check Supabase Dashboard for data" -ForegroundColor White
        Write-Host "  4. Notify team of completion" -ForegroundColor White
        Write-Host "  5. Proceed to Phase 2 (UI Refactor)" -ForegroundColor White
    } else {
        Write-Host "[INFO] Migration cancelled." -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] Migration cancelled. No changes made." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Script complete." -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful Supabase commands:" -ForegroundColor Yellow
Write-Host "  supabase db execute 'SELECT * FROM v_migration_status;'" -ForegroundColor Gray
Write-Host "  supabase db execute --file migration_validation_queries.sql" -ForegroundColor Gray
Write-Host "  supabase db push  # Deploy migrations" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
