-- Final fix: Simple query without DISTINCT and ORDER BY issues
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
  SELECT 
    t.id,
    t.entry_number::TEXT,
    t.entry_date,
    COALESCE(t.description, '')::TEXT,
    COALESCE(t.status, 'pending'),
    COUNT(*) FILTER (WHERE tl.line_status = 'pending')::BIGINT,
    COUNT(*)::BIGINT,
    MIN(tl.submitted_for_approval_at)
  FROM transactions t
  INNER JOIN transaction_lines tl ON tl.transaction_id = t.id
  WHERE tl.line_status = 'pending'
  GROUP BY t.id, t.entry_number, t.entry_date, t.description, t.status
  ORDER BY MIN(tl.submitted_for_approval_at) DESC NULLS LAST;
END;
$function$;

GRANT EXECUTE ON FUNCTION get_transactions_with_pending_lines TO authenticated;
