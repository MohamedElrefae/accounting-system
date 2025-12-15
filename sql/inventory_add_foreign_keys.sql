-- ============================================================================
-- Inventory Module: Foreign Key Constraints
-- ============================================================================
-- Purpose: Add referential integrity constraints to inventory tables
-- Status: REQUIRES DBA APPROVAL - DO NOT RUN WITHOUT DATA VALIDATION
-- Risk: HIGH - May fail if orphaned records exist
-- 
-- Pre-requisites:
--   1. Backup database
--   2. Run data validation queries (see below)
--   3. Clean up orphaned records
--   4. Test in staging environment first
-- ============================================================================

-- ============================================================================
-- STEP 1: Data Validation Queries (Run these FIRST)
-- ============================================================================

-- Check for orphaned location_from_id references
SELECT COUNT(*) as orphaned_location_from
FROM inventory_documents d
WHERE d.location_from_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_locations l 
    WHERE l.id = d.location_from_id
  );

-- Check for orphaned location_to_id references
SELECT COUNT(*) as orphaned_location_to
FROM inventory_documents d
WHERE d.location_to_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_locations l 
    WHERE l.id = d.location_to_id
  );

-- Check for orphaned project_id references in documents
SELECT COUNT(*) as orphaned_projects
FROM inventory_documents d
WHERE d.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = d.project_id
  );

-- Check for orphaned cost_center_id references in documents
SELECT COUNT(*) as orphaned_cost_centers
FROM inventory_documents d
WHERE d.cost_center_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cost_centers cc 
    WHERE cc.id = d.cost_center_id
  );

-- Check for orphaned document_id references in lines
SELECT COUNT(*) as orphaned_document_lines
FROM inventory_document_lines l
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_documents d 
    WHERE d.id = l.document_id
  );

-- Check for orphaned material_id references
SELECT COUNT(*) as orphaned_materials
FROM inventory_document_lines l
WHERE NOT EXISTS (
    SELECT 1 FROM materials m 
    WHERE m.id = l.material_id
  );

-- Check for orphaned uom_id references in lines
SELECT COUNT(*) as orphaned_uoms_in_lines
FROM inventory_document_lines l
WHERE NOT EXISTS (
    SELECT 1 FROM uoms u 
    WHERE u.id = l.uom_id
  );

-- Check for orphaned location_id references in lines
SELECT COUNT(*) as orphaned_locations_in_lines
FROM inventory_document_lines l
WHERE l.location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_locations loc 
    WHERE loc.id = l.location_id
  );

-- Check for orphaned base_uom_id in materials
SELECT COUNT(*) as orphaned_base_uoms
FROM materials m
WHERE NOT EXISTS (
    SELECT 1 FROM uoms u 
    WHERE u.id = m.base_uom_id
  );

-- Check for orphaned default_cost_center_id in materials
SELECT COUNT(*) as orphaned_material_cost_centers
FROM materials m
WHERE m.default_cost_center_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cost_centers cc 
    WHERE cc.id = m.default_cost_center_id
  );

-- ============================================================================
-- STEP 2: Data Cleanup (Run ONLY if validation queries show orphaned records)
-- ============================================================================

-- Clean orphaned location references in documents
UPDATE inventory_documents
SET location_from_id = NULL
WHERE location_from_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_locations l 
    WHERE l.id = location_from_id
  );

UPDATE inventory_documents
SET location_to_id = NULL
WHERE location_to_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_locations l 
    WHERE l.id = location_to_id
  );

-- Clean orphaned project references
UPDATE inventory_documents
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id
  );

-- Clean orphaned cost center references
UPDATE inventory_documents
SET cost_center_id = NULL
WHERE cost_center_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cost_centers cc 
    WHERE cc.id = cost_center_id
  );

-- Clean orphaned location references in lines
UPDATE inventory_document_lines
SET location_id = NULL
WHERE location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_locations loc 
    WHERE loc.id = location_id
  );

-- Clean orphaned cost center references in materials
UPDATE materials
SET default_cost_center_id = NULL
WHERE default_cost_center_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cost_centers cc 
    WHERE cc.id = default_cost_center_id
  );

-- ============================================================================
-- STEP 3: Add Foreign Key Constraints
-- ============================================================================

