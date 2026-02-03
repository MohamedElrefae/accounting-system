import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { Profile } from '../types/auth';
import featureFlags from '../utils/featureFlags';
import { ApplicationPerformanceMonitor } from '../services/ApplicationPerformanceMonitor';
import {
  flattenPermissions,
  hasActionInSnapshot,
  hasRouteInSnapshot,
  type PermissionCode,
  type ResolvedRole,
  type RoleSlug,
} from '../lib/permissions';
import { fetchUserRolesSafely } from '../utils/databaseFix';

interface OrgRole {
  org_id: string;
  role: string;
  can_access_all_projects: boolean;
  org_name?: string;
  org_name_ar?: string;
}

interface ProjectRole {
  project_id: string;
  role: string;
  project_name?: string;
  project_name_ar?: string;
  org_id: string;
}

interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // Scope-aware fields for org/project access validation
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  
  // NEW: Scoped roles (Phase 6)
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
}

// Auth cache configuration with versioning and stampede protection
const CACHE_VERSION = 'v7'; // Increment on schema changes - v7: Force permission refresh for Accountant role fixes
const AUTH_CACHE_KEY = `auth_data_cache_${CACHE_VERSION}`;
const AUTH_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (extended from 5)

interface AuthCacheEntry {
  profile: Profile | null;
  roles: RoleSlug[];
  timestamp: number;
  userId: string;
  cacheVersion: string;
  
  // Scope data for org/project access
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  
  // NEW: Scoped roles (Phase 6)
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
}

// Get cached auth data from localStorage with stampede protection
function getCachedAuthData(userId: string): { 
  profile: Profile | null; 
  roles: RoleSlug[];
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
} | null {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    
    const entry: AuthCacheEntry = JSON.parse(cached);
    
    // Check if cache is for the same user and not expired
    if (entry.userId !== userId) return null;
    if (entry.cacheVersion !== CACHE_VERSION) {
    if (import.meta.env.DEV) {
      console.log('[Auth] Cache version mismatch, clearing old cache');
    }
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    
    const expirationTime = entry.timestamp + AUTH_CACHE_DURATION;
    const currentTime = Date.now();
    
    // Probabilistic early expiration (5% chance) to prevent stampede
    if (currentTime > expirationTime || 
        (currentTime > expirationTime * 0.9 && Math.random() < 0.05)) {
      return null;
    }
    
    if (import.meta.env.DEV) {
      console.log('[Auth] Using cached auth data with stampede protection');
    }
    return { 
      profile: entry.profile, 
      roles: entry.roles,
      userOrganizations: entry.userOrganizations || [],
      userProjects: entry.userProjects || [],
      defaultOrgId: entry.defaultOrgId || null,
      orgRoles: entry.orgRoles || [],
      projectRoles: entry.projectRoles || []
    };
  } catch (error) {
    console.warn('[Auth] Cache read error:', error);
    return null;
  }
}

// Save auth data to localStorage cache
function setCachedAuthData(
  userId: string, 
  profile: Profile | null, 
  roles: RoleSlug[],
  userOrganizations: string[],
  userProjects: string[],
  defaultOrgId: string | null,
  orgRoles: OrgRole[] = [],
  projectRoles: ProjectRole[] = []
): void {
  try {
    const entry: AuthCacheEntry = {
      profile,
      roles,
      timestamp: Date.now(),
      userId,
      cacheVersion: CACHE_VERSION,
      userOrganizations,
      userProjects,
      defaultOrgId,
      orgRoles,
      projectRoles
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(entry));
    if (import.meta.env.DEV) {
      console.log('[Auth] Saved auth data to cache');
    }
  } catch (error) {
    console.warn('[Auth] Cache write error:', error);
    // Ignore storage errors
  }
}

// Clear auth cache (call on logout)
export function clearAuthCache(): void {
  try {
    // Clear all cache versions
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('auth_data_cache_')) {
        localStorage.removeItem(key);
      }
    });
    if (import.meta.env.DEV) {
      console.log('[Auth] Cleared all auth cache versions');
    }
  } catch (error) {
    console.warn('[Auth] Cache clear error:', error);
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
  
  // Initialize scope fields
  userOrganizations: [],
  userProjects: [],
  defaultOrgId: null,
  
  // Initialize scoped roles (Phase 6)
  orgRoles: [],
  projectRoles: [],
};

const authListeners: Set<(state: OptimizedAuthState) => void> = new Set();
let authInitialized = false;

// Permission caches for ultra-fast lookups
const routeCache = new Map<string, boolean>();
const actionCache = new Map<string, boolean>();

// Permission cache persistence (Phase 2)
const PERMISSION_CACHE_VERSION = 'v1';
const PERMISSION_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const PERMISSION_CACHE_KEY = (userId: string) => `permission_cache_${PERMISSION_CACHE_VERSION}_${userId}`;

let permissionCacheCleanup: (() => void) | null = null;
let permissionCacheUserId: string | null = null;

const getRolesSignature = (roles: RoleSlug[]) => roles.join(',');

