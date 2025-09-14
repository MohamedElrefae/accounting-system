export interface AnalysisWorkItemRow {
  id: string;
  org_id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  is_active: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface AnalysisWorkItemFull extends AnalysisWorkItemRow {
  transaction_count?: number;
  total_debit_amount?: number;
  total_credit_amount?: number;
  net_amount?: number;
  has_transactions?: boolean;
}
