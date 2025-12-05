-- Migration: Add wizard draft support to transactions
-- This allows temporary draft transactions during wizard flow
-- These drafts are filtered from normal queries and cleaned up automatically

-- ============================================================
-- 1. Add wizard draft columns to transactions table
-- ============================================================

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_wizard_draft BOOLEAN DEFAULT FALSE;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS wizard_draft_created_at TIMESTAMPTZ;

COMMENT ON COLUMN transactions.is_wizard_draft IS 'True for temporary drafts created during wizard flow. These should be filtered from normal queries.';
COMMENT ON COLUMN transactions.wizard_draft_created_at IS 'Timestamp when wizard draft was created. Used for cleanup of orphaned drafts.';

-- ============================================================
-- 2. Create index for efficient filtering
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_wizard_draft 
ON transactions (is_wizard_draft) 
WHERE is_wizard_draft = TRUE;

-- ============================================================
-- 3. Create cleanup function for orphaned drafts (older than 24 hours)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_wizard_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete wizard drafts older than 24 hours
  WITH deleted AS (
    DELETE FROM transactions
    WHERE is_wizard_draft = TRUE
      AND wizard_draft_created_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_wizard_drafts() TO authenticated;

COMMENT ON FUNCTION cleanup_wizard_drafts() IS 'Cleanup orphaned wizard drafts older than 24 hours. Call periodically via cron or manually.';

-- ============================================================
-- 4. Create RPC to delete a specific wizard draft (user's own)
-- ============================================================

CREATE OR REPLACE FUNCTION delete_wizard_draft(p_transaction_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM transactions
  WHERE id = p_transaction_id
    AND is_wizard_draft = TRUE
    AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_wizard_draft(UUID) TO authenticated;

COMMENT ON FUNCTION delete_wizard_draft(UUID) IS 'Delete a wizard draft transaction. Only the creator can delete their own drafts.';

-- ============================================================
-- 5. Update existing queries/views to exclude wizard drafts
-- NOTE: You may need to update any views or functions that 
-- select from transactions to add: WHERE is_wizard_draft = FALSE
-- ============================================================

-- Example: If you have a view, update it like this:
-- CREATE OR REPLACE VIEW transactions_view AS
-- SELECT * FROM transactions WHERE is_wizard_draft = FALSE OR is_wizard_draft IS NULL;

