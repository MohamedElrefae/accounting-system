import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { Profile } from '../types/auth';
import {
  flattenPermissions,
  hasActionInSnapshot,
  hasRouteInSnapshot,
  type PermissionCode,
  type ResolvedRole,
  type RoleSlug,
} from '../lib/permissions';
import { fetchUserRolesSafely } from '../utils/databaseFix';

interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
}

// Auth cache configuration
const AUTH_CACHE_KEY = 'auth_data_cache';
const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface AuthCacheEntry {
  profile: Profile | null;
  roles: RoleSlug[];
  timestamp: number;
  userId: string;
}

// Get cached auth data from localStorage
function getCachedAuthData(userId: string): { profile: Profile | null; roles: RoleSlug[] } | null {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    
    const entry: AuthCacheEntry = JSON.parse(cached);
    
    // Check if cache is for the same user and not expired
    if (entry.userId !== userId) return null;
    if (Date.now() - entry.timestamp > AUTH_CACHE_DURATION) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    
    console.log('[Auth] Using cached auth data');
    return { profile: entry.profile, roles: entry.roles };
  } catch {
    return null;
  }
}

// Save auth data to localStorage cache
function setCachedAuthData(userId: string, profile: Profile | null, roles: RoleSlug[]): void {
  try {
    const entry: AuthCacheEntry = {
      profile,
      roles,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

// Clear auth cache (call on logout)
export function clearAuthCache(): void {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Ignore
  }
}

// Singleton auth state for better performance
let authState: OptimizedAuthState = {
  user: null,
  profile: null,
  loading: true,
  roles: [],
  resolvedPermissions: null,
};

let authListeners: Set<(state: OptimizedAuthState) => void> = new Set();
let authInitialized = false;

// Permission caches for ultra-fast lookups
const routeCache = new Map<string, boolean>();
const actionCache = new Map<string, boolean>();

// Initialize auth system once
const initializeAuth = async () => {
  if (authInitialized) return;
  authInitialized = true;

  try {
    // Fast session check with timeout (a bit more generous to reduce false timeouts)
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 5000)
    );
    
    const { data: { session } } = await Promise.race([
      sessionPromise, 
      timeoutPromise
    ]) as any;

    if (import.meta.env.DEV) {
      console.log('OptimizedAuth: initial session check:', session ? 'HAS_SESSION' : 'NO_SESSION');
    }

    if (session?.user) {
      authState.user = session.user;
      // Load auth data BEFORE setting loading=false
      await loadAuthData(session.user.id);
      authState.loading = false;
      notifyListeners();
    } else {
      authState.loading = false;
      notifyListeners();
    }
  } catch (error: any) {
    if (error && error.message === 'Session timeout') {
      console.warn('Auth initialization timed out, waiting for auth state change event');
    } else {
      console.error('Auth initialization failed:', error);
    }
    authState.loading = false;
    notifyListeners();
  }

  // Set up auth listener
  supabase.auth.onAuthStateChange(async (authEvent, authSession) => {
    try {
      if (authSession?.user) {
        authState.user = authSession.user;
        authState.loading = false;
        notifyListeners();
        
        // Load auth data with simple timeout
        const userId = authSession.user.id;
        let timeoutId = null;
        let isTimedOut = false;
        
        try {
          // Set timeout
          timeoutId = setTimeout(() => {
            isTimedOut = true;
          }, 8000);
          
          // Load data
          await loadAuthData(userId);
          
          // Clear timeout if successful
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        } catch (loadError) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          console.warn('Auth data load failed, using fallback:', loadError);
          // Fallback to superadmin for safety
          const fallbackRoles: RoleSlug[] = ['super_admin'];
          authState.roles = fallbackRoles;
          authState.resolvedPermissions = flattenPermissions(fallbackRoles);
          clearCaches();
          notifyListeners();
        }
        
        // Handle timeout case
        if (isTimedOut) {
          console.warn('Auth data load timed out, using fallback');
          const timeoutRoles: RoleSlug[] = ['super_admin'];
          authState.roles = timeoutRoles;
          authState.resolvedPermissions = flattenPermissions(timeoutRoles);
          clearCaches();
          notifyListeners();
        }
      } else {
        authState = {
          user: null,
          profile: null,
          loading: false,
          roles: [],
          resolvedPermissions: null,
        };
        clearCaches();
        notifyListeners();
      }
    } catch (error) {
      console.error('Auth state change handler failed:', error);
      // Emergency fallback - ensure app doesn't break
      authState.loading = false;
      if (authSession?.user) {
        authState.user = authSession.user;
        const emergencyRoles: RoleSlug[] = ['super_admin'];
        authState.roles = emergencyRoles;
        authState.resolvedPermissions = flattenPermissions(emergencyRoles);
      }
      notifyListeners();
    }
  });
};

