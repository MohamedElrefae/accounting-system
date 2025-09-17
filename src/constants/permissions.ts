// Permission definitions - Single source of truth
export interface PermissionDefinition {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
}

export interface PermissionCategory {
  key: string;
  name: string;
  nameAr: string;
  icon?: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'users',
    name: 'User Management',
    nameAr: 'إدارة المستخدمين',
    icon: 'People',
    permissions: [
      {
        name: 'users.view',
        nameAr: 'عرض المستخدمين',
        description: 'View user list and details',
        descriptionAr: 'عرض قائمة المستخدمين وتفاصيلهم',
        category: 'users'
      },
      {
        name: 'users.create',
        nameAr: 'إنشاء مستخدم',
        description: 'Create new users',
        descriptionAr: 'إنشاء مستخدمين جدد',
        category: 'users'
      },
      {
        name: 'users.update',
        nameAr: 'تعديل المستخدمين',
        description: 'Update user information',
        descriptionAr: 'تعديل معلومات المستخدمين',
        category: 'users'
      },
      {
        name: 'users.delete',
        nameAr: 'حذف المستخدمين',
        description: 'Delete users from the system',
        descriptionAr: 'حذف المستخدمين من النظام',
        category: 'users'
      },
      {
        name: 'users.activate',
        nameAr: 'تفعيل المستخدمين',
        description: 'Activate or deactivate users',
        descriptionAr: 'تفعيل أو إلغاء تفعيل المستخدمين',
        category: 'users'
      }
    ]
  },
  {
    key: 'roles',
    name: 'Role Management',
    nameAr: 'إدارة الأدوار',
    icon: 'Security',
    permissions: [
      {
        name: 'roles.view',
        nameAr: 'عرض الأدوار',
        description: 'View roles and their permissions',
        descriptionAr: 'عرض الأدوار وصلاحياتها',
        category: 'roles'
      },
      {
        name: 'roles.create',
        nameAr: 'إنشاء أدوار',
        description: 'Create new roles',
        descriptionAr: 'إنشاء أدوار جديدة',
        category: 'roles'
      },
      {
        name: 'roles.update',
        nameAr: 'تعديل الأدوار',
        description: 'Update role information and permissions',
        descriptionAr: 'تعديل معلومات الأدوار وصلاحياتها',
        category: 'roles'
      },
      {
        name: 'roles.delete',
        nameAr: 'حذف الأدوار',
        description: 'Delete roles from the system',
        descriptionAr: 'حذف الأدوار من النظام',
        category: 'roles'
      },
      {
        name: 'roles.manage',
        nameAr: 'إدارة الأدوار',
        description: 'Assign and remove roles from users',
        descriptionAr: 'تعيين وإزالة الأدوار من المستخدمين',
        category: 'roles'
      }
    ]
  },
  {
    key: 'accounts',
    name: 'Accounts Management',
    nameAr: 'إدارة الحسابات',
    icon: 'AccountTree',
    permissions: [
      {
        name: 'accounts.view',
        nameAr: 'عرض الحسابات',
        description: 'View chart of accounts',
        descriptionAr: 'عرض دليل الحسابات',
        category: 'accounts'
      },
      {
        name: 'accounts.create',
        nameAr: 'إنشاء حسابات',
        description: 'Create new accounts',
        descriptionAr: 'إنشاء حسابات جديدة',
        category: 'accounts'
      },
      {
        name: 'accounts.update',
        nameAr: 'تعديل الحسابات',
        description: 'Update account information',
        descriptionAr: 'تعديل معلومات الحسابات',
        category: 'accounts'
      },
      {
        name: 'accounts.delete',
        nameAr: 'حذف الحسابات',
        description: 'Delete accounts',
        descriptionAr: 'حذف الحسابات',
        category: 'accounts'
      }
    ]
  },
  {
    key: 'transactions',
    name: 'Transactions',
    nameAr: 'المعاملات',
    icon: 'Receipt',
    permissions: [
      {
        name: 'transactions.create',
        nameAr: 'إنشاء المعاملات',
        description: 'Create new transactions',
        descriptionAr: 'إنشاء معاملات جديدة',
        category: 'transactions'
      },
      {
        name: 'transactions.update',
        nameAr: 'تعديل المعاملات',
        description: 'Update own unposted transactions',
        descriptionAr: 'تعديل المعاملات غير المرحلة',
        category: 'transactions'
      },
      {
        name: 'transactions.delete',
        nameAr: 'حذف المعاملات',
        description: 'Delete unposted transactions',
        descriptionAr: 'حذف المعاملات غير المرحلة',
        category: 'transactions'
      },
      {
        name: 'transactions.post',
        nameAr: 'ترحيل المعاملات',
        description: 'Post/approve transactions',
        descriptionAr: 'ترحيل واعتماد المعاملات',
        category: 'transactions'
      },
      {
        name: 'transactions.read.own',
        nameAr: 'عرض معاملاتي',
        description: 'View own transactions',
        descriptionAr: 'عرض المعاملات الخاصة بي',
        category: 'transactions'
      },
      {
        name: 'transactions.read.all',
        nameAr: 'عرض جميع المعاملات',
        description: 'View all transactions in system',
        descriptionAr: 'عرض جميع المعاملات في النظام',
        category: 'transactions'
      },
      {
        name: 'transactions.review',
        nameAr: 'مراجعة واعتماد المعاملات',
        description: 'Review transactions: approve/reject/request revision',
        descriptionAr: 'مراجعة المعاملات: اعتماد/رفض/طلب تعديل',
        category: 'transactions'
      },
      {
        name: 'transactions.manage',
        nameAr: 'إدارة المعاملات',
        description: 'Manage all transactions (edit/delete)',
        descriptionAr: 'إدارة جميع المعاملات (تعديل/حذف)',
        category: 'transactions'
      }
    ]
  },
  {
    key: 'sub_tree',
    name: 'Sub Tree',
    nameAr: 'الشجرة الفرعية',
    icon: 'Category',
    permissions: [
      {
        name: 'sub_tree.view',
        nameAr: 'عرض الشجرة الفرعية',
        description: 'View sub tree',
        descriptionAr: 'عرض الشجرة الفرعية',
        category: 'sub_tree'
      },
      {
        name: 'sub_tree.create',
        nameAr: 'إنشاء عقدة فرعية',
        description: 'Create new sub tree nodes',
        descriptionAr: 'إنشاء عقد فرعية جديدة',
        category: 'sub_tree'
      },
      {
        name: 'sub_tree.update',
        nameAr: 'تعديل الشجرة الفرعية',
        description: 'Update sub tree nodes',
        descriptionAr: 'تعديل عقد الشجرة الفرعية',
        category: 'sub_tree'
      },
      {
        name: 'sub_tree.delete',
        nameAr: 'حذف عقد الشجرة',
        description: 'Delete sub tree nodes',
        descriptionAr: 'حذف عقد الشجرة الفرعية',
        category: 'sub_tree'
      }
    ]
  },
  {
    key: 'permissions',
    name: 'Permissions Management',
    nameAr: 'إدارة الصلاحيات',
    icon: 'Security',
    permissions: [
      {
        name: 'permissions.view',
        nameAr: 'عرض الصلاحيات',
        description: 'View all permissions in the system',
        descriptionAr: 'عرض جميع الصلاحيات في النظام',
        category: 'permissions'
      },
      {
        name: 'permissions.create',
        nameAr: 'إنشاء صلاحيات',
        description: 'Create new permissions',
        descriptionAr: 'إنشاء صلاحيات جديدة',
        category: 'permissions'
      },
      {
        name: 'permissions.update',
        nameAr: 'تعديل الصلاحيات',
        description: 'Update existing permissions',
        descriptionAr: 'تعديل الصلاحيات الموجودة',
        category: 'permissions'
      },
      {
        name: 'permissions.delete',
        nameAr: 'حذف الصلاحيات',
        description: 'Delete permissions from the system',
        descriptionAr: 'حذف الصلاحيات من النظام',
        category: 'permissions'
      },
      {
        name: 'permissions.manage',
        nameAr: 'إدارة الصلاحيات',
        description: 'Full permissions management access',
        descriptionAr: 'وصول كامل لإدارة الصلاحيات',
        category: 'permissions'
      }
    ]
  },
  {
    key: 'reports',
    name: 'Reports',
    nameAr: 'التقارير',
    icon: 'Assessment',
    permissions: [
      {
        name: 'reports.view',
        nameAr: 'عرض التقارير',
        description: 'View financial reports',
        descriptionAr: 'عرض التقارير المالية',
        category: 'reports'
      },
      {
        name: 'reports.export',
        nameAr: 'تصدير التقارير',
        description: 'Export reports to Excel/PDF',
        descriptionAr: 'تصدير التقارير إلى Excel/PDF',
        category: 'reports'
      },
      {
        name: 'reports.custom',
        nameAr: 'تقارير مخصصة',
        description: 'Create custom reports',
        descriptionAr: 'إنشاء تقارير مخصصة',
        category: 'reports'
      },
      {
        name: 'reports.financial',
        nameAr: 'التقارير المالية',
        description: 'Access sensitive financial reports',
        descriptionAr: 'الوصول إلى التقارير المالية الحساسة',
        category: 'reports'
      }
    ]
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    nameAr: 'الفوترة',
    icon: 'Description',
    permissions: [
      {
        name: 'invoicing.view',
        nameAr: 'عرض الفواتير',
        description: 'View all invoices',
        descriptionAr: 'عرض جميع الفواتير',
        category: 'invoicing'
      },
      {
        name: 'invoicing.create',
        nameAr: 'إنشاء فواتير',
        description: 'Create new invoices',
        descriptionAr: 'إنشاء فواتير جديدة',
        category: 'invoicing'
      },
      {
        name: 'invoicing.update',
        nameAr: 'تعديل الفواتير',
        description: 'Update existing invoices',
        descriptionAr: 'تعديل الفواتير الموجودة',
        category: 'invoicing'
      },
      {
        name: 'invoicing.delete',
        nameAr: 'حذف الفواتير',
        description: 'Delete invoices',
        descriptionAr: 'حذف الفواتير',
        category: 'invoicing'
      },
      {
        name: 'invoicing.approve',
        nameAr: 'اعتماد الفواتير',
        description: 'Approve invoices for payment',
        descriptionAr: 'اعتماد الفواتير للدفع',
        category: 'invoicing'
      }
    ]
  },
  {
    key: 'inventory',
    name: 'Inventory',
    nameAr: 'المخزون',
    icon: 'Inventory',
    permissions: [
      {
        name: 'inventory.view',
        nameAr: 'عرض المخزون',
        description: 'View inventory items',
        descriptionAr: 'عرض عناصر المخزون',
        category: 'inventory'
      },
      {
        name: 'inventory.manage',
        nameAr: 'إدارة المخزون',
        description: 'Manage inventory items and stock',
        descriptionAr: 'إدارة عناصر المخزون والمخزون',
        category: 'inventory'
      },
      {
        name: 'inventory.adjust',
        nameAr: 'تعديل المخزون',
        description: 'Make inventory adjustments',
        descriptionAr: 'إجراء تعديلات المخزون',
        category: 'inventory'
      },
      {
        name: 'inventory.transfer',
        nameAr: 'نقل المخزون',
        description: 'Transfer inventory between locations',
        descriptionAr: 'نقل المخزون بين المواقع',
        category: 'inventory'
      }
    ]
  },
  {
    key: 'settings',
    name: 'System Settings',
    nameAr: 'إعدادات النظام',
    icon: 'Settings',
    permissions: [
      {
        name: 'settings.view',
        nameAr: 'عرض الإعدادات',
        description: 'View system settings',
        descriptionAr: 'عرض إعدادات النظام',
        category: 'settings'
      },
      {
        name: 'settings.update',
        nameAr: 'تعديل الإعدادات',
        description: 'Update system settings',
        descriptionAr: 'تعديل إعدادات النظام',
        category: 'settings'
      },
      {
        name: 'settings.backup',
        nameAr: 'النسخ الاحتياطي',
        description: 'Create and restore backups',
        descriptionAr: 'إنشاء واستعادة النسخ الاحتياطية',
        category: 'settings'
      },
      {
        name: 'settings.audit',
        nameAr: 'سجل المراجعة',
        description: 'View audit logs',
        descriptionAr: 'عرض سجلات المراجعة',
        category: 'settings'
      }
    ]
  }
];

