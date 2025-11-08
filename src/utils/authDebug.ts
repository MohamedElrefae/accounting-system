/**
 * Authentication debugging utilities
 */

import { supabase } from './supabase';

export const debugAuthState = async () => {
  console.log('🔍 Debugging Auth State...');
  
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Current session:', session ? 'EXISTS' : 'NULL');
    console.log('📋 Session error:', sessionError);
    
    if (session) {
      console.log('👤 User ID:', session.user.id);
      console.log('📧 User email:', session.user.email);
      console.log('⏰ Session expires:', new Date(session.expires_at! * 1000));
    }
    
    // Check auth state
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user ? 'EXISTS' : 'NULL');
    console.log('👤 User error:', userError);
    
    // Check local storage
    const keys = Object.keys(localStorage);
    const authKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'));
    console.log('🗄️ Auth-related localStorage keys:', authKeys);
    
    // Check if stuck in loading
    const loadingStates = {
      hasSupabaseSession: !!session,
      hasUser: !!user,
      sessionValid: session && new Date(session.expires_at! * 1000) > new Date(),
      timestamp: new Date().toISOString()
    };
    console.log('⚡ Loading states:', loadingStates);
    
    return loadingStates;
  } catch (error) {
    console.error('💥 Auth debug failed:', error);
    return null;
  }
};

export const forceAuthRefresh = async () => {
  console.log('🔄 Forcing auth refresh...');
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    console.log('✅ Auth refresh result:', data ? 'SUCCESS' : 'FAILED');
    console.log('❌ Auth refresh error:', error);
    return { success: !!data, error };
  } catch (error) {
    console.error('💥 Auth refresh failed:', error);
    return { success: false, error };
  }
};

export const clearAuthState = () => {
  console.log('🧹 Clearing auth state...');
  
  try {
    // Clear localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('perm')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('perm')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ Auth state cleared');
    return true;
  } catch (error) {
    console.error('💥 Clear auth state failed:', error);
    return false;
  }
};

// Auto-run debug on import in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    debugAuthState();
  }, 2000);
}