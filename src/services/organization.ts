import { supabase } from "../utils/supabase";
import type { Organization } from "../types";

export type { Organization };

// Cache configuration
const CACHE_KEY = 'organizations_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: Organization[];
  timestamp: number;
}

// Get cached organizations from localStorage
function getCachedOrganizations(): Organization[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

// Save organizations to localStorage cache
function setCachedOrganizations(data: Organization[]): void {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

// Clear organizations cache (call after create/update/delete)
export function clearOrganizationsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore
  }
}

export async function getOrganizations(): Promise<Organization[]> {
  const startTime = performance.now();
  
  // Check cache first
  const cached = getCachedOrganizations();
  if (cached) {
    console.log(`[getOrganizations] Cache hit! (${cached.length} orgs)`);
    return cached;
  }
  
  console.log('[getOrganizations] Cache miss, fetching from API...');
  
  // Use direct REST query - faster than RPC
  const { data, error } = await supabase
    .from('organizations')
    .select('id, code, name, name_ar, is_active, created_at')
    .eq('is_active', true)
    .order('code', { ascending: true })
    .limit(50);
  
  console.log(`[getOrganizations] REST took ${(performance.now() - startTime).toFixed(0)}ms`, { 
    error: error?.message,
    count: data?.length 
  });
  
  if (error) {
    console.error('[getOrganizations] Error fetching organizations:', error);
    return [];
  }
  
  const organizations = (data as Organization[]) || [];
  
  // Cache the result
  setCachedOrganizations(organizations);
  
  return organizations;
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
  clearOrganizationsCache(); // Clear cache after create
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
  clearOrganizationsCache(); // Clear cache after update
  return data as Organization;
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_delete', { p_id: id });
  if (error) throw error;
  clearOrganizationsCache(); // Clear cache after delete
}

export async function deleteOrganizationCascade(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_delete_cascade', { p_id: id });
  if (error) throw error;
  clearOrganizationsCache(); // Clear cache after delete
}

export async function purgeOrganizationData(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_purge_data', { p_id: id });
  if (error) throw error;
  clearOrganizationsCache(); // Clear cache after purge
}
