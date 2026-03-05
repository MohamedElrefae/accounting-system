import { supabase } from "../utils/supabase";
import { getConnectionMonitor } from '../utils/connectionMonitor';
import { offlineCacheManager } from "./offline/core/OfflineCacheManager";

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
      if (import.meta.env.DEV && getConnectionMonitor().getHealth().isOnline) console.warn(`[withRetry] Attempt ${attempt + 1} failed:`, error?.message || error);
      
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

// Offline-hardened Organization Service

// Helper for offline fallback
async function getFromCache(key: string) {
  try {
    const cached = await offlineCacheManager.get<any[]>(key);
    return cached && Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}


export interface Organization {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  is_active: boolean;
  logo_url?: string | null;
  subscription_tier?: string;
  created_at: string;
}

export async function getOrganizations(): Promise<Organization[]> {
  const isOffline = !getConnectionMonitor().getHealth().isOnline;

  if (isOffline) {
      console.log('[getOrganizations] Offline - yielding cache');
      const cached = await offlineCacheManager.get<Organization[]>('organizations_cache', Infinity);
      return cached || [];
  }

  try {
    const { data, error } = await withRetry<{ data: any; error: any }>(
      async () => {
        return await supabase
          .from('organizations')
          .select('id, code, name, name_ar, is_active, created_at')
          .eq('is_active', true)
          .order('code', { ascending: true })
          .limit(50);
      },
      isOffline ? 0 : 3,
      1000
    );
    
    if (error) throw error;
    
    const organizations = (data as Organization[]) || [];
    
    // 2. Update local cache for offline use
    if (organizations.length > 0) {
      try {
        await offlineCacheManager.set('organizations_cache', organizations);
      } catch (cacheUpdateErr) {
        console.warn('[getOrganizations] Failed to update local metadata cache:', cacheUpdateErr);
      }
    }
    
    return organizations;
  } catch (error: any) {
    if (getConnectionMonitor().getHealth().isOnline) console.error('[getOrganizations] Fetch failed:', error);
    
    // 3. Last resort fallback to local cache
    try {
      const cached = await offlineCacheManager.get<any[]>('organizations_cache', Infinity);
      if (cached && Array.isArray(cached)) {
        return cached;
      }
    } catch (finalFallbackErr) {
      // Ignore
    }
    
    return [];
  }
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const isOffline = !getConnectionMonitor().getHealth().isOnline;

  if (isOffline) {
    try {
      const cached = await offlineCacheManager.get<any[]>('organizations_cache', Infinity);
      if (cached && Array.isArray(cached)) {
        return cached.find((o: any) => o.id === id) || null;
      }
    } catch {}
    return null;
  }

  try {
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
  } catch (error) {
    // If we get a network error while "online", try cache as last resort
    try {
      const cached = await offlineCacheManager.get<any[]>('organizations_cache', Infinity);
      if (cached && Array.isArray(cached)) {
        return cached.find((o: any) => o.id === id) || null;
      }
    } catch {}
    throw error;
  }
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


// Get all users in an organization
// Get all users in an organization
export async function getOrganizationUsers(orgId: string): Promise<Array<{ id: string; name?: string; email: string }>> {
  const isOffline = !getConnectionMonitor().getHealth().isOnline;

  // 1. Offline Fallback
  if (isOffline) {
    try {
      const cached = await offlineCacheManager.get<any[]>('organization_users_cache');
      if (cached && Array.isArray(cached)) {
        return cached.filter((u: any) => u.org_id === orgId);
      }
    } catch (e) {
      console.error('[getOrganizationUsers] Cache read failed', e);
    }
    return [];
  }

  try {
    // 2. Fetch Members
    const { data: members, error: membersError } = await supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId);

    if (membersError) throw membersError;

    if (!members || members.length === 0) return [];

    const userIds = members.map(m => m.user_id);

    // 3. Fetch Profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, full_name_ar, email')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const result = (profiles || []).map(profile => ({
      id: profile.id,
      name: profile.full_name_ar || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
      email: profile.email,
      org_id: orgId 
    }));

    // 4. Update Cache
    try {
      const cached = await offlineCacheManager.get<any[]>('organization_users_cache', Infinity);
      let all = (cached && Array.isArray(cached)) ? cached : [];
      // Remove old entries for this org
      all = all.filter((u: any) => u.org_id !== orgId);
      // Add new
      all = [...all, ...result];
      
      await offlineCacheManager.set('organization_users_cache', all);
    } catch (e) {
      console.warn('Cache update failed', e);
    }

    return result.map(({ org_id, ...rest }) => rest);

  } catch (error) {
    console.error('[getOrganizationUsers] Error:', error);
    
    // Fallback on error
    try {
      const cached = await offlineCacheManager.get<any[]>('organization_users_cache', Infinity);
      if (cached && Array.isArray(cached)) {
        return cached.filter((u: any) => u.org_id === orgId);
      }
    } catch {}
    
    return [];
  }
}