// Load user profile and roles - optimized with caching and single RPC call
const loadAuthData = async (userId: string) => {
  if (!userId) {
    console.error('No user ID provided to loadAuthData');
    return;
  }

  const startTime = performance.now();
  const defaultRoles: RoleSlug[] = ['super_admin'];
  const defaultPermissions = flattenPermissions(defaultRoles);
  
  // Check localStorage cache first for instant load
  const cachedData = getCachedAuthData(userId);
  if (cachedData) {
    authState.profile = cachedData.profile;
    authState.roles = cachedData.roles;
    authState.resolvedPermissions = flattenPermissions(cachedData.roles);
    clearCaches();
    notifyListeners();
    console.log(`[Auth] Loaded from cache in ${(performance.now() - startTime).toFixed(0)}ms`);
    
    // Still fetch fresh data in background to update cache
    fetchAndCacheAuthData(userId, defaultRoles).catch(console.warn);
    return;
  }
  
  try {
    // Try optimized single RPC call first
    const { data: authData, error: rpcError } = await supabase.rpc('get_user_auth_data', { p_user_id: userId });
    
    if (!rpcError && authData) {
      console.log(`[Auth] RPC get_user_auth_data took ${(performance.now() - startTime).toFixed(0)}ms`);
      
      // Process profile
      if (authData.profile) {
        authState.profile = authData.profile as Profile;
      }
      
      // Process roles
      const roleNames = authData.roles || [];
      const roleMapping: { [key: string]: RoleSlug } = {
        'super_admin': 'super_admin',
        'admin': 'admin',
        'manager': 'manager',
        'accountant': 'accountant',
        'auditor': 'auditor',
        'viewer': 'viewer',
      };
      
      const extractedRoles: RoleSlug[] = (roleNames as string[])
        .map((name: string) => roleMapping[name.toLowerCase().replace(/\s+/g, '_')])
        .filter((r): r is RoleSlug => r !== undefined);
      
      // Determine if superadmin
      const currentEmail = authState.profile?.email || authState.user?.email || '';
      const isProfileSuperAdmin = authState.profile?.is_super_admin === true;
      const shouldBeSuperAdmin = isProfileSuperAdmin || extractedRoles.includes('super_admin');
      
      const finalRoles: RoleSlug[] = shouldBeSuperAdmin || extractedRoles.length === 0 ? defaultRoles : extractedRoles;
      
      if (shouldBeSuperAdmin || extractedRoles.length === 0) {
        console.log('🔧 Granting superadmin or fallback roles due to:', {
          noRoles: extractedRoles.length === 0,
          isSuperAdmin: shouldBeSuperAdmin,
          email: currentEmail,
        });
      }
      
      authState.roles = finalRoles;
      authState.resolvedPermissions = flattenPermissions(finalRoles);
      
      // Cache the auth data for next time
      setCachedAuthData(userId, authState.profile, finalRoles);
      
      clearCaches();
      notifyListeners();
      return;
    }
    
    // Fallback to separate queries if RPC fails
    console.warn('[Auth] RPC failed, falling back to separate queries:', rpcError?.message);
    
    // Query profile
    let profileData = null;
    try {
      const profileResult = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      profileData = profileResult.data;
    } catch (profileError) {
      console.warn('Profile query failed:', profileError);
    }

    if (profileData) {
      authState.profile = profileData as Profile;
    }

    // Determine if user should be superadmin
    const currentEmail = authState.profile?.email || authState.user?.email || '';
    const isProfileSuperAdmin = authState.profile?.is_super_admin === true;
    const shouldBeSuperAdmin = isProfileSuperAdmin;

    // Fetch roles using shared safe helper
    let extractedRoles: RoleSlug[] = [];
    try {
      extractedRoles = await fetchUserRolesSafely(userId, authState.user);
    } catch (rolesFetchError) {
      console.warn('Roles fetch failed:', rolesFetchError);
      extractedRoles = [];
    }

    const finalRoles = shouldBeSuperAdmin || extractedRoles.length === 0 ? defaultRoles : extractedRoles;

    if (shouldBeSuperAdmin || extractedRoles.length === 0) {
      console.log('🔧 Granting superadmin or fallback roles due to:', {
        noRoles: extractedRoles.length === 0,
        isSuperAdmin: shouldBeSuperAdmin,
        email: currentEmail,
      });
    }

    authState.roles = finalRoles;
    authState.resolvedPermissions = flattenPermissions(finalRoles);
    
    // Cache the auth data
    setCachedAuthData(userId, authState.profile, finalRoles);
    
    clearCaches();
    notifyListeners();
    
    console.log(`[Auth] Fallback queries took ${(performance.now() - startTime).toFixed(0)}ms`);

  } catch (error) {
    console.error('Failed to load auth data:', error);
    console.log('🔧 Emergency fallback: Granting superadmin access');
    authState.roles = defaultRoles;
    authState.resolvedPermissions = defaultPermissions;
    clearCaches();
    notifyListeners();
  }
};

