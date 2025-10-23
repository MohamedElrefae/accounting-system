-- Migration: Update document_associations to support transaction_line_items
-- Purpose: Allow document attachments to transaction line items
-- Date: 2025-10-19

-- Step 1: Drop existing constraint that limits entity_type
ALTER TABLE public.document_associations
DROP CONSTRAINT IF EXISTS valid_entity_type;

-- Step 2: Add new constraint with transaction_line_items
ALTER TABLE public.document_associations
ADD CONSTRAINT valid_entity_type CHECK (
  entity_type IN (
    'transaction', 
    'transaction_line', 
    'transaction_line_items',
    'invoice', 
    'purchase_order', 
    'payment'
  )
);

-- Step 3: Create index for transaction_line_items lookups
CREATE INDEX IF NOT EXISTS idx_doc_assoc_line_items 
  ON public.document_associations(entity_type, entity_id) 
  WHERE entity_type = 'transaction_line_items';

-- Step 4: Rollback plan (if needed)
-- ALTER TABLE public.document_associations DROP CONSTRAINT valid_entity_type;
-- ALTER TABLE public.document_associations
-- ADD CONSTRAINT valid_entity_type CHECK (entity_type IN ('transaction', 'transaction_line', 'invoice', 'purchase_order', 'payment'));
