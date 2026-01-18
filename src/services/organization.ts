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

// Enhanced cache validation
function validateCacheEntry(entry: CacheEntry): boolean {
  if (!entry || typeof entry !== 'object') return false;
  if (!Array.isArray(entry.data)) return false;
  if (typeof entry.timestamp !== 'number') return false;
  if (Date.now() - entry.timestamp > CACHE_DURATION) return false;
  
  // Validate data structure
  const isValidData = entry.data.every(item => 
    item && 
    typeof item === 'object' && 
    typeof item.id === 'string' && 
    typeof item.code === 'string' && 
    typeof item.name === 'string'
  );
  
  return isValidData;
}

// Get cached organizations from localStorage
function getCachedOrganizations(): Organization[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    
    if (!validateCacheEntry(entry)) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.warn('[getCachedOrganizations] Cache read error:', error);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
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

// Network retry helper
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.warn(`[withRetry] Attempt ${attempt + 1} failed:`, error?.message || error);
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
};

export async function getOrganizations(): Promise<Organization[]> {
  const startTime = performance.now();
  
  // Check cache first
  const cached = getCachedOrganizations();
  if (cached) {
    console.log(`[getOrganizations] Cache hit! (${cached.length} orgs)`);
    return cached;
  }
  
  console.log('[getOrganizations] Cache miss, fetching from API...');
  
  try {
    // Use retry mechanism for network resilience
    const { data, error } = await withRetry(
      () => supabase
        .from('organizations')
        .select('id, code, name, name_ar, is_active, created_at')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(50),
      3, // max retries
      1000 // base delay
    );
    
    console.log(`[getOrganizations] REST took ${(performance.now() - startTime).toFixed(0)}ms`, { 
      error: error?.message,
      count: data?.length 
    });
    
    if (error) {
      console.error('[getOrganizations] Error fetching organizations:', error);
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }
    
    const organizations = (data as Organization[]) || [];
    
    // Cache the result
    setCachedOrganizations(organizations);
    
    return organizations;
  } catch (error: any) {
    console.error('[getOrganizations] All retry attempts failed:', error);
    
    // Return empty array as fallback to prevent app from breaking
    console.warn('[getOrganizations] Returning empty array as fallback');
    return [];
  }
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
