-- 2026-01-21: Create sub_tree table and RPC functions
-- This migration creates the sub_tree (expenses categories) table and related RPC functions

-- Create sub_tree table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sub_tree (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.sub_tree(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(300) NOT NULL CHECK (length(description) >= 1 AND length(description) <= 300),
  add_to_cost BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  level INTEGER DEFAULT 1,
  path ltree,
  linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_code_per_org UNIQUE(org_id, code),
  CONSTRAINT valid_level CHECK (level >= 1 AND level <= 4)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_id ON public.sub_tree(org_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_parent_id ON public.sub_tree(parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_parent ON public.sub_tree(org_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_path ON public.sub_tree(org_id, path);
CREATE INDEX IF NOT EXISTS idx_sub_tree_is_active ON public.sub_tree(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_tree_linked_account ON public.sub_tree(linked_account_id);

-- Create view for sub_tree with joined account info
CREATE OR REPLACE VIEW public.sub_tree_full AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.level,
  st.path::text as path,
  st.linked_account_id,
  a.code as linked_account_code,
  a.name as linked_account_name,
  (SELECT COUNT(*)::BIGINT FROM public.sub_tree st2 WHERE st2.parent_id = st.id) as child_count,
  (SELECT EXISTS(SELECT 1 FROM public.transaction_lines tl WHERE tl.sub_tree_id = st.id LIMIT 1)) as has_transactions,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id
ORDER BY st.path;

-- Create view v2 (optimized version)
CREATE OR REPLACE VIEW public.sub_tree_full_v2 AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.level,
  st.path::text as path,
  st.linked_account_id,
  a.code as linked_account_code,
  a.name as linked_account_name,
  (SELECT COUNT(*)::BIGINT FROM public.sub_tree st2 WHERE st2.org_id = st.org_id AND st2.parent_id = st.id) as child_count,
  (SELECT EXISTS(SELECT 1 FROM public.transaction_lines tl WHERE tl.sub_tree_id = st.id LIMIT 1)) as has_transactions,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id;

-- RPC: Get next code for a sub_tree node
CREATE OR REPLACE FUNCTION public.rpc_sub_tree_next_code(
  p_org_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
  v_max_code INTEGER;
  v_prefix VARCHAR;
BEGIN
  -- Get the prefix from parent if exists
  IF p_parent_id IS NOT NULL THEN
    SELECT code INTO v_prefix FROM public.sub_tree WHERE id = p_parent_id;
    v_prefix := COALESCE(v_prefix, '') || '.';
  ELSE
    v_prefix := '';
  END IF;

  -- Get the max numeric code at this level
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM LENGTH(v_prefix) + 1) AS INTEGER)), 0)
  INTO v_max_code
  FROM public.sub_tree
  WHERE org_id = p_org_id
    AND (p_parent_id IS NULL AND parent_id IS NULL OR p_parent_id IS NOT NULL AND parent_id = p_parent_id)
    AND code LIKE v_prefix || '%';

  RETURN v_prefix || LPAD((v_max_code + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Create sub_tree node
CREATE OR REPLACE FUNCTION public.create_sub_tree(
  p_org_id UUID,
  p_code VARCHAR,
  p_description VARCHAR,
  p_add_to_cost BOOLEAN DEFAULT FALSE,
  p_parent_id UUID DEFAULT NULL,
  p_linked_account_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_level INTEGER;
  v_path ltree;
  v_parent_path ltree;
  v_desc_trimmed VARCHAR;
BEGIN
  -- Trim and validate description (handle NULL properly)
  v_desc_trimmed := TRIM(COALESCE(p_description, ''));
  
  IF LENGTH(v_desc_trimmed) < 1 OR LENGTH(v_desc_trimmed) > 300 THEN
    RAISE EXCEPTION 'الوصف مطلوب (1..300)';
  END IF;

  -- Determine level and path
  IF p_parent_id IS NULL THEN
    v_level := 1;
    v_path := p_code::ltree;
  ELSE
    SELECT level, path INTO v_level, v_parent_path FROM public.sub_tree WHERE id = p_parent_id;
    IF v_level IS NULL THEN
      RAISE EXCEPTION 'Parent not found';
    END IF;
    IF v_level >= 4 THEN
      RAISE EXCEPTION 'Cannot add children beyond level 4';
    END IF;
    v_level := v_level + 1;
    v_path := v_parent_path || p_code::ltree;
  END IF;

  -- Insert the new record
  INSERT INTO public.sub_tree (
    org_id, parent_id, code, description, add_to_cost, is_active, level, path, linked_account_id, created_by
  ) VALUES (
    p_org_id, p_parent_id, TRIM(COALESCE(p_code, '')), v_desc_trimmed, p_add_to_cost, TRUE, v_level, v_path, p_linked_account_id, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update sub_tree node
CREATE OR REPLACE FUNCTION public.update_sub_tree(
  p_id UUID,
  p_code VARCHAR DEFAULT NULL,
  p_description VARCHAR DEFAULT NULL,
  p_add_to_cost BOOLEAN DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_linked_account_id UUID DEFAULT NULL,
  p_clear_linked_account BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_desc_trimmed VARCHAR;
BEGIN
  -- Validate description if provided (handle NULL properly)
  IF p_description IS NOT NULL THEN
    v_desc_trimmed := TRIM(p_description);
    IF LENGTH(v_desc_trimmed) < 1 OR LENGTH(v_desc_trimmed) > 300 THEN
      RAISE EXCEPTION 'الوصف مطلوب (1..300)';
    END IF;
  END IF;

  UPDATE public.sub_tree
  SET
    code = COALESCE(NULLIF(TRIM(p_code), ''), code),
    description = COALESCE(v_desc_trimmed, description),
    add_to_cost = COALESCE(p_add_to_cost, add_to_cost),
    is_active = COALESCE(p_is_active, is_active),
    linked_account_id = CASE
      WHEN p_clear_linked_account THEN NULL
      WHEN p_linked_account_id IS NOT NULL THEN p_linked_account_id
      ELSE linked_account_id
    END,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = auth.uid()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Delete sub_tree node
CREATE OR REPLACE FUNCTION public.delete_sub_tree(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.sub_tree WHERE id = p_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure transaction_lines has sub_tree_id column
ALTER TABLE public.transaction_lines
ADD COLUMN IF NOT EXISTS sub_tree_id UUID REFERENCES public.sub_tree(id) ON DELETE SET NULL;

-- Create index on transaction_lines.sub_tree_id for performance
CREATE INDEX IF NOT EXISTS idx_transaction_lines_sub_tree_id ON public.transaction_lines(sub_tree_id);

-- Enable RLS on sub_tree table
ALTER TABLE public.sub_tree ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view sub_tree for their organizations
CREATE POLICY "sub_tree_view_policy" ON public.sub_tree
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = sub_tree.org_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert sub_tree for their organizations
CREATE POLICY "sub_tree_insert_policy" ON public.sub_tree
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = org_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update sub_tree for their organizations
CREATE POLICY "sub_tree_update_policy" ON public.sub_tree
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = org_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete sub_tree for their organizations
CREATE POLICY "sub_tree_delete_policy" ON public.sub_tree
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = org_id
        AND om.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON public.sub_tree TO authenticated;
GRANT INSERT ON public.sub_tree TO authenticated;
GRANT UPDATE ON public.sub_tree TO authenticated;
GRANT DELETE ON public.sub_tree TO authenticated;
GRANT SELECT ON public.sub_tree_full TO authenticated;
GRANT SELECT ON public.sub_tree_full_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sub_tree_next_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sub_tree TO authenticated;
