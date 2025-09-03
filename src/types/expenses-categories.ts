// Types for Expenses Categories (org-scoped)
export interface ExpensesCategoryRow {
  id: string;
  org_id: string;
  parent_id: string | null;
  code: string;
  description: string;
  add_to_cost: boolean;
  is_active: boolean;
  level: number;
  path: string; // ltree rendered as text
  linked_account_id: string | null;
  // From view join (optional)
  linked_account_code?: string | null;
  linked_account_name?: string | null;
  // Rollups (optional)
  child_count?: number;
  has_transactions?: boolean;
  total_debit_amount?: number;
  total_credit_amount?: number;
  net_amount?: number;
}

export interface ExpensesCategoryTreeNode extends ExpensesCategoryRow {
  children?: ExpensesCategoryTreeNode[];
}

export interface CreateExpensesCategoryPayload {
  org_id: string;
  code: string;
  description: string;
  add_to_cost?: boolean;
  parent_id?: string | null;
  linked_account_id?: string | null;
}

export interface UpdateExpensesCategoryPayload {
  id: string;
  code?: string;
  description?: string;
  add_to_cost?: boolean;
  is_active?: boolean;
  linked_account_id?: string | null;
}

