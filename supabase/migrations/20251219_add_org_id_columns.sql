-- ============================================
-- ADD org_id COLUMNS TO TABLES MISSING IT
-- For consistent multi-tenant isolation
-- ============================================
-- 
-- GENERATED: December 19, 2025
-- PURPOSE: Add org_id to all tables that need organization isolation
--          but currently lack the column
--
-- TABLES TO MODIFY:
-- 1. approval_actions (link via approval_requests.org_id)
-- 2. approval_steps (link via approval_workflows.org_id)
-- 3. document_associations (link via documents.org_id)
-- 4. document_versions (link via documents.org_id)
-- 5. purchase_invoice_status_history (link via purchase_invoices.org_id)
-- 6. transaction_audit (link via transactions.org_id)
-- 7. transaction_line_reviews (link via transaction_lines.org_id)
-- 8. report_datasets (system-wide, add org_id for org-specific datasets)
-- 9. report_execution_logs (add org_id for audit trail)
-- 10. account_prefix_map (add org_id for org-specific prefix rules)
-- 11. approved_emails (add org_id for org-specific email whitelist)
--
-- EXCLUDED (system-wide tables):
-- - debug_settings (dev only, no org isolation needed)
-- - roles, permissions, role_permissions (system-wide definitions)
-- ============================================

SET search_path = public;

-- ============================================
-- SECTION 1: APPROVAL TABLES
-- ============================================

-- approval_actions: Add org_id, populate from approval_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'approval_actions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE approval_actions ADD COLUMN org_id UUID;
    
    -- Populate from parent approval_requests
    UPDATE approval_actions aa
    SET org_id = ar.org_id
    FROM approval_requests ar
    WHERE aa.request_id = ar.id;
    
    -- Add foreign key constraint
    ALTER TABLE approval_actions 
    ADD CONSTRAINT fk_approval_actions_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_approval_actions_org_id ON approval_actions(org_id);
    
    RAISE NOTICE '✅ Added org_id to approval_actions';
  ELSE
    RAISE NOTICE '⏭️ approval_actions already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to approval_actions: %', SQLERRM;
END $$;

-- approval_steps: Add org_id, populate from approval_workflows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'approval_steps' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE approval_steps ADD COLUMN org_id UUID;
    
    -- Populate from parent approval_workflows
    UPDATE approval_steps ast
    SET org_id = aw.org_id
    FROM approval_workflows aw
    WHERE ast.workflow_id = aw.id;
    
    -- Add foreign key constraint
    ALTER TABLE approval_steps 
    ADD CONSTRAINT fk_approval_steps_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_approval_steps_org_id ON approval_steps(org_id);
    
    RAISE NOTICE '✅ Added org_id to approval_steps';
  ELSE
    RAISE NOTICE '⏭️ approval_steps already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to approval_steps: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 2: DOCUMENT TABLES
-- ============================================

-- document_associations: Add org_id, populate from documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'document_associations' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE document_associations ADD COLUMN org_id UUID;
    
    -- Populate from parent documents
    UPDATE document_associations da
    SET org_id = d.org_id
    FROM documents d
    WHERE da.document_id = d.id;
    
    -- Add foreign key constraint
    ALTER TABLE document_associations 
    ADD CONSTRAINT fk_document_associations_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_document_associations_org_id ON document_associations(org_id);
    
    RAISE NOTICE '✅ Added org_id to document_associations';
  ELSE
    RAISE NOTICE '⏭️ document_associations already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to document_associations: %', SQLERRM;
END $$;

-- document_versions: Add org_id, populate from documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'document_versions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE document_versions ADD COLUMN org_id UUID;
    
    -- Populate from parent documents
    UPDATE document_versions dv
    SET org_id = d.org_id
    FROM documents d
    WHERE dv.document_id = d.id;
    
    -- Add foreign key constraint
    ALTER TABLE document_versions 
    ADD CONSTRAINT fk_document_versions_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_document_versions_org_id ON document_versions(org_id);
    
    RAISE NOTICE '✅ Added org_id to document_versions';
  ELSE
    RAISE NOTICE '⏭️ document_versions already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to document_versions: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 3: PURCHASE INVOICE TABLES
-- ============================================

-- purchase_invoice_status_history: Add org_id, populate from purchase_invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_invoice_status_history' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE purchase_invoice_status_history ADD COLUMN org_id UUID;
    
    -- Populate from parent purchase_invoices
    UPDATE purchase_invoice_status_history pish
    SET org_id = pi.org_id
    FROM purchase_invoices pi
    WHERE pish.invoice_id = pi.id;
    
    -- Add foreign key constraint
    ALTER TABLE purchase_invoice_status_history 
    ADD CONSTRAINT fk_purchase_invoice_status_history_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_purchase_invoice_status_history_org_id ON purchase_invoice_status_history(org_id);
    
    RAISE NOTICE '✅ Added org_id to purchase_invoice_status_history';
  ELSE
    RAISE NOTICE '⏭️ purchase_invoice_status_history already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to purchase_invoice_status_history: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 4: TRANSACTION AUDIT TABLES
-- ============================================

-- transaction_audit: Add org_id, populate from transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transaction_audit' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE transaction_audit ADD COLUMN org_id UUID;
    
    -- Populate from parent transactions
    UPDATE transaction_audit ta
    SET org_id = t.org_id
    FROM transactions t
    WHERE ta.transaction_id = t.id;
    
    -- Add foreign key constraint
    ALTER TABLE transaction_audit 
    ADD CONSTRAINT fk_transaction_audit_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_transaction_audit_org_id ON transaction_audit(org_id);
    
    RAISE NOTICE '✅ Added org_id to transaction_audit';
  ELSE
    RAISE NOTICE '⏭️ transaction_audit already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to transaction_audit: %', SQLERRM;
