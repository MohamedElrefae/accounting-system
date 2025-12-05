#!/bin/bash
# ============================================
# Transaction Migration - Quick Start Script
# ============================================

set -e  # Exit on error

echo "🚀 Transaction Migration - Quick Start"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo "ℹ $1"
}

# Check if psql is available
if ! command -v psql &> /dev/null; then
    print_error "psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI not found. Will use psql directly."
    USE_SUPABASE=false
else
    USE_SUPABASE=true
fi

echo ""
print_info "Step 1: Pre-Migration Audit"
echo "----------------------------"
read -p "Run audit queries? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running audit queries..."
    psql -f migration_audit_queries.sql > audit_report.txt 2>&1
    print_success "Audit complete. Results saved to audit_report.txt"
    echo ""
    print_info "Review audit_report.txt before proceeding."
    read -p "Press Enter to continue..."
fi

echo ""
print_info "Step 2: Deploy Migration Infrastructure"
echo "---------------------------------------"
read -p "Deploy infrastructure (creates backup)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deploying migration infrastructure..."
    if [ "$USE_SUPABASE" = true ]; then
        supabase db push
    else
        psql -f supabase/migrations/20250129_migration_infrastructure.sql
    fi
    print_success "Infrastructure deployed"
    
    print_info "Verifying backup..."
    psql -c "SELECT COUNT(*) as backup_count FROM transactions_legacy_backup;"
    print_success "Backup verified"
fi

echo ""
print_info "Step 3: Deploy Migration Functions"
echo "----------------------------------"
read -p "Deploy migration functions? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deploying migration functions..."
    psql -f supabase/migrations/20250129_migration_functions.sql
    print_success "Functions deployed"
fi

echo ""
print_info "Step 4: Validate Migration Readiness"
echo "------------------------------------"
read -p "Run validation checks? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running validation..."
    psql -c "SELECT * FROM validate_migration_readiness();"
    echo ""
    print_warning "All checks must show PASS before proceeding!"
    read -p "Press Enter to continue..."
fi

echo ""
print_info "Step 5: Test Migration (Optional)"
echo "--------------------------------"
read -p "Run test migration on 10 transactions? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running test migration..."
    psql <<EOF
DO \$\$
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
END \$\$;
EOF
    print_success "Test migration complete"
    
    print_info "Checking results..."
    psql -c "SELECT migration_status, COUNT(*) FROM migration_log GROUP BY migration_status;"
fi

echo ""
print_warning "⚠️  PRODUCTION MIGRATION"
print_warning "This will migrate ALL legacy transactions!"
print_warning "Make sure you have:"
print_warning "  1. Reviewed audit report"
print_warning "  2. Verified backup exists"
print_warning "  3. All validation checks passed"
print_warning "  4. Team is notified"
echo ""
read -p "Proceed with PRODUCTION migration? (yes/no): " -r
echo
if [[ $REPLY == "yes" ]]; then
    print_info "Starting production migration..."
    print_warning "This may take 10-30 minutes depending on data size"
    
    psql <<EOF
BEGIN;

-- Count transactions to migrate
SELECT 
  COUNT(*) as total_to_migrate,
  SUM(amount) as total_amount
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id);

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
EOF
    
    print_success "Migration complete!"
    
    echo ""
    print_info "Step 7: Post-Migration Validation"
    echo "---------------------------------"
    print_info "Running validation queries..."
    psql -f migration_validation_queries.sql > validation_report.txt 2>&1
    print_success "Validation complete. Results saved to validation_report.txt"
    
    echo ""
    print_success "🎉 Migration Complete!"
    print_info "Next steps:"
    print_info "  1. Review validation_report.txt"
    print_info "  2. Verify all checks passed"
    print_info "  3. Notify team of completion"
    print_info "  4. Proceed to Phase 2 (UI Refactor)"
else
    print_info "Migration cancelled. No changes made."
fi

echo ""
print_info "Script complete."
