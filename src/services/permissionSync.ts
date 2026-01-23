import { supabase } from '../utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PermissionChangeCallback {
  (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any): void;
}

/**
 * Permission Sync Service
 * 
 * Provides real-time synchronization for role_permissions table
 * and verification utilities to ensure data integrity.
 */
class PermissionSyncService {
  private channel: RealtimeChannel | null = null;
  private callbacks: Set<PermissionChangeCallback> = new Set();
  private isActive = false;

  /**
   * Start listening to role_permissions changes
   */
  startSync() {
    if (this.channel) {
      console.warn('⚠️ Permission sync already started');
      return;
    }

    console.log('🚀 Starting permission sync service...');

    this.channel = supabase
      .channel('role_permissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions'
        },
        (payload) => {
          console.log('🔄 Permission change detected:', payload);
          this.notifyCallbacks(payload.eventType as any, payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Permission sync status:', status);
        this.isActive = status === 'SUBSCRIBED';
      });
  }

  /**
   * Stop listening to changes
   */
  stopSync() {
    if (this.channel) {
      console.log('🛑 Stopping permission sync service...');
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isActive = false;
    }
  }

  /**
   * Check if sync is active
   */
  isSubscribed(): boolean {
    return this.isActive;
  }

  /**
   * Subscribe to permission changes
   * @returns Unsubscribe function
   */
  subscribe(callback: PermissionChangeCallback) {
    this.callbacks.add(callback);
    console.log(`📝 Added permission sync callback (total: ${this.callbacks.size})`);
    
    return () => {
      this.callbacks.delete(callback);
      console.log(`🗑️ Removed permission sync callback (remaining: ${this.callbacks.size})`);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifyCallbacks(event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    console.log(`📢 Notifying ${this.callbacks.size} callbacks of ${event} event`);
    
    this.callbacks.forEach(callback => {
      try {
        callback(event, payload);
      } catch (error) {
        console.error('❌ Error in permission sync callback:', error);
      }
    });
  }

  /**
   * Force refresh permissions for a specific role
   */
  async refreshRolePermissions(roleId: number): Promise<string[]> {
    try {
      console.log(`🔄 Refreshing permissions for role ${roleId}...`);
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions (name)
        `)
        .eq('role_id', roleId);

      if (error) {
        console.error('❌ Error refreshing role permissions:', error);
        throw error;
      }

      const permissions = data?.map(rp => {
        const perm = rp.permissions as any;
        return Array.isArray(perm) ? perm[0]?.name : perm?.name;
      }).filter(Boolean) || [];

      console.log(`✅ Refreshed ${permissions.length} permissions for role ${roleId}`);
      return permissions;
    } catch (error) {
      console.error('❌ Error refreshing role permissions:', error);
      return [];
    }
  }

  /**
   * Verify permissions were saved correctly
   */
  async verifyPermissionsSaved(
    roleId: number, 
    expectedPermissions: string[]
  ): Promise<{
    success: boolean;
    actualCount: number;
    expectedCount: number;
    missing: string[];
    extra: string[];
    actualPermissions: string[];
  }> {
    console.log(`🔍 Verifying permissions for role ${roleId}...`);
    console.log(`📋 Expected permissions:`, expectedPermissions);

    const actualPermissions = await this.refreshRolePermissions(roleId);
    console.log(`📋 Actual permissions:`, actualPermissions);
    
    const missing = expectedPermissions.filter(p => !actualPermissions.includes(p));
    const extra = actualPermissions.filter(p => !expectedPermissions.includes(p));

    const success = missing.length === 0 && extra.length === 0;

    const result = {
      success,
      actualCount: actualPermissions.length,
      expectedCount: expectedPermissions.length,
      missing,
      extra,
      actualPermissions
    };

    if (success) {
      console.log(`✅ Verification successful: ${actualPermissions.length} permissions match`);
    } else {
      console.warn(`⚠️ Verification failed:`, {
        missing: missing.length > 0 ? missing : 'none',
        extra: extra.length > 0 ? extra : 'none'
      });
    }

    return result;
  }

  /**
   * Get all permissions for multiple roles
   */
  async getRolePermissions(roleIds: number[]): Promise<Map<number, string[]>> {
    try {
      console.log(`🔄 Fetching permissions for ${roleIds.length} roles...`);
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          permissions (name)
        `)
        .in('role_id', roleIds);

      if (error) throw error;

      const permissionsMap = new Map<number, string[]>();
      
      data?.forEach(rp => {
        const roleId = rp.role_id;
        const perm = rp.permissions as any;
        const permName = Array.isArray(perm) ? perm[0]?.name : perm?.name;
        
        if (permName) {
          if (!permissionsMap.has(roleId)) {
            permissionsMap.set(roleId, []);
          }
          permissionsMap.get(roleId)!.push(permName);
        }
      });

      console.log(`✅ Fetched permissions for ${permissionsMap.size} roles`);
      return permissionsMap;
    } catch (error) {
      console.error('❌ Error fetching role permissions:', error);
      return new Map();
    }
  }

  /**
   * Assign permissions to a role using the RPC function
   */
  async assignPermissionsToRole(
    roleId: number,
    permissionNames: string[]
  ): Promise<{
    success: boolean;
    message: string;
    permissions_assigned?: number;
    errors_count?: number;
  }> {
    try {
      console.log(`🔄 Assigning ${permissionNames.length} permissions to role ${roleId}...`);
      
      const { data, error } = await supabase.rpc('save_role_permissions', {
        p_role_id: roleId,
        p_permission_names: permissionNames
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      console.log('✅ RPC Response:', data);

      // Verify the assignment
      const verification = await this.verifyPermissionsSaved(roleId, permissionNames);

      if (!verification.success) {
        return {
          success: false,
          message: `Verification failed: ${verification.missing.length} missing, ${verification.extra.length} extra`,
          permissions_assigned: verification.actualCount,
          errors_count: verification.missing.length + verification.extra.length
        };
      }

      return {
        success: true,
        message: `Successfully assigned ${verification.actualCount} permissions`,
        permissions_assigned: verification.actualCount,
        errors_count: 0
      };
    } catch (error: any) {
      console.error('❌ Error assigning permissions:', error);
      return {
        success: false,
        message: error.message || 'Unknown error',
        errors_count: 1
      };
    }
  }

  /**
   * Assign permissions to multiple roles
   */
  async assignPermissionsToRoles(
    roleIds: number[],
    permissionNames: string[]
  ): Promise<{
    success: boolean;
    message: string;
    successfulRoles: number;
    failedRoles: number;
    totalPermissionsAssigned: number;
  }> {
    console.log(`🔄 Assigning permissions to ${roleIds.length} roles...`);
    
    let successfulRoles = 0;
    let failedRoles = 0;
    let totalPermissionsAssigned = 0;

    for (const roleId of roleIds) {
      const result = await this.assignPermissionsToRole(roleId, permissionNames);
      
      if (result.success) {
        successfulRoles++;
        totalPermissionsAssigned += result.permissions_assigned || 0;
      } else {
        failedRoles++;
      }
    }

    const success = successfulRoles > 0;
    const message = `Assigned permissions to ${successfulRoles}/${roleIds.length} roles (${totalPermissionsAssigned} total permissions)`;

    console.log(success ? '✅' : '❌', message);

    return {
      success,
      message,
      successfulRoles,
      failedRoles,
      totalPermissionsAssigned
    };
  }

  /**
   * Clear all permissions for a role
   */
  async clearRolePermissions(roleId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Clearing permissions for role ${roleId}...`);
      
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (error) throw error;

      console.log(`✅ Cleared permissions for role ${roleId}`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing permissions:', error);
      return false;
    }
  }
}

// Export singleton instance
export const permissionSyncService = new PermissionSyncService();

// Export class for testing
export { PermissionSyncService };
