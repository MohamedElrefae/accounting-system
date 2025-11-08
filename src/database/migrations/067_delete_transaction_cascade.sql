-- 067_delete_transaction_cascade.sql
-- Adds company setting to optionally renumber transactions after deletion,
-- and a secured RPC to delete a transaction with full cascade and optional renumbering.

BEGIN;

-- 1) Add setting to company_config (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_config' AND column_name = 'renumber_transactions_after_delete'
  ) THEN
    ALTER TABLE public.company_config
      ADD COLUMN renumber_transactions_after_delete boolean NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.company_config.renumber_transactions_after_delete IS 'When true, resequence entry_number after deletions (intended for pre-go-live/testing only).';
  END IF;
END $$;

-- 2) Helper to fetch single company config (latest row)
CREATE OR REPLACE FUNCTION public.fn_company_config()
RETURNS public.company_config
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.company_config ORDER BY created_at DESC NULLS LAST LIMIT 1;
$$;

-- 3) Cascade delete RPC with permission checks
CREATE OR REPLACE FUNCTION public.sp_delete_transaction_cascade(
  p_transaction_id uuid,
  p_force boolean DEFAULT false,
  p_renumber boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_can_manage boolean := false;
  v_is_super boolean := false;
  v_is_owner boolean := false;
  v_is_draft boolean := false;
  v_do_renumber boolean := false;
  v_cfg public.company_config;
  v_prefix text;
  v_sep text;
  v_use_ym boolean;
  v_len int;
  v_group_key text;
BEGIN
  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'p_transaction_id is required';
  END IF;

  -- Lock and read the transaction
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  -- Permission checks
  v_can_manage := public.has_permission(auth.uid(), 'transactions.manage');
  SELECT COALESCE(up.is_super_admin, false) INTO v_is_super FROM public.user_profiles up WHERE up.id = auth.uid();
  v_is_owner := (v_tx.created_by IS NOT NULL AND v_tx.created_by = auth.uid());
  v_is_draft := (COALESCE(v_tx.approval_status, 'draft') = 'draft' AND COALESCE(v_tx.is_posted, false) = false);

  IF v_is_super THEN
    -- Super admin can delete any transaction; p_force ignored
  ELSIF v_can_manage THEN
    IF v_tx.is_posted AND NOT p_force THEN
      RAISE EXCEPTION 'Not allowed to delete posted transaction without force';
    END IF;
  ELSE
    -- Regular user: must be owner and draft and have transactions.delete permission
    IF NOT (v_is_owner AND v_is_draft AND public.has_permission(auth.uid(), 'transactions.delete')) THEN
      RAISE EXCEPTION 'Not allowed to delete this transaction';
    END IF;
  END IF;

  -- Delete dependents first to satisfy FK constraints
  -- Child cost-analysis line items referencing transaction_lines
  DELETE FROM public.transaction_line_items tli
  USING public.transaction_lines tl
  WHERE tl.transaction_id = v_tx.id AND tli.transaction_line_id = tl.id;

  -- Transaction lines
  DELETE FROM public.transaction_lines tl WHERE tl.transaction_id = v_tx.id;

  -- Any audit rows (optional, otherwise ON DELETE CASCADE could keep it)
  DELETE FROM public.transaction_audit ta WHERE ta.transaction_id = v_tx.id;

  -- Finally, the transaction
  DELETE FROM public.transactions t WHERE t.id = v_tx.id;

  -- Determine if we should renumber remaining transactions
  SELECT * INTO v_cfg FROM public.fn_company_config();
  v_do_renumber := COALESCE(p_renumber, COALESCE(v_cfg.renumber_transactions_after_delete, false));
  v_prefix := COALESCE(v_cfg.transaction_number_prefix, 'JE');
  v_sep := COALESCE(v_cfg.transaction_number_separator, '-');
  v_use_ym := COALESCE(v_cfg.transaction_number_use_year_month, true);
  v_len := COALESCE(v_cfg.transaction_number_length, 4);

  IF v_do_renumber THEN
    -- Compute grouping key for remaining transactions sharing the same prefix and (optionally) yearmonth
    IF v_use_ym THEN
      v_group_key := CONCAT(v_prefix, v_sep, to_char(v_tx.entry_date, 'YYYYMM'));
      -- Renumber only within the same year-month bucket
      WITH bucket AS (
        SELECT id, entry_date
        FROM public.transactions
        WHERE entry_number ILIKE (v_group_key || v_sep || '%')
        ORDER BY entry_date ASC, created_at ASC, id ASC
      ), seq AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY entry_date ASC, id ASC) AS rn FROM bucket
      )
      UPDATE public.transactions t
      SET entry_number = CONCAT(v_group_key, v_sep, LPAD(seq.rn::text, v_len, '0')),
          updated_at = now()
      FROM seq
      WHERE t.id = seq.id;
    ELSE
      v_group_key := v_prefix;
      WITH bucket AS (
        SELECT id, entry_date FROM public.transactions WHERE entry_number ILIKE (v_group_key || v_sep || '%') ORDER BY entry_date ASC, created_at ASC, id ASC
      ), seq AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY entry_date ASC, id ASC) AS rn FROM bucket
      )
      UPDATE public.transactions t
      SET entry_number = CONCAT(v_group_key, v_sep, LPAD(seq.rn::text, v_len, '0')),
          updated_at = now()
      FROM seq
      WHERE t.id = seq.id;
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true, 'renumber_applied', v_do_renumber);
END;
$$;

-- Restrict execution to authenticated users; function itself enforces permission checks
DO $$ BEGIN
  BEGIN GRANT EXECUTE ON FUNCTION public.sp_delete_transaction_cascade(uuid, boolean, boolean) TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

COMMIT;