import { supabase } from '../utils/supabase';

/**
 * Centralized auth service to replace direct supabase.auth calls
 * This ensures all auth operations go through a single point
 */
export class AuthService {
  /**
   * Get current user ID - centralized method
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      // Offline-first check
      const { getConnectionMonitor } = await import('../utils/connectionMonitor');
      const isOnline = getConnectionMonitor().getHealth().isOnline;

      if (!isOnline) {
         // When offline, trust the local session cache
         const { data: { session } } = await supabase.auth.getSession();
         return session?.user?.id || null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        // Only log if online or if it's not a network error
        if (isOnline && !error.message?.includes('fetch')) {
             console.error('Failed to get current user:', error);
        }
        return null;
      }
      return user?.id || null;
    } catch (error: any) {
      if (!error.message?.includes('fetch') && !error.message?.includes('network')) {
          console.error('Error getting current user:', error);
      }
      return null;
    }
  }

  /**
   * Get current session - centralized method
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to get session:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get current user data - centralized method
   */
  static async getCurrentUser() {
    try {
      // Offline-first check
      const { getConnectionMonitor } = await import('../utils/connectionMonitor');
      const isOnline = getConnectionMonitor().getHealth().isOnline;

      if (!isOnline) {
         const { data: { session } } = await supabase.auth.getSession();
         return session?.user || null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        if (isOnline && !error.message?.includes('fetch')) {
             console.error('Failed to get user:', error);
        }
        return null;
      }
      return user;
    } catch (error: any) {
      if (!error.message?.includes('fetch')) {
         console.error('Error getting user:', error);
      }
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return !!session?.user;
  }

  /**
   * Get user metadata
   */
  static async getUserMetadata() {
    const user = await this.getCurrentUser();
    return user?.user_metadata || {};
  }
}

export default AuthService;