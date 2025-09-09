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
      },
      {
        id: "transaction-classification",
        label: "Transaction Classification",
        titleEn: "Transaction Classification",
        titleAr: "تصنيفات المعاملات",
        icon: "tag",
        path: "/main-data/transaction-classification"
      },
      {
        id: "expenses-categories",
        label: "Expenses Categories",
        titleEn: "Expenses Categories",
        titleAr: "فئات المصروفات",
        icon: "Category",
        path: "/main-data/expenses-categories"
      },
      {
        id: "work-items",
        label: "Work Items",
        titleEn: "Work Items",
        titleAr: "عناصر الأعمال",
        icon: "tree-structure",
        path: "/main-data/work-items"
      },
      {
        id: "cost-centers",
        label: "Cost Centers",
        titleEn: "Cost Centers",
        titleAr: "مراكز التكلفة",
        icon: "target",
        path: "/main-data/cost-centers"
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
        requiredPermission: "transactions.review"
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
    id: "approvals",
    label: "Approvals",
    titleEn: "Approvals",
    titleAr: "الموافقات",
    icon: "Assignment",
    children: [
      {
        id: "approvals-inbox",
        label: "Inbox",
        titleEn: "Inbox",
        titleAr: "صندوق الموافقات",
        icon: "Assignment",
        path: "/approvals/inbox",
        requiredPermission: "transactions.review"
      },
      {
        id: "approvals-workflows",
        label: "Workflows",
        titleEn: "Workflows",
        titleAr: "مسارات الموافقات",
        icon: "Assignment",
        path: "/approvals/workflows",
        requiredPermission: "transactions.manage"
      },
      {
        id: "approvals-test",
        label: "Test",
        titleEn: "Test",
        titleAr: "اختبار المسارات",
        icon: "Assignment",
        path: "/approvals/test",
        requiredPermission: "transactions.manage"
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
        id: "trial-balance-all-levels",
        label: "Trial Balance (All Levels)",
        titleEn: "Trial Balance (All Levels)",
        titleAr: "ميزان المراجعة (شجري)",
        icon: "scale",
        path: "/reports/trial-balance-all-levels"
      },
      {
        id: "general-ledger",
        label: "General Ledger",
        titleEn: "General Ledger",
        titleAr: "دفتر الأستاذ",
        icon: "book",
        path: "/reports/general-ledger"
      },
      {
        id: "account-explorer",
        label: "Account Explorer",
        titleEn: "Account Explorer",
        titleAr: "أرصدة الحسابات",
        icon: "tree-structure",
        path: "/reports/account-explorer"
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
      },
      {
        id: "custom-reports",
        label: "Custom Reports Builder",
        titleEn: "Custom Reports Builder",
        titleAr: "منشئ التقارير المخصصة",
        icon: "Tune",
        path: "/reports/custom"
      },
      {
        id: "main-data-reports",
        label: "Main Data Reports",
        titleEn: "Main Data Reports",
        titleAr: "تقارير البيانات الأساسية",
        icon: "database",
        children: [
          {
            id: "transaction-classification-reports",
            label: "Transaction Classification Reports",
            titleEn: "Transaction Classification Reports",
            titleAr: "تقارير تصنيفات المعاملات",
            icon: "tag",
            path: "/reports/main-data/transaction-classification"
          },
          {
            id: "work-item-usage",
            label: "Work Item Usage",
            titleEn: "Work Item Usage",
            titleAr: "استخدام عناصر الأعمال",
            icon: "activity",
            path: "/reports/main-data/work-item-usage"
          }
        ]
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
        id: "user-management",
        label: "User Management",
        titleEn: "User Management",
        titleAr: "إدارة المستخدمين",
        icon: "Security",
        path: "/settings/user-management"
      },
      {
        id: "org-management",
        label: "Organization Management",
        titleEn: "Organization Management",
        titleAr: "إدارة المؤسسة",
        icon: "settings",
        path: "/settings/organization-management"
      },
      {
        id: "account-prefix-mapping",
        label: "Account Prefix Mapping",
        titleEn: "Account Prefix Mapping",
        titleAr: "تصنيف رموز الحسابات",
        icon: "settings",
        path: "/settings/account-prefix-mapping"
      },
      {
        id: "font-preferences",
        label: "Font Settings",
        titleEn: "Font & Formatting",
        titleAr: "إعدادات الخطوط والتنسيق",
        icon: "type",
        path: "/settings/font-preferences"
      },
      {
        id: "export-database",
        label: "Export Database",
        titleEn: "Export Database",
        titleAr: "تصدير قاعدة البيانات",
        icon: "database",
        path: "/settings/export-database",
        requiredPermission: "data.export"
      },
      {
        id: "diagnostics",
        label: "Diagnostics",
        titleEn: "Diagnostics",
        titleAr: "التشخيص",
        icon: "activity", 
        path: "/settings/diagnostics",
        superAdminOnly: true
      },
      {
        id: "organization-management",
        label: "Organization Settings",
        titleEn: "Company/Organization Settings",
        titleAr: "إعدادات المؤسسة",
        icon: "settings",
        path: "/settings/organization-management"
      }
    ]
  }
];
