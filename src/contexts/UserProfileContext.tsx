import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

export type AppUserProfile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  avatar_url?: string | null;
  phone?: string | null;
  department?: string | null;
  roles?: string[];
  created_at?: string;
  updated_at?: string;
};

interface UserProfileContextValue {
  profile: AppUserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<AppUserProfile>) => Promise<void>;
  getRoleDisplayName: (role: string) => string;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

export const useUserProfile = () => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
};

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (userId: string) => {
    try {
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
        } catch (roleError) {
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
    } catch (e: any) {
      console.error('[UserProfile] Failed to load profile:', e.message);
      setError(e.message || 'Failed to load user profile');
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
      load(user.id);
    } else {
      setProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [user?.id, load]);

  const refreshProfile = async () => {
    if (user?.id) await load(user.id);
  };

  const updateProfile = async (updates: Partial<AppUserProfile>) => {
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
  };

  const getRoleDisplayName = (role: string) => {
    const map: Record<string, string> = {
      super_admin: 'مدير النظام الرئيسي',
      admin: 'مدير النظام',
      accountant: 'محاسب',
      user: 'مستخدم',
      auditor: 'مدقق',
      viewer: 'عارض',
    };
    return map[role] || role;
  };

  const hasRole = (role: string) => !!profile?.roles?.includes(role);
  const isSuperAdmin = () => hasRole('super_admin');

  const value = useMemo(() => ({
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    getRoleDisplayName,
    hasRole,
    isSuperAdmin
  }), [profile, loading, error, refreshProfile, updateProfile]);

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
};

