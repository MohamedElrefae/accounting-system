# Part 8: Database RLS Policies for Scope Enforcement

## Overview

Row Level Security (RLS) policies are the **last line of defense** for data isolation. Even if frontend validation fails, RLS ensures users can only access data from organizations they belong to.

---

## Step 1: Enable RLS on All Tables

```sql
-- Enable RLS on all data tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
-- ... enable for all other tables with organization_id
```

---

## Step 2: User Membership Tables RLS

```sql
-- user_organizations: Users can view their own memberships
CREATE POLICY "Users can view their own org memberships"
ON user_organizations FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage org memberships
CREATE POLICY "Admins can manage org memberships"
ON user_organizations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin')
    AND (ur.organization_id IS NULL OR ur.organization_id = user_organizations.organization_id)
  )
);

-- user_projects: Users can view their own project assignments
CREATE POLICY "Users can view their own project assignments"
ON user_projects FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage project assignments
CREATE POLICY "Users can manage project assignments in their orgs"
ON user_projects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN projects p ON p.id = user_projects.project_id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin')
    AND (ur.organization_id IS NULL OR ur.organization_id = p.organization_id)
  )
);
```

---

## Step 3: Organizations Table RLS

```sql
-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Only admins can create organizations
CREATE POLICY "Admins can create organizations"
ON organizations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin')
  )
);

-- Users can update organizations where they are admin
CREATE POLICY "Admins can update their organizations"
ON organizations FOR UPDATE
USING (
  id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin')
    AND ur.organization_id = organizations.id
  )
);

-- Only super admins can delete organizations
CREATE POLICY "Super admins can delete organizations"
ON organizations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug = 'super_admin'
  )
);
```

---

## Step 4: Projects Table RLS

```sql
-- Users can view projects in their organizations
CREATE POLICY "Users can view projects in their orgs"
ON projects FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Admins can create projects in their organizations
CREATE POLICY "Admins can create projects in their orgs"
ON projects FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin', 'manager')
    AND ur.organization_id = projects.organization_id
  )
);

-- Admins can update projects in their organizations
CREATE POLICY "Admins can update projects in their orgs"
ON projects FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin', 'manager')
    AND ur.organization_id = projects.organization_id
  )
);

-- Admins can delete projects in their organizations
CREATE POLICY "Admins can delete projects in their orgs"
ON projects FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin')
    AND ur.organization_id = projects.organization_id
  )
);
```

---

## Step 5: Transactions Table RLS

```sql
-- Users can view transactions in their organizations
CREATE POLICY "Users can view org transactions"
ON transactions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Users can create transactions in their organizations (if they have permission)
CREATE POLICY "Users can create transactions in their orgs"
ON transactions FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organizations uo
    JOIN user_roles ur ON ur.user_id = uo.user_id
    JOIN roles r ON r.id = ur.role_id
    WHERE uo.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = transactions.organization_id)
    AND r.slug IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

-- Users can update their own transactions or if they have permission
CREATE POLICY "Users can update transactions in their orgs"
ON transactions FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (ur.organization_id IS NULL OR ur.organization_id = transactions.organization_id)
      AND r.slug IN ('super_admin', 'admin', 'manager')
    )
  )
);

-- Only admins can delete transactions
CREATE POLICY "Admins can delete transactions in their orgs"
ON transactions FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = transactions.organization_id)
    AND r.slug IN ('super_admin', 'admin')
  )
);
```

---

## Step 6: Transaction Line Items RLS

```sql
-- Users can view line items for transactions in their orgs
CREATE POLICY "Users can view line items in their orgs"
ON transaction_line_items FOR SELECT
USING (
  transaction_id IN (
    SELECT t.id FROM transactions t
    WHERE t.organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

-- Users can create line items for transactions in their orgs
CREATE POLICY "Users can create line items in their orgs"
ON transaction_line_items FOR INSERT
WITH CHECK (
  transaction_id IN (
    SELECT t.id FROM transactions t
    WHERE t.organization_id IN (
      SELECT uo.organization_id
      FROM user_organizations uo
      JOIN user_roles ur ON ur.user_id = uo.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE uo.user_id = auth.uid()
      AND (ur.organization_id IS NULL OR ur.organization_id = t.organization_id)
      AND r.slug IN ('super_admin', 'admin', 'manager', 'accountant')
    )
  )
);

-- Users can update line items they created or if they have permission
CREATE POLICY "Users can update line items in their orgs"
ON transaction_line_items FOR UPDATE
USING (
  transaction_id IN (
    SELECT t.id FROM transactions t
    WHERE t.organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND (ur.organization_id IS NULL OR ur.organization_id = t.organization_id)
        AND r.slug IN ('super_admin', 'admin', 'manager')
      )
    )
  )
);

-- Admins can delete line items
CREATE POLICY "Admins can delete line items in their orgs"
ON transaction_line_items FOR DELETE
USING (
  transaction_id IN (
    SELECT t.id FROM transactions t
    WHERE t.organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (ur.organization_id IS NULL OR ur.organization_id = t.organization_id)
      AND r.slug IN ('super_admin', 'admin')
    )
  )
);
```

