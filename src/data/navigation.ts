import type { NavigationItem } from "../types";

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    titleEn: "Dashboard",
    titleAr: "لوحة التحكم",
    icon: "dashboard",
    path: "/"
  },
  {
    id: "main-data",
    label: "Main Data",
    titleEn: "Main Data", 
    titleAr: "البيانات الأساسية",
    icon: "database",
    children: [
      {
        id: "accounts-tree",
        label: "Accounts Tree",
        titleEn: "Tree of Accounts",
        titleAr: "شجرة الحسابات", 
        icon: "tree-structure",
        path: "/main-data/accounts-tree"
      },
      {
        id: "organizations",
        label: "Organizations",
        titleEn: "Organizations",
        titleAr: "إدارة المؤسسات",
        icon: "building",
        path: "/main-data/organizations"
      },
      {
        id: "projects",
        label: "Projects",
        titleEn: "Projects",
        titleAr: "إدارة المشاريع",
        icon: "folder",
        path: "/main-data/projects"
      }
    ]
  },
  {
    id: "transactions",
    label: "Transactions",
    titleEn: "Transactions",
    titleAr: "المعاملات المالية",
    icon: "receipt",
    children: [
      {
        id: "my-transactions",
        label: "My Transactions", 
        titleEn: "My Transactions",
        titleAr: "معاملاتي",
        icon: "user-check",
        path: "/transactions/my",
        requiredPermission: "transactions.read.own"
      },
      {
        id: "pending-transactions",
        label: "Pending Approval",
        titleEn: "Pending Approval", 
        titleAr: "في انتظار الموافقة",
        icon: "clock",
        path: "/transactions/pending",
        requiredPermission: "transactions.post"
      },
      {
        id: "all-transactions",
        label: "All Transactions",
        titleEn: "All Transactions",
        titleAr: "جميع المعاملات", 
        icon: "list",
        path: "/transactions/all",
        requiredPermission: "transactions.read.all"
      }
    ]
  },
  {
    id: "reports", 
    label: "Reports",
    titleEn: "Financial Reports",
    titleAr: "التقارير المالية",
    icon: "chart-line",
    children: [
      {
        id: "trial-balance",
        label: "Trial Balance",
        titleEn: "Trial Balance",
        titleAr: "ميزان المراجعة",
        icon: "scale",
        path: "/reports/trial-balance"
      },
      {
        id: "profit-loss",
        label: "Profit & Loss", 
        titleEn: "Profit & Loss",
        titleAr: "قائمة الدخل",
        icon: "trending-up",
        path: "/reports/profit-loss"
      },
      {
        id: "balance-sheet",
        label: "Balance Sheet",
        titleEn: "Balance Sheet", 
        titleAr: "الميزانية العمومية", 
        icon: "file-text",
        path: "/reports/balance-sheet"
      }
    ]
  },
  {
    id: "settings",
    label: "Settings",
    titleEn: "System Settings",
    titleAr: "إعدادات النظام",
    icon: "settings",
    children: [
      {
        id: "users",
        label: "Users",
        titleEn: "Users",
        titleAr: "المستخدمون",
        icon: "users",
        path: "/settings/users"
      },
      {
        id: "roles",
        label: "Roles & Permissions",
        titleEn: "Roles & Permissions", 
        titleAr: "الأدوار والصلاحيات",
        icon: "shield",
        path: "/settings/roles"
      },
      {
        id: "company-settings",
        label: "Company Settings",
        titleEn: "Company Settings",
        titleAr: "إعدادات الشركة",
        icon: "building",
        path: "/settings/company"
      },
      {
        id: "diagnostics",
        label: "Diagnostics",
        titleEn: "Diagnostics",
        titleAr: "التشخيص",
        icon: "activity", 
        path: "/settings/diagnostics",
        superAdminOnly: true
      }
    ]
  }
];
