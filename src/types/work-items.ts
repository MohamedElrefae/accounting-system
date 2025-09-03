export interface WorkItemRow {
  id: string;
  org_id: string;
  project_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  unit_of_measure?: string | null;
  is_active: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
  // View rollups (from work_items_full)
  child_count?: number;
  has_transactions?: boolean;
}

export interface WorkItemTreeNode extends WorkItemRow {
  children?: WorkItemTreeNode[];
}

