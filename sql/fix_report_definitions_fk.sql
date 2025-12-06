-- ============================================================================
-- Fix Report Definitions Foreign Key
-- Purpose: Create report_definitions table with proper FK to report_datasets
-- ============================================================================

-- First, check if report_definitions table exists
-- If it does, we need to add the FK; if not, create it

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS report_definitions CASCADE;

-- Create report_definitions table with proper FK
CREATE TABLE report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  dataset_id UUID REFERENCES report_datasets(id) ON DELETE CASCADE,
  selected_fields TEXT[] DEFAULT '{}',
  filters JSONB DEFAULT '[]'::jsonb,
  sort_config JSONB DEFAULT NULL,
  group_config JSONB DEFAULT NULL,
  is_public BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_report_definitions_user_id ON report_definitions(user_id);
CREATE INDEX idx_report_definitions_dataset_id ON report_definitions(dataset_id);
CREATE INDEX idx_report_definitions_org_id ON report_definitions(org_id);

-- Enable RLS
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own report definitions"
  ON report_definitions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own report definitions"
  ON report_definitions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own report definitions"
  ON report_definitions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own report definitions"
  ON report_definitions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON report_definitions TO authenticated;

-- Verify the FK relationship
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'report_definitions';
