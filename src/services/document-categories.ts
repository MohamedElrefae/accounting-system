import { supabase } from '../utils/supabase';

export interface DocumentCategory {
  id: string;
  org_id: string;
  name: string;
  name_ar?: string | null;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  position: number;
}

export async function listCategories(orgId: string) {
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .eq('org_id', orgId)
    .order('parent_id', { ascending: true })
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []) as DocumentCategory[];
}

export async function createCategory(payload: Partial<DocumentCategory>) {
  const { data, error } = await supabase
    .from('document_categories')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentCategory;
}

export async function updateCategory(id: string, patch: Partial<DocumentCategory>) {
  const { data, error } = await supabase
    .from('document_categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentCategory;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('document_categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function reorderCategory(id: string, newParentId: string | null, newPosition: number) {
  // naive reorder: update parent & position; client should refetch
  const { data, error } = await supabase
    .from('document_categories')
    .update({ parent_id: newParentId, position: newPosition })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentCategory;
}