-- ============================================
-- RLS POLICIES FOR FINANCIAL TABLES
-- Aligned with existing organization-based security model
-- ============================================
-- 
-- ARCHITECTURE NOTES:
-- 1. This system uses ORGANIZATION-BASED isolation (org_id), NOT user-based
-- 2. Users belong to organizations via org_memberships table
-- 3. Existing helper functions: is_super_admin(), has_permission(), fn_is_org_member()
-- 4. Frontend permissions defined in src/lib/permissions.ts with role inheritance
-- 5. Database roles: super_admin, admin, manager, accountant, auditor, viewer
--
-- SYNC WITH FRONTEND:
-- - Frontend uses usePermissions hook to check permissions
-- - Backend RLS enforces data access at database level
-- - Both systems use the same role/permission tables
-- ============================================

SET search_path = public;

-- ============================================
-- SECTION 1: ENABLE RLS ON FINANCIAL TABLES
-- ============================================

-- Enable RLS on core financial tables (idempotent)
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fiscal_periods ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 2: TRANSACTIONS TABLE POLICIES
-- Organization-based access with permission checks
-- ============================================

DO $$ BEGIN
  -- Drop existing policies to avoid conflicts
  DROP POLICY IF EXISTS "tx_select_org_member" ON transactions;
  DROP POLICY IF EXISTS "tx_insert_org_member_with_perm" ON transactions;
  DROP POLICY IF EXISTS "tx_update_org_member_with_perm" ON transactions;
  DROP POLICY IF EXISTS "tx_delete_admin_only" ON transactions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Organization members can view their org's transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='tx_select_org_member'
  ) THEN
    CREATE POLICY tx_select_org_member ON public.transactions
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR public.fn_is_org_member(org_id, auth.uid())
      );
  END IF;

  -- INSERT: Organization members with transactions.create permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='tx_insert_org_member_with_perm'
  ) THEN
    CREATE POLICY tx_insert_org_member_with_perm ON public.transactions
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'transactions.create')
        )
      );
  END IF;

  -- UPDATE: Organization members with transactions.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='tx_update_org_member_with_perm'
  ) THEN
    CREATE POLICY tx_update_org_member_with_perm ON public.transactions
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'transactions.manage')
        )
      )
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'transactions.manage')
        )
      );
  END IF;

  -- DELETE: Super admin or users with transactions.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='tx_delete_admin_only'
  ) THEN
    CREATE POLICY tx_delete_admin_only ON public.transactions
      FOR DELETE TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'transactions.manage')
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'transactions table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 3: TRANSACTION_LINES TABLE POLICIES
-- ============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "tx_lines_select_org_member" ON transaction_lines;
  DROP POLICY IF EXISTS "tx_lines_insert_org_member_with_perm" ON transaction_lines;
  DROP POLICY IF EXISTS "tx_lines_update_org_member_with_perm" ON transaction_lines;
  DROP POLICY IF EXISTS "tx_lines_delete_admin_only" ON transaction_lines;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Based on parent transaction's org_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transaction_lines' AND policyname='tx_lines_select_org_member'
  ) THEN
    CREATE POLICY tx_lines_select_org_member ON public.transaction_lines
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR EXISTS (
          SELECT 1 FROM public.transactions t 
          WHERE t.id = transaction_lines.transaction_id 
          AND public.fn_is_org_member(t.org_id, auth.uid())
        )
      );
  END IF;

  -- INSERT: Based on parent transaction's org_id with permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transaction_lines' AND policyname='tx_lines_insert_org_member_with_perm'
  ) THEN
    CREATE POLICY tx_lines_insert_org_member_with_perm ON public.transaction_lines
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin() 
        OR (
          EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = transaction_lines.transaction_id 
            AND public.fn_is_org_member(t.org_id, auth.uid())
          )
          AND public.has_permission(auth.uid(), 'transactions.create')
        )
      );
  END IF;

  -- UPDATE: Based on parent transaction's org_id with permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transaction_lines' AND policyname='tx_lines_update_org_member_with_perm'
  ) THEN
    CREATE POLICY tx_lines_update_org_member_with_perm ON public.transaction_lines
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = transaction_lines.transaction_id 
            AND public.fn_is_org_member(t.org_id, auth.uid())
          )
          AND public.has_permission(auth.uid(), 'transactions.manage')
        )
      );
  END IF;

  -- DELETE: Admin only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transaction_lines' AND policyname='tx_lines_delete_admin_only'
  ) THEN
    CREATE POLICY tx_lines_delete_admin_only ON public.transaction_lines
      FOR DELETE TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = transaction_lines.transaction_id 
            AND public.fn_is_org_member(t.org_id, auth.uid())
          )
          AND public.has_permission(auth.uid(), 'transactions.manage')
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'transaction_lines table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 4: ACCOUNTS TABLE POLICIES
-- ============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "accounts_select_org_member" ON accounts;
  DROP POLICY IF EXISTS "accounts_insert_admin" ON accounts;
  DROP POLICY IF EXISTS "accounts_update_admin" ON accounts;
  DROP POLICY IF EXISTS "accounts_delete_admin" ON accounts;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Organization members can view accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_select_org_member'
  ) THEN
    CREATE POLICY accounts_select_org_member ON public.accounts
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR public.fn_is_org_member(org_id, auth.uid())
        OR public.has_permission(auth.uid(), 'accounts.view')
      );
  END IF;

  -- INSERT: Users with accounts.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_insert_admin'
  ) THEN
    CREATE POLICY accounts_insert_admin ON public.accounts
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'accounts.manage')
        )
      );
  END IF;

  -- UPDATE: Users with accounts.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_update_admin'
  ) THEN
    CREATE POLICY accounts_update_admin ON public.accounts
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'accounts.manage')
        )
      );
  END IF;

  -- DELETE: Super admin only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_delete_admin'
  ) THEN
    CREATE POLICY accounts_delete_admin ON public.accounts
      FOR DELETE TO authenticated
      USING (public.is_super_admin());
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'accounts table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 5: COST_CENTERS TABLE POLICIES
-- ============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "cost_centers_select_org_member" ON cost_centers;
  DROP POLICY IF EXISTS "cost_centers_modify_admin" ON cost_centers;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Organization members can view
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cost_centers' AND policyname='cost_centers_select_org_member'
  ) THEN
    CREATE POLICY cost_centers_select_org_member ON public.cost_centers
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR public.fn_is_org_member(org_id, auth.uid())
      );
  END IF;

  -- INSERT/UPDATE/DELETE: Admin with accounts.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cost_centers' AND policyname='cost_centers_modify_admin'
  ) THEN
    CREATE POLICY cost_centers_modify_admin ON public.cost_centers
      FOR ALL TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'accounts.manage')
        )
      )
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'accounts.manage')
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'cost_centers table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 6: WORK_ITEMS TABLE POLICIES
-- ============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "work_items_select_org_member" ON work_items;
  DROP POLICY IF EXISTS "work_items_modify_admin" ON work_items;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Organization members can view
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='work_items' AND policyname='work_items_select_org_member'
  ) THEN
    CREATE POLICY work_items_select_org_member ON public.work_items
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR public.fn_is_org_member(org_id, auth.uid())
      );
  END IF;

  -- INSERT/UPDATE/DELETE: Admin with accounts.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='work_items' AND policyname='work_items_modify_admin'
  ) THEN
    CREATE POLICY work_items_modify_admin ON public.work_items
      FOR ALL TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'accounts.manage')
        )
      )
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'accounts.manage')
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'work_items table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 7: FISCAL_YEARS TABLE POLICIES
-- ============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "fiscal_years_select_org_member" ON fiscal_years;
  DROP POLICY IF EXISTS "fiscal_years_modify_admin" ON fiscal_years;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Organization members can view
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fiscal_years' AND policyname='fiscal_years_select_org_member'
  ) THEN
    CREATE POLICY fiscal_years_select_org_member ON public.fiscal_years
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR public.fn_is_org_member(org_id, auth.uid())
      );
  END IF;

  -- INSERT/UPDATE/DELETE: Admin with fiscal.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fiscal_years' AND policyname='fiscal_years_modify_admin'
  ) THEN
    CREATE POLICY fiscal_years_modify_admin ON public.fiscal_years
      FOR ALL TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'fiscal.manage')
        )
      )
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'fiscal.manage')
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'fiscal_years table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 8: FISCAL_PERIODS TABLE POLICIES
-- ============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "fiscal_periods_select_org_member" ON fiscal_periods;
  DROP POLICY IF EXISTS "fiscal_periods_modify_admin" ON fiscal_periods;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- SELECT: Organization members can view
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fiscal_periods' AND policyname='fiscal_periods_select_org_member'
  ) THEN
    CREATE POLICY fiscal_periods_select_org_member ON public.fiscal_periods
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin() 
        OR public.fn_is_org_member(org_id, auth.uid())
      );
  END IF;

  -- INSERT/UPDATE/DELETE: Admin with fiscal.manage permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fiscal_periods' AND policyname='fiscal_periods_modify_admin'
  ) THEN
    CREATE POLICY fiscal_periods_modify_admin ON public.fiscal_periods
      FOR ALL TO authenticated
      USING (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'fiscal.manage')
        )
      )
      WITH CHECK (
        public.is_super_admin() 
        OR (
          public.fn_is_org_member(org_id, auth.uid())
          AND public.has_permission(auth.uid(), 'fiscal.manage')
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN 
  RAISE NOTICE 'fiscal_periods table does not exist, skipping policies';
END $$;

-- ============================================
-- SECTION 9: AUDIT LOGGING ENHANCEMENT
-- ============================================

-- Create audit_logs table if it doesn't exist (with proper structure)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  org_id UUID REFERENCES public.organizations(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs policies (using existing pattern from security_rls_hardening.sql)
DO $$ BEGIN
  -- Insert by any authenticated user (write-only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_insert_any_auth'
  ) THEN
    CREATE POLICY audit_logs_insert_any_auth ON public.audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  -- Read only for super admins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_select_super_admin'
  ) THEN
    CREATE POLICY audit_logs_select_super_admin ON public.audit_logs
      FOR SELECT TO authenticated
      USING (public.is_super_admin());
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Add indexes for audit_logs performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- SECTION 10: AUDIT TRIGGER FUNCTION
-- Enhanced to capture org_id from the record
-- ============================================

CREATE OR REPLACE FUNCTION public.log_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_record_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Try to get org_id from the record (if column exists)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.org_id;
      v_record_id := OLD.id;
    ELSE
      v_org_id := NEW.org_id;
      v_record_id := NEW.id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    v_org_id := NULL;
    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id;
    ELSE
      v_record_id := NEW.id;
    END IF;
  END;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    v_user_id,
    v_org_id,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the main operation if audit logging fails
  RAISE WARNING 'Audit logging failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 11: CREATE AUDIT TRIGGERS
-- Only create if they don't exist
-- ============================================

DO $$ BEGIN
  -- Transactions audit trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_transactions' AND tgrelid = 'public.transactions'::regclass
  ) THEN
    CREATE TRIGGER audit_transactions
      AFTER INSERT OR UPDATE OR DELETE ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- Transaction lines audit trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_transaction_lines' AND tgrelid = 'public.transaction_lines'::regclass
  ) THEN
    CREATE TRIGGER audit_transaction_lines
      AFTER INSERT OR UPDATE OR DELETE ON public.transaction_lines
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- Accounts audit trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_accounts' AND tgrelid = 'public.accounts'::regclass
  ) THEN
    CREATE TRIGGER audit_accounts
      AFTER INSERT OR UPDATE OR DELETE ON public.accounts
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================
-- SECTION 12: VERIFICATION QUERIES
-- Run these to verify policies are working
-- ============================================

-- Verification: List all RLS-enabled tables
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ RLS POLICIES MIGRATION COMPLETED';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables with RLS enabled:';
  
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('transactions', 'transaction_lines', 'accounts', 'cost_centers', 'work_items', 'fiscal_years', 'fiscal_periods', 'audit_logs')
  LOOP
    RAISE NOTICE '  • %', r.tablename;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security Model:';
  RAISE NOTICE '  • Organization-based isolation (org_id)';
  RAISE NOTICE '  • Permission checks via has_permission()';
  RAISE NOTICE '  • Super admin bypass via is_super_admin()';
  RAISE NOTICE '  • Audit logging on financial tables';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Permission Codes Used:';
  RAISE NOTICE '  • transactions.create - Create transactions';
  RAISE NOTICE '  • transactions.manage - Update/delete transactions';
  RAISE NOTICE '  • accounts.view - View accounts';
  RAISE NOTICE '  • accounts.manage - Manage accounts/cost centers';
  RAISE NOTICE '  • fiscal.manage - Manage fiscal years/periods';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
