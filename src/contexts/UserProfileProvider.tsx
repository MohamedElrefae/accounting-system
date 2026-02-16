import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';
import featureFlags from '../utils/featureFlags';
import {
  UserProfileContext,
  type AppUserProfile,
  type UserProfileContextValue,
} from './UserProfileContext';

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pull core auth state from optimized auth hook
  const { user, profile: authProfile, roles: authRoles } = useAuth();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep UserProfileContext in sync with optimized auth profile/roles so TopBar, Sidebar, etc.
  // always see the same user data as the auth system.
  useEffect(() => {
    if (authProfile) {
      const merged: AppUserProfile = {
        id: authProfile.id,
        email: authProfile.email,
        first_name: authProfile.first_name,
        last_name: authProfile.last_name,
        full_name_ar: authProfile.full_name_ar,
        avatar_url: authProfile.avatar_url ?? null,
        phone: (authProfile as any).phone ?? null,
        department: (authProfile as any).department ?? null,
        roles: authRoles,
        created_at: profile?.created_at,
        updated_at: profile?.updated_at,
      };
      setProfile(prev => ({ ...(prev || {}), ...merged }));
      setError(null);
    } else if (!user) {
      // When user logs out, clear profile state
      setProfile(null);
      setError(null);
    }
  }, [authProfile, authRoles, user?.id, profile?.created_at, profile?.updated_at]);

  const load = useCallback(async (userId: string) => {
    try {
      if (featureFlags.isEnabled('UNIFIED_AUTH_DATA') && authProfile) {
        if (import.meta.env.DEV) console.log('[UserProfile] UnifiedAuth: Skipping redundant profile fetch');
        // Data is already synced via the authProfile effect
        return;
      }

      setLoading(true);
      setError(null);

      // First, get the profile without roles to avoid relationship issues
      const { data, error: selErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Then separately get the roles if needed
      let roles: string[] = [];
      if (!selErr && data) {
        try {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId)
            .eq('is_active', true);

          roles = (rolesData || []).map((ur: any) => ur.roles?.name).filter(Boolean);
        } catch {
          // Continue without roles - this is not critical
        }
      }

      if (selErr && selErr.code !== 'PGRST116') throw selErr;

      const p: AppUserProfile = {
        id: data?.id || userId,
        email: data?.email || '',
        first_name: data?.first_name || undefined,
        last_name: data?.last_name || undefined,
        full_name_ar: data?.full_name_ar || undefined,
        avatar_url: data?.avatar_url || null,
        phone: data?.phone || null,
        department: data?.department || null,
        roles,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      };

      setProfile(p);
      // Persist super admin flag for navigation gating
      try {
        const isSuper = roles.includes('super_admin') || (data as any)?.is_super_admin === true;
        localStorage.setItem('is_super_admin', isSuper ? 'true' : 'false');
      } catch { }
    } catch (e: any) {
      console.error('[UserProfile] Failed to load profile:', e?.message ?? e);
      setError(e?.message || 'Failed to load user profile');
      // Fallback minimal profile
      if (user) {
        setProfile({ id: user.id, email: user.email || '', roles: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      if (featureFlags.isEnabled('UNIFIED_AUTH_DATA') && authProfile) {
        if (import.meta.env.DEV) console.log('[UserProfile] UnifiedAuth: Correctly skipping initial load');
        return;
      }
      load(user.id);
    } else {
      setProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [user?.id, load, authProfile]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await load(user.id);
  }, [user?.id, load]);

  const updateProfile = useCallback(async (updates: Partial<AppUserProfile>) => {
    if (!user?.id) return;
    const { error: upErr } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);
    if (upErr) {
      console.error('[UserProfile] Update failed:', upErr.message);
      throw upErr;
    }

    // Immediately refresh profile data to update all consuming components
    await refreshProfile();
  }, [user?.id, user, refreshProfile]);

  const normalizeRole = useCallback((role: string): string => {
    // Normalize role names: convert to lowercase and replace spaces with underscores
    return role.toLowerCase().replace(/\s+/g, '_');
  }, []);

  const getRoleDisplayName = useCallback((role: string) => {
    const normalized = normalizeRole(role);
    const map: Record<string, string> = {
      super_admin: 'مدير النظام الرئيسي',
      admin: 'مدير النظام',
      accountant: 'محاسب',
      user: 'مستخدم',
      auditor: 'مدقق',
      viewer: 'عارض',
    };
    return map[normalized] || role;
  }, [normalizeRole]);

  const hasRole = useCallback((role: string) => {
    const normalized = normalizeRole(role);
    return !!profile?.roles?.some(r => normalizeRole(r) === normalized);
  }, [profile?.roles, normalizeRole]);

  const isSuperAdmin = useCallback(() => hasRole('super_admin'), [hasRole]);

  const value: UserProfileContextValue = useMemo(() => ({
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    getRoleDisplayName,
    hasRole,
    isSuperAdmin,
  }), [
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    getRoleDisplayName,
    hasRole,
    isSuperAdmin,
  ]);

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
};

export default UserProfileProvider;
