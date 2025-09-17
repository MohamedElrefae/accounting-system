// Types for Sub Tree (org-scoped) - الشجرة الفرعية
export interface SubTreeRow {
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

export interface SubTreeNode extends SubTreeRow {
  children?: SubTreeNode[];
}

export interface CreateSubTreePayload {
  org_id: string;
  code: string;
  description: string;
  add_to_cost?: boolean;
  parent_id?: string | null;
  linked_account_id?: string | null;
}

export interface UpdateSubTreePayload {
  id: string;
  code?: string;
  description?: string;
  add_to_cost?: boolean;
  is_active?: boolean;
  linked_account_id?: string | null;
}

// Legacy aliases for backward compatibility
export type ExpensesCategoryRow = SubTreeRow;
export type ExpensesCategoryTreeNode = SubTreeNode;
export type CreateExpensesCategoryPayload = CreateSubTreePayload;
export type UpdateExpensesCategoryPayload = UpdateSubTreePayload;
