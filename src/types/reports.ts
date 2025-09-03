export interface ReportDataset {
  id: string;
  name: string;
  description?: string;
  table_name: string;
  allowed_fields: string[];
  required_permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface ReportField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'not_null';
  value: any;
  label?: string;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
  label?: string;
}

export interface ReportGroupBy {
  field: string;
  label?: string;
}

export interface ReportDefinition {
  id?: string;
  name: string;
  description?: string;
  dataset_id: string;
  selected_fields: string[];
  filters: ReportFilter[];
  sorts: ReportSort[];
  group_by: ReportGroupBy[];
  limit?: number;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReportResult {
  columns: Array<{
    field: string;
    label: string;
    type: string;
  }>;
  data: Record<string, any>[];
  total_count: number;
  execution_time_ms: number;
}

export interface ReportExecutionLog {
  id: string;
  report_definition_id?: string;
  dataset_id: string;
  selected_fields: string[];
  filters: ReportFilter[];
  sorts: ReportSort[];
  group_by: ReportGroupBy[];
  result_count: number;
  execution_time_ms: number;
  created_at: string;
}

// UI State interfaces
export interface ReportBuilderState {
  selectedDataset: ReportDataset | null;
  availableFields: ReportField[];
  selectedFields: string[];
  filters: ReportFilter[];
  sorts: ReportSort[];
  groupBy: ReportGroupBy[];
  limit: number;
  previewData: ReportResult | null;
  isLoadingPreview: boolean;
  isExecuting: boolean;
  lastExecutionResult: ReportResult | null;
  error: string | null;
}

// Component Props interfaces
export interface DatasetSelectorProps {
  datasets: ReportDataset[];
  selectedDataset: ReportDataset | null;
  onDatasetSelect: (dataset: ReportDataset | null) => void;
  loading?: boolean;
}

export interface FieldSelectorProps {
  availableFields: ReportField[];
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  disabled?: boolean;
}

export interface FilterBuilderProps {
  availableFields: ReportField[];
  filters: ReportFilter[];
  onFiltersChange: (filters: ReportFilter[]) => void;
  disabled?: boolean;
}

export interface SortBuilderProps {
  availableFields: ReportField[];
  sorts: ReportSort[];
  onSortsChange: (sorts: ReportSort[]) => void;
  disabled?: boolean;
}

export interface GroupByBuilderProps {
  availableFields: ReportField[];
  groupBy: ReportGroupBy[];
  onGroupByChange: (groupBy: ReportGroupBy[]) => void;
  disabled?: boolean;
}

export interface ReportPreviewProps {
  data: ReportResult | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export interface ReportResultsProps {
  data: ReportResult | null;
  loading?: boolean;
  error?: string | null;
  onExport?: (format: 'csv' | 'xlsx' | 'pdf') => void;
  onSave?: () => void;
}

// Service interfaces
export interface RunReportParams {
  dataset_id: string;
  selected_fields: string[];
  filters: ReportFilter[];
  sorts: ReportSort[];
  group_by: ReportGroupBy[];
  limit?: number;
}

export interface SaveReportDefinitionParams {
  id?: string;
  name: string;
  description?: string;
  dataset_id: string;
  selected_fields: string[];
  filters: ReportFilter[];
  sorts: ReportSort[];
  group_by: ReportGroupBy[];
  limit?: number;
  is_public?: boolean;
}
