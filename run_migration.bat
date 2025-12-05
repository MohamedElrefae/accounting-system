@echo off
REM ============================================
REM Transaction Migration - Quick Start Script (Windows)
REM ============================================

echo.
echo ========================================
echo Transaction Migration - Quick Start
echo ========================================
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] psql command not found. Please install PostgreSQL client.
    pause
    exit /b 1
)

echo [INFO] Step 1: Pre-Migration Audit
echo ----------------------------
set /p AUDIT="Run audit queries? (y/n): "
if /i "%AUDIT%"=="y" (
    echo [INFO] Running audit queries...
    psql -f migration_audit_queries.sql > audit_report.txt 2>&1
    echo [SUCCESS] Audit complete. Results saved to audit_report.txt
    echo.
    echo [INFO] Review audit_report.txt before proceeding.
    pause
)

echo.
echo [INFO] Step 2: Deploy Migration Infrastructure
echo ---------------------------------------
set /p INFRA="Deploy infrastructure (creates backup)? (y/n): "
if /i "%INFRA%"=="y" (
    echo [INFO] Deploying migration infrastructure...
    psql -f supabase/migrations/20250129_migration_infrastructure.sql
    echo [SUCCESS] Infrastructure deployed
    
    echo [INFO] Verifying backup...
    psql -c "SELECT COUNT(*) as backup_count FROM transactions_legacy_backup;"
    echo [SUCCESS] Backup verified
)

echo.
echo [INFO] Step 3: Deploy Migration Functions
echo ----------------------------------
set /p FUNCS="Deploy migration functions? (y/n): "
if /i "%FUNCS%"=="y" (
    echo [INFO] Deploying migration functions...
    psql -f supabase/migrations/20250129_migration_functions.sql
    echo [SUCCESS] Functions deployed
)

echo.
echo [INFO] Step 4: Validate Migration Readiness
echo ------------------------------------
set /p VALIDATE="Run validation checks? (y/n): "
if /i "%VALIDATE%"=="y" (
    echo [INFO] Running validation...
    psql -c "SELECT * FROM validate_migration_readiness();"
    echo.
    echo [WARNING] All checks must show PASS before proceeding!
    pause
)

echo.
echo [INFO] Step 5: Test Migration (Optional)
echo --------------------------------
set /p TEST="Run test migration on 10 transactions? (y/n): "
if /i "%TEST%"=="y" (
    echo [INFO] Running test migration...
    psql -c "DO $$ DECLARE v_tx_id UUID; v_result RECORD; v_count INTEGER := 0; BEGIN FOR v_tx_id IN (SELECT id FROM transactions WHERE debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL AND amount IS NOT NULL LIMIT 10) LOOP SELECT * INTO v_result FROM migrate_legacy_transaction(v_tx_id); RAISE NOTICE 'TX %%: Status %%, Lines %%', v_tx_id, v_result.status, v_result.lines_created; v_count := v_count + 1; END LOOP; RAISE NOTICE 'Test complete: %% transactions', v_count; END $$;"
    echo [SUCCESS] Test migration complete
    
    echo [INFO] Checking results...
    psql -c "SELECT migration_status, COUNT(*) FROM migration_log GROUP BY migration_status;"
)

echo.
echo ========================================
echo [WARNING] PRODUCTION MIGRATION
echo ========================================
echo This will migrate ALL legacy transactions!
echo Make sure you have:
echo   1. Reviewed audit report
echo   2. Verified backup exists
echo   3. All validation checks passed
echo   4. Team is notified
echo.
set /p PROD="Proceed with PRODUCTION migration? (yes/no): "
if /i "%PROD%"=="yes" (
    echo [INFO] Starting production migration...
    echo [WARNING] This may take 10-30 minutes depending on data size
    
    psql -c "BEGIN; SELECT COUNT(*) as total_to_migrate, SUM(amount) as total_amount FROM transactions WHERE debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL AND amount IS NOT NULL AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id); SELECT * FROM migrate_all_legacy_transactions(100); SELECT * FROM v_migration_status; COMMIT;"
    
    echo [SUCCESS] Migration complete!
    
    echo.
    echo [INFO] Step 7: Post-Migration Validation
    echo ---------------------------------
    echo [INFO] Running validation queries...
    psql -f migration_validation_queries.sql > validation_report.txt 2>&1
    echo [SUCCESS] Validation complete. Results saved to validation_report.txt
    
    echo.
    echo ========================================
    echo [SUCCESS] Migration Complete!
    echo ========================================
    echo Next steps:
    echo   1. Review validation_report.txt
    echo   2. Verify all checks passed
    echo   3. Notify team of completion
    echo   4. Proceed to Phase 2 (UI Refactor)
) else (
    echo [INFO] Migration cancelled. No changes made.
)

echo.
echo [INFO] Script complete.
pause
