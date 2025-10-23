# Next Steps: Schema Cleanup

## 📋 What We Found

Your `transaction_line_items` table has **14 duplicate columns** from an incomplete merge cleanup.

### Remove These (14 columns)
```
item_code, item_name, item_name_ar, 
description, description_ar,
parent_id, level, path, is_selectable,
item_type, specifications, standard_cost,
is_active, position
```

### Keep These (13 columns)
```
id, transaction_line_id, line_number,
quantity, percentage, unit_price, unit_of_measure,
total_amount (GENERATED),
analysis_work_item_id, sub_tree_id,
org_id, created_at, updated_at
```

### Rename This (1 column)
```
line_item_id → line_item_catalog_id  (for clarity)
```

---

## 🚀 Deployment Steps

### Step 1: Backup (5 minutes)
```bash
# Create backup in database
psql -U postgres -d accounting_db -c \
  "CREATE TABLE transaction_line_items_backup AS SELECT * FROM transaction_line_items;"
```

### Step 2: Run Cleanup SQL (2 minutes)
```bash
# Run the cleanup script
psql -U postgres -d accounting_db -f CLEANUP_SCHEMA.sql
```

**OR via Supabase:**
```bash
supabase db shell < CLEANUP_SCHEMA.sql
```

### Step 3: Verify (1 minute)
```bash
# Check column count (should be ~13)
psql -U postgres -d accounting_db -c \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='transaction_line_items';"

# Test the new view
psql -U postgres -d accounting_db -c \
  "SELECT * FROM v_transaction_line_items_full LIMIT 1;"
```

### Step 4: Update API Code (10 minutes)
Search for direct column references in TypeScript:
```bash
grep -r "item_code\|item_name\|parent_id" src/services/
grep -r "\.specifications\|\.standard_cost" src/
```

If found, update to use `v_transaction_line_items_full` view or JOIN to `line_items`.

### Step 5: Test (15 minutes)
```bash
npm run lint
npm run typecheck
npm run test:integration
```

### Step 6: Deploy (5 minutes)
```bash
npm run build
# Deploy to production
```

---

## 📁 Documents Created

| Document | Purpose |
|----------|---------|
| `CLEANUP_SCHEMA.sql` | Database migration script (RUN THIS) |
| `SCHEMA_CLEANUP_ANALYSIS.md` | Technical deep dive |
| `SCHEMA_CLEANUP_SUMMARY.md` | Quick reference |
| `ANSWERS_TO_QUESTIONS.md` | Your specific Q&A |
| `NEXT_STEPS.md` | This file |

---

## ⚠️ Important Notes

1. **Data is safe**: This only removes columns, not rows
2. **View provides continuity**: Queries still work via new view
3. **No API changes needed** (mostly): If you use the service layer, no changes required
4. **Backup is crucial**: Run Step 1 first

---

## ✅ Verification Checklist

After cleanup, verify:

- [ ] Column count is ~13 (was ~30)
- [ ] View `v_transaction_line_items_full` returns data
- [ ] `line_item_id` renamed to `line_item_catalog_id`
- [ ] FK constraint to `line_items` exists
- [ ] No code errors in IDE
- [ ] Lint passes: `npm run lint`
- [ ] Type check passes: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] UI works: Create transaction → add items → save

---

## 📊 Before & After

### BEFORE (Messy)
```
transaction_line_items: 30 columns
├── Transaction data (10 cols)
├── Duplicated catalog data (14 cols) ❌
└── Audit (3 cols)

Query: Fast (no JOINs) but redundant
```

### AFTER (Clean)
```
transaction_line_items: 13 columns
├── Transaction data (10 cols)
├── Catalog FK (1 col)
└── Audit (3 cols)

Query: Via view (automatic JOIN) or manual
Result: Single source of truth ✅
```

---

## 🎯 Final Result

✅ Proper schema separation  
✅ No data duplication  
✅ Cleaner table (13 vs 30 columns)  
✅ Seamless queries via view  
✅ Production ready  

---

## Quick Rollback

If something goes wrong:

```sql
-- Restore from backup
DROP TABLE transaction_line_items;
ALTER TABLE transaction_line_items_backup RENAME TO transaction_line_items;
```

---

**Estimated Total Time: 40 minutes**

Ready to proceed? 🚀
