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
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Failed to get current user:', error);
        return null;
      }
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user:', error);
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
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Failed to get user:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
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