import { supabase } from "../utils/supabase";
import type { Organization } from "../types";

export type { Organization };

export async function getOrganizations(): Promise<Organization[]> {
  // Prefer stable RPC to avoid complex RLS interactions
  const { data, error } = await supabase.rpc('org_list', { p_only_active: true });
  if (error) {
    console.warn('getOrganizations: RPC failed, falling back to REST. Reason:', error.message || error);
    const res = await supabase
      .from('organizations')
      .select('*')
      .order('code', { ascending: true });
    if (res.error) {
      console.error('Error fetching organizations:', res.error);
      return [];
    }
    return (res.data as Organization[]) || [];
  }
  return (data as Organization[]) || [];
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

export async function createOrganization(input: Partial<Omit<Organization, "id" | "created_at" | "updated_at">>): Promise<Organization> {
  const payload: any = { ...input };
  if ((payload as any).status) {
    payload.is_active = (payload as any).status === 'active';
    delete payload.status;
  }
  const { data, error } = await supabase.rpc('org_create', { p: payload });
  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(id: string, updates: Partial<Omit<Organization, "id" | "created_at" | "updated_at">>): Promise<Organization> {
  const payload: any = { ...updates };
  if ((payload as any).status !== undefined) {
    payload.is_active = (payload as any).status === 'active';
    delete payload.status;
  }
  const { data, error } = await supabase.rpc('org_update', { p_id: id, p: payload });
  if (error) throw error;
  return data as Organization;
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_delete', { p_id: id });
  if (error) throw error;
}

export async function deleteOrganizationCascade(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_delete_cascade', { p_id: id });
  if (error) throw error;
}

export async function purgeOrganizationData(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_purge_data', { p_id: id });
  if (error) throw error;
}
