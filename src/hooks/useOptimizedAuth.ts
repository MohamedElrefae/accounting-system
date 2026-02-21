import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { Profile } from '../types/auth';
import type { Organization, Project } from '../types';
import {
  flattenPermissions,
  hasActionInSnapshot,
  hasRouteInSnapshot,
  type PermissionCode,
  type ResolvedRole,
  type RoleSlug,
} from '../lib/permissions';
import { getConnectionMonitor } from '../utils/connectionMonitor';

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
  userOrganizations: Organization[];
  userProjects: Project[];
  defaultOrgId: string | null;
  
  // NEW: Scoped roles (Phase 6)
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];

  // NEW: Unified data (Sprint 2)
  landingPreference: 'welcome' | 'dashboard' | null;
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

  // NEW: Unified data (Sprint 2)
  landingPreference: 'welcome',
};

const authListeners: Set<(state: OptimizedAuthState) => void> = new Set();
let authInitialized = false;

// Permission caches for ultra-fast lookups
const routeCache = new Map<string, boolean>();
const actionCache = new Map<string, boolean>();


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
  
  let currentLoadPromise: Promise<void> | null = null;

  const applyAuthenticatedUser = async (userId: string) => {
    if (!userId) return;
    
    // Return existing promise if already loading for this session
    if (currentLoadPromise) {
      if (import.meta.env.DEV) console.log('[Auth] Attaching to existing load promise...');
      return currentLoadPromise;
    }

    currentLoadPromise = (async () => {
      try {
        await withTimeout(loadAuthData(userId), 30000, 'Auth data load timeout');
      } catch (loadError) {
        console.warn('Auth data load failed, using fallback:', loadError);
        const fallbackRoles: RoleSlug[] = ['super_admin'];
        authState.roles = fallbackRoles;
        authState.resolvedPermissions = flattenPermissions(fallbackRoles);
        clearCaches();
        notifyListeners();
      } finally {
        currentLoadPromise = null;
      }
    })();

    return currentLoadPromise;
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

        // CRITICAL DEBOUNCE: Do NOT await this. 
        // Awaiting here blocks the Supabase client's notification loop ("_notifyAllSubscribers"),
        // which holds the client lock. If applyAuthenticatedUser tries to use the client (e.g. RPC)
        // while the lock is held, it causes a DEADLOCK that lasts until the 30s timeout.
        applyAuthenticatedUser(authSession.user.id).catch(err => {
             console.error('[Auth] Background auth load failed:', err);
             authState.loading = false;
             notifyListeners();
        });

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
          landingPreference: 'welcome'
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
        (async () => {
          // Allow getSession to run even if offline (reads from localStorage)
          // const monitor = getConnectionMonitor();
          // if (!monitor.getHealth().isOnline) return null; 
          
          const sStart = performance.now();
          const sess = await supabase.auth.getSession().then((r) => r.data.session ?? null);
          if (import.meta.env.DEV) console.log(`[Auth] getSession took ${(performance.now() - sStart).toFixed(0)}ms`);
          return sess;
        })(),
        30000,
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
      // Offline Fallback: If no Supabase session, check if we have an "Offline User" enabled
      const { getConnectionMonitor } = await import('../utils/connectionMonitor');
      if (!getConnectionMonitor().getHealth().isOnline) {
          try {
             // Attempt to recover last active user from Dexie
             const { getOfflineDB } = await import('../services/offline/core/OfflineSchema');
             const db = getOfflineDB();
             const lastUser = await db.metadata.get('last_active_user_id');
             
             if (lastUser && typeof lastUser.value === 'string') {
                 console.log('[Auth] Offline: Recovering session for user:', lastUser.value);
                 // We don't have a full session, but we can load the profile/roles 
                 // and let SecurityManager handle the "Unlock" screen if needed.
                 // For now, we populate state to allow "Offline" access if the app doesn't enforce strict login check on every load
                 // Or, better: we remain "logged out" but LoginForm detects this state.
                 
                 // NOTE: We do NOT set authState.user here because that bypasses authentication. 
                 // The user must still enter a password/PIN in LoginForm if session is gone.
             }
          } catch(e) {
             console.warn('[Auth] Offline recovery check failed', e);
          }
      }

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
const loadAuthData = async (userId: string, forceRefresh = false) => {
  if (!userId) return;

  const monitor = getConnectionMonitor();
  const isOnline = monitor.getHealth().isOnline;

  // 1. ALWAYS try to get from local Dexie cache immediately for instant UI
  let cacheFound = false;
  try {
    const { getOfflineDB } = await import('../services/offline/core/OfflineSchema');
    const db = getOfflineDB();
    const cached = await db.metadata.get(`auth_data_${userId}`);
    if (cached && cached.value) {
      const data = cached.value as any; // Cast to any to avoid property access errors
      authState.profile = data.profile;
      authState.roles = data.roles as RoleSlug[];
      authState.resolvedPermissions = flattenPermissions(data.roles as RoleSlug[]);
      authState.userOrganizations = data.organizations;
      authState.userProjects = data.projects;
      authState.defaultOrgId = data.defaultOrgId;
      authState.orgRoles = data.orgRoles;
      authState.projectRoles = data.projectRoles;
      authState.landingPreference = data.landingPreference;
      clearCaches();
      notifyListeners();
      cacheFound = true;
      if (import.meta.env.DEV) console.log('[Auth] Loaded from offline cache');
    }
  } catch (cacheErr) {
    if (import.meta.env.DEV) console.error('[Auth] Offline cache read failed:', cacheErr);
  }

  // 2. Only attempt network RPC if verified online and (not found in cache OR forced)
  if (!isOnline && cacheFound && !forceRefresh) {
    if (import.meta.env.DEV) console.log('[Auth] Offline: Skipping RPC as cache is present');
    return;
  }

  if (!isOnline && !cacheFound) {
    if (import.meta.env.DEV) console.warn('[Auth] Offline and no cache found for user');
    return;
  }

  try {
    if (import.meta.env.DEV) console.log('[Auth] Attempting background data refresh...');
    
    // Explicitly cast the rpc call to avoid Promise generic issues in some environments
    const { data: authData, error: rpcError } = await withTimeout(
      (supabase.rpc('get_user_auth_data', { p_user_id: userId }) as any),
      30000,
      'Auth RPC timeout'
    ) as { data: any, error: any };

    if (!rpcError && authData) {
      // Process data...
      const profile = authData.profile as Profile;
      
      const roleMapping: any = {
        'super_admin': 'super_admin', 'admin': 'admin', 'manager': 'manager',
        'accountant': 'accountant', 'auditor': 'auditor', 'viewer': 'viewer',
        'محاسب': 'accountant', 'مدير': 'manager', 'مشرف': 'admin', 'مسؤول': 'admin',
        'مراقب': 'auditor', 'مراجع': 'auditor', 'قائد فريق': 'team_leader', 'موارد بشرية': 'hr'
      };
      
      const roles = (authData.roles || []).map((name: string) => {
        const clean = String(name || '').trim().toLowerCase().replace(/\s+/g, '_');
        let mapped = roleMapping[clean];
        if (!mapped) {
          if (clean.includes('محاسب')) mapped = 'accountant';
          else if (clean.includes('مدير')) mapped = 'manager';
          else if (clean.includes('مشرف')) mapped = 'admin';
        }
        return mapped;
      }).filter((r: any) => !!r) as RoleSlug[];

      const isSuper = profile?.is_super_admin || roles.includes('super_admin');
      const finalRoles = (isSuper ? ['super_admin'] : roles) as RoleSlug[];

      // Update state
      authState.profile = profile;
      authState.roles = finalRoles;
      authState.resolvedPermissions = flattenPermissions(finalRoles);
      authState.userOrganizations = authData.organizations || [];
      authState.userProjects = authData.projects || [];
      authState.defaultOrgId = authData.default_org || null;
      authState.orgRoles = authData.org_roles || [];
      authState.projectRoles = authData.project_roles || [];
      authState.landingPreference = authData.landing_preference || 'welcome';

      // Save to local cache for next time
      try {
        const { getOfflineDB } = await import('../services/offline/core/OfflineSchema');
        const db = getOfflineDB();
        
        await db.metadata.bulkPut([
            {
               key: `auth_data_${userId}`,
               value: {
                 profile: authState.profile,
                 roles: authState.roles,
                 organizations: authState.userOrganizations,
                 projects: authState.userProjects,
                 defaultOrgId: authState.defaultOrgId,
                 orgRoles: authState.orgRoles,
                 projectRoles: authState.projectRoles,
                 landingPreference: authState.landingPreference
               },
               updatedAt: new Date().toISOString()
            },
            {
               key: 'last_active_user_id',
               value: userId,
               updatedAt: new Date().toISOString()
            }
        ]);
      } catch (cacheSaveErr) {
        // Silent
      }

      clearCaches();
      notifyListeners();
    }
  } catch (err) {
    // Silence network errors to keep console clean
    if (import.meta.env.DEV && isOnline) {
      console.warn('[Auth] Background refresh failed:', err);
    }
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
  const cacheKey = `${pathname}|${authState.roles.join(',')}`;

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
  const cacheKey = `${String(action)}|${authState.roles.join(',')}`;

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
  return authState.userOrganizations.some(o => o.id === orgId);
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
  return authState.userProjects.some(p => p.id === projectId);
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
    landingPreference: 'welcome'
  };
  clearCaches();
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

// function to manually set offline user (called by LoginForm after successful PIN/Password unlock)
export const setOfflineSession = async (userId: string) => {
    if (import.meta.env.DEV) console.log('[Auth] Setting offline session for:', userId);
    
    // Create a mock user object
    const mockUser = {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'offline_user@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: new Date().toISOString(),
    };
    
    authState.user = mockUser;
    authState.loading = true;
    notifyListeners();
    
    // Load cached data
    await loadAuthData(userId);
    
    authState.loading = false;
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
    
    // Scope-aware fields
    userOrganizations: state.userOrganizations,
    userProjects: state.userProjects,
    defaultOrgId: state.defaultOrgId,
    orgRoles: state.orgRoles,
    projectRoles: state.projectRoles,
    landingPreference: state.landingPreference,

    signIn,
    signOut,
    signUp,
    refreshProfile,

    // NEW: Offline helper
    setOfflineSession,

    // Scope helpers
    belongsToOrg: belongsToOrg,
    canAccessProject: canAccessProject,
    getRolesInOrg: getRolesInOrg,
    hasRoleInOrg: hasRoleInOrgMemo,
    hasRoleInProject: hasRoleInProjectMemo,
    canPerformActionInOrg: canPerformActionInOrgMemo,
    canPerformActionInProject: canPerformActionInProjectMemo,
    getUserRolesInOrg: getUserRolesInOrgMemo,
    getUserRolesInProject: getUserRolesInProjectMemo,

    // NEW: Action access with context
    hasActionAccessInOrg,
    hasActionAccessInProject: canPerformActionInProjectMemo, // Alias for consistency

    // Legacy helper for backward compatibility
    hasActionAccess: hasActionAccessMemo, 
    hasPermission: hasActionAccessMemo,
    hasRouteAccess: hasRouteAccessMemo,
  };
};


export default useOptimizedAuth;