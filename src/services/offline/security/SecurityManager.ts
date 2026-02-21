/**
 * SecurityManager.ts
 * High-level security service bridging Supabase auth and offline encryption.
 * 
 * Responsibilities:
 * - Link Supabase session to offline encryption session
 * - Handle offline permission checks
 * - Log security events (PIN failures, auto-locks)
 * - Coordinate secure wipes on logout
 */

import { supabase } from '../../../utils/supabase';
import { 
  lockSession, 
  validateSecret, 
  isSessionActive,
  secureWipe 
} from './OfflineEncryption';
import { getOfflineDB } from '../core/OfflineSchema';
import { OFFLINE_FEATURE_FLAGS } from '../core/OfflineConfig';
import type { SecurityEvent } from '../core/OfflineTypes';

export class SecurityManager {
  private static instance: SecurityManager;

  private constructor() {}

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initializes or refreshes the security state based on the current user.
   */
  public async syncWithSupabase(): Promise<void> {
    const { getConnectionMonitor } = await import('../../../utils/connectionMonitor');
    if (!getConnectionMonitor().getHealth().isOnline) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && isSessionActive()) {
      await this.handleLogout();
    }
  }

  /**
   * Prompts user for their login password and initializes offline encryption.
   * Implements secure access using existing user passwords (User Feedback turn).
   */
  public async unlockWithPassword(password: string): Promise<boolean> {
    const result = await validateSecret(password, () => {
      this.logSecurityEvent('auto_lock', 'low', { message: 'Inactivity auto-lock triggered.' });
    });

    if (result === 'success') {
      await this.logSecurityEvent('access_violation', 'low', { action: 'unlock_with_password_success' });
      return true;
    }

    return false;
  }

  /**
   * @deprecated Use unlockWithPassword for better consistency with user login.
   */
  public async unlockOfflineData(pin: string): Promise<'success' | 'wrong_pin' | 'locked'> {
    return validateSecret(pin, () => {
      this.logSecurityEvent('auto_lock', 'low', { message: 'Inactivity auto-lock triggered.' });
    });
  }

  /**
   * Handles user logout — coordinates secure wipe if configured.
   */
  public async handleLogout(): Promise<void> {
    if (OFFLINE_FEATURE_FLAGS.ENCRYPTION_ENABLED) {
        await secureWipe();
    } else {
        lockSession();
    }
  }

  /**
   * Logs a security event to IndexedDB for audit/monitoring.
   */
  public async logSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: Record<string, unknown>
  ): Promise<void> {
    const db = getOfflineDB();
    let userId = 'anonymous';
    
    const { getConnectionMonitor } = await import('../../../utils/connectionMonitor');
    if (getConnectionMonitor().getHealth().isOnline) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || 'anonymous';
    }
    
    const event: SecurityEvent = {
        id: crypto.randomUUID(),
        type,
        severity,
        timestamp: new Date().toISOString(),
        userId,
        deviceId: localStorage.getItem('offline_device_id') || 'unknown',
        details,
        resolved: false
    };

    try {
        await db.securityEvents.add(event);
    } catch (error) {
        console.error('[SecurityManager] Failed to log security event:', error);
    }
  }

  /**
   * Checks if the currently active offline session has permission for an action.
   * This logic can be expanded to mirror Supabase RLS or custom permission sets.
   */
  public async checkOfflinePermission(
    _resource: string,
    _action: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    if (!isSessionActive()) return false;
    
    // In a real implementation, we would query a 'permissions' store in IndexedDB
    // which was populated during the last successful sync.
    return true; 
  }
}

export const securityManager = SecurityManager.getInstance();
