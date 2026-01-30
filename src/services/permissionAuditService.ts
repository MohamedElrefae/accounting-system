import { supabase } from '../utils/supabase';

export interface PermissionAuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: 'ASSIGN' | 'REVOKE' | 'MODIFY' | 'CREATE' | 'DELETE';
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PermissionAuditFilters {
  action?: string;
  resourceType?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalChanges: number;
  changesThisWeek: number;
  changesThisMonth: number;
  topUsers: Array<{ userId: string; count: number }>;
  actionBreakdown: Record<string, number>;
}

export const permissionAuditService = {
  /**
   * Log a permission change
   */
  async logPermissionChange(
    orgId: string,
    action: 'ASSIGN' | 'REVOKE' | 'MODIFY' | 'CREATE' | 'DELETE',
    resourceType: string,
    resourceId: string | null,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    reason?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('permission_audit_logs')
        .insert({
          org_id: orgId,
          user_id: user?.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          old_value: oldValue,
          new_value: newValue,
          reason: reason || null,
          ip_address: null, // Would need to get from request context
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log permission change:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in logPermissionChange:', error);
      // Don't throw - audit logging should not break the main operation
    }
  },

  /**
   * Fetch permission audit logs with filtering
   */
  async getPermissionAuditLogs(
    orgId: string,
    filters?: PermissionAuditFilters
  ): Promise<PermissionAuditLog[]> {
    try {
      let query = supabase
        .from('permission_audit_logs')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      // Apply pagination
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch permission audit logs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPermissionAuditLogs:', error);
      throw error;
    }
  },

  /**
   * Get audit statistics for an organization
   */
  async getAuditStats(orgId: string): Promise<AuditStats> {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total changes
      const { count: totalChanges } = await supabase
        .from('permission_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      // Get changes this week
      const { count: changesThisWeek } = await supabase
        .from('permission_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', weekAgo.toISOString());

      // Get changes this month
      const { count: changesThisMonth } = await supabase
        .from('permission_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', monthAgo.toISOString());

      // Get top users
      const { data: topUsersData } = await supabase
        .from('permission_audit_logs')
        .select('user_id')
        .eq('org_id', orgId);

      const userCounts: Record<string, number> = {};
      (topUsersData || []).forEach(log => {
        if (log.user_id) {
          userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
        }
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get action breakdown
      const { data: actionData } = await supabase
        .from('permission_audit_logs')
        .select('action')
        .eq('org_id', orgId);

      const actionBreakdown: Record<string, number> = {};
      (actionData || []).forEach(log => {
        actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      });

      return {
        totalChanges: totalChanges || 0,
        changesThisWeek: changesThisWeek || 0,
        changesThisMonth: changesThisMonth || 0,
        topUsers,
        actionBreakdown
      };
    } catch (error) {
      console.error('Error in getAuditStats:', error);
      throw error;
    }
  },

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    orgId: string,
    resourceType: string,
    resourceId: string
  ): Promise<PermissionAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('permission_audit_logs')
        .select('*')
        .eq('org_id', orgId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch resource audit trail:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getResourceAuditTrail:', error);
      throw error;
    }
  },

  /**
   * Export audit logs to CSV format
   */
  async exportAuditLogs(
    orgId: string,
    filters?: PermissionAuditFilters
  ): Promise<string> {
    try {
      const logs = await this.getPermissionAuditLogs(orgId, { ...filters, limit: 10000 });

      // Create CSV header
      const headers = [
        'ID',
        'User ID',
        'Action',
        'Resource Type',
        'Resource ID',
        'Old Value',
        'New Value',
        'Reason',
        'Created At'
      ];

      // Create CSV rows
      const rows = logs.map(log => [
        log.id,
        log.user_id || '',
        log.action,
        log.resource_type,
        log.resource_id || '',
        JSON.stringify(log.old_value || {}),
        JSON.stringify(log.new_value || {}),
        log.reason || '',
        log.created_at
      ]);

      // Combine headers and rows
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return csv;
    } catch (error) {
      console.error('Error in exportAuditLogs:', error);
      throw error;
    }
  }
};
