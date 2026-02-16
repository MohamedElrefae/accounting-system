# Troubleshooting Guide: Excel Data Migration to Supabase

## Common Issues and Solutions

### Connection Issues

#### Problem: "Failed to connect to Supabase"

**Symptoms:**
```
✗ Failed to connect to Supabase
```

**Possible Causes:**
1. Incorrect Supabase URL or key in `.env`
2. Network connectivity issues
3. Supabase service is down
4. Invalid credentials

**Solutions:**

1. **Verify credentials in `.env`:**
   ```bash
   # Check that SUPABASE_URL and SUPABASE_KEY are correct
   cat .env
   ```

2. **Test connection manually:**
   ```bash
   python -c "from src.services.supabase_connection import SupabaseConnectionManager; cm = SupabaseConnectionManager(); print('✓ OK' if cm.test_connection() else '✗ Failed')"
   ```

3. **Check network connectivity:**
   ```bash
   # Test if you can reach Supabase
   ping bgxknceshxxifwytalex.supabase.co
   ```

4. **Verify credentials are correct:**
   - Go to Supabase dashboard
   - Check Project Settings → API
   - Copy correct URL and anon key
   - Update `.env` file

5. **Check Supabase status:**
   - Visit https://status.supabase.com
   - Verify service is operational

---

#### Problem: "Connection timeout"

**Symptoms:**
```
Connection timeout after 30 seconds
```

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping google.com
   ```

2. **Try again later** - Supabase may be experiencing temporary issues

3. **Increase timeout** - Edit the connection manager code to increase timeout value

4. **Check firewall** - Ensure firewall allows outbound HTTPS connections

---

### Excel File Issues

#### Problem: "Failed to read Excel: File not found"

**Symptoms:**
```
✗ Failed to read Excel: File not found
```

**Solutions:**

1. **Verify file path in `.env`:**
   ```bash
   # Check EXCEL_FILE_PATH
   cat .env
   ```

2. **Check file exists:**
   ```bash
   # On Windows:
   dir "يومية الحدائق من البداية كاملة .xlsx"
   
   # On macOS/Linux:
   ls "يومية الحدائق من البداية كاملة .xlsx"
   ```

3. **Use absolute path:**
   ```env
   EXCEL_FILE_PATH=/full/path/to/your/file.xlsx
   ```

4. **Check file permissions:**
   - Ensure you have read permission on the file
   - File should not be open in Excel (close it first)

---

#### Problem: "Failed to read Excel: File is corrupted"

**Symptoms:**
```
✗ Failed to read Excel: File is corrupted or invalid format
```

**Solutions:**

1. **Verify file format:**
   - File must be `.xlsx` (Excel 2007+)
   - Not `.xls` (older Excel format)
   - Not `.csv` (comma-separated values)

2. **Try opening in Excel:**
   - Open the file in Microsoft Excel
   - If it opens successfully, file is likely OK
   - If Excel shows errors, file may be corrupted

3. **Repair the file:**
   - Open Excel
   - File → Open → Select file
   - Click dropdown arrow next to Open button
   - Select "Open and Repair"

4. **Re-save the file:**
   - Open in Excel
   - Save as `.xlsx` format
   - Try migration again

---

#### Problem: "Sheet 'transactions ' not found"

**Symptoms:**
```
✗ Sheet 'transactions ' not found in Excel file
```

**Note:** The sheet name has a trailing space: `"transactions "` (not `"transactions"`)

**Solutions:**

1. **Verify sheet name:**
   - Open Excel file
   - Check sheet tab at bottom
   - Sheet name must be exactly: `transactions ` (with trailing space)

2. **Rename sheet if needed:**
   - Right-click sheet tab
   - Select "Rename"
   - Type: `transactions ` (with trailing space)
   - Press Enter

3. **Check for hidden sheets:**
   - Right-click sheet tab area
   - Select "Unhide" if available
   - Look for `transactions ` sheet

---

### Data Validation Issues

#### Problem: "Validation failed with X errors"

**Symptoms:**
```
✗ Validation failed with 5 errors
Run 'python migrate.py validate' for details
```

**Solutions:**

1. **Get detailed error report:**
   ```bash
   python migrate.py validate
   ```

2. **Review validation report:**
   ```bash
   # Check the detailed report
   cat reports/validation_report.json
   ```

3. **Common validation errors:**

   **Missing required fields:**
   - Check Excel file has all required columns
   - Verify column headers match expected names
   - See `config/column_mapping_APPROVED.csv` for expected columns

   **Invalid account codes:**
   - Extract unique account codes from Excel
   - Verify they exist in Supabase accounts table
   - Run: `python analyze.py accounts` to check mappings

   **Invalid data types:**
   - Check numeric fields contain numbers
   - Check date fields contain valid dates
   - Check text fields don't exceed length limits

   **Unbalanced transactions:**
   - Check that debit = credit for each transaction
   - Some transactions may be intentionally unbalanced
   - Review `reports/unbalanced_transactions.csv` if it exists

4. **Fix issues in Excel:**
   - Correct data in Excel file
   - Save file
   - Run validation again

---

#### Problem: "Account code X not found in Supabase"

**Symptoms:**
```
Account code 134 not found in Supabase accounts table
```

**Solutions:**

1. **Check account mappings:**
   ```bash
   python analyze.py accounts
   ```

2. **Review unmapped codes:**
   - Check `reports/account_mapping.json`
   - Look for codes with `"mapped": false`

3. **Add missing accounts to Supabase:**
   - Go to Supabase dashboard
   - Add missing accounts to accounts table
   - Include legacy_code field with Excel code
   - Re-run account mapping: `python analyze.py accounts`

4. **Update account mapping manually:**
   - Edit `config/account_mapping.csv`
   - Add correct account_id for unmapped codes
   - Re-run migration

---

### Migration Issues

#### Problem: "Migration failed: X records failed"

**Symptoms:**
```
✗ Migration failed: 5 records failed
```

**Solutions:**

1. **Check migration report:**
   ```bash
   cat reports/migration_report.md
   ```

2. **Review error logs:**
   ```bash
   # Check latest log file
   ls -lt logs/ | head -1
   cat logs/migration_*.log
   ```

3. **Common migration errors:**

   **Foreign key constraint violation:**
   - Transaction line references non-existent transaction
   - Account code doesn't exist in accounts table
   - Project code doesn't exist in projects table
   - Solution: Fix data in Excel or add missing references

   **Duplicate key violation:**
   - Record with same ID already exists
   - Solution: Check if migration already ran, or delete duplicates

   **Data type mismatch:**
   - Field value doesn't match expected type
   - Solution: Fix data type in Excel

4. **Rollback if needed:**
   ```bash
   # Get backup timestamp from migration output
   python migrate.py rollback --backup-timestamp 20260213_121500
   ```

5. **Fix issues and retry:**
   - Correct data in Excel
   - Run validation again
   - Run dry-run to verify
   - Execute migration again

---

#### Problem: "Batch insert failed"

**Symptoms:**
```
Batch insert failed: Connection lost
```

**Solutions:**

1. **Reduce batch size:**
   ```bash
   # Try smaller batch size
   python migrate.py --mode dry-run --batch-size 50
   ```

2. **Check network:**
   - Verify internet connection is stable
   - Try again later if network is unstable

3. **Check Supabase:**
   - Verify Supabase is operational
   - Check https://status.supabase.com

4. **Increase timeout:**
   - Edit `src/executor/migration_executor.py`
   - Increase timeout value in batch insert function

---

#### Problem: "Rollback failed"

**Symptoms:**
```
✗ Rollback failed: Backup file not found
```

**Solutions:**

1. **Verify backup exists:**
   ```bash
   # List available backups
   ls -la backups/
   ```

2. **Check backup timestamp:**
   - Backup filename format: `pre_migration_YYYYMMDD_HHMMSS.json`
   - Use correct timestamp in rollback command

3. **If backup is missing:**
   - Manually restore from your own backup if available
   - Contact Supabase support for data recovery options

4. **Verify backup is readable:**
   ```bash
   # Check backup file size
   ls -lh backups/pre_migration_*.json
   
   # Try to read backup
   python -c "import json; json.load(open('backups/pre_migration_20260213_121500.json'))"
   ```

---

### Performance Issues

#### Problem: "Migration is very slow"

**Symptoms:**
```
Migration taking longer than expected
```

**Solutions:**

1. **Increase batch size:**
   ```bash
   # Try larger batch size
   python migrate.py --mode execute --batch-size 500
   ```

2. **Check network latency:**
   ```bash
   # Measure latency to Supabase
   ping bgxknceshxxifwytalex.supabase.co
   ```

3. **Check system resources:**
   - Verify CPU usage is not maxed out
   - Check available memory
   - Close other applications

4. **Check Supabase performance:**
   - Go to Supabase dashboard
   - Check database performance metrics
   - Verify no other heavy operations running

5. **Run during off-peak hours:**
   - Try migration at night or weekends
   - Less load on Supabase servers

---

#### Problem: "Out of memory error"

**Symptoms:**
```
MemoryError: Unable to allocate memory
```

**Solutions:**

1. **Reduce batch size:**
   ```bash
   # Smaller batches use less memory
   python migrate.py --mode execute --batch-size 50
   ```

2. **Close other applications:**
   - Free up system memory
   - Close browser tabs, other programs

3. **Increase system memory:**
   - Add more RAM to your computer
   - Or use a more powerful machine

4. **Process in chunks:**
   - Split Excel file into smaller files
   - Migrate each file separately

---

### Logging and Debugging

#### Enable Debug Logging

```bash
# Set log level to DEBUG in .env
LOG_LEVEL=DEBUG

# Run command again
python migrate.py validate
```

Debug logs provide detailed information about each step.

#### Check Log Files

```bash
# List all log files
ls -la logs/

# View latest log
cat logs/migration_*.log | tail -100

# Search for errors in logs
grep ERROR logs/migration_*.log
```

#### Generate Diagnostic Report

```bash
# Run analysis to generate diagnostic reports
python analyze.py all

# Check reports
ls -la reports/
```

---

## Getting Help

### Before Contacting Support

1. **Collect information:**
   - Error message (exact text)
   - Command you ran
   - Log file content (from `logs/` directory)
   - Generated reports (from `reports/` directory)

2. **Check documentation:**
   - Review [USAGE_GUIDE.md](USAGE_GUIDE.md)
   - Check [SETUP_GUIDE.md](SETUP_GUIDE.md)
   - Review this troubleshooting guide

3. **Try solutions:**
   - Follow troubleshooting steps above
   - Try dry-run mode first
   - Test with smaller dataset

### Contacting Support

When contacting support, provide:

1. **Error message** - Exact error text
2. **Command** - Exact command you ran
3. **Environment** - Python version, OS, Supabase region
4. **Logs** - Content from `logs/` directory
5. **Reports** - Relevant reports from `reports/` directory
6. **Steps to reproduce** - Exact steps to reproduce the issue

### Emergency Procedures

#### If Migration Corrupted Data

1. **Stop immediately** - Don't run any more migrations
2. **Rollback** - Use rollback command if backup exists
3. **Contact Supabase support** - For data recovery assistance
4. **Restore from backup** - If you have your own backup

#### If Supabase is Down

1. **Wait for recovery** - Check https://status.supabase.com
2. **Don't retry immediately** - Wait 5-10 minutes
3. **Try again** - Once service is restored
4. **Contact Supabase support** - If service doesn't recover

---

## FAQ

**Q: Can I run migration multiple times?**
A: Yes, but be careful. Dry-run mode is safe. Execute mode will create duplicates if run twice. Use rollback to undo.

**Q: What if I interrupt the migration?**
A: Partially migrated data will remain in Supabase. Use rollback to restore from backup.

**Q: Can I migrate only specific records?**
A: Not directly. You can edit Excel file to include only desired records, then migrate.

**Q: How long does migration take?**
A: Depends on record count and network speed. Typically 1-5 minutes for 14,000 records.

**Q: Can I change batch size during migration?**
A: No. Stop migration, rollback, and restart with new batch size.

**Q: What if backup file is corrupted?**
A: Rollback will fail. Contact Supabase support for data recovery.

**Q: Can I migrate to multiple Supabase projects?**
A: Yes. Change SUPABASE_URL and SUPABASE_KEY in `.env`, then run migration again.

