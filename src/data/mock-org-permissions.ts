// DEPRECATED: Mock org-level permission matrix for development.
// Note: org memberships are now roleless. This mock remains only for app-level role/permission demos.
// Prefer checking membership via DB helpers and using the enterprise permissions system.

export type OrgPermission = string;

export type OrgRoleKey = 'viewer' | 'manager' | 'admin';

export interface OrgRoleDefinition {
  key: OrgRoleKey;
  name: string;
  nameAr: string;
  permissions: OrgPermission[];
}

export interface OrgPermissionMatrix {
  orgId: string;
  roles: OrgRoleDefinition[];
}

// Keep aligned with src/constants/permissions.ts keys when possible
const BASE_PERMS = {
  READ_REPORTS: 'reports.view',
  READ_TRANSACTIONS_OWN: 'transactions.read.own',
  READ_TRANSACTIONS_ALL: 'transactions.read.all',
  POST_TRANSACTIONS: 'transactions.post',
  USERS_VIEW: 'users.view',
  ROLES_MANAGE: 'roles.manage',
};

export function getOrgPermissionMatrixMock(orgId: string): OrgPermissionMatrix {
  return {
    orgId,
    roles: [
      {
        key: 'viewer',
        name: 'Viewer',
        nameAr: 'مشاهد',
        permissions: [
          BASE_PERMS.READ_REPORTS,
          BASE_PERMS.READ_TRANSACTIONS_OWN,
        ],
      },
      {
        key: 'manager',
        name: 'Manager',
        nameAr: 'مدير',
        permissions: [
          BASE_PERMS.READ_REPORTS,
          BASE_PERMS.READ_TRANSACTIONS_ALL,
          BASE_PERMS.POST_TRANSACTIONS,
        ],
      },
      {
        key: 'admin',
        name: 'Admin',
        nameAr: 'مسؤول',
        permissions: [
          BASE_PERMS.READ_REPORTS,
          BASE_PERMS.READ_TRANSACTIONS_ALL,
          BASE_PERMS.POST_TRANSACTIONS,
          BASE_PERMS.USERS_VIEW,
          BASE_PERMS.ROLES_MANAGE,
        ],
      },
    ],
  };
}

export function getDefaultRoleForNewMember(): OrgRoleKey {
  return 'viewer';
}