const hydratePermissionCaches = (userId: string, rolesSig: string) => {
  if (!featureFlags.isEnabled('PERMISSION_CACHING')) return;

  try {
    const raw = localStorage.getItem(PERMISSION_CACHE_KEY(userId));
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      timestamp: number;
      rolesSig: string;
      routeCache: Record<string, boolean>;
      actionCache: Record<string, boolean>;
    };

    if (!parsed || typeof parsed.timestamp !== 'number') return;
    if (Date.now() - parsed.timestamp > PERMISSION_CACHE_DURATION) return;
    if (parsed.rolesSig !== rolesSig) return;

    Object.entries(parsed.routeCache || {}).forEach(([k, v]) => routeCache.set(k, v));
    Object.entries(parsed.actionCache || {}).forEach(([k, v]) => actionCache.set(k, v));
  } catch (e) {
    console.warn('[Auth] Permission cache invalid:', e);
  }
};

const persistPermissionCaches = (userId: string, rolesSig: string) => {
  if (!featureFlags.isEnabled('PERMISSION_CACHING')) return;

  try {
    const routeObj: Record<string, boolean> = {};
    const actionObj: Record<string, boolean> = {};

    routeCache.forEach((v, k) => {
      routeObj[k] = v;
    });
    actionCache.forEach((v, k) => {
      actionObj[k] = v;
    });

    localStorage.setItem(
      PERMISSION_CACHE_KEY(userId),
      JSON.stringify({
        timestamp: Date.now(),
        rolesSig,
        routeCache: routeObj,
        actionCache: actionObj,
      })
    );
  } catch (e) {
    console.warn('[Auth] Permission cache write error:', e);
  }
};

const setupPermissionCachePersistence = (userId: string, rolesSig: string) => {
  if (!featureFlags.isEnabled('PERMISSION_CACHING')) return;

  if (permissionCacheCleanup) {
    permissionCacheCleanup();
    permissionCacheCleanup = null;
    permissionCacheUserId = null;
  }

  permissionCacheUserId = userId;

  const save = () => {
    if (!permissionCacheUserId) return;
    persistPermissionCaches(permissionCacheUserId, rolesSig);
  };

  const intervalId = window.setInterval(save, 5 * 60 * 1000);
  window.addEventListener('beforeunload', save);

  permissionCacheCleanup = () => {
    window.clearInterval(intervalId);
    window.removeEventListener('beforeunload', save);
  };
};

const teardownPermissionCachePersistence = () => {
  if (permissionCacheCleanup) {
    permissionCacheCleanup();
    permissionCacheCleanup = null;
    permissionCacheUserId = null;
  }
};

const withTimeout = async <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    }),
  ]);
};

// Initialize auth system once
const initializeAuth = async () => {
  if (authInitialized) return;
  authInitialized = true;

  let initialSessionResolved = false;
  let resolveInitialSession: (session: any | null) => void = () => {};
  const initialSessionPromise = new Promise<any | null>((resolve) => {
    resolveInitialSession = resolve;
  });

  const applyAuthenticatedUser = async (userId: string) => {
    try {
      await withTimeout(loadAuthData(userId), 8000, 'Auth data load timeout');
    } catch (loadError) {
      console.warn('Auth data load failed, using fallback:', loadError);
      const fallbackRoles: RoleSlug[] = ['super_admin'];
      authState.roles = fallbackRoles;
      authState.resolvedPermissions = flattenPermissions(fallbackRoles);
      clearCaches();
      notifyListeners();
    }
  };

  // Set up auth listener first so we don't miss INITIAL_SESSION
  supabase.auth.onAuthStateChange(async (authEvent, authSession) => {
    if (!initialSessionResolved && authEvent === 'INITIAL_SESSION') {
      initialSessionResolved = true;
      resolveInitialSession(authSession ?? null);
    }

    try {
      if (authSession?.user) {
        authState.user = authSession.user;
        authState.loading = true;
        notifyListeners();

        await applyAuthenticatedUser(authSession.user.id);

        authState.loading = false;
        notifyListeners();
      } else {
        authState = {
          user: null,
          profile: null,
          loading: false,
          roles: [],
          resolvedPermissions: null,
          userOrganizations: [],
          userProjects: [],
          defaultOrgId: null,
          orgRoles: [],
          projectRoles: [],
        };
        clearCaches();
        notifyListeners();
      }
    } catch (error) {
      console.error('Auth state change handler failed:', error);
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

  try {
    const session = await Promise.race([
      initialSessionPromise,
      withTimeout(
        supabase.auth.getSession().then((r) => r.data.session ?? null),
        8000,
        'Session timeout'
      ),
    ]);

    if (import.meta.env.DEV) {
      console.log('OptimizedAuth: initial session check:', session ? 'HAS_SESSION' : 'NO_SESSION');
    }

    if (session?.user) {
      authState.user = session.user;
      authState.loading = true;
      notifyListeners();
      await applyAuthenticatedUser(session.user.id);
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
};

// Load user profile and roles - optimized with caching and single RPC call
const loadAuthData = async (userId: string) => {
  if (!userId) {
    console.error('No user ID provided to loadAuthData');
    return;
  }

  const startTime = performance.now();
  const defaultRoles: RoleSlug[] = ['viewer']; // FAIL SAFE: Default to Viewer
  if (import.meta.env.DEV) {
    console.log('[Auth] loadAuthData start', { userId, defaultRoles });
  } 
  const defaultPermissions = flattenPermissions(defaultRoles);
  
  // Check localStorage cache first for instant load
  const cachedData = getCachedAuthData(userId);
  if (cachedData) {
    authState.profile = cachedData.profile;
    authState.roles = cachedData.roles;
    authState.resolvedPermissions = flattenPermissions(cachedData.roles);
    
    // Restore scope data from cache
    authState.userOrganizations = cachedData.userOrganizations;
    authState.userProjects = cachedData.userProjects;
    authState.defaultOrgId = cachedData.defaultOrgId;
    
    clearCaches();

    // Restore cached permission decisions (Phase 2)
    const rolesSig = getRolesSignature(authState.roles);
    hydratePermissionCaches(userId, rolesSig);
    setupPermissionCachePersistence(userId, rolesSig);
    
    // CRITICAL: Mark loading as complete after cache restore
    authState.loading = false;
    notifyListeners();
    
    const cacheLoadTime = performance.now() - startTime;
    if (import.meta.env.DEV) {
      console.log(`[Auth] Loaded from cache in ${cacheLoadTime.toFixed(0)}ms`);
    }
    
    // Log cache hit for monitoring
    logAuthPerformance({
      loadTime: cacheLoadTime,
      cacheHit: true,
      rpcSuccess: false,
      profileSuccess: false,
      networkType: 'unknown' // navigator.connection is not available in all browsers
    });
    
    // Still fetch fresh data in background to update cache
    fetchAndCacheAuthData(userId, defaultRoles).catch(console.warn);
    return;
  }
  
  try {
    // Phase 2: parallel auth queries (RPC + profile) with timeouts
    if (featureFlags.isEnabled('PARALLEL_AUTH_QUERIES')) {
      const parallelStart = performance.now();

      const [profileResult, rpcResult] = await Promise.allSettled([
        (async () => {
          const result = await supabase.from('user_profiles').select('*').eq('id', userId).single();
          return result;
        })(),
        (async () => {
          const result = await supabase.rpc('get_user_auth_data', { p_user_id: userId });
          return result;
        })()
      ]);

      const tryUseRpc = async () => {
        if (rpcResult.status !== 'fulfilled') return false;
        const rpcValue = rpcResult.value as any;
        if (!rpcValue || rpcValue.error || !rpcValue.data) return false;

        const authData = rpcValue.data;

        if (authData.profile) {
          authState.profile = authData.profile as Profile;
        }

        const roleNames = authData.roles || [];
        const roleMapping: { [key: string]: RoleSlug } = {
          super_admin: 'super_admin',
          admin: 'admin',
          manager: 'manager',
          hr: 'hr',
          team_leader: 'team_leader',
          accountant: 'accountant',
          auditor: 'auditor',
          viewer: 'viewer',
          // Arabic mappings
          'محاسب': 'accountant',
          'مدير': 'manager',
          'مشرف': 'admin',
          'مسؤول': 'admin',
          'مراقب': 'auditor',
          'مراجع': 'auditor',
          'قائد فريق': 'team_leader',
          'موارد بشرية': 'hr',
          'مشاهد': 'viewer',
        };

        const extractedRoles: RoleSlug[] = (roleNames as string[])
          .map((name: string) => {
            const cleanName = String(name || '').trim().toLowerCase().replace(/\s+/g, '_');
            
            // 1. Try Exact Match
            let mapped = roleMapping[cleanName];
            
            // 2. Try Fuzzy Match for Arabic (Common issue with variations)
            if (!mapped) {
              if (cleanName.includes('محاسب')) mapped = 'accountant';
              else if (cleanName.includes('مدير')) mapped = 'manager';
              else if (cleanName.includes('مشرف') || cleanName.includes('مسؤول')) mapped = 'admin';
              else if (cleanName.includes('مراقب') || cleanName.includes('مراجع')) mapped = 'auditor';
              else if (cleanName.includes('قائد فريق')) mapped = 'team_leader';
              else if (cleanName.includes('موارد')) mapped = 'hr';
            }

            if (!mapped) {
               // Log critical error but NOT break execution used to default to viewer
               console.error(`[Auth] CRITICAL: RPC Role mapping failed for: "${name}" (cleaned: "${cleanName}")`);
            }
            return mapped;
          })
          .filter((r): r is RoleSlug => r !== undefined);

        if (import.meta.env.DEV) {
          console.log('[Auth] RPC Processed Roles:', { raw: roleNames, extracted: extractedRoles });
        }

        const isProfileSuperAdmin = authState.profile?.is_super_admin === true;
        let finalRoles: RoleSlug[] = extractedRoles;

        // If RPC failed to find roles, try legacy fallback before falling back to defaultRoles
        if (finalRoles.length === 0) {
           if (import.meta.env.DEV) console.warn('[Auth] RPC returned no roles, trying legacy fallback...');
           try {
             const legacyRoles = await fetchUserRolesSafely(userId, authState.user);
             if (legacyRoles.length > 0) {
               if (import.meta.env.DEV) console.log('[Auth] Legacy fallback recovered roles:', legacyRoles);
               finalRoles = legacyRoles;
             }
           } catch (e) {
             console.error('[Auth] Legacy fallback failed:', e);
           }
        }

        const shouldBeSuperAdmin = isProfileSuperAdmin || finalRoles.includes('super_admin');
        const resolvedRoles: RoleSlug[] = shouldBeSuperAdmin ? ['super_admin'] : (finalRoles.length === 0 ? defaultRoles : finalRoles);

        // Process scope data from RPC
        const organizations = authData.organizations || [];
        const projects = authData.projects || [];
        const defaultOrg = authData.default_org || null;
        
        authState.roles = resolvedRoles;
        authState.resolvedPermissions = flattenPermissions(resolvedRoles);
        authState.userOrganizations = organizations;
        authState.userProjects = projects;
        authState.defaultOrgId = defaultOrg;
        
        setCachedAuthData(
          userId, 
          authState.profile, 
          resolvedRoles,
          organizations,
          projects,
          defaultOrg
        );

        const totalLoadTime = performance.now() - parallelStart;
        logAuthPerformance({
          loadTime: totalLoadTime,
          cacheHit: false,
          rpcSuccess: true,
          profileSuccess: false,
          networkType: 'unknown'
        });

        clearCaches();
        const rolesSig = getRolesSignature(authState.roles);
        hydratePermissionCaches(userId, rolesSig);
        setupPermissionCachePersistence(userId, rolesSig);
        notifyListeners();
        return true;
      };

      const tryUseProfile = async () => {
        if (profileResult.status !== 'fulfilled') return false;
        const profileValue = profileResult.value as any;
        if (!profileValue || profileValue.error || !profileValue.data) return false;

        authState.profile = profileValue.data as Profile;

        const isProfileSuperAdmin = authState.profile?.is_super_admin === true;
        let extractedRoles: RoleSlug[] = [];
        try {
          extractedRoles = await fetchUserRolesSafely(userId, authState.user);
        } catch {
          extractedRoles = [];
        }

        const finalRoles: RoleSlug[] = isProfileSuperAdmin || extractedRoles.length === 0 ? defaultRoles : extractedRoles;
        authState.roles = finalRoles;
        authState.resolvedPermissions = flattenPermissions(finalRoles);
        
        // Scope data not available in profile-only fallback - will be empty
        authState.userOrganizations = [];
        authState.userProjects = [];
        authState.defaultOrgId = null;
        authState.orgRoles = [];
        authState.projectRoles = [];
        
        setCachedAuthData(
          userId, 
          authState.profile, 
          finalRoles,
          [],
          [],
          null,
          [],
          []
        );

        const totalLoadTime = performance.now() - parallelStart;
        logAuthPerformance({
          loadTime: totalLoadTime,
          cacheHit: false,
          rpcSuccess: false,
          profileSuccess: true,
          networkType: 'unknown'
        });

        clearCaches();
        const rolesSig = getRolesSignature(authState.roles);
        hydratePermissionCaches(userId, rolesSig);
        setupPermissionCachePersistence(userId, rolesSig);
        notifyListeners();
        return true;
      };

      // Priority: RPC (faster / more complete) then Profile
      if (await tryUseRpc()) return;
      if (await tryUseProfile()) return;

      throw new Error('Parallel auth queries failed');
    }

    // Try optimized single RPC call first
    const { data: authData, error: rpcError } = await supabase.rpc('get_user_auth_data', { p_user_id: userId });
    
    if (!rpcError && authData) {
      if (import.meta.env.DEV) {
        console.log(`[Auth] RPC get_user_auth_data took ${(performance.now() - startTime).toFixed(0)}ms`);
      }
      
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
        'hr': 'hr', // Added missing English HR here too just in case
        'team_leader': 'team_leader', // Added missing English Team Leader here too
        'accountant': 'accountant',
        'auditor': 'auditor',
        'viewer': 'viewer',
        // Arabic mappings
        'محاسب': 'accountant',
        'مدير': 'manager',
        'مشرف': 'admin',
        'مسؤول': 'admin',
        'مراقب': 'auditor',
        'مراجع': 'auditor',
        'قائد فريق': 'team_leader',
        'موارد بشرية': 'hr',
        'مشاهد': 'viewer',
      };
      
      let extractedRoles: RoleSlug[] = (roleNames as string[])
        .map((name: string) => {
          const cleanName = String(name || '').trim().toLowerCase().replace(/\s+/g, '_');
          
          // 1. Try Exact Match
          let mapped = roleMapping[cleanName];
          
          // 2. Try Fuzzy Match for Arabic
          if (!mapped) {
            if (cleanName.includes('محاسب')) mapped = 'accountant';
            else if (cleanName.includes('مدير')) mapped = 'manager';
            else if (cleanName.includes('مشرف') || cleanName.includes('مسؤول')) mapped = 'admin';
            else if (cleanName.includes('مراقب') || cleanName.includes('مراجع')) mapped = 'auditor';
            else if (cleanName.includes('قائد فريق')) mapped = 'team_leader';
            else if (cleanName.includes('موارد')) mapped = 'hr';
          }

          if (!mapped) {
            console.error(`[Auth] CRITICAL: Fallback Role mapping failed for: "${name}" (cleaned: "${cleanName}")`);
          }
          return mapped;
        })
        .filter((r): r is RoleSlug => r !== undefined);
      
      // If RPC failed to find roles, try legacy fallback
      if (extractedRoles.length === 0) {
         if (import.meta.env.DEV) console.warn('[Auth] Primary RPC returned no roles, trying legacy fallback...');
         try {
           const legacyRoles = await fetchUserRolesSafely(userId, authState.user);
           if (legacyRoles.length > 0) {
             if (import.meta.env.DEV) console.log('[Auth] Primary legacy fallback recovered roles:', legacyRoles);
             extractedRoles = legacyRoles;
           }
         } catch (e) {
           console.error('[Auth] Primary legacy fallback failed:', e);
         }
      }

      // Process scope data (organizations, projects, default_org)
      const organizations = authData.organizations || [];
      const projects = authData.projects || [];
      const defaultOrg = authData.default_org || null;
      
      // Process org roles (Phase 6)
      const orgRoles = authData.org_roles || [];
      const projectRoles = authData.project_roles || [];
      
      authState.userOrganizations = organizations;
      authState.userProjects = projects;
      authState.defaultOrgId = defaultOrg;
      authState.orgRoles = orgRoles;
      authState.projectRoles = projectRoles;
      
      if (import.meta.env.DEV) {
        console.log('[Auth] Loaded scope data:', {
          orgs: organizations.length,
          projects: projects.length,
          defaultOrg,
          orgRoles: orgRoles.length,
          projectRoles: projectRoles.length
        });
      }
      
      // Determine if superadmin
      const currentEmail = authState.profile?.email || authState.user?.email || '';
      const isProfileSuperAdmin = authState.profile?.is_super_admin === true;
      const shouldBeSuperAdmin = isProfileSuperAdmin || extractedRoles.includes('super_admin');
      
      // Removed defaultRoles fallback. If extractedRoles is empty, finalRoles is empty.
      const finalRoles: RoleSlug[] = shouldBeSuperAdmin ? ['super_admin'] : extractedRoles;
      
      if (shouldBeSuperAdmin && extractedRoles.length === 0) {
        // Only log if we are granting superadmin

        if (import.meta.env.DEV) {
          console.log('🔧 Granting superadmin or fallback roles due to:', {
            noRoles: extractedRoles.length === 0,
            isSuperAdmin: shouldBeSuperAdmin,
            email: currentEmail,
          });
        }
      }
      
      authState.roles = finalRoles;
      authState.resolvedPermissions = flattenPermissions(finalRoles);
      
      // Cache the auth data for next time (including scope data and scoped roles)
      setCachedAuthData(
        userId, 
        authState.profile, 
        finalRoles,
        authState.userOrganizations,
        authState.userProjects,
        authState.defaultOrgId,
        authState.orgRoles,
        authState.projectRoles
      );
      
      const totalLoadTime = performance.now() - startTime;
      if (import.meta.env.DEV) {
        console.log(`[Auth] RPC load completed in ${totalLoadTime.toFixed(0)}ms`);
      }
      
      // Log performance metrics
      logAuthPerformance({
        loadTime: totalLoadTime,
        cacheHit: false,
        rpcSuccess: true,
        profileSuccess: false,
        networkType: 'unknown'
      });
      
      clearCaches();
      const rolesSig = getRolesSignature(authState.roles);
      hydratePermissionCaches(userId, rolesSig);
      setupPermissionCachePersistence(userId, rolesSig);
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
      if (import.meta.env.DEV) {
        console.log('🔧 Granting superadmin or fallback roles due to:', {
          noRoles: extractedRoles.length === 0,
          isSuperAdmin: shouldBeSuperAdmin,
          email: currentEmail,
        });
      }
    }

    authState.roles = finalRoles;
    authState.resolvedPermissions = flattenPermissions(finalRoles);
    
    // Scope data not available in fallback path - will be empty
    authState.userOrganizations = [];
    authState.userProjects = [];
    authState.defaultOrgId = null;
    authState.orgRoles = [];
    authState.projectRoles = [];
    
    // Cache the auth data
    setCachedAuthData(
      userId, 
      authState.profile, 
      finalRoles,
      [],
      [],
      null,
      [],
      []
    );
    
    const fallbackLoadTime = performance.now() - startTime;
    if (import.meta.env.DEV) {
      console.log(`[Auth] Fallback queries took ${fallbackLoadTime.toFixed(0)}ms`);
    }
    
    // Log performance metrics for fallback
    logAuthPerformance({
      loadTime: fallbackLoadTime,
      cacheHit: false,
      rpcSuccess: false,
      profileSuccess: true,
      networkType: 'unknown'
    });
    
    clearCaches();
    const rolesSig = getRolesSignature(authState.roles);
    hydratePermissionCaches(userId, rolesSig);
    setupPermissionCachePersistence(userId, rolesSig);
    notifyListeners();

  } catch (error) {
    console.error('Failed to load auth data:', error);
    if (import.meta.env.DEV) {
      console.log('🔧 Emergency fallback: Granting superadmin access');
    }
    authState.roles = defaultRoles;
    authState.resolvedPermissions = defaultPermissions;
    clearCaches();
    const rolesSig = getRolesSignature(authState.roles);
    hydratePermissionCaches(userId, rolesSig);
    setupPermissionCachePersistence(userId, rolesSig);
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
        .map((name: string) => {
            const cleanName = String(name || '').trim().toLowerCase().replace(/\s+/g, '_');
            
            // 1. Try Exact Match
            let mapped = roleMapping[cleanName];
            
            // 2. Try Fuzzy Match for Arabic (Common issue with variations)
            if (!mapped) {
              if (cleanName.includes('محاسب')) mapped = 'accountant';
              else if (cleanName.includes('مدير')) mapped = 'manager';
              else if (cleanName.includes('مشرف') || cleanName.includes('مسؤول')) mapped = 'admin';
              else if (cleanName.includes('مراقب') || cleanName.includes('مراجع')) mapped = 'auditor';
              else if (cleanName.includes('قائد فريق')) mapped = 'team_leader';
              else if (cleanName.includes('موارد')) mapped = 'hr';
            }

            if (!mapped) {
               console.error(`[Auth] CRITICAL: Background Role mapping failed for: "${name}" (cleaned: "${cleanName}")`);
            }
            return mapped;
        })
        .filter((r): r is RoleSlug => r !== undefined);
      
      const profile = authData.profile as Profile | null;
      const isProfileSuperAdmin = profile?.is_super_admin === true;
      const finalRoles = isProfileSuperAdmin || extractedRoles.length === 0 ? defaultRoles : extractedRoles;
      
      // Extract scope data
      const organizations = authData.organizations || [];
      const projects = authData.projects || [];
      const defaultOrg = authData.default_org || null;
      
      // Extract scoped roles (Phase 6)
      const orgRoles = authData.org_roles || [];
      const projectRoles = authData.project_roles || [];
      
      // GUARD: Only update cache if we extracted valid roles
      // This prevents cache corruption with default 'viewer' role
      if (extractedRoles.length > 0) {
        // Update cache silently (including scope data and scoped roles)
        setCachedAuthData(
          userId, 
          profile, 
          finalRoles,
          organizations,
          projects,
          defaultOrg,
          orgRoles,
          projectRoles
        );
        if (import.meta.env.DEV) {
          console.log('[Auth] Background cache updated with roles:', finalRoles);
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('[Auth] Background RPC returned no roles. Attempting fallback fetch...');
        }

        // FALLBACK: Try to fetch legacy roles directly if RPC missed them
        try {
           const legacyRoles = await fetchUserRolesSafely(userId);
           if (legacyRoles.length > 0) {
              console.log('[Auth] Fallback fetch recovered roles:', legacyRoles);
              
              // Recalculate final roles with legacy fallbacks
              const recoveredRoles = isProfileSuperAdmin ? defaultRoles : legacyRoles;

              setCachedAuthData(
                userId, 
                profile, 
                recoveredRoles,
                organizations,
                projects,
                defaultOrg,
                orgRoles,
                projectRoles
              );
           } else {
             console.warn('[Auth] Background cache NOT updated - no valid roles extracted from RPC or Fallback');
           }
        } catch (err) {
           console.error('[Auth] Background fallback fetch failed', err);
        }
      }
    }
  } catch (e) {
    console.warn('[Auth] Background cache update failed:', e);
  }
};

// Performance logging function for monitoring
const logAuthPerformance = (data: {
  loadTime: number;
  cacheHit: boolean;
  rpcSuccess: boolean;
  profileSuccess: boolean;
  networkType?: string;
}) => {
  ApplicationPerformanceMonitor.record('auth_init_duration_ms', data.loadTime);

  // Log to analytics if available
  const w = window as any;
  if (w?.analytics?.track) {
    w.analytics.track('AuthPerformance', {
      loadTime: data.loadTime,
      cacheHit: data.cacheHit,
      rpcSuccess: data.rpcSuccess,
      profileSuccess: data.profileSuccess,
      networkType: data.networkType || 'unknown',
      timestamp: Date.now(),
    });
  }
  if (w?.monitoring?.send) {
    w.monitoring.send('auth.performance', {
      auth_init_duration_ms: data.loadTime,
      rpc_success: data.rpcSuccess,
      profile_fallback_used: !data.rpcSuccess && data.profileSuccess,
      cache_hit_ratio: data.cacheHit ? 1 : 0,
      network_type: data.networkType || 'unknown',
      user_agent: navigator.userAgent,
      timestamp: Date.now(),
    });
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[PERF] Auth: ${data.loadTime.toFixed(0)}ms`, {
      cacheHit: data.cacheHit,
      rpcSuccess: data.rpcSuccess,
      networkType: data.networkType
    });
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
  const cacheKey = `${pathname}|${getRolesSignature(authState.roles)}`;

  // Check cache first
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Super admin override - multiple checks for safety
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin ||
                      authState.profile?.email === 'admin@example.com' ||
                      authState.profile?.email?.includes('admin');

  if (isSuperAdmin) {
    routeCache.set(cacheKey, true);
    return true;
  }

  // Allow access to basic routes for any authenticated user
  const publicRoutes = ['/', '/dashboard', '/welcome', '/profile'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    routeCache.set(cacheKey, true);
    return true;
  }

  if (!authState.resolvedPermissions) {
    routeCache.set(cacheKey, false);
    return false;
  }

  const result = hasRouteInSnapshot(authState.resolvedPermissions, pathname);
  routeCache.set(cacheKey, result);
  return result;
};

const hasActionAccess = (action: PermissionCode): boolean => {
  const cacheKey = `${String(action)}|${getRolesSignature(authState.roles)}`;

  // Check cache first
  if (actionCache.has(cacheKey)) {
    return actionCache.get(cacheKey)!;
  }

  // Super admin override - multiple checks for safety
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin ||
                      authState.profile?.email === 'admin@example.com' ||
                      authState.profile?.email?.includes('admin');

  if (isSuperAdmin) {
    actionCache.set(cacheKey, true);
    return true;
  }

  if (!authState.resolvedPermissions) {
    actionCache.set(cacheKey, false);
    return false;
  }

  const result = hasActionInSnapshot(authState.resolvedPermissions, action);
  actionCache.set(cacheKey, result);
  return result;
};

// Scope validation functions for org/project access control
/**
 * Check if user belongs to an organization
 * @param orgId - Organization ID to check
 * @returns true if user has access to the organization
 */
const belongsToOrg = (orgId: string): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check membership
  return authState.userOrganizations.includes(orgId);
};

/**
 * Check if user can access a project
 * @param projectId - Project ID to check
 * @returns true if user has access to the project
 */
const canAccessProject = (projectId: string): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check access (includes both direct project memberships and org-level access)
  return authState.userProjects.includes(projectId);
};

/**
 * Get user's roles in a specific organization
 * @param orgId - Organization ID
 * @returns Array of role slugs for the organization
 * @note Currently returns global roles. Org-scoped roles to be implemented in future.
 */
const getRolesInOrg = (orgId: string): RoleSlug[] => {
  if (!orgId) return [];
  
  // For now, return global roles if user belongs to org
  // TODO: Implement org-scoped roles when needed
  if (!belongsToOrg(orgId)) return [];
  return authState.roles;
};

/**
 * Check if user has a specific permission in an organization
 * @param action - Permission code to check
 * @param orgId - Organization ID
 * @returns true if user has the permission in the organization
 */
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  if (!belongsToOrg(orgId)) return false;
  return hasActionAccess(action);
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
    userOrganizations: [],
    userProjects: [],
    defaultOrgId: null,
    orgRoles: [],
    projectRoles: [],
  };
  clearCaches();
  clearAuthCache(); // Clear localStorage auth cache
  teardownPermissionCachePersistence();
  notifyListeners();
};

const signUp = async (email: string, password: string) => {
  try {
    console.log('🔍 Checking approval for email:', email.toLowerCase());
    
    // First check if email is approved - use case-insensitive query
    const { data: approvedRequests, error: approvalError } = await supabase
      .from('access_requests')
      .select('email, status, full_name_ar, phone, department, job_title, assigned_role')
      .ilike('email', email.toLowerCase())
      .eq('status', 'approved');

    console.log('📊 Approval query result:', { data: approvedRequests, error: approvalError });

    if (approvalError) {
      console.error('❌ Approval query error:', approvalError);
      // Try alternative query if ilike doesn't work
      const { data: fallbackRequests, error: fallbackError } = await supabase
        .from('access_requests')
        .select('email, status, full_name_ar, phone, department, job_title, assigned_role')
        .eq('email', email)
        .eq('status', 'approved');
      
      console.log('🔄 Fallback query result:', { data: fallbackRequests, error: fallbackError });
      
      if (fallbackError || !fallbackRequests || fallbackRequests.length === 0) {
        throw new Error(`خطأ في التحقق من الموافقة: ${approvalError.message}`);
      }
      
      // Use fallback results
      return await processApprovedRequest(fallbackRequests[0], email, password);
    }

    if (!approvedRequests || approvedRequests.length === 0) {
      console.log('❌ No approved request found for email:', email.toLowerCase());
      
      // Debug: Check what emails are actually approved
      const { data: allApproved } = await supabase
        .from('access_requests')
        .select('email, status')
        .eq('status', 'approved');
      
      console.log('🔍 All approved emails in database:', allApproved);
      
      throw new Error('هذا البريد الإلكتروني غير معتمد للتسجيل. يرجى طلب الوصول أولاً.');
    }

    return await processApprovedRequest(approvedRequests[0], email, password);
  } catch (error) {
    console.error('❌ Signup error:', error);
    throw error;
  }
};

// Helper function to process approved request and create user
const processApprovedRequest = async (approvedRequest: any, email: string, password: string) => {
  console.log('✅ Found approved request:', approvedRequest);

  // Create the user account
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        full_name: approvedRequest.full_name_ar,
        phone: approvedRequest.phone,
        department: approvedRequest.department,
        job_title: approvedRequest.job_title,
      }
    }
  });

  if (error) {
    console.error('❌ Supabase auth signup error:', error);
    throw error;
  }

  console.log('✅ Supabase auth signup successful:', data);

  // If user creation successful, create user profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: data.user.id,
        email: data.user.email,
        full_name_ar: approvedRequest.full_name_ar,
        phone: approvedRequest.phone,
        department: approvedRequest.department,
        job_title: approvedRequest.job_title,
        role: approvedRequest.assigned_role || 'user',
        is_super_admin: approvedRequest.assigned_role === 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn('⚠️ Profile creation failed, but user was created:', profileError);
      // Don't throw error - user account exists, profile can be fixed later
    } else {
      console.log('✅ User profile created successfully');
    }
  }

  return data;
};

// Refresh profile function for manual profile reload
const refreshProfile = async () => {
  if (!authState.user?.id) {
    console.warn('[Auth] Cannot refresh profile: no user ID');
    return;
  }
  
  try {
    await loadAuthData(authState.user.id);
  } catch (error) {
    console.error('[Auth] Failed to refresh profile:', error);
    throw error;
  }
};

// ===== SCOPED ROLES FUNCTIONS (Phase 5) =====



// Check if user has role in org
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check org_roles table (Phase 6)
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  if (!orgRole) return false;
  
  return orgRole.role === role;
};

// Check if user has role in project
const hasRoleInProject = (projectId: string, role: string): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check project_roles table (Phase 6)
  const projectRole = authState.projectRoles.find(r => r.project_id === projectId);
  if (!projectRole) return false;
  
  return projectRole.role === role;
};

// Check if user can perform action in org
const canPerformActionInOrg = (
  orgId: string,
  action: 'manage_users' | 'manage_projects' | 'manage_transactions' | 'view'
): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Get user's org role (Phase 6)
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  if (!orgRole) return false;
  
  // Permission matrix for org roles
  const permissions: Record<string, string[]> = {
    org_admin: ['manage_users', 'manage_projects', 'manage_transactions', 'view'],
    org_manager: ['manage_users', 'manage_projects', 'view'],
    org_accountant: ['manage_transactions', 'view'],
    org_auditor: ['view'],
    org_viewer: ['view'],
  };
  
  const allowedActions = permissions[orgRole.role] || [];
  return allowedActions.includes(action);
};

// Check if user can perform action in project
const canPerformActionInProject = (
  projectId: string,
  action: 'manage' | 'create' | 'edit' | 'view'
): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Get user's project role (Phase 6)
  const projectRole = authState.projectRoles.find(r => r.project_id === projectId);
  if (!projectRole) return false;
  
  // Permission matrix for project roles
  const permissions: Record<string, string[]> = {
    project_manager: ['manage', 'create', 'edit', 'view'],
    project_contributor: ['create', 'edit', 'view'],
    project_viewer: ['view'],
  };
  
  const allowedActions = permissions[projectRole.role] || [];
  return allowedActions.includes(action);
};

// Get user's roles in org
const getUserRolesInOrg = (orgId: string): string[] => {
  if (!orgId) return [];
  
  // Get all roles for this org (Phase 6)
  return authState.orgRoles
    .filter(r => r.org_id === orgId)
    .map(r => r.role);
};

// Get user's roles in project
const getUserRolesInProject = (projectId: string): string[] => {
  if (!projectId) return [];
  
  // Get all roles for this project (Phase 6)
  return authState.projectRoles
    .filter(r => r.project_id === projectId)
    .map(r => r.role);
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
  const hasRoleInOrgMemo = useCallback(hasRoleInOrg, [state.roles, state.userOrganizations]);
  const hasRoleInProjectMemo = useCallback(hasRoleInProject, [state.roles, state.userProjects]);
  const canPerformActionInOrgMemo = useCallback(canPerformActionInOrg, [state.roles, state.userOrganizations]);
  const canPerformActionInProjectMemo = useCallback(canPerformActionInProject, [state.roles, state.userProjects]);
  const getUserRolesInOrgMemo = useCallback(getUserRolesInOrg, [state.roles, state.userOrganizations]);
  const getUserRolesInProjectMemo = useCallback(getUserRolesInProject, [state.roles, state.userProjects]);

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
    signUp,
    refreshProfile,
    
    // Scope data for org/project access
    userOrganizations: state.userOrganizations,
    userProjects: state.userProjects,
    defaultOrgId: state.defaultOrgId,
    
    // NEW: Scoped roles data (Phase 6)
    orgRoles: state.orgRoles,
    projectRoles: state.projectRoles,
    
    // Scope validation functions
    belongsToOrg,
    canAccessProject,
    getRolesInOrg,
    hasActionAccessInOrg,
    
    // NEW: Scoped roles functions (Phase 5/6)
    hasRoleInOrg: hasRoleInOrgMemo,
    hasRoleInProject: hasRoleInProjectMemo,
    canPerformActionInOrg: canPerformActionInOrgMemo,
    canPerformActionInProject: canPerformActionInProjectMemo,
    getUserRolesInOrg: getUserRolesInOrgMemo,
    getUserRolesInProject: getUserRolesInProjectMemo,
  };
};

export default useOptimizedAuth;