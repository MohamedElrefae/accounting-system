import React, { createContext, useEffect, useMemo, useState, useContext, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { Profile } from './AuthContext';
import {
  buildPermissionCacheSnapshot,
  flattenPermissions,
  hasActionInSnapshot,
  hasRouteInSnapshot,
  hydrateSnapshot,
  PERMISSION_SCHEMA_VERSION,
  type PermissionCode,
  type PermissionSnapshot,
  type ResolvedRole,
  type RoleSlug,
} from '../lib/permissions';

interface OptimizedAuthContextValue {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  hasRouteAccess: (pathname: string) => boolean;
  hasActionAccess: (action: PermissionCode) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const OptimizedAuthContext = createContext<OptimizedAuthContextValue | undefined>(undefined);

export function useOptimizedAuth(): OptimizedAuthContextValue {
  const ctx = useContext(OptimizedAuthContext);
  if (ctx === undefined) {
    throw new Error('useOptimizedAuth must be used within an OptimizedAuthProvider');
  }
  return ctx;
}

export const OptimizedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleSlug[]>([]);
  const [resolvedPermissions, setResolvedPermissions] = useState<ResolvedRole | null>(null);
  
  // Cache for permission checks to avoid repeated calculations
  const permissionCache = useRef(new Map<string, boolean>());
  const routeCache = useRef(new Map<string, boolean>());

  // Optimized permission checking with caching
  const hasRouteAccess = useCallback(
    (pathname: string) => {
      // Check cache first
      if (routeCache.current.has(pathname)) {
        return routeCache.current.get(pathname)!;
      }

      // Super admin override
      if (roles.includes('super_admin') || profile?.is_super_admin) {
        routeCache.current.set(pathname, true);
        return true;
      }

      if (!resolvedPermissions) {
        routeCache.current.set(pathname, false);
        return false;
      }

      const result = hasRouteInSnapshot(resolvedPermissions, pathname);
      routeCache.current.set(pathname, result);
      return result;
    },
    [roles, resolvedPermissions, profile?.is_super_admin],
  );

  const hasActionAccess = useCallback(
    (action: PermissionCode) => {
      // Check cache first
      if (permissionCache.current.has(action)) {
        return permissionCache.current.get(action)!;
      }

      // Super admin override
      if (roles.includes('super_admin') || profile?.is_super_admin) {
        permissionCache.current.set(action, true);
        return true;
      }

      if (!resolvedPermissions) {
        permissionCache.current.set(action, false);
        return false;
      }

      const result = hasActionInSnapshot(resolvedPermissions, action);
      permissionCache.current.set(action, result);
      return result;
    },
    [roles, resolvedPermissions, profile?.is_super_admin],
  );

  // Parallel loading of auth data
  const loadAuthData = useCallback(async (userId: string) => {
    try {
      // Load profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role_name').eq('user_id', userId)
      ]);

      // Set profile
      if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      }

      // Set roles and permissions
      const userRoles = rolesResult.data?.map(r => r.role_name as RoleSlug) || [];
      const effectiveRoles = userRoles.length ? userRoles : ['viewer'] as RoleSlug[];
      
      setRoles(effectiveRoles);
      setResolvedPermissions(flattenPermissions(effectiveRoles));

      // Clear caches when roles change
      permissionCache.current.clear();
      routeCache.current.clear();

    } catch (error) {
      console.error('Failed to load auth data:', error);
      // Fallback to viewer role
      setRoles(['viewer']);
      setResolvedPermissions(flattenPermissions(['viewer']));
    }
  }, []);

  // Fast initialization
  useEffect(() => {
    const init = async () => {
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
          setUser(session.user);
          setLoading(false); // Set loading false immediately
          
          // Load auth data async (don't block UI)
          loadAuthData(session.user.id).catch(console.error);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setLoading(false);
      }
    };

    init();

    // Optimized auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
        loadAuthData(session.user.id).catch(console.error);
      } else {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setResolvedPermissions(null);
        setLoading(false);
        permissionCache.current.clear();
        routeCache.current.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAuthData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear state and caches
    setUser(null);
    setProfile(null);
    setRoles([]);
    setResolvedPermissions(null);
    permissionCache.current.clear();
    routeCache.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      roles,
      resolvedPermissions,
      hasRouteAccess,
      hasActionAccess,
      signIn,
      signOut,
    }),
    [
      user,
      profile,
      loading,
      roles,
      resolvedPermissions,
      hasRouteAccess,
      hasActionAccess,
      signIn,
      signOut,
    ],
  );

  return <OptimizedAuthContext.Provider value={value}>{children}</OptimizedAuthContext.Provider>;
};