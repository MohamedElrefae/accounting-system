# Production Quick Start: 9 Steps to Deploy

**Time Required**: ~2 hours  
**Risk Level**: Low (with dry-run validation)  
**Status**: Ready to Execute

---

## ✅ Step 1: Pre-Flight Check (5 minutes)

```bash
# Verify Python
python --version

# Verify tests pass
python -m pytest tests/ -v --tb=short
```

**Expected**: Python 3.8+, 56/56 tests pass ✅

---

## ✅ Step 2: Setup Environment (5 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-service-role-key
# EXCEL_FILE_PATH=c:\path\to\your\file.xlsx
```

**Verify**:
```bash
python -c "import os; print('✓ SUPABASE_URL:', os.getenv('SUPABASE_URL')[:30])"
```

---

## ✅ Step 3: Install Dependencies (2 minutes)

```bash
pip install -r requirements.txt
```

**Verify**:
```bash
pip list | grep supabase
```

---

## ✅ Step 4: Test Connections (5 minutes)

```bash
# Test Supabase
python -c "
from src.analyzer.supabase_connection import SupabaseConnectionManager
manager = SupabaseConnectionManager()
print('✓ Supabase connection OK' if manager.test_connection() else '✗ Connection failed')
"

# Test Excel file
python -c "
import os
path = os.getenv('EXCEL_FILE_PATH')
print(f'✓ Excel file found: {path}' if os.path.exists(path) else '✗ File not found')
"
```

---

## ✅ Step 5: Run Dry-Run (30 minutes)

```bash
python migrate.py --mode dry-run --batch-size 100
```

**Monitor**: Watch progress bars and logs

**Check Results**:
```bash
cat reports/migration_report.json
```

**Expected**:
- Transactions processed: 2,164
- Transaction lines processed: 14,224
- No critical errors

---

## ✅ Step 6: Review & Approve (15 minutes)

**Review these files**:
- `reports/migration_report.json` - Overall results
- `reports/validation_errors.csv` - Any data issues
- `reports/verification_report.json` - Verification results

**Checklist**:
- [ ] Record counts correct
- [ ] No critical errors
- [ ] All validations pass
- [ ] Team lead approved

---

## ✅ Step 7: Create Backup (5 minutes)

```bash
python migrate.py --mode backup
```

**Verify**:
```bash
ls -lh backups/pre_migration_*.json
```

**Save this path** for potential rollback!

---

## ✅ Step 8: Execute Migration (30 minutes)

```bash
python migrate.py --mode execute --batch-size 100
```

**Monitor**: Watch progress bars

**Expected Output**:
```
✓ Transactions migrated: 2,164 records
✓ Transaction lines migrated: 14,224 records
Migration completed successfully!
```

---

## ✅ Step 9: Verify & Validate (15 minutes)

```bash
# Run verification
python migrate.py --mode verify

# Check results
cat reports/verification_report.json
```

**Expected**: All checks PASS ✅

**Verify in Supabase**:
```sql
SELECT COUNT(*) FROM transactions;        -- Should be 2,164
SELECT COUNT(*) FROM transaction_lines;   -- Should be 14,224
```

---

## 🎉 Success!

Your migration is complete when:

✅ All 9 steps completed  
✅ Dry-run passed  
✅ Backup created  
✅ Migration executed  
✅ Verification passed  
✅ Record counts match  

---

## 🚨 If Something Goes Wrong

### Rollback (Undo Migration)

```bash
python migrate.py --mode rollback --backup-file backups/pre_migration_TIMESTAMP.json
```

### Check Logs

```bash
cat logs/migration_*.log
```

### Get Help

See `PRODUCTION_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.

---

## 📊 Key Metrics

| Metric | Expected | Actual |
|--------|----------|--------|
| Transactions | 2,164 | _____ |
| Transaction Lines | 14,224 | _____ |
| Execution Time | ~45 sec | _____ |
| Success Rate | 100% | _____ |
| Errors | 0 | _____ |

---

## 📝 Sign-Off

- [ ] Data Analyst: _________________ Date: _______
- [ ] DBA: _________________ Date: _______
- [ ] Finance Manager: _________________ Date: _______
- [ ] IT Manager: _________________ Date: _______

---

## 📞 Emergency Contact

If critical issues occur:
1. Stop migration immediately
2. Execute rollback
3. Contact: [Your DBA Name]
4. Escalate to: [Your Manager Name]

---

**Ready to deploy?** Start with Step 1! ✅
