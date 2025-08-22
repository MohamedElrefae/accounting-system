import type { NavigationItem } from '../types';

export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    titleEn: 'Dashboard',
    titleAr: 'لوحة التحكم',
    icon: 'Dashboard',
    path: '/',
  },
  {
    id: 'main-data',
    titleEn: 'Main Data',
    titleAr: 'البيانات الرئيسية',
    icon: 'AccountTree',
    children: [
      {
        id: 'accounts-tree',
        titleEn: 'Tree of Accounts',
        titleAr: 'شجرة الحسابات',
        icon: 'List',
        path: '/main-data/accounts-tree',
      },
    ],
  },
  {
    id: 'settings',
    titleEn: 'Settings',
    titleAr: 'الإعدادات',
    icon: 'Settings',
    children: [
      {
        id: 'users',
        titleEn: 'Users',
        titleAr: 'المستخدمين',
        icon: 'Group',
        path: '/settings/users',
      },
      {
        id: 'roles',
        titleEn: 'Roles & Permissions',
        titleAr: 'الأدوار والصلاحيات',
        icon: 'Security',
        path: '/settings/roles',
      },
      {
        id: 'diagnostics',
        titleEn: 'Diagnostics',
        titleAr: 'التشخيص',
        icon: 'Security',
        path: '/settings/diagnostics',
        superAdminOnly: true
      },
    ],
  },
];
