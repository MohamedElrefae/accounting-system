-- Fix sub_tree table permissions for authenticated users

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "sub_tree_view_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_insert_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_update_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_delete_policy" ON public.sub_tree;

-- Disable RLS temporarily to allow operations
ALTER TABLE public.sub_tree DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simpler policies
ALTER TABLE public.sub_tree ENABLE ROW LEVEL SECURITY;

-- Simple policy: Allow all authenticated users to view
CREATE POLICY "sub_tree_select_all" ON public.sub_tree
  FOR SELECT
  TO authenticated
  USING (true);

-- Simple policy: Allow all authenticated users to insert
CREATE POLICY "sub_tree_insert_all" ON public.sub_tree
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Simple policy: Allow all authenticated users to update
CREATE POLICY "sub_tree_update_all" ON public.sub_tree
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simple policy: Allow all authenticated users to delete
CREATE POLICY "sub_tree_delete_all" ON public.sub_tree
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_tree TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify policies
SELECT tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'sub_tree'
ORDER BY policyname;