---

## Step 7: Accounts Table RLS

```sql
-- Users can view accounts in their organizations
CREATE POLICY "Users can view accounts in their orgs"
ON accounts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Only admins can create accounts
CREATE POLICY "Admins can create accounts in their orgs"
ON accounts FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = accounts.organization_id)
    AND r.slug IN ('super_admin', 'admin')
  )
);

-- Only admins can update accounts
CREATE POLICY "Admins can update accounts in their orgs"
ON accounts FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = accounts.organization_id)
    AND r.slug IN ('super_admin', 'admin')
  )
);

-- Only admins can delete accounts
CREATE POLICY "Admins can delete accounts in their orgs"
ON accounts FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = accounts.organization_id)
    AND r.slug IN ('super_admin', 'admin')
  )
);
```

---

## Step 8: Documents Table RLS

```sql
-- Users can view documents in their organizations
CREATE POLICY "Users can view documents in their orgs"
ON documents FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Users can create documents in their organizations
CREATE POLICY "Users can create documents in their orgs"
ON documents FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organizations uo
    JOIN user_roles ur ON ur.user_id = uo.user_id
    JOIN roles r ON r.id = ur.role_id
    WHERE uo.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = documents.organization_id)
    AND r.slug IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

-- Users can update their own documents or if they have permission
CREATE POLICY "Users can update documents in their orgs"
ON documents FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (ur.organization_id IS NULL OR ur.organization_id = documents.organization_id)
      AND r.slug IN ('super_admin', 'admin', 'manager')
    )
  )
);

-- Users can delete their own documents or if they are admin
CREATE POLICY "Users can delete documents in their orgs"
ON documents FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (ur.organization_id IS NULL OR ur.organization_id = documents.organization_id)
      AND r.slug IN ('super_admin', 'admin')
    )
  )
);
```

---

## Step 9: Fiscal Years & Periods RLS

```sql
-- Users can view fiscal years in their organizations
CREATE POLICY "Users can view fiscal years in their orgs"
ON fiscal_years FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Only admins can manage fiscal years
CREATE POLICY "Admins can manage fiscal years in their orgs"
ON fiscal_years FOR ALL
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND (ur.organization_id IS NULL OR ur.organization_id = fiscal_years.organization_id)
    AND r.slug IN ('super_admin', 'admin')
  )
);

-- Users can view fiscal periods in their organizations
CREATE POLICY "Users can view fiscal periods in their orgs"
ON fiscal_periods FOR SELECT
USING (
  fiscal_year_id IN (
    SELECT fy.id FROM fiscal_years fy
    WHERE fy.organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

-- Only admins can manage fiscal periods
CREATE POLICY "Admins can manage fiscal periods in their orgs"
ON fiscal_periods FOR ALL
USING (
  fiscal_year_id IN (
    SELECT fy.id FROM fiscal_years fy
    WHERE fy.organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND (ur.organization_id IS NULL OR ur.organization_id = fy.organization_id)
      AND r.slug IN ('super_admin', 'admin')
    )
  )
);
```

---

## Step 10: Testing RLS Policies

```sql
-- Test as accountant user (should only see their org's data)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'accountant-user-id';

-- Should return only org-1 data
SELECT * FROM transactions;

-- Should fail (org-2 data)
SELECT * FROM transactions WHERE organization_id = 'org-2-id';

-- Should fail (cannot create in org-2)
INSERT INTO transactions (organization_id, ...) 
VALUES ('org-2-id', ...);

-- Reset
RESET ROLE;
```

---

## Deployment Script

```sql
-- File: supabase/migrations/YYYYMMDD_scope_aware_rls_policies.sql

-- Drop all existing policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ALL ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- Enable RLS on all tables
-- (paste all ALTER TABLE statements from above)

-- Create all policies
-- (paste all CREATE POLICY statements from above)

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

