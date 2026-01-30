import { describe, it, expect, beforeEach, vi } from 'vitest';
import { permissionSyncService } from './permissionSync';
import { supabase } from '../utils/supabase';
import { permissionAuditService } from './permissionAuditService';

vi.mock('../utils/supabase');
vi.mock('./permissionAuditService');

describe('permissionSyncService with audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignPermissionsToRole', () => {
    it('should assign permissions and log the change', async () => {
      const roleId = 1;
      const permissions = ['read', 'write'];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { permissions_assigned: 2 },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { permissions: { name: 'read' } },
              { permissions: { name: 'write' } },
            ],
            error: null,
          }),
        }),
      } as any);

      const result = await permissionSyncService.assignPermissionsToRole(
        roleId,
        permissions
      );

      expect(result.success).toBe(true);
      expect(result.permissions_assigned).toBe(2);
    });

    it('should handle assignment errors gracefully', async () => {
      const roleId = 1;
      const permissions = ['read'];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      } as any);

      const result = await permissionSyncService.assignPermissionsToRole(
        roleId,
        permissions
      );

      expect(result.success).toBe(false);
      expect(result.errors_count).toBe(1);
    });
  });

  describe('clearRolePermissions', () => {
    it('should clear permissions and log the revocation', async () => {
      const roleId = 1;

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { permissions: { name: 'read' } },
              { permissions: { name: 'write' } },
            ],
            error: null,
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await permissionSyncService.clearRolePermissions(roleId);

      expect(result).toBe(true);
    });

    it('should handle deletion errors', async () => {
      const roleId = 1;

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
        }),
      } as any);

      const result = await permissionSyncService.clearRolePermissions(roleId);

      expect(result).toBe(false);
    });
  });

  describe('verifyPermissionsSaved', () => {
    it('should verify permissions were saved correctly', async () => {
      const roleId = 1;
      const expectedPermissions = ['read', 'write'];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { permissions: { name: 'read' } },
              { permissions: { name: 'write' } },
            ],
            error: null,
          }),
        }),
      } as any);

      const result = await permissionSyncService.verifyPermissionsSaved(
        roleId,
        expectedPermissions
      );

      expect(result.success).toBe(true);
      expect(result.actualCount).toBe(2);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing permissions', async () => {
      const roleId = 1;
      const expectedPermissions = ['read', 'write', 'delete'];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { permissions: { name: 'read' } },
              { permissions: { name: 'write' } },
            ],
            error: null,
          }),
        }),
      } as any);

      const result = await permissionSyncService.verifyPermissionsSaved(
        roleId,
        expectedPermissions
      );

      expect(result.success).toBe(false);
      expect(result.missing).toContain('delete');
    });
  });

  describe('getRolePermissions', () => {
    it('should retrieve permissions for multiple roles', async () => {
      const roleIds = [1, 2];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { role_id: 1, permissions: { name: 'read' } },
              { role_id: 1, permissions: { name: 'write' } },
              { role_id: 2, permissions: { name: 'read' } },
            ],
            error: null,
          }),
        }),
      } as any);

      const result = await permissionSyncService.getRolePermissions(roleIds);

      expect(result.size).toBe(2);
      expect(result.get(1)).toContain('read');
      expect(result.get(1)).toContain('write');
    });
  });
});
