import React, { createContext, useEffect, useMemo, useState, useContext, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { setLoadingTimeout, clearLoadingTimeout, debounce } from '../utils/loadingFix';
import { fetchUserRolesSafely, fetchUserProfileSafely } from '../utils/databaseFix';
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

export type Profile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  phone?: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  is_active?: boolean;
  last_login?: string | null;
  is_super_admin?: boolean;
};

interface AuthContextValue {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  permissionsLoading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  hasRouteAccess: (pathname: string) => boolean;
  hasActionAccess: (action: PermissionCode) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: 'github' | 'google') => Promise<void>;
  signUp: (email: string, password: string, profile?: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleSlug[]>([]);
  const [resolvedPermissions, setResolvedPermissions] = useState<ResolvedRole | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [superAdminOverrideDetected, setSuperAdminOverrideDetected] = useState(false);

  const cacheKey = user?.id ? `perm-cache:${user.id}` : null;
  const permissionsRequestRef = useRef<Promise<void> | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profilePromise = supabase.from('user_profiles').select('*').eq('id', userId).single();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout')), 5000),
      );

      const result = (await Promise.race([profilePromise, timeoutPromise])) as any;

      if (result?.error) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const email = userData.user?.email;
          if (!email) return;

          const { data: pendingProfile } = await supabase
            .from('pending_user_profiles')
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .single();

          if (!pendingProfile) return;

          const { error: createError } = await supabase.from('user_profiles').insert({
            id: userId,
            email: pendingProfile.email,
            full_name_ar: pendingProfile.full_name_ar,
            phone: pendingProfile.phone,
            department: pendingProfile.department,
            job_title: pendingProfile.job_title,
            is_active: true,
          });

          if (!createError) {
            await supabase
              .from('pending_user_profiles')
              .update({ used: true })
              .eq('email', pendingProfile.email);

            if (pendingProfile.assigned_role && pendingProfile.assigned_role !== 'user') {
              await supabase.from('user_roles').insert({
                user_id: userId,
                role_name: pendingProfile.assigned_role,
              });
            }

            const { data: newProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (newProfile) {
              setProfile(newProfile as Profile);
              return;
            }
          }
        } catch (pendingError) {
          console.error('Failed to create profile from pending:', pendingError);
        }

        console.log('Profile not found for user:', userId);
        return;
      }

      if (result?.data) {
        setProfile(result.data as Profile);
        try {
          const isSuper = (result.data as any)?.is_super_admin === true;
          if (typeof isSuper === 'boolean') {
            localStorage.setItem('is_super_admin', isSuper ? 'true' : 'false');
          }
        } catch {}
      }
    } catch {
      // Profile load failed/timeout, continuing anyway
    }
  }, []);

  const applySnapshot = useCallback(
    (snapshot: PermissionSnapshot | null) => {
      const hydrated = hydrateSnapshot(snapshot);
      if (snapshot && hydrated) {
        let effectiveRoles = snapshot.roles;
        let effectiveResolved: ResolvedRole = hydrated;

        const override = superAdminOverrideDetected || effectiveRoles.includes('super_admin');
        if (override && !effectiveRoles.includes('super_admin')) {
          effectiveRoles = ['super_admin', ...effectiveRoles] as RoleSlug[];
          effectiveResolved = flattenPermissions(effectiveRoles);
        }

        if (override && cacheKey) {
          const refreshed = buildPermissionCacheSnapshot(effectiveRoles);
          sessionStorage.setItem(cacheKey, JSON.stringify(refreshed));
        }

        setRoles(effectiveRoles);
        setResolvedPermissions(effectiveResolved);
        setPermissionsLoading(false);
      } else {
        setRoles([] as RoleSlug[]);
        setResolvedPermissions(null);
        setPermissionsLoading(false);
      }
    },
    [cacheKey, superAdminOverrideDetected],
  );

  const loadRolesAndPermissions = useCallback(
    (userId: string, skipCache = false): Promise<void> => {
      if (!skipCache && permissionsRequestRef.current) {
        return permissionsRequestRef.current;
      }

      const requestPromise = (async () => {
        try {
          setPermissionsLoading(true);
          // Attempt to hydrate from cache first - prioritize cache for performance
          if (cacheKey && !skipCache) {
            const cachedRaw = sessionStorage.getItem(cacheKey);
            if (cachedRaw) {
              try {
                const parsed = JSON.parse(cachedRaw) as PermissionSnapshot;
                if (parsed.version === PERMISSION_SCHEMA_VERSION) {
                  applySnapshot(parsed);
                  return;
                }
              } catch {
                // ignore cache parse errors
              }
            }
          }

          // Use safe database fetching to handle schema differences
          const [slugs, profileRow] = await Promise.all([
            fetchUserRolesSafely(userId, user),
            fetchUserProfileSafely(userId)
          ]);

          // Ensure super admin fallback
          let effectiveRoles = slugs.length ? slugs : ([] as RoleSlug[]);

          const isSuperFromProfile = profileRow?.is_super_admin === true;
          try {
            localStorage.setItem('is_super_admin', isSuperFromProfile ? 'true' : 'false');
          } catch {
            // ignore storage errors
          }

          if (isSuperFromProfile) {
            if (!effectiveRoles.includes('super_admin')) {
              effectiveRoles = ['super_admin', ...effectiveRoles] as RoleSlug[];
            }
            setProfile((prev) => (prev ? { ...prev, is_super_admin: true } : prev));
            setSuperAdminOverrideDetected(true);
          } else {
            setProfile((prev) => (prev ? { ...prev, is_super_admin: prev?.is_super_admin ?? false } : prev));
            setSuperAdminOverrideDetected((prev) => prev || false);
          }

          const resolved = flattenPermissions(effectiveRoles);
          const snapshot = buildPermissionCacheSnapshot(effectiveRoles);

          setRoles(effectiveRoles);
          setResolvedPermissions(resolved);
          setPermissionsLoading(false);

          if (cacheKey) {
            sessionStorage.setItem(cacheKey, JSON.stringify(snapshot));
          }
        } catch (error) {
          console.error('Failed to load roles/permissions:', error);
          let fallbackRoles: RoleSlug[] = [];
          let fallbackResolved: ResolvedRole | null = null;
          const hasProfileSuperFlag = profile?.is_super_admin === true;
          let storedSuper = false;
          try {
            storedSuper = localStorage.getItem('is_super_admin') === 'true';
          } catch {
            storedSuper = false;
          }

          if (hasProfileSuperFlag || storedSuper || superAdminOverrideDetected) {
            fallbackRoles = ['super_admin'];
            fallbackResolved = flattenPermissions(fallbackRoles);
            setSuperAdminOverrideDetected(true);
          }

          setRoles(fallbackRoles);
          setResolvedPermissions(fallbackResolved);
          setPermissionsLoading(false);
          if (cacheKey) {
            sessionStorage.removeItem(cacheKey);
          }
        } finally {
          if (permissionsRequestRef.current === requestPromise) {
            permissionsRequestRef.current = null;
          }
        }
      })();

      permissionsRequestRef.current = requestPromise;
      return requestPromise;
    },
    [applySnapshot, cacheKey, profile?.is_super_admin, superAdminOverrideDetected],
  );

  useEffect(() => {
    if (user?.id) {
      loadRolesAndPermissions(user.id);
    } else {
      setRoles([] as RoleSlug[]);
      setResolvedPermissions(null);
      setPermissionsLoading(false);
      if (cacheKey) {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }, [user?.id, cacheKey, loadRolesAndPermissions]);

  useEffect(() => {
    const init = async () => {
      console.log('🔄 AuthContext: Starting initialization...');
      
      try {
        console.log('📋 AuthContext: Checking session...');
        
        // Fast session check with 2-second timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        );
        
        const { data: { session } } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]) as any;
        
        console.log('📋 AuthContext: Session result:', session ? 'EXISTS' : 'NULL');
        
        if (session?.user) {
          console.log('✅ AuthContext: User found, setting up...');
          setUser(session.user);
          setLoading(false);
          
          // Load profile and permissions async (don't block UI)
          loadProfile(session.user.id).catch((error) => {
            console.error('Profile load failed:', error);
          });
          loadRolesAndPermissions(session.user.id).catch((error) => {
            console.error('Permission load failed:', error);
          });
          return;
        }
      } catch (error) {
        console.error('💥 AuthContext: Session fetch failed or timeout:', error);
      }
      
      // No session or error - immediate fallback
      console.log('✅ AuthContext: No session, setting loading to false');
      setLoading(false);
      setPermissionsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state changed:', event, session ? 'HAS_SESSION' : 'NO_SESSION');
      
      if (session?.user) {
        console.log('✅ AuthContext: Setting user from auth state change');
        setUser(session.user);
        
        // If user is required to change password, force redirect to reset page
        try {
          const requireChange = (session.user.user_metadata as any)?.require_password_change === true;
          if (requireChange && window.location.pathname !== '/reset-password') {
            console.log('🔄 AuthContext: Redirecting to password reset');
            window.history.pushState({}, '', '/reset-password');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return;
          }
        } catch {}

        // Load profile but don't block on it - set loading to false first
        console.log('✅ AuthContext: Setting loading to false after auth state change');
        setLoading(false);
        
        loadProfile(session.user.id).catch((error) => {
          console.error('Profile load after auth event failed:', error);
        });
        loadRolesAndPermissions(session.user.id).catch((error) => {
          console.error('Permission load after auth event failed:', error);
        });
        
        // Only redirect on successful sign-in from login page
        if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
          console.log('🔄 AuthContext: Redirecting from login to dashboard');
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }, 100);
        }
      } else {
        console.log('❌ AuthContext: Clearing user state');
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id, loadRolesAndPermissions, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data: _data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Sign in completed
    if (error) throw error;
  }, []);

  const signInWithProvider = useCallback(async (provider: 'github' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, extra?: Partial<Profile>) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { emailRedirectTo: window.location.origin + '/login' }
    });
    if (error) throw error;
    // Optional profile creation; may fail if RLS is strict or table not present
    if (data.user) {
      try {
        await supabase.from('user_profiles').insert({ id: data.user.id, email: data.user.email!, ...extra });
      } catch {
        // Ignore if table/policy not ready yet
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setProfile(null);
      setRoles([] as RoleSlug[]);
      setResolvedPermissions(null);
      setPermissionsLoading(false);
      
      // Clear any local storage items
      localStorage.removeItem('is_super_admin');
      if (cacheKey) {
        sessionStorage.removeItem(cacheKey);
      }
      
      // Use gentle navigation to login page
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [cacheKey]);

  const hasRouteAccess = useCallback(
    (pathname: string) => {
      const superAdminOverride = () => {
        if (roles.includes('super_admin')) return true;
        if (profile?.is_super_admin) return true;
        try {
          return localStorage.getItem('is_super_admin') === 'true';
        } catch {
          return false;
        }
      };

      if (superAdminOverride()) return true;
      if (!resolvedPermissions) return false;
      return hasRouteInSnapshot(resolvedPermissions, pathname);
    },
    [roles, resolvedPermissions, profile?.is_super_admin],
  );

  const hasActionAccessCb = useCallback(
    (action: PermissionCode) => {
      const superAdminOverride = () => {
        if (roles.includes('super_admin')) return true;
        if (profile?.is_super_admin) return true;
        try {
          return localStorage.getItem('is_super_admin') === 'true';
        } catch {
          return false;
        }
      };

      if (superAdminOverride()) return true;
      if (!resolvedPermissions) return false;
      return hasActionInSnapshot(resolvedPermissions, action);
    },
    [roles, resolvedPermissions, profile?.is_super_admin],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      permissionsLoading,
      roles,
      resolvedPermissions,
      hasRouteAccess,
      hasActionAccess: hasActionAccessCb,
      signIn,
      signInWithProvider,
      signUp,
      signOut,
      refreshProfile: async () => user && loadProfile(user.id),
    }),
    [
      user,
      profile,
      loading,
      permissionsLoading,
      roles,
      resolvedPermissions,
      hasRouteAccess,
      hasActionAccessCb,
      signIn,
      signInWithProvider,
      signUp,
      signOut,
      loadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
