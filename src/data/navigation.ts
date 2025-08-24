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
    id: 'transactions',
    titleEn: 'Transactions',
    titleAr: 'المعاملات',
    icon: 'SwapHoriz',
    children: [
      {
        id: 'my-transactions',
        titleEn: 'My Transactions',
        titleAr: 'معاملاتي',
        icon: 'List',
        path: '/transactions/my',
        requiredPermission: 'transactions.read.own',
      },
      {
        id: 'pending-transactions',
        titleEn: 'Pending Approval',
        titleAr: 'المعاملات المعلقة',
        icon: 'Summarize',
        path: '/transactions/pending',
        requiredPermission: 'transactions.post',
      },
      {
        id: 'all-transactions',
        titleEn: 'All Transactions',
        titleAr: 'كل المعاملات',
        icon: 'Summarize',
        path: '/transactions/all',
        requiredPermission: 'transactions.read.all',
      },
    ],
  },
  {
    id: 'reports',
    titleEn: 'Reports',
    titleAr: 'التقارير',
    icon: 'Assessment',
    children: [
      {
        id: 'trial-balance',
        titleEn: 'Trial Balance',
        titleAr: 'ميزان المراجعة',
        icon: 'BarChart',
        path: '/reports/trial-balance',
      },
      {
        id: 'profit-loss',
        titleEn: 'Profit & Loss',
        titleAr: 'الأرباح والخسائر',
        icon: 'TrendingUp',
        path: '/reports/profit-loss',
      },
      {
        id: 'balance-sheet',
        titleEn: 'Balance Sheet',
        titleAr: 'الميزانية العمومية',
        icon: 'AccountBalance',
        path: '/reports/balance-sheet',
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
  }
];
