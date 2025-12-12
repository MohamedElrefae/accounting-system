-- Fix for line items catalog dropdown
-- Create the v_line_items_browse view that the catalog service needs

-- Drop existing view if it exists
DROP VIEW IF EXISTS v_line_items_browse CASCADE;

-- Create the browse view for line items catalog
CREATE VIEW v_line_items_browse AS
SELECT 
    li.id,
    li.org_id,
    li.code,
    li.name,
    li.name_ar,
    li.parent_id,
    COALESCE(li.level, 0) as level,
    COALESCE(li.path, '') as path,
    COALESCE(li.is_selectable, true) as is_selectable,
    li.item_type,
    li.specifications,
    li.base_unit_of_measure,
    li.standard_cost,
    COALESCE(li.is_active, true) as is_active,
    li.created_at,
    li.updated_at
FROM line_items li
WHERE li.org_id IS NOT NULL;

-- Grant permissions
GRANT SELECT ON v_line_items_browse TO authenticated, service_role, anon;

-- Create indexes on the underlying table for performance
CREATE INDEX IF NOT EXISTS idx_line_items_org_id ON line_items(org_id);
CREATE INDEX IF NOT EXISTS idx_line_items_path ON line_items(path);
CREATE INDEX IF NOT EXISTS idx_line_items_active ON line_items(org_id, is_active) WHERE is_active = true;

-- Test query to verify the view works
-- SELECT * FROM v_line_items_browse WHERE org_id = 'your-org-id' LIMIT 5;
