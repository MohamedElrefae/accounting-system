/**
 * Auth cleanup utility to remove old auth patterns and optimize performance
 */

/**
 * Clean up old auth tokens and session data
 */
export const cleanupOldAuthData = () => {
  try {
    // Remove any old auth tokens that might be lingering
    const keysToRemove = [
      'auth_token',
      'access_token', 
      'refresh_token',
      'user_session',
      'auth_user',
      'supabase_auth_token'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    console.log('✅ Old auth data cleaned up');
  } catch (error) {
    console.warn('Failed to cleanup old auth data:', error);
  }
};

/**
 * Validate current auth state consistency
 */
export const validateAuthState = () => {
  try {
    // Supabase-js stores auth state under a key like: sb-<project-ref>-auth-token
    const projectRef = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '';
    const sbKey = projectRef ? `sb-${projectRef}-auth-token` : null;

    const hasSupabaseSession = sbKey
      ? !!(localStorage.getItem(sbKey) || sessionStorage.getItem(sbKey))
      : false;

    const hasPermissionCache = Object.keys(sessionStorage).some(key => key.startsWith('perm-cache:'));

    if (import.meta.env.DEV) {
      console.log('Auth State Validation:', {
        hasSupabaseSession,
        hasPermissionCache,
        timestamp: new Date().toISOString()
      });
    }

    return {
      isValid: hasSupabaseSession,
      hasPermissions: hasPermissionCache
    };
  } catch (error) {
    console.warn('Auth state validation failed:', error);
    return { isValid: false, hasPermissions: false };
  }
};

/**
 * Initialize auth cleanup on app start
 */
export const initAuthCleanup = () => {
  if (import.meta.env.DEV) {
    console.log('🧹 Initializing auth cleanup...');
  }
  
  cleanupOldAuthData();
  
  // Run validation after a short delay
  setTimeout(() => {
    validateAuthState();
  }, 1000);
};

export default {
  cleanupOldAuthData,
  validateAuthState,
  initAuthCleanup
};