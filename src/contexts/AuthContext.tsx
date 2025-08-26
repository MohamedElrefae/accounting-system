import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
      } catch (e) {
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
        // Load profile but don't block on it - set loading to false first
        setLoading(false);
        try {
          await loadProfile(session.user.id);
        } catch (e) {
          // Profile load failed, continuing anyway
        }
        // Ensure redirect after successful sign-in or password recovery
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && 
            (window.location.pathname === '/login' || window.location.pathname === '/reset-password')) {
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
        // Profile load error, continuing anyway
      } else if (result?.data) {
        // Profile loaded successfully
        setProfile(result.data as Profile);
        // Persist super admin flag if present on profile row
        try {
          // @ts-ignore allow dynamic prop
          const isSuper = (result.data as any)?.is_super_admin === true;
          if (typeof isSuper === 'boolean') {
            localStorage.setItem('is_super_admin', isSuper ? 'true' : 'false');
          }
        } catch {}
      }
    } catch (e: any) {
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
      } catch (_) {
        // Ignore if table/policy not ready yet
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(() => ({ user, profile, loading, permissions, signIn, signInWithProvider, signUp, signOut, refreshProfile: async () => user && loadProfile(user.id) }), [user, profile, loading, permissions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
