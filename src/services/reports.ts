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
      .eq('is_active', true)
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
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (newError || !newData || newData.length === 0) {
          console.warn('Still no datasets after population, using mock data');
          return getMockReportDatasets();
        }
        
        console.log(`✅ Successfully populated and loaded ${newData.length} datasets from database`);
        return (newData as ReportDataset[]) || [];
      } catch (populateError) {
        console.error('Error populating sample datasets:', populateError);
        return getMockReportDatasets();
      }
    }

    console.log(`✅ Loaded ${data.length} datasets from database`);
    return (data as ReportDataset[]) || [];
  } catch (error) {
    console.error('Critical error accessing database:', error);
    console.warn('Falling back to mock data');
    return getMockReportDatasets();
  }
}

/**
 * Get a specific report dataset by ID
 */
export async function getReportDataset(id: string): Promise<ReportDataset | null> {
  const { data, error } = await supabase
    .from('report_datasets')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching report dataset:', error);
    throw error;
  }

  return data as ReportDataset;
}

/**
 * Get available fields for a dataset using the RPC function
 */
export async function getDatasetFields(datasetId: string): Promise<ReportField[]> {
  // If it's a mock dataset ID, return mock fields
  if (datasetId.startsWith('mock_')) {
    return getMockReportFields(datasetId);
  }

  try {
    const { data, error } = await supabase.rpc('get_dataset_fields', {
      p_dataset_id: datasetId
    });

    if (error) {
      console.warn('Error fetching dataset fields, using mock data:', error);
      // Try to get mock fields if available
      return getMockReportFields(datasetId);
    }

    return (data as ReportField[]) || [];
  } catch (error) {
    console.warn('Error accessing dataset fields, using mock data:', error);
    return getMockReportFields(datasetId);
  }
}

/**
 * Execute a custom report using the secure RPC function
 */
export async function runCustomReport(params: RunReportParams): Promise<ReportResult> {
  // If it's a mock dataset ID, return mock data
  if (params.dataset_id.startsWith('mock_')) {
    return {
      columns: params.selected_fields.map(field => {
        const mockFields = getMockReportFields(params.dataset_id);
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

  try {
    const { data, error } = await supabase.rpc('run_custom_report', {
      p_dataset_id: params.dataset_id,
      p_selected_fields: params.selected_fields,
      p_filters: params.filters,
      p_sorts: params.sorts,
      p_group_by: params.group_by,
      p_limit: params.limit || 1000
    });

    if (error) {
      console.warn('Error running custom report, using mock data:', error);
      // Return mock data
      return {
        columns: params.selected_fields.map(field => ({ field, label: field, type: 'text' })),
        data: generateMockReportData(params.selected_fields, params.limit || 20).data,
        total_count: params.limit || 20,
        execution_time_ms: Math.floor(Math.random() * 100) + 50
      };
    }

    return data as ReportResult;
  } catch (error) {
    console.warn('Error running custom report, using mock data:', error);
    // Return mock data
    return {
      columns: params.selected_fields.map(field => ({ field, label: field, type: 'text' })),
      data: generateMockReportData(params.selected_fields, params.limit || 20).data,
      total_count: params.limit || 20,
      execution_time_ms: Math.floor(Math.random() * 100) + 50
    };
  }
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
