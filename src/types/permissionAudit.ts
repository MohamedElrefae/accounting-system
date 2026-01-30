/**
 * Permission Audit Types
 * Defines types for permission audit logging system
 */

export type PermissionAuditAction = 'ASSIGN' | 'REVOKE' | 'MODIFY' | 'CREATE' | 'DELETE';

export type PermissionAuditResourceType = 
  | 'user_role'
  | 'role_permission'
  | 'role'
  | 'permission'
  | 'user_permission';

export interface PermissionAuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: PermissionAuditAction;
  resource_type: PermissionAuditResourceType;
  resource_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PermissionAuditFilters {
  action?: PermissionAuditAction;
  resourceType?: PermissionAuditResourceType;
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
  topUsers: Array<{
    userId: string;
    count: number;
  }>;
  actionBreakdown: Record<PermissionAuditAction, number>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: PermissionAuditAction;
  resource: string;
  details: string;
  status: 'success' | 'failed';
}
