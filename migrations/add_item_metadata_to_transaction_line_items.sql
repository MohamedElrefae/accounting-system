-- Migration: Add item metadata columns to transaction_line_items
-- Purpose: Store item_code, item_name, item_name_ar on line items for faster queries
-- This eliminates need for N+1 catalog joins on every load

BEGIN;

-- Add columns to store item metadata
ALTER TABLE transaction_line_items 
ADD COLUMN IF NOT EXISTS item_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS item_name_ar VARCHAR(255);

-- Create index on catalog reference for faster enrichment
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_catalog_id 
ON transaction_line_items(line_item_catalog_id) 
WHERE line_item_catalog_id IS NOT NULL;

-- Create index on item code for search
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_item_code 
ON transaction_line_items(item_code) 
WHERE item_code IS NOT NULL;

-- Backfill existing items with catalog data
UPDATE transaction_line_items tli
SET 
  item_code = li.code,
  item_name = li.name,
  item_name_ar = li.name_ar
FROM line_items li
WHERE tli.line_item_catalog_id = li.id
  AND tli.item_code IS NULL; -- Only fill if empty

-- Add NOT NULL constraint after backfill (optional - set to true if you want to enforce)
-- ALTER TABLE transaction_line_items
-- ALTER COLUMN item_code SET NOT NULL;

-- Create trigger to auto-populate item metadata from catalog on insert/update
CREATE OR REPLACE FUNCTION sync_item_metadata_from_catalog()
RETURNS TRIGGER AS $$
BEGIN
  -- When line_item_catalog_id is set and metadata fields are empty, fetch from catalog
  IF NEW.line_item_catalog_id IS NOT NULL THEN
    SELECT code, name, name_ar
    INTO NEW.item_code, NEW.item_name, NEW.item_name_ar
    FROM line_items
    WHERE id = NEW.line_item_catalog_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (safe to re-run)
DROP TRIGGER IF EXISTS transaction_line_items_sync_metadata ON transaction_line_items;

-- Create trigger
CREATE TRIGGER transaction_line_items_sync_metadata
BEFORE INSERT OR UPDATE ON transaction_line_items
FOR EACH ROW
WHEN (NEW.line_item_catalog_id IS NOT NULL)
EXECUTE FUNCTION sync_item_metadata_from_catalog();

-- Add comment documenting the columns
COMMENT ON COLUMN transaction_line_items.item_code IS 'Denormalized from line_items_catalog for performance';
COMMENT ON COLUMN transaction_line_items.item_name IS 'Denormalized from line_items_catalog for performance';
COMMENT ON COLUMN transaction_line_items.item_name_ar IS 'Denormalized from line_items_catalog for performance';

COMMIT;