// Flatten all permissions for easy lookup
export const ALL_PERMISSIONS: PermissionDefinition[] = PERMISSION_CATEGORIES.flatMap(
  category => category.permissions
);

// Create a map for quick permission lookup
export const PERMISSION_MAP: Record<string, PermissionDefinition> = ALL_PERMISSIONS.reduce(
  (acc, perm) => ({ ...acc, [perm.name]: perm }),
  {}
);

// Export permission names as constants to avoid typos
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_ACTIVATE: 'users.activate',
  
  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_MANAGE: 'roles.manage',
  
  // Accounts
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_CREATE: 'accounts.create',
  ACCOUNTS_UPDATE: 'accounts.update',
  ACCOUNTS_DELETE: 'accounts.delete',
  
  // Transactions
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_READ_OWN: 'transactions.read.own',
  TRANSACTIONS_READ_ALL: 'transactions.read.all',
  TRANSACTIONS_POST: 'transactions.post',
  TRANSACTIONS_CREATE: 'transactions.create',
  TRANSACTIONS_UPDATE: 'transactions.update',
  TRANSACTIONS_DELETE: 'transactions.delete',
  TRANSACTIONS_APPROVE: 'transactions.approve',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_CUSTOM: 'reports.custom',
  REPORTS_FINANCIAL: 'reports.financial',
  
  // Invoicing
  INVOICING_VIEW: 'invoicing.view',
  INVOICING_CREATE: 'invoicing.create',
  INVOICING_UPDATE: 'invoicing.update',
  INVOICING_DELETE: 'invoicing.delete',
  INVOICING_APPROVE: 'invoicing.approve',
  
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_BACKUP: 'settings.backup',
  SETTINGS_AUDIT: 'settings.audit',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];
