-- Create transactions and transaction_lines tables for Excel data migration
-- Based on column mapping from config/column_mapping_APPROVED.csv

-- Create transactions table (headers)
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  entry_no TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'posted')),
  notes TEXT
);

-- Create transaction_lines table (detail lines)
CREATE TABLE IF NOT EXISTS public.transaction_lines (
  id BIGSERIAL PRIMARY KEY,
  entry_no TEXT NOT NULL REFERENCES public.transactions(entry_no) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT,
  transaction_classification_code TEXT,
  classification_code TEXT,
  classification_name TEXT,
  project_code TEXT,
  project_name TEXT,
  work_analysis_code TEXT,
  work_analysis_name TEXT,
  sub_tree_code TEXT,
  sub_tree_name TEXT,
  debit DECIMAL(19, 4) DEFAULT 0,
  credit DECIMAL(19, 4) DEFAULT 0,
  notes TEXT,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  line_number INT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'posted'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_entry_no ON public.transactions(entry_no);
CREATE INDEX IF NOT EXISTS idx_transactions_entry_date ON public.transactions(entry_date);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON public.transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

CREATE INDEX IF NOT EXISTS idx_transaction_lines_entry_no ON public.transaction_lines(entry_no);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_account_code ON public.transaction_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_org_id ON public.transaction_lines(org_id);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_project_code ON public.transaction_lines(project_code);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_classification_code ON public.transaction_lines(classification_code);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_status ON public.transaction_lines(status);

-- Enable RLS on both tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view transactions in their organization
CREATE POLICY "transactions_select_org" ON public.transactions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert transactions in their organization
CREATE POLICY "transactions_insert_org" ON public.transactions
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update transactions in their organization
CREATE POLICY "transactions_update_org" ON public.transactions
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete transactions in their organization
CREATE POLICY "transactions_delete_org" ON public.transactions
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can view transaction lines in their organization
CREATE POLICY "transaction_lines_select_org" ON public.transaction_lines
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert transaction lines in their organization
CREATE POLICY "transaction_lines_insert_org" ON public.transaction_lines
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update transaction lines in their organization
CREATE POLICY "transaction_lines_update_org" ON public.transaction_lines
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete transaction lines in their organization
CREATE POLICY "transaction_lines_delete_org" ON public.transaction_lines
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at on transactions
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at_trigger
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_transactions_updated_at();

-- Create trigger to update updated_at on transaction_lines
CREATE OR REPLACE FUNCTION public.update_transaction_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_lines_updated_at_trigger
BEFORE UPDATE ON public.transaction_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_transaction_lines_updated_at();
