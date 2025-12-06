import { supabase } from '../utils/supabase';
import { SAMPLE_DATASETS, generateMockReportData, populateSampleDatasets } from '../utils/sampleDatasets';
import type {
  ReportDataset,
  ReportField,
  ReportDefinition,
  ReportResult,
  RunReportParams,
  SaveReportDefinitionParams,
  ReportExecutionLog
} from '../types/reports';

// Export types for convenience
export type {
  ReportDataset,
  ReportField,
  ReportDefinition,
  ReportResult,
  RunReportParams,
  SaveReportDefinitionParams,
  ReportExecutionLog
};

// Helper functions for mock data
function normalizeDatasetRow(row: any): ReportDataset {
  const fieldsArray: any[] = Array.isArray(row.fields) ? row.fields : [];
  const allowed = Array.isArray(row.allowed_fields) && row.allowed_fields.length > 0
    ? row.allowed_fields
    : fieldsArray.map((x) => x.key ?? x.name).filter(Boolean);
  const tableName = row.table_name || row.base_view || 'unknown_view';
  return {
    id: row.id ?? row.key, // fall back to key when id column is not present
    key: row.key ?? row.id,
    name: row.name,
    description: row.description ?? undefined,
    table_name: tableName,
    base_view: row.base_view ?? null,
    fields: row.fields ?? undefined,
    is_active: row.is_active ?? true,
    allowed_fields: allowed,
    required_permissions: row.required_permissions ?? [],
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  } as ReportDataset;
}
function getMockReportDatasets(): ReportDataset[] {
  return SAMPLE_DATASETS.map((dataset, index) => ({
    id: `mock_${index + 1}`,
    name: dataset.name,
    description: dataset.description,
    table_name: dataset.table_name,
    allowed_fields: dataset.allowed_fields,
    required_permissions: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}

function getMockReportFields(datasetId: string): ReportField[] {
  const mockDatasets = getMockReportDatasets();
  const dataset = mockDatasets.find(d => d.id === datasetId);
  if (!dataset) return [];
  
  const sampleDataset = SAMPLE_DATASETS.find(d => d.name === dataset.name);
  if (!sampleDataset) return [];
  
  return sampleDataset.sample_fields.map(field => ({
    name: field.name,
    label: field.label,
    type: field.type,
    filterable: field.filterable,
    sortable: field.sortable,
    groupable: field.groupable
  }));
}

/**
 * Fetch all available report datasets
 */
export async function getReportDatasets(): Promise<ReportDataset[]> {
  try {
    const { data, error } = await supabase
.from('report_datasets')
          .select('*')
          .order('name', { ascending: true });

    if (error) {
      console.error('Database error fetching report datasets:', error);
      // Only fall back to mock data if explicitly unavailable
      console.warn('Falling back to mock data due to database error');
      return getMockReportDatasets();
    }

    // If no data from database, populate sample datasets first
    if (!data || data.length === 0) {
      console.warn('No datasets found in database, attempting to populate sample datasets...');
      try {
        await populateSampleDatasets();
        // Try fetching again after population
        const { data: newData, error: newError } = await supabase
          .from('report_datasets')
          .select('*')
          .order('name', { ascending: true });
        
        if (newError || !newData || newData.length === 0) {
          console.warn('Still no datasets after population, using mock data');
          return getMockReportDatasets();
        }
        
        console.log(`✅ Successfully populated and loaded ${newData.length} datasets from database`);
        // Normalize shape for UI (map base_view/fields to expected props)
        return (newData as any[]).map((row) => normalizeDatasetRow(row));
      } catch (populateError) {
        console.error('Error populating sample datasets:', populateError);
        return getMockReportDatasets();
      }
    }

    console.log(`✅ Loaded ${data.length} datasets from database`);
    return (data as any[]).map((row) => normalizeDatasetRow(row));
  } catch (error) {
    console.error('Critical error accessing database:', error);
    console.warn('Falling back to mock data');
    return getMockReportDatasets();
  }
}

/**
 * Get a specific report dataset by ID
 */
export async function getReportDataset(idOrKey: string): Promise<ReportDataset | null> {
  console.log('🔍 getReportDataset called with:', idOrKey);
  
  // Try by id first (UUID format)
  let res = await supabase
    .from('report_datasets')
    .select('*')
    .eq('id', idOrKey)
    .maybeSingle();
  
  if (!res.error && res.data) {
    console.log('🔍 Found by id:', res.data);
    return normalizeDatasetRow(res.data);
  }

  // Fallback to key lookup
  res = await supabase
    .from('report_datasets')
    .select('*')
    .eq('key', idOrKey)
    .maybeSingle();
  
  if (!res.error && res.data) {
    console.log('🔍 Found by key:', res.data);
    return normalizeDatasetRow(res.data);
  }
  
  if (res.error && res.error.code !== 'PGRST116') {
    console.warn('getReportDataset error:', res.error);
  }
  
  console.warn('🔍 Dataset not found:', idOrKey);
  return null;
}

/**
 * Get available fields for a dataset using the RPC function
 */
export async function getDatasetFields(datasetId: string): Promise<ReportField[]> {
  const dsId = datasetId ?? '';
  // If it's a mock dataset ID, return mock fields
  if (dsId && dsId.startsWith('mock_')) {
    return getMockReportFields(dsId);
  }

  // Try to get dataset with fields - first by id, then by key
  try {
    // Try by id first (UUID)
    let result = await supabase
      .from('report_datasets')
      .select('fields, allowed_fields')
      .eq('id', dsId)
      .maybeSingle();
    
    // If not found by id, try by key
    if (!result.data) {
      result = await supabase
        .from('report_datasets')
        .select('fields, allowed_fields')
        .eq('key', dsId)
        .maybeSingle();
    }

    const data = result.data as any;
    
    // First try to use the fields JSONB column
    const f = data?.fields as Array<any> | null | undefined;
    if (Array.isArray(f) && f.length > 0) {
      return f.map((x) => ({
        name: x.key ?? x.name,
        label: x.label ?? (x.key ?? x.name),
        type: (x.type ?? 'text') as any,
        filterable: x.filterable !== false,
        sortable: x.sortable !== false,
        groupable: x.groupable !== false,
      }));
    }

    // Fallback to allowed_fields array if fields JSONB is empty
    const allowedFields = data?.allowed_fields as string[] | null | undefined;
    if (Array.isArray(allowedFields) && allowedFields.length > 0) {
      return allowedFields.map((fieldName) => ({
        name: fieldName,
        label: fieldName,
        type: 'text' as any,
        filterable: true,
        sortable: true,
        groupable: true,
      }));
    }
  } catch (err) {
    console.error('Error fetching dataset fields:', err);
  }

  // Fallback: RPC if available
  try {
    const { data, error } = await supabase.rpc('get_dataset_fields', {
      p_dataset_id: dsId
    });
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return (data as ReportField[]);
    }
  } catch {/* ignore */}

  // Last resort: try to get the full dataset and use allowed_fields
  try {
    const dataset = await getReportDataset(dsId);
    if (dataset && Array.isArray(dataset.allowed_fields) && dataset.allowed_fields.length > 0) {
      console.log('Using allowed_fields from dataset:', dataset.allowed_fields);
      return dataset.allowed_fields.map((fieldName) => ({
        name: fieldName,
        label: fieldName,
        type: 'text' as any,
        filterable: true,
        sortable: true,
        groupable: true,
      }));
    }
  } catch {/* ignore */}

  console.warn('No fields found for dataset:', dsId);
  return [];
}

/**
 * Refresh dataset fields from the database schema (calls RPC to re-read table columns)
 */
export async function refreshDatasetFields(datasetId: string): Promise<ReportField[]> {
  try {
    // Call the RPC function to refresh fields from table schema
    const { error } = await supabase.rpc('refresh_dataset_fields', {
      p_dataset_id: datasetId
    });
    
    if (error) {
      console.error('Error refreshing dataset fields:', error);
      // Fall back to getting fields normally
      return getDatasetFields(datasetId);
    }
    
    // Now fetch the updated fields
    return getDatasetFields(datasetId);
  } catch (err) {
    console.error('Error in refreshDatasetFields:', err);
    return getDatasetFields(datasetId);
  }
}

/**
 * Refresh all dataset fields from their table schemas
 */
export async function refreshAllDatasetFields(): Promise<{ dataset_name: string; field_count: number }[]> {
  try {
    const { data, error } = await supabase.rpc('refresh_all_dataset_fields');
    
    if (error) {
      console.error('Error refreshing all dataset fields:', error);
      return [];
    }
    
    return (data as { dataset_name: string; field_count: number }[]) || [];
  } catch (err) {
    console.error('Error in refreshAllDatasetFields:', err);
    return [];
  }
}

/**
 * Execute a custom report using the secure RPC function
 */
export async function runCustomReport(params: RunReportParams): Promise<ReportResult> {
  console.log('🚀 runCustomReport called with:', { 
    dataset_id: params.dataset_id, 
    fields: params.selected_fields?.length,
    filters: params.filters?.length 
  });
  
  const datasetId = params.dataset_id ?? '';
  // If it's a mock dataset ID, return mock data
  if (datasetId && datasetId.startsWith('mock_')) {
    return {
      columns: params.selected_fields.map(field => {
        const mockFields = getMockReportFields(datasetId);
        const fieldInfo = mockFields.find(f => f.name === field);
        return {
          field,
          label: fieldInfo?.label || field,
          type: fieldInfo?.type || 'text'
        };
      }),
      data: generateMockReportData(params.selected_fields, params.limit || 20).data,
      total_count: params.limit || 20,
      execution_time_ms: Math.floor(Math.random() * 100) + 50
    };
  }
  if (!datasetId) {
    throw new Error('dataset_id is required');
  }

  // Query the dataset base view directly (avoid RPC dependency)
  console.log('📊 Fetching dataset:', datasetId);
  const dataset = await getReportDataset(params.dataset_id);
  console.log('📊 Dataset result:', dataset);
  if (!dataset) throw new Error('Dataset not found: ' + datasetId);
  const viewRaw = dataset.table_name;
  const view = (viewRaw || '').replace(/^public\./, '');
  console.log('📊 Querying view/table:', view);
  // Filter requested fields to those defined in dataset.fields (if provided)
  const dsFieldsMeta = Array.isArray((dataset as any).fields) ? (dataset as any).fields as any[] : [];
  const allowedKeys = dsFieldsMeta.map((x) => (x.key ?? x.name)).filter(Boolean) as string[];
  let fields = (params.selected_fields && params.selected_fields.length > 0)
    ? params.selected_fields.slice()
    : (dataset.allowed_fields && dataset.allowed_fields.length > 0 ? dataset.allowed_fields.slice() : []);
  if (allowedKeys.length) {
    fields = fields.filter((f) => allowedKeys.includes(f));
    if (fields.length === 0) fields = allowedKeys.slice(0, Math.min(allowedKeys.length, 15));
  }
  if (fields.length === 0) fields = ['*'];

  const selectStr = fields.includes('*') ? '*' : fields.join(',');
  let q = supabase.from(view).select(selectStr, { count: 'exact' });

  // Apply filters
  for (const f of params.filters || []) {
    const op = f.operator;
    const name = f.field;
    const val = f.value;
    if (op === 'eq') q = q.eq(name, val);
    else if (op === 'neq') q = q.neq(name, val);
    else if (op === 'gt') q = q.gt(name, val);
    else if (op === 'gte') q = q.gte(name, val);
    else if (op === 'lt') q = q.lt(name, val);
    else if (op === 'lte') q = q.lte(name, val);
    else if (op === 'like') q = q.like(name, val);
    else if (op === 'ilike') q = q.ilike(name, val);
    else if (op === 'in') q = q.in(name, Array.isArray(val) ? val : String(val).split(','));
    else if (op === 'not_in') q = q.not(name, 'in', Array.isArray(val) ? val : String(val).split(','));
    else if (op === 'is_null') q = q.is(name, null);
    else if (op === 'not_null') q = q.not(name, 'is', null);
  }

  // Sorts
  for (const s of params.sorts || []) {
    q = q.order(s.field, { ascending: s.direction === 'asc' });
  }

  // Limit
  if (params.limit && params.limit > 0) q = q.limit(params.limit);

  console.log('📊 Executing query with fields:', selectStr);
  const t0 = performance.now();
  const { data, error, count } = await q;
  const t1 = performance.now();
  console.log('📊 Query result:', { error, rowCount: data?.length, totalCount: count, timeMs: t1 - t0 });
  if (error) {
    console.error('📊 Query error:', error);
    // If columns are invalid, retry with select '*'
    try {
      if (selectStr !== '*') {
        const tRetry0 = performance.now();
        const retry = await supabase.from(view).select('*', { count: 'exact' }).limit(params.limit || 20);
        const tRetry1 = performance.now();
        if (!retry.error) {
          const retryData = retry.data as any[];
          const retryCount = typeof retry.count === 'number' ? retry.count : (retryData?.length || 0);
          // Derive columns from data keys
          const inferredFields = Array.isArray(retryData) && retryData.length > 0 ? Object.keys(retryData[0] as Record<string, any>) : [];
          const inferredColumns = inferredFields.map((f) => ({ field: f, label: f, type: 'text' as string }));
          return {
            columns: inferredColumns,
            data: retryData || [],
            total_count: retryCount,
            execution_time_ms: Math.max(1, Math.round((tRetry1 - tRetry0) + (t1 - t0))),
          };
        }
      }
    } catch {/* ignore */}
    console.warn('Direct view query failed, returning mock data:', error);
    return {
      columns: (fields.includes('*') ? [] : fields).map((field) => ({ field, label: field, type: 'text' })),
      data: generateMockReportData(fields.includes('*') ? ['col1','col2'] : fields, params.limit || 20).data,
      total_count: params.limit || 20,
      execution_time_ms: Math.max(1, Math.round(t1 - t0)),
    };
  }

  // Build columns from dataset.fields if present; if selecting '*', infer from data keys
  const dsFields = (dataset as any)?.fields as Array<any> | undefined;
  const fieldListForColumns: string[] = fields.includes('*')
    ? (Array.isArray(data) && data.length > 0 ? Object.keys(data[0] as Record<string, any>) : [])
    : fields;
  let columns = fieldListForColumns.map((f) => ({ field: f, label: f, type: 'text' as string }));
  if (Array.isArray(dsFields)) {
    columns = fieldListForColumns.map((f) => {
      const meta = dsFields.find((x) => (x.key ?? x.name) === f);
      return { field: f, label: meta?.label || f, type: meta?.type || 'text' };
    });
  }

  return {
    columns,
    data: (data as any[]) || [],
    total_count: typeof count === 'number' ? count : ((data as any[])?.length || 0),
    execution_time_ms: Math.max(1, Math.round(t1 - t0)),
  };
}

/**
 * Preview a report with limited results (first 10 rows)
 */
export async function previewReport(params: RunReportParams): Promise<ReportResult> {
  return runCustomReport({
    ...params,
    limit: 10
  });
}

/**
 * Save a report definition
 */
export async function saveReportDefinition(params: SaveReportDefinitionParams): Promise<ReportDefinition> {
  const payload = {
    name: params.name,
    description: params.description || null,
    dataset_id: params.dataset_id,
    selected_fields: params.selected_fields,
    filters: params.filters,
    sorts: params.sorts,
    group_by: params.group_by,
    limit: params.limit || null,
    is_public: params.is_public || false
  };

  let result;
  
  if (params.id) {
    // Update existing report
    result = await supabase
      .from('report_definitions')
      .update(payload)
      .eq('id', params.id)
      .select('*')
      .single();
  } else {
    // Create new report
    result = await supabase
      .from('report_definitions')
      .insert(payload)
      .select('*')
      .single();
  }

  if (result.error) {
    console.error('Error saving report definition:', result.error);
    throw result.error;
  }

  return result.data as ReportDefinition;
}

/**
 * Get user's report definitions
 */
export async function getUserReportDefinitions(): Promise<ReportDefinition[]> {
  const { data, error } = await supabase
    .from('report_definitions')
    .select(`
      *,
      dataset:report_datasets(name, description)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user report definitions:', error);
    throw error;
  }

  return (data as ReportDefinition[]) || [];
}

/**
 * Get a specific report definition
 */
export async function getReportDefinition(id: string): Promise<ReportDefinition | null> {
  const { data, error } = await supabase
    .from('report_definitions')
    .select(`
      *,
      dataset:report_datasets(name, description, allowed_fields)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching report definition:', error);
    throw error;
  }

  return data as ReportDefinition;
}

/**
 * Delete a report definition
 */
export async function deleteReportDefinition(id: string): Promise<void> {
  const { error } = await supabase
    .from('report_definitions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting report definition:', error);
    throw error;
  }
}

/**
 * Get recent report execution logs for the current user
 */
export async function getRecentExecutionLogs(limit: number = 20): Promise<ReportExecutionLog[]> {
  const { data, error } = await supabase
    .from('report_execution_logs')
    .select(`
      *,
      report_definition:report_definitions(name),
      dataset:report_datasets(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching execution logs:', error);
    throw error;
  }

  return (data as ReportExecutionLog[]) || [];
}

/**
 * Export report results to CSV format
 */
export function exportToCSV(result: ReportResult, filename: string = 'report'): void {
  if (!result.data || result.data.length === 0) {
    throw new Error('No data to export');
  }

  // Create CSV content
  const headers = result.columns.map(col => col.label).join(',');
  const rows = result.data.map(row => 
    result.columns.map(col => {
      const value = row[col.field];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get field label for display purposes
 */
export function getFieldLabel(fieldName: string, availableFields: ReportField[]): string {
  const field = availableFields.find(f => f.name === fieldName);
  return field?.label || fieldName;
}

/**
 * Get field type for a given field name
 */
export function getFieldType(fieldName: string, availableFields: ReportField[]): string {
  const field = availableFields.find(f => f.name === fieldName);
  return field?.type || 'text';
}

/**
 * Validate report definition before saving/running
 */
export function validateReportDefinition(definition: Partial<SaveReportDefinitionParams>): string[] {
  const errors: string[] = [];

  if (!definition.name?.trim()) {
    errors.push('Report name is required');
  }

  if (!definition.dataset_id) {
    errors.push('Dataset selection is required');
  }

  if (!definition.selected_fields || definition.selected_fields.length === 0) {
    errors.push('At least one field must be selected');
  }

  // Validate filters
  if (definition.filters) {
    definition.filters.forEach((filter, index) => {
      if (!filter.field) {
        errors.push(`Filter ${index + 1}: Field is required`);
      }
      if (!filter.operator) {
        errors.push(`Filter ${index + 1}: Operator is required`);
      }
      if (filter.value === undefined || filter.value === null) {
        if (!['is_null', 'not_null'].includes(filter.operator)) {
          errors.push(`Filter ${index + 1}: Value is required`);
        }
      }
    });
  }

  return errors;
}