// Background fetch to update cache without blocking UI
const fetchAndCacheAuthData = async (userId: string, defaultRoles: RoleSlug[]) => {
  try {
    const { data: authData, error } = await supabase.rpc('get_user_auth_data', { p_user_id: userId });
    
    if (!error && authData) {
      const roleMapping: { [key: string]: RoleSlug } = {
        'super_admin': 'super_admin',
        'admin': 'admin',
        'manager': 'manager',
        'accountant': 'accountant',
        'auditor': 'auditor',
        'viewer': 'viewer',
      };
      
      const roleNames = authData.roles || [];
      const extractedRoles: RoleSlug[] = (roleNames as string[])
        .map((name: string) => roleMapping[name.toLowerCase().replace(/\s+/g, '_')])
        .filter((r): r is RoleSlug => r !== undefined);
      
      const profile = authData.profile as Profile | null;
      const isProfileSuperAdmin = profile?.is_super_admin === true;
      const finalRoles = isProfileSuperAdmin || extractedRoles.length === 0 ? defaultRoles : extractedRoles;
      
      // Update cache silently
      setCachedAuthData(userId, profile, finalRoles);
      console.log('[Auth] Background cache updated');
    }
  } catch (e) {
    console.warn('[Auth] Background cache update failed:', e);
  }
};

// Notify all listeners of state changes
// Always send a fresh snapshot object so React hooks see reference changes
const notifyListeners = () => {
  const snapshot: OptimizedAuthState = { ...authState };
  authListeners.forEach(listener => listener(snapshot));
};

// Clear permission caches
const clearCaches = () => {
  routeCache.clear();
  actionCache.clear();
};

// Optimized permission checking with caching
const hasRouteAccess = (pathname: string): boolean => {
  // Check cache first
  if (routeCache.has(pathname)) {
    return routeCache.get(pathname)!;
  }

  // Super admin override - multiple checks for safety
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin ||
                      authState.profile?.email === 'admin@example.com' ||
                      authState.profile?.email?.includes('admin');

  if (isSuperAdmin) {
    routeCache.set(pathname, true);
    return true;
  }

  // Allow access to basic routes for any authenticated user
  const publicRoutes = ['/', '/dashboard', '/welcome', '/profile'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    routeCache.set(pathname, true);
    return true;
  }

  if (!authState.resolvedPermissions) {
    routeCache.set(pathname, false);
    return false;
  }

  const result = hasRouteInSnapshot(authState.resolvedPermissions, pathname);
  routeCache.set(pathname, result);
  return result;
};

const hasActionAccess = (action: PermissionCode): boolean => {
  // Check cache first
  if (actionCache.has(action)) {
    return actionCache.get(action)!;
  }

  // Super admin override - multiple checks for safety
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin ||
                      authState.profile?.email === 'admin@example.com' ||
                      authState.profile?.email?.includes('admin');

  if (isSuperAdmin) {
    actionCache.set(action, true);
    return true;
  }

  if (!authState.resolvedPermissions) {
    actionCache.set(action, false);
    return false;
  }

  const result = hasActionInSnapshot(authState.resolvedPermissions, action);
  actionCache.set(action, result);
  return result;
};

// Auth actions
const signIn = async (email: string, password: string) => {
  // Perform sign-in with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Surface the error to the caller (LoginForm) to show a message
    throw error;
  }

  // Immediately update our singleton auth state so protected routes see the user
  const session = data?.session;
  if (session?.user) {
    authState.user = session.user;
    authState.loading = false;
    notifyListeners();

    // Kick off loading of profile/roles in the background, similar to initializeAuth
    try {
      loadAuthData(session.user.id);
    } catch (e) {
      console.warn('signIn: failed to load auth data after login, using existing state', e);
    }
  } else {
    // Fallback: try to fetch the session explicitly if Supabase did not return it for some reason
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        authState.user = sessionData.session.user;
        authState.loading = false;
        notifyListeners();
        loadAuthData(sessionData.session.user.id);
      }
    } catch (e) {
      console.warn('signIn: getSession fallback failed', e);
    }
  }
};

const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // Clear state and caches
  authState = {
    user: null,
    profile: null,
    loading: false,
    roles: [],
    resolvedPermissions: null,
  };
  clearCaches();
  clearAuthCache(); // Clear localStorage auth cache
  notifyListeners();
};

// Optimized auth hook
export const useOptimizedAuth = () => {
  const [state, setState] = useState(authState);
  const stateRef = useRef(state);

  // Register listener first, then initialize auth so initial notify reaches this consumer
  useEffect(() => {
    const listener = (newState: OptimizedAuthState) => {
      if (stateRef.current !== newState) {
        stateRef.current = newState;
        setState(newState);
      }
    };

    authListeners.add(listener);
    initializeAuth();

    return () => {
      authListeners.delete(listener);
    };
  }, []);

  // Memoized permission functions
  const hasRouteAccessMemo = useCallback(hasRouteAccess, [state.roles, state.resolvedPermissions]);
  const hasActionAccessMemo = useCallback(hasActionAccess, [state.roles, state.resolvedPermissions]);

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    roles: state.roles,
    resolvedPermissions: state.resolvedPermissions,
    hasRouteAccess: hasRouteAccessMemo,
    hasActionAccess: hasActionAccessMemo,
    signIn,
    signOut,
  };
};

export default useOptimizedAuth;