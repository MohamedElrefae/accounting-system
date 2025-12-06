# Fiscal Database Troubleshooting Guide

## Current Issue: Stack Depth Limit Exceeded

### Error Details
```
Error: Failed to fetch fiscal years: stack depth limit exceeded
Code: 54001
Hint: Increase the configuration parameter "max_stack_depth" or simplify the query to reduce nesting. Alternatively, increasing the platform's stack depth limit is adequate.
```

### Root Cause Analysis

This error typically occurs when:
1. **Recursive Queries**: There's a recursive relationship causing infinite loops
2. **Complex RLS Policies**: Row Level Security policies are too complex
3. **Database Configuration**: Stack depth limit is too low
4. **Circular References**: Foreign key relationships create circular dependencies

### Immediate Solutions

#### 1. Check RLS Policies
```sql
-- Check current RLS policies on fiscal_years table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'fiscal_years';

-- Temporarily disable RLS to test (CAUTION: Only for debugging)
ALTER TABLE fiscal_years DISABLE ROW LEVEL SECURITY;
-- Test the query
-- Re-enable RLS
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
```

#### 2. Simplify the Query
```sql
-- Test with a simple query first
SELECT id, org_id, year_number, name_en, status 
FROM fiscal_years 
WHERE org_id = 'your-org-id' 
LIMIT 5;
```

#### 3. Check for Recursive Relationships
```sql
-- Check foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'fiscal_years';
```

### Database Configuration Fix

#### Option 1: Increase Stack Depth (Supabase)
```sql
-- Check current setting
SHOW max_stack_depth;

-- Increase stack depth (requires superuser privileges)
-- Note: This may not be available in Supabase hosted environment
ALTER SYSTEM SET max_stack_depth = '4MB';
SELECT pg_reload_conf();
```

#### Option 2: Optimize RLS Policies
```sql
-- Example of a simple, efficient RLS policy
DROP POLICY IF EXISTS fiscal_years_org_policy ON fiscal_years;

CREATE POLICY fiscal_years_org_policy ON fiscal_years
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );
```

### Application-Level Workarounds

#### 1. Add Query Timeout
```typescript
// In fiscalYearService.ts
const { data, error } = await supabase
  .from('fiscal_years')
  .select('*')
  .eq('org_id', orgId)
  .order('year_number', { ascending: false })
  .abortSignal(AbortSignal.timeout(5000)) // 5 second timeout
```

#### 2. Implement Pagination
```typescript
// Fetch in smaller chunks
const { data, error } = await supabase
  .from('fiscal_years')
  .select('*')
  .eq('org_id', orgId)
  .order('year_number', { ascending: false })
  .range(0, 9) // Limit to 10 records
```

#### 3. Use Specific Column Selection
```typescript
// Only select needed columns
const { data, error } = await supabase
  .from('fiscal_years')
  .select('id, org_id, year_number, name_en, name_ar, status, is_current, start_date, end_date, created_at')
  .eq('org_id', orgId)
  .order('year_number', { ascending: false })
```

### Testing Steps

1. **Test Simple Query**:
   ```sql
   SELECT COUNT(*) FROM fiscal_years WHERE org_id = 'your-org-id';
   ```

2. **Test Without RLS**:
   ```sql
   SET row_security = off;
   SELECT * FROM fiscal_years LIMIT 1;
   SET row_security = on;
   ```

3. **Check for Infinite Recursion**:
   ```sql
   -- Look for self-referencing foreign keys
   SELECT * FROM information_schema.table_constraints 
   WHERE table_name = 'fiscal_years' AND constraint_type = 'FOREIGN KEY';
   ```

### Prevention Measures

1. **Optimize RLS Policies**: Keep them simple and efficient
2. **Avoid Deep Nesting**: Limit query complexity
3. **Use Indexes**: Ensure proper indexing on filtered columns
4. **Monitor Performance**: Set up query performance monitoring
5. **Test Thoroughly**: Test with realistic data volumes

### Emergency Fallback

If the issue persists, implement a fallback service:

```typescript
// Emergency fallback service
export class FallbackFiscalYearService {
  static async getAll(orgId: string): Promise<FiscalYear[]> {
    try {
      // Try the normal query first
      return await FiscalYearService.getAll(orgId)
    } catch (error) {
      // Fallback to a simpler query
      const { data } = await supabase
        .from('fiscal_years')
        .select('id, year_number, name_en, status')
        .eq('org_id', orgId)
        .limit(10)
      
      return data?.map(row => ({
        ...row,
        // Provide defaults for missing fields
        nameAr: null,
        descriptionEn: null,
        descriptionAr: null,
        startDate: `${row.year_number}-01-01`,
        endDate: `${row.year_number}-12-31`,
        isCurrent: false,
        closedAt: null,
        closedBy: null,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })) || []
    }
  }
}
```

### Next Steps

1. Contact Supabase support if using hosted service
2. Review and optimize RLS policies
3. Consider database schema redesign if needed
4. Implement proper error handling and fallbacks
5. Monitor query performance after fixes

### Status
🔴 **CRITICAL** - Database configuration issue preventing normal operation
⚠️ **WORKAROUND** - Error handling implemented in dashboard
🔧 **ACTION REQUIRED** - Database administrator intervention needed