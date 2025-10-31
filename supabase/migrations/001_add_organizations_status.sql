-- Migration: Add status column to organizations table
-- Created: 2025-10-29
-- Description: Adds a status column to track active/inactive organizations

-- Add status column with default value 'active'
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL;

-- Add check constraint to ensure valid status values
ALTER TABLE organizations 
ADD CONSTRAINT organizations_status_check 
CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_status 
ON organizations(status);

-- Update existing records to have 'active' status if NULL
UPDATE organizations 
SET status = 'active' 
WHERE status IS NULL;

-- Add comment to column for documentation
COMMENT ON COLUMN organizations.status IS 'Organization status: active, inactive, suspended, or archived';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Successfully added status column to organizations table';
  RAISE NOTICE '✅ All existing organizations set to active';
  RAISE NOTICE '✅ Index created for better performance';
END $$;