-- Inventory Documents Table
-- -------------------------

-- Location references
ALTER TABLE inventory_documents
  ADD CONSTRAINT fk_inv_doc_location_from 
    FOREIGN KEY (location_from_id) 
    REFERENCES inventory_locations(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE inventory_documents
  ADD CONSTRAINT fk_inv_doc_location_to 
    FOREIGN KEY (location_to_id) 
    REFERENCES inventory_locations(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Project reference
ALTER TABLE inventory_documents
  ADD CONSTRAINT fk_inv_doc_project 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Cost center reference
ALTER TABLE inventory_documents
  ADD CONSTRAINT fk_inv_doc_cost_center 
    FOREIGN KEY (cost_center_id) 
    REFERENCES cost_centers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Inventory Document Lines Table
-- ------------------------------

-- Document reference (CASCADE delete - lines should be deleted with document)
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_document 
    FOREIGN KEY (document_id) 
    REFERENCES inventory_documents(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Material reference
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_material 
    FOREIGN KEY (material_id) 
    REFERENCES materials(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- UOM reference
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_uom 
    FOREIGN KEY (uom_id) 
    REFERENCES uoms(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Location reference
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_location 
    FOREIGN KEY (location_id) 
    REFERENCES inventory_locations(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Project reference
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_project 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Cost center reference
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_cost_center 
    FOREIGN KEY (cost_center_id) 
    REFERENCES cost_centers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Materials Table
-- ---------------

-- Base UOM reference
ALTER TABLE materials
  ADD CONSTRAINT fk_material_base_uom 
    FOREIGN KEY (base_uom_id) 
    REFERENCES uoms(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Default cost center reference
ALTER TABLE materials
  ADD CONSTRAINT fk_material_cost_center 
    FOREIGN KEY (default_cost_center_id) 
    REFERENCES cost_centers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Inventory Locations Table
-- -------------------------

-- Parent location reference (self-referencing for hierarchy)
ALTER TABLE inventory_locations
  ADD CONSTRAINT fk_inv_location_parent 
    FOREIGN KEY (parent_location_id) 
    REFERENCES inventory_locations(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Project reference
ALTER TABLE inventory_locations
  ADD CONSTRAINT fk_inv_location_project 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Cost center reference
ALTER TABLE inventory_locations
  ADD CONSTRAINT fk_inv_location_cost_center 
    FOREIGN KEY (cost_center_id) 
    REFERENCES cost_centers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ============================================================================
-- STEP 4: Verification Queries
-- ============================================================================

-- List all foreign keys added
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'inventory_documents',
    'inventory_document_lines',
    'materials',
    'inventory_locations'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- ROLLBACK SCRIPT (Use if migration fails)
-- ============================================================================

/*
-- Drop all foreign keys added by this migration

-- inventory_documents
ALTER TABLE inventory_documents
  DROP CONSTRAINT IF EXISTS fk_inv_doc_location_from,
  DROP CONSTRAINT IF EXISTS fk_inv_doc_location_to,
  DROP CONSTRAINT IF EXISTS fk_inv_doc_project,
  DROP CONSTRAINT IF EXISTS fk_inv_doc_cost_center;

-- inventory_document_lines
ALTER TABLE inventory_document_lines
  DROP CONSTRAINT IF EXISTS fk_inv_line_document,
  DROP CONSTRAINT IF EXISTS fk_inv_line_material,
  DROP CONSTRAINT IF EXISTS fk_inv_line_uom,
  DROP CONSTRAINT IF EXISTS fk_inv_line_location,
  DROP CONSTRAINT IF EXISTS fk_inv_line_project,
  DROP CONSTRAINT IF EXISTS fk_inv_line_cost_center;

-- materials
ALTER TABLE materials
  DROP CONSTRAINT IF EXISTS fk_material_base_uom,
  DROP CONSTRAINT IF EXISTS fk_material_cost_center;

-- inventory_locations
ALTER TABLE inventory_locations
  DROP CONSTRAINT IF EXISTS fk_inv_location_parent,
  DROP CONSTRAINT IF EXISTS fk_inv_location_project,
  DROP CONSTRAINT IF EXISTS fk_inv_location_cost_center;
*/
