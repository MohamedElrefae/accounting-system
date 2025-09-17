import { supabase } from "../utils/supabase";
import type { Organization } from "../types";

export type { Organization };

export async function getOrganizations(): Promise<Organization[]> {
  // Try with status filter first (if column exists)
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'active')
    .order('code', { ascending: true })
  if (error) {
    // Fallback: retry without status filter (some schemas may not have this column)
    console.warn('getOrganizations: falling back without status filter. Reason:', error.message)
    const res = await supabase
      .from('organizations')
      .select('*')
      .order('code', { ascending: true })
    if (res.error) {
      console.error('Error fetching organizations:', res.error)
      return []
    }
    return (res.data as Organization[]) || []
  }
  return (data as Organization[]) || []
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data as Organization;
}

export async function createOrganization(input: Omit<Organization, "id" | "created_at" | "updated_at">): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(id: string, updates: Partial<Omit<Organization, "id" | "created_at" | "updated_at">>): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
