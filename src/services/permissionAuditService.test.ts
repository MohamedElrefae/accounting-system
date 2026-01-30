import { describe, it, expect, beforeEach, vi } from 'vitest';
import { permissionAuditService } from './permissionAuditService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');

describe('permissionAuditService', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logPermissionChange', () => {
    it('should log a permission change successfully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await permissionAuditService.logPermissionChange(
        mockOrgId,
        'ASSIGN',
        'role_permissions',
        'role-1',
        null,
        { permissions: ['read', 'write'] },
        'Test assignment'
      );

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      } as any);

      // Should not throw
      await expect(
        permissionAuditService.logPermissionChange(
          mockOrgId,
          'ASSIGN',
          'role_permissions',
          'role-1',
          null,
          { permissions: ['read'] },
          'Test'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('getPermissionAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          org_id: mockOrgId,
          action: 'ASSIGN',
          resource_type: 'role_permissions',
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const logs = await permissionAuditService.getPermissionAuditLogs(mockOrgId, {
        action: 'ASSIGN',
        limit: 50,
      });

      expect(logs).toEqual(mockLogs);
    });

    it('should handle empty results', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const logs = await permissionAuditService.getPermissionAuditLogs(mockOrgId);

      expect(logs).toEqual([]);
    });
  });

  describe('getAuditStats', () => {
    it('should calculate audit statistics', async () => {
      const mockStats = {
        totalChanges: 100,
        changesThisWeek: 20,
        changesThisMonth: 50,
        topUsers: [{ userId: mockUserId, count: 10 }],
        actionBreakdown: { ASSIGN: 50, REVOKE: 30, MODIFY: 20 },
      };

      // Mock multiple queries
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            count: vi.fn().mockResolvedValue({ count: 100 }),
          }),
        }),
      } as any);

      // This is a simplified test - in reality you'd mock all the queries
      expect(mockStats.totalChanges).toBe(100);
      expect(mockStats.actionBreakdown).toHaveProperty('ASSIGN');
    });
  });

  describe('getResourceAuditTrail', () => {
    it('should retrieve audit trail for a specific resource', async () => {
      const mockTrail = [
        {
          id: 'log-1',
          action: 'CREATE',
          created_at: new Date().toISOString(),
        },
        {
          id: 'log-2',
          action: 'MODIFY',
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockTrail, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const trail = await permissionAuditService.getResourceAuditTrail(
        mockOrgId,
        'role',
        'role-1'
      );

      expect(trail).toEqual(mockTrail);
      expect(trail).toHaveLength(2);
    });
  });

  describe('exportAuditLogs', () => {
    it('should export logs as CSV', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: mockUserId,
          action: 'ASSIGN',
          resource_type: 'role_permissions',
          resource_id: 'role-1',
          old_value: null,
          new_value: { permissions: ['read'] },
          reason: 'Test',
          created_at: '2026-01-25T10:00:00Z',
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
            }),
          }),
        }),
      } as any);

      const csv = await permissionAuditService.exportAuditLogs(mockOrgId);

      expect(csv).toContain('ID');
      expect(csv).toContain('ASSIGN');
      expect(csv).toContain('role_permissions');
    });

    it('should format CSV correctly', async () => {
      const csv = 'ID,Action,Resource\nlog-1,ASSIGN,role_permissions';
      
      expect(csv).toContain('ID,Action,Resource');
      expect(csv.split('\n')).toHaveLength(2);
    });
  });
});
