-- Simplified version - just get transactions with pending lines assigned to user
DROP FUNCTION IF EXISTS get_transactions_with_pending_lines(UUID);

CREATE FUNCTION get_transactions_with_pending_lines(p_user_id UUID)
RETURNS TABLE (
  transaction_id UUID,
  entry_number TEXT,
  entry_date DATE,
  description TEXT,
  status VARCHAR,
  pending_lines_count BIGINT,
  total_lines_count BIGINT,
  submitted_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    t.id,
    t.entry_number::TEXT,
    t.entry_date,
    COALESCE(t.description, '')::TEXT,
    COALESCE(t.status, 'pending'),
    (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = t.id AND line_status = 'pending' AND assigned_approver_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = t.id)::BIGINT,
    (SELECT MIN(submitted_for_approval_at) FROM transaction_lines WHERE transaction_id = t.id AND line_status = 'pending')
  FROM transactions t
  WHERE EXISTS (
    SELECT 1 
    FROM transaction_lines tl
    WHERE tl.transaction_id = t.id 
      AND tl.line_status = 'pending'
      AND tl.assigned_approver_id = p_user_id
  )
  ORDER BY (SELECT MIN(submitted_for_approval_at) FROM transaction_lines WHERE transaction_id = t.id AND line_status = 'pending') DESC NULLS LAST;
END;
$function$;

GRANT EXECUTE ON FUNCTION get_transactions_with_pending_lines TO authenticated;
