import { supabase } from "../utils/supabase";
import type { Organization } from "../types";

export type { Organization };

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
  
  console.log('[getOrganizations] Fetching organizations from API...');
  
  try {
    // Use retry mechanism for network resilience
    const { data, error } = await withRetry<{ data: any; error: any }>(
      async () => {
        const result = await supabase
          .from('organizations')
          .select('id, code, name, name_ar, is_active, created_at')
          .eq('is_active', true)
          .order('code', { ascending: true })
          .limit(50);
        return result;
      },
      3,
      1000
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
    
    // Unified flow uses memory, so no local caching here
    
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
export async function getOrganizationUsers(orgId: string): Promise<Array<{ id: string; name?: string; email: string }>> {
  try {
    // First get org members
    const { data: members, error: membersError } = await supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId)

    if (membersError) {
      console.error('[getOrganizationUsers] Error fetching org members:', membersError)
      throw membersError
    }

    if (!members || members.length === 0) {
      return []
    }

    // Then get user profiles for those members
    const userIds = members.map(m => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, full_name_ar, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('[getOrganizationUsers] Error fetching user profiles:', profilesError)
      throw profilesError
    }

    return (profiles as any[])?.map(profile => ({
      id: profile.id,
      name: profile.full_name_ar || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
      email: profile.email,
    })) || []
  } catch (error) {
    console.error('[getOrganizationUsers] Error:', error)
    throw error
  }
}
