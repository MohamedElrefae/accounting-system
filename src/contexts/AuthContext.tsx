import React, { createContext, useEffect, useMemo, useState, useContext } from 'react';
import { supabase } from '../utils/supabase';

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
};

interface AuthContextValue {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  permissions: string[];
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
  const [permissions] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        // Session check completed
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } catch {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state changed
      if (session?.user) {
        setUser(session.user);
        // If user is required to change password, force redirect to reset page
        try {
          const requireChange = (session.user.user_metadata as any)?.require_password_change === true;
          if (requireChange && window.location.pathname !== '/reset-password') {
            // Hard redirect to ensure token/state is fresh on reset page
            window.location.href = '/reset-password';
            return; // Stop further redirects
          }
        } catch {}

        // Load profile but don't block on it - set loading to false first
        setLoading(false);
        try {
          await loadProfile(session.user.id);
        } catch {
          // Profile load failed, continuing anyway
        }
        // Ensure redirect after successful sign-in only
        // Do NOT redirect on PASSWORD_RECOVERY; the ResetPassword page must remain visible
        if (event === 'SIGNED_IN' && (window.location.pathname === '/login')) {
          // Redirecting to dashboard
          // Use location.href for a hard redirect to ensure clean state
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    // Loading user profile
    try {
      // Add timeout to prevent hanging
      const profilePromise = supabase.from('user_profiles').select('*').eq('id', userId).single();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile load timeout')), 5000)
      );
      
      const result = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      if (result?.error) {
        // Profile doesn't exist, check if there's a pending profile
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user?.email) {
            const { data: pendingProfile } = await supabase
              .from('pending_user_profiles')
              .select('*')
              .eq('email', userData.user.email)
              .eq('used', false)
              .single();
              
            if (pendingProfile) {
              // Create profile from pending data
              const { error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: userId,
                  email: pendingProfile.email,
                  full_name_ar: pendingProfile.full_name_ar,
                  phone: pendingProfile.phone,
                  department: pendingProfile.department,
                  job_title: pendingProfile.job_title,
                  is_active: true
                });
                
              if (!createError) {
                // Mark pending profile as used
                await supabase
                  .from('pending_user_profiles')
                  .update({ used: true })
                  .eq('email', pendingProfile.email);
                  
                // Assign role if specified
                if (pendingProfile.assigned_role && pendingProfile.assigned_role !== 'user') {
                  await supabase
                    .from('user_roles')
                    .insert({
                      user_id: userId,
                      role_name: pendingProfile.assigned_role
                    });
                }
                
                // Try to load the newly created profile
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
            }
          }
        } catch (pendingError) {
          console.error('Failed to create profile from pending:', pendingError);
        }
        
        console.log('Profile not found for user:', userId);
      } else if (result?.data) {
        // Profile loaded successfully
        setProfile(result.data as Profile);
        // Persist super admin flag if present on profile row
        try {
          // Using dynamic property read; profile may have is_super_admin if available
          const isSuper = (result.data as any)?.is_super_admin === true;
          if (typeof isSuper === 'boolean') {
            localStorage.setItem('is_super_admin', isSuper ? 'true' : 'false');
          }
        } catch {}
      }
    } catch {
      // Profile load failed/timeout, continuing anyway
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data: _data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Sign in completed
    if (error) throw error;
  };

  const signInWithProvider = async (provider: 'github' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, extra?: Partial<Profile>) => {
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
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setProfile(null);
      
      // Clear any local storage items
      localStorage.removeItem('is_super_admin');
      
      // Force redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = useMemo(() => ({ user, profile, loading, permissions, signIn, signInWithProvider, signUp, signOut, refreshProfile: async () => user && loadProfile(user.id) }), [user, profile, loading, permissions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
