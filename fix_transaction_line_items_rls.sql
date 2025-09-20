-- Fix transaction_line_items RLS policies
-- This assumes you're using org-based security similar to other tables

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Users can view transaction_line_items in their org" ON transaction_line_items;
DROP POLICY IF EXISTS "Users can insert transaction_line_items in their org" ON transaction_line_items;
DROP POLICY IF EXISTS "Users can update transaction_line_items in their org" ON transaction_line_items;
DROP POLICY IF EXISTS "Users can delete transaction_line_items in their org" ON transaction_line_items;

-- Enable RLS on the table
ALTER TABLE transaction_line_items ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy
CREATE POLICY "Users can view transaction_line_items in their org" ON transaction_line_items
    FOR SELECT USING (
        org_id = current_setting('app.current_org_id', true)::uuid
    );

-- Create INSERT policy
CREATE POLICY "Users can insert transaction_line_items in their org" ON transaction_line_items
    FOR INSERT WITH CHECK (
        org_id = current_setting('app.current_org_id', true)::uuid
    );

-- Create UPDATE policy
CREATE POLICY "Users can update transaction_line_items in their org" ON transaction_line_items
    FOR UPDATE USING (
        org_id = current_setting('app.current_org_id', true)::uuid
    ) WITH CHECK (
        org_id = current_setting('app.current_org_id', true)::uuid
    );

-- Create DELETE policy
CREATE POLICY "Users can delete transaction_line_items in their org" ON transaction_line_items
    FOR DELETE USING (
        org_id = current_setting('app.current_org_id', true)::uuid
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_line_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE transaction_line_items_id_seq TO authenticated;

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'transaction_line_items'
ORDER BY cmd, policyname;