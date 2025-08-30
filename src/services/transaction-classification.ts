import { supabase } from '../utils/supabase';

export interface TransactionClassification {
  id: string;
  code: number;
  name: string;
  post_to_costs: boolean;
  org_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export type TransactionClassificationInput = Omit<TransactionClassification, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type TransactionClassificationUpdate = Partial<Omit<TransactionClassification, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>>;

/**
 * Get all transaction classifications for an organization
 */
export async function getTransactionClassifications(orgId: string): Promise<TransactionClassification[]> {
  const { data, error } = await supabase
    .from('transaction_classification')
    .select('*')
    .eq('org_id', orgId)
    .order('code', { ascending: true });

  if (error) {
    console.error('Error fetching transaction classifications:', error);
    throw error;
  }
  
  return (data as TransactionClassification[]) || [];
}

/**
 * Get all transaction classifications (for all organizations the user has access to)
 * This is useful for general UI components that need all available classifications
 */
export async function getAllTransactionClassifications(): Promise<TransactionClassification[]> {
  const { data, error } = await supabase
    .from('transaction_classification')
    .select('*')
    .order('code', { ascending: true });

  if (error) {
    console.error('Error fetching all transaction classifications:', error);
    throw error;
  }
  
  return (data as TransactionClassification[]) || [];
}

/**
 * Get a single transaction classification by ID
 */
export async function getTransactionClassification(id: string, orgId: string): Promise<TransactionClassification | null> {
  const { data, error } = await supabase
    .from('transaction_classification')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data as TransactionClassification;
}

/**
 * Create a new transaction classification
 */
export async function createTransactionClassification(
  orgId: string,
  input: { code: number; name: string; post_to_costs: boolean }
): Promise<TransactionClassification> {
  const { data, error } = await supabase.rpc('transaction_classification_insert', {
    p_org_id: orgId,
    p_code: input.code,
    p_name: input.name,
    p_post_to_costs: input.post_to_costs
  });

  if (error) throw error;
  
  if (!data || data.length === 0) {
    throw new Error('No data returned from insert function');
  }
  
  return data[0] as TransactionClassification;
}

/**
 * Update an existing transaction classification
 */
export async function updateTransactionClassification(
  id: string,
  orgId: string,
  updates: { code: number; name: string; post_to_costs: boolean }
): Promise<TransactionClassification> {
  const { data, error } = await supabase.rpc('transaction_classification_update', {
    p_org_id: orgId,
    p_id: id,
    p_code: updates.code,
    p_name: updates.name,
    p_post_to_costs: updates.post_to_costs
  });

  if (error) throw error;
  
  if (!data || data.length === 0) {
    throw new Error('No data returned from update function');
  }
  
  return data[0] as TransactionClassification;
}

/**
 * Delete a transaction classification
 */
export async function deleteTransactionClassification(id: string, orgId: string): Promise<void> {
  const { error } = await supabase.rpc('transaction_classification_delete', {
    p_org_id: orgId,
    p_id: id
  });

  if (error) throw error;
}

/**
 * Get the next available code for a new transaction classification
 */
export async function getNextTransactionClassificationCode(orgId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_next_transaction_classification_code', {
    p_org_id: orgId
  });

  if (error) throw error;
  
  return data as number;
}

/**
 * Check if a code is available (not already used)
 */
export async function isTransactionClassificationCodeAvailable(code: number, orgId: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('transaction_classification')
    .select('id')
    .eq('org_id', orgId)
    .eq('code', code);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return !data || data.length === 0;
}

/**
 * Check if a name is available (not already used)
 */
export async function isTransactionClassificationNameAvailable(name: string, orgId: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('transaction_classification')
    .select('id')
    .eq('org_id', orgId)
    .eq('name', name);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return !data || data.length === 0;
}
