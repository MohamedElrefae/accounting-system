-- Migration: Add metadata support for unified document linking
-- Purpose: Store document-entity associations in metadata (document_associations table)
-- This supports linking documents to ANY entity (transactions, lines, invoices, etc) without FK bloat

-- Step 1: Create document_associations junction table (replaces individual FK columns)
-- This allows one document to be linked to multiple entities (transaction + its lines, etc)
CREATE TABLE IF NOT EXISTS public.document_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  -- Entity type: transaction, transaction_line, invoice, purchase_order, etc.
  entity_type text NOT NULL,
  -- Entity ID (transaction_id, line_id, etc)
  entity_id uuid NOT NULL,
  -- Optional: sort order for displaying documents in specific order
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, entity_type, entity_id),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('transaction', 'transaction_line', 'invoice', 'purchase_order', 'payment'))
);

-- Step 2: Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_doc_assoc_document ON public.document_associations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_assoc_entity ON public.document_associations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_doc_assoc_line ON public.document_associations(entity_type, entity_id) WHERE entity_type = 'transaction_line';
CREATE INDEX IF NOT EXISTS idx_doc_assoc_tx ON public.document_associations(entity_type, entity_id) WHERE entity_type = 'transaction';

-- Step 3: Create view to get documents for a transaction_line
CREATE OR REPLACE VIEW v_transaction_line_documents AS
SELECT 
  tl.id as transaction_line_id,
  tl.transaction_id,
  COUNT(d.id) as document_count,
  ARRAY_AGG(d.id ORDER BY da.sort_order) FILTER (WHERE d.id IS NOT NULL) as document_ids
FROM public.transaction_lines tl
LEFT JOIN public.document_associations da ON da.entity_type = 'transaction_line' AND da.entity_id = tl.id
LEFT JOIN public.documents d ON d.id = da.document_id
GROUP BY tl.id, tl.transaction_id;

-- Step 4: Create view to get all documents for a transaction (from transaction + all its lines)
CREATE OR REPLACE VIEW v_transaction_documents AS
SELECT 
  t.id as transaction_id,
  COUNT(DISTINCT d.id) as total_document_count,
  ARRAY_AGG(DISTINCT d.id) FILTER (WHERE d.id IS NOT NULL) as all_document_ids
FROM public.transactions t
LEFT JOIN public.document_associations da ON (
  (da.entity_type = 'transaction' AND da.entity_id = t.id) OR
  (da.entity_type = 'transaction_line' AND da.entity_id IN (SELECT id FROM transaction_lines WHERE transaction_id = t.id))
)
LEFT JOIN public.documents d ON d.id = da.document_id
GROUP BY t.id;

-- Verification queries:
-- SELECT * FROM document_associations WHERE entity_type = 'transaction_line' LIMIT 5;
-- SELECT * FROM v_transaction_line_documents LIMIT 5;
-- SELECT * FROM v_transaction_documents LIMIT 5;
