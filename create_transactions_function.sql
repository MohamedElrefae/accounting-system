-- Drop existing function
DROP FUNCTION IF EXISTS get_transactions_with_pending_lines(UUID);

-- Create function to get transactions with pending lines for a user
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
    COUNT(*) FILTER (WHERE tl.line_status = 'pending'),
    COUNT(*),
    MIN(tl.submitted_for_approval_at)
  FROM transactions t
  INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
  WHERE EXISTS (
    SELECT 1 
    FROM transaction_lines tl2 
    WHERE tl2.transaction_id = t.id 
      AND tl2.line_status = 'pending'
      AND tl2.assigned_approver_id = p_user_id
  )
  GROUP BY t.id, t.entry_number, t.entry_date, t.description, t.status
  HAVING COUNT(*) FILTER (WHERE tl.line_status = 'pending' AND tl.assigned_approver_id = p_user_id) > 0
  ORDER BY MIN(tl.submitted_for_approval_at) DESC;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_transactions_with_pending_lines TO authenticated;