END $$;

-- transaction_line_reviews: Add org_id, populate from transaction_lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transaction_line_reviews' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE transaction_line_reviews ADD COLUMN org_id UUID;
    
    -- Populate from parent transaction_lines
    UPDATE transaction_line_reviews tlr
    SET org_id = tl.org_id
    FROM transaction_lines tl
    WHERE tlr.line_id = tl.id;
    
    -- Add foreign key constraint
    ALTER TABLE transaction_line_reviews 
    ADD CONSTRAINT fk_transaction_line_reviews_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_transaction_line_reviews_org_id ON transaction_line_reviews(org_id);
    
    RAISE NOTICE '✅ Added org_id to transaction_line_reviews';
  ELSE
    RAISE NOTICE '⏭️ transaction_line_reviews already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to transaction_line_reviews: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 5: REPORT TABLES
-- ============================================

-- report_datasets: Add org_id for org-specific datasets (NULL = system-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'report_datasets' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE report_datasets ADD COLUMN org_id UUID;
    
    -- Leave existing records as NULL (system-wide datasets)
    -- Future org-specific datasets will have org_id set
    
    -- Add foreign key constraint (nullable)
    ALTER TABLE report_datasets 
    ADD CONSTRAINT fk_report_datasets_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_report_datasets_org_id ON report_datasets(org_id);
    
    RAISE NOTICE '✅ Added org_id to report_datasets (nullable for system-wide datasets)';
  ELSE
    RAISE NOTICE '⏭️ report_datasets already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to report_datasets: %', SQLERRM;
END $$;

-- report_execution_logs: Add org_id for audit trail
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'report_execution_logs' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE report_execution_logs ADD COLUMN org_id UUID;
    
    -- Populate from report_definitions if possible
    UPDATE report_execution_logs rel
    SET org_id = rd.org_id
    FROM report_definitions rd
    WHERE rel.report_definition_id = rd.id;
    
    -- Add foreign key constraint (nullable)
    ALTER TABLE report_execution_logs 
    ADD CONSTRAINT fk_report_execution_logs_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_report_execution_logs_org_id ON report_execution_logs(org_id);
    
    RAISE NOTICE '✅ Added org_id to report_execution_logs';
  ELSE
    RAISE NOTICE '⏭️ report_execution_logs already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to report_execution_logs: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 6: CONFIG TABLES
-- ============================================

-- account_prefix_map: Add org_id for org-specific prefix rules (NULL = system-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'account_prefix_map' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE account_prefix_map ADD COLUMN org_id UUID;
    
    -- Leave existing records as NULL (system-wide defaults)
    -- Orgs can create their own prefix rules with org_id set
    
    -- Add foreign key constraint (nullable)
    ALTER TABLE account_prefix_map 
    ADD CONSTRAINT fk_account_prefix_map_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_account_prefix_map_org_id ON account_prefix_map(org_id);
    
    RAISE NOTICE '✅ Added org_id to account_prefix_map (nullable for system-wide defaults)';
  ELSE
    RAISE NOTICE '⏭️ account_prefix_map already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to account_prefix_map: %', SQLERRM;
END $$;

-- approved_emails: Add org_id for org-specific email whitelist (NULL = system-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'approved_emails' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE approved_emails ADD COLUMN org_id UUID;
    
    -- Leave existing records as NULL (system-wide approved emails)
    -- Orgs can add their own approved emails with org_id set
    
    -- Add foreign key constraint (nullable)
    ALTER TABLE approved_emails 
    ADD CONSTRAINT fk_approved_emails_org 
    FOREIGN KEY (org_id) REFERENCES organizations(id);
    
    -- Create index for RLS performance
    CREATE INDEX IF NOT EXISTS idx_approved_emails_org_id ON approved_emails(org_id);
    
    RAISE NOTICE '✅ Added org_id to approved_emails (nullable for system-wide)';
  ELSE
    RAISE NOTICE '⏭️ approved_emails already has org_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error adding org_id to approved_emails: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 7: VERIFICATION
-- ============================================

DO $$
DECLARE
  v_tables_updated INTEGER := 0;
  v_table_name TEXT;
  v_has_org_id BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ ORG_ID COLUMN MIGRATION COMPLETED';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables Modified:';
  
  FOR v_table_name IN 
    SELECT unnest(ARRAY[
      'approval_actions',
      'approval_steps',
      'document_associations',
      'document_versions',
      'purchase_invoice_status_history',
      'transaction_audit',
      'transaction_line_reviews',
      'report_datasets',
      'report_execution_logs',
      'account_prefix_map',
      'approved_emails'
    ])
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'org_id'
    ) INTO v_has_org_id;
    
    IF v_has_org_id THEN
      RAISE NOTICE '  ✅ % - org_id column present', v_table_name;
      v_tables_updated := v_tables_updated + 1;
    ELSE
      RAISE NOTICE '  ❌ % - org_id column MISSING', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary: %/11 tables now have org_id column', v_tables_updated;
  RAISE NOTICE '';
  RAISE NOTICE '🔜 Next Step: Run 20251219_comprehensive_rls_policies.sql';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
