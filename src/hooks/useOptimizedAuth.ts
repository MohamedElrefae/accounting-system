import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { Profile } from '../contexts/AuthContext';
import {
  flattenPermissions,
  hasActionInSnapshot,
  hasRouteInSnapshot,
  type PermissionCode,
  type ResolvedRole,
  type RoleSlug,
} from '../lib/permissions';

interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
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
    // Fast session check with timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 1500)
    );
    
    const { data: { session } } = await Promise.race([
      sessionPromise, 
      timeoutPromise
    ]) as any;
    
    if (session?.user) {
      authState.user = session.user;
      authState.loading = false;
      notifyListeners();
      
      // Load auth data async
      loadAuthData(session.user.id);
    } else {
      authState.loading = false;
      notifyListeners();
    }
  } catch (error) {
    console.error('Auth initialization failed:', error);
    authState.loading = false;
    notifyListeners();
  }

  // Set up auth listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      authState.user = session.user;
      authState.loading = false;
      notifyListeners();
      loadAuthData(session.user.id);
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
  });
};

// Load user profile and roles in parallel
const loadAuthData = async (userId: string) => {
  try {
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role_name').eq('user_id', userId)
    ]);

    // Update profile
    if (profileResult.data) {
      authState.profile = profileResult.data as Profile;
    }

    // Update roles and permissions
    const userRoles = rolesResult.data?.map(r => r.role_name as RoleSlug) || [];
    const effectiveRoles = userRoles.length ? userRoles : ['viewer'] as RoleSlug[];
    
    authState.roles = effectiveRoles;
    authState.resolvedPermissions = flattenPermissions(effectiveRoles);

    // Clear caches when permissions change
    clearCaches();
    notifyListeners();

  } catch (error) {
    console.error('Failed to load auth data:', error);
    // Fallback to viewer role
    authState.roles = ['viewer'];
    authState.resolvedPermissions = flattenPermissions(['viewer']);
    clearCaches();
    notifyListeners();
  }
};

// Notify all listeners of state changes
const notifyListeners = () => {
  authListeners.forEach(listener => listener(authState));
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

  // Super admin override
  if (authState.roles.includes('super_admin') || authState.profile?.is_super_admin) {
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

  // Super admin override
  if (authState.roles.includes('super_admin') || authState.profile?.is_super_admin) {
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
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
  notifyListeners();
};

// Optimized auth hook
export const useOptimizedAuth = () => {
  const [state, setState] = useState(authState);
  const stateRef = useRef(state);

  // Initialize auth system
  useEffect(() => {
    initializeAuth();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const listener = (newState: OptimizedAuthState) => {
      if (stateRef.current !== newState) {
        stateRef.current = newState;
        setState(newState);
      }
    };

    authListeners.add(listener);
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