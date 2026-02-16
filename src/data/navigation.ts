import type { NavigationItem } from "../types";

const FEATURE_INVENTORY = Boolean(import.meta.env.VITE_FEATURE_INVENTORY);

const baseNavigation: NavigationItem[] = [
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
    // NO requiredPermission - auto-shows if any child visible
    children: [
      {
        id: "accounts-tree",
        label: "Accounts Tree",
        titleEn: "Tree of Accounts",
        titleAr: "شجرة الحسابات", 
        icon: "tree-structure",
        path: "/main-data/accounts-tree",
        requiredPermission: "accounts.view"
      },
      {
        id: "organizations",
        label: "Organizations",
        titleEn: "Organizations",
        titleAr: "إدارة المؤسسات",
        icon: "building",
        path: "/main-data/organizations",
        requiredPermission: "organizations.view"
      },
      {
        id: "projects",
        label: "Projects",
        titleEn: "Projects",
        titleAr: "إدارة المشاريع",
        icon: "folder",
        path: "/main-data/projects",
        requiredPermission: "projects.view"
      },
      {
        id: "transaction-classification",
        label: "Transaction Classification",
        titleEn: "Transaction Classification",
        titleAr: "تصنيفات المعاملات",
        icon: "tag",
        path: "/main-data/transaction-classification",
        requiredPermission: "classification.view"
      },
      {
        id: "sub-tree",
        label: "Sub Tree",
        titleEn: "Sub Tree",
        titleAr: "الشجرة الفرعية",
        icon: "Category",
        path: "/main-data/sub-tree",
        requiredPermission: "sub_tree.view"
      },
      {
        id: "work-items",
        label: "Work Items",
        titleEn: "Work Items",
        titleAr: "عناصر الأعمال",
        icon: "tree-structure",
        path: "/main-data/work-items",
        requiredPermission: "work_items.view"
      },
      // Temporarily hidden: Document Categories (not ready for use)
      // {
      //   id: "document-categories",
      //   label: "Document Categories",
      //   titleEn: "Document Categories",
      //   titleAr: "تصنيفات المستندات",
      //   icon: "Category",
      //   path: "/main-data/document-categories"
      // },
      {
        id: "document-templates",
        label: "Document Templates",
        titleEn: "Document Templates",
        titleAr: "قوالب المستندات",
        icon: "Description",
        path: "/main-data/document-templates",
        requiredPermission: "templates.view"
      },
      {
        id: "analysis-work-items",
        label: "Analysis Work Items",
        titleEn: "Analysis Work Items",
        titleAr: "بنود الاعمال التحليلية",
        icon: "tree-structure",
        path: "/main-data/analysis-work-items",
        requiredPermission: "analysis.view"
      },
      {
        id: "cost-centers",
        label: "Cost Centers",
        titleEn: "Cost Centers",
        titleAr: "مراكز التكلفة",
        icon: "target",
        path: "/main-data/cost-centers",
        requiredPermission: "cost_centers.view"
      },
      {
        id: "transaction-line-items",
        label: "Transaction Line Items",
        titleEn: "Transaction Line Items Catalog",
        titleAr: "بنود التكلفة التفصيلية",
        icon: "list-tree",
        path: "/main-data/transaction-line-items",
        requiredPermission: "transaction_line_items.read"
      }
    ]
  },
  {
    id: "documents",
    label: "Document Management",
    titleEn: "Document Management",
    titleAr: "إدارة المستندات",
    icon: "Description",
    path: "/documents",
    requiredPermission: "documents.view"
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
        requiredPermission: "transactions.view.own"
      },
      {
        id: "my-transactions-enriched",
        label: "My Transactions (Enriched)", 
        titleEn: "My Transactions (Enriched)",
        titleAr: "معاملاتي (محسّن)",
        icon: "user-check",
        path: "/transactions/my-enriched",
        requiredPermission: "transactions.view.own"
      },
      {
        id: "my-lines-enriched",
        label: "My Lines (Enriched)", 
        titleEn: "My Lines (Enriched)",
        titleAr: "سطور معاملاتي",
        icon: "file-text",
        path: "/transactions/my-lines",
        requiredPermission: "transactions.view.own"
      },
      {
        id: "all-transactions-enriched",
        label: "All Transactions (Enriched)", 
        titleEn: "All Transactions (Enriched)",
        titleAr: "جميع المعاملات (محسّن)",
        icon: "list",
        path: "/transactions/all-enriched",
        requiredPermission: "transactions.view.all"
      },
      {
        id: "all-lines-enriched",
        label: "All Lines (Enriched)", 
        titleEn: "All Lines (Enriched)",
        titleAr: "جميع سطور المعاملات",
        icon: "file-text",
        path: "/transactions/all-lines",
        requiredPermission: "transactions.view.all"
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
        requiredPermission: "transactions.view.all"
      },
// GL2 menu items removed in unified model
      {
        id: "assign-cost-analysis",
        label: "Assign Cost Analysis",
        titleEn: "Assign Cost Analysis",
        titleAr: "تسجيل التكاليف",
        icon: "calculator",
        path: "/transactions/assign-cost-analysis",
        requiredPermission: "transactions.cost_analysis"
      }
    ]
  },
  {
    id: "approvals",
    label: "Approvals",
    titleEn: "Approvals",
    titleAr: "الموافقات",
    icon: "Assignment",
    // NO requiredPermission - auto-shows if any child visible
    children: [
      {
        id: "approvals-documents",
        label: "Document Approvals",
        titleEn: "Document Approvals",
        titleAr: "موافقات المستندات",
        icon: "Assignment",
        path: "/approvals/documents",
        requiredPermission: "approvals.review"
      },
      {
        id: "approvals-inbox",
        label: "Inbox",
        titleEn: "Inbox",
        titleAr: "صندوق الموافقات",
        icon: "Assignment",
        path: "/approvals/inbox",
        requiredPermission: "approvals.review"
      },
      {
        id: "approvals-workflows",
        label: "Workflows",
        titleEn: "Workflows",
        titleAr: "مسارات الموافقات",
        icon: "Assignment",
        path: "/approvals/workflows",
        requiredPermission: "approvals.manage"
      },
      {
        id: "approvals-test",
        label: "Test",
        titleEn: "Test",
        titleAr: "اختبار المسارات",
        icon: "Assignment",
        path: "/approvals/test",
        requiredPermission: "approvals.manage"
      }
    ]
  },
  {
    id: "fiscal",
    label: "Fiscal",
    titleEn: "Fiscal Management",
    titleAr: "الإدارة المالية",
    icon: "AccountBalance",
    // NO requiredPermission - auto-shows if any child visible
    children: [
      {
        id: "fiscal-dashboard",
        label: "Fiscal Dashboard",
        titleEn: "Fiscal Year Dashboard",
        titleAr: "لوحة السنة المالية",
        icon: "BarChart",
        path: "/fiscal/dashboard"
      },
      {
        id: "fiscal-periods",
        label: "Period Manager",
        titleEn: "Period Manager",
        titleAr: "إدارة الفترات",
        icon: "List",
        path: "/fiscal/periods"
      },
      {
        id: "opening-balance-import",
        label: "Opening Balance Import",
        titleEn: "Opening Balance Import",
        titleAr: "استيراد الأرصدة الافتتاحية",
        icon: "Upload",
        path: "/fiscal/opening-balance"
      }
    ]
  },
  {
    id: "reports", 
    label: "Reports",
    titleEn: "Financial Reports",
    titleAr: "التقارير المالية",
    icon: "chart-line",
    requiredPermission: "reports.view",
    // NO requiredPermission - auto-shows if any child visible
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
        id: "running-balance",
        label: "Running Balance",
        titleEn: "Running Balance",
        titleAr: "الرصيد الجاري",
        icon: "trending-up",
        path: "/reports/running-balance"
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
        id: "transaction-lines-report",
        label: "Transaction Lines Report",
        titleEn: "Transaction Lines Report",
        titleAr: "تقرير سطور المعاملات",
        icon: "LineChart",
        path: "/reports/transaction-lines-report"
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
          },
          {
            id: "analysis-item-usage",
            label: "Analysis Item Usage",
            titleEn: "Analysis Item Usage",
            titleAr: "استخدام بنود التحليل",
            icon: "activity",
            path: "/reports/main-data/analysis-item-usage"
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
        path: "/settings/user-management",
        requiredPermission: "users.view"
      },
      {
        id: "online-users",
        label: "Online Users",
        titleEn: "Online Users",
        titleAr: "المستخدمون المتصلون الآن",
        icon: "People",
        path: "/settings/online-users",
        requiredPermission: "presence.view.team"
      },
      {
        id: "org-management",
        label: "Organization Management",
        titleEn: "Organization Management",
        titleAr: "إدارة المؤسسة",
        icon: "settings",
        path: "/settings/organization-management",
        requiredPermission: "settings.manage"
      },
      {
        id: "account-prefix-mapping",
        label: "Account Prefix Mapping",
        titleEn: "Account Prefix Mapping",
        titleAr: "تصنيف رموز الحسابات",
        icon: "settings",
        path: "/settings/account-prefix-mapping",
        requiredPermission: "settings.manage"
      },
      {
        id: "font-preferences",
        label: "Font Settings",
        titleEn: "Font & Formatting",
        titleAr: "إعدادات الخطوط والتنسيق",
        icon: "type",
        path: "/settings/font-preferences",
        requiredPermission: "settings.preferences"
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
        id: "enterprise-audit",
        label: "Audit Log",
        titleEn: "Audit Log",
        titleAr: "سجل المراجعة",
        icon: "Security",
        path: "/settings/audit",
        requiredPermission: "settings.audit"
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
        path: "/settings/organization-management",
        requiredPermission: "settings.manage"
      }
    ]
  }
];

// Conditionally add Inventory section when feature flag is on
const inventorySection: NavigationItem | null = FEATURE_INVENTORY ? {
  id: 'inventory',
  label: 'Inventory',
  titleEn: 'Inventory',
  titleAr: 'إدارة المخزون',
  icon: 'inventory',
  requiredPermission: 'inventory.view',
  children: [
    {
      id: 'inventory-dashboard',
      label: 'Dashboard',
      titleEn: 'Inventory Dashboard',
      titleAr: 'لوحة المخزون',
      icon: 'dashboard',
      path: '/inventory'
    },
    {
      id: 'inventory-kpis',
      label: 'KPIs',
      titleEn: 'Inventory KPIs',
      titleAr: 'مؤشرات المخزون',
      icon: 'bar-chart',
      path: '/inventory/kpis'
    },
    // Master Data Group
    {
      id: 'inventory-master-data',
      label: 'Master Data',
      titleEn: 'Master Data',
      titleAr: 'البيانات الأساسية',
      icon: 'database',
      children: [
        {
          id: 'inventory-materials',
          label: 'Materials',
          titleEn: 'Materials',
          titleAr: 'المواد',
          icon: 'list',
          path: '/inventory/materials',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-locations',
          label: 'Locations',
          titleEn: 'Locations',
          titleAr: 'المواقع',
          icon: 'location',
          path: '/inventory/locations',
          requiredPermission: 'inventory.manage'
        },
        {
          id: 'inventory-uoms',
          label: 'UOMs',
          titleEn: 'Units of Measure',
          titleAr: 'وحدات القياس',
          icon: 'ruler',
          path: '/inventory/uoms',
          requiredPermission: 'inventory.manage'
        }
      ]
    },
    // Operations Group
    {
      id: 'inventory-operations',
      label: 'Operations',
      titleEn: 'Operations',
      titleAr: 'العمليات',
      icon: 'activity',
      children: [
        {
          id: 'inventory-receive',
          label: 'Receive',
          titleEn: 'Receive Materials',
          titleAr: 'توريد مواد',
          icon: 'download',
          path: '/inventory/receive',
          requiredPermission: 'inventory.manage'
        },
        {
          id: 'inventory-issue',
          label: 'Issue',
          titleEn: 'Issue to Project',
          titleAr: 'صرف للمشروع',
          icon: 'upload',
          path: '/inventory/issue',
          requiredPermission: 'inventory.manage'
        },
        {
          id: 'inventory-transfer',
          label: 'Transfer',
          titleEn: 'Transfer',
          titleAr: 'نقل',
          icon: 'shuffle',
          path: '/inventory/transfer',
          requiredPermission: 'inventory.transfer'
        },
        {
          id: 'inventory-adjust',
          label: 'Adjust',
          titleEn: 'Adjust',
          titleAr: 'تسوية',
          icon: 'tune',
          path: '/inventory/adjust',
          requiredPermission: 'inventory.adjust'
        },
        {
          id: 'inventory-returns',
          label: 'Returns',
          titleEn: 'Returns',
          titleAr: 'مرتجعات',
          icon: 'rotate-ccw',
          path: '/inventory/returns',
          requiredPermission: 'inventory.manage'
        },
        {
          id: 'inventory-reconciliation',
          label: 'Reconciliation',
          titleEn: 'Reconciliation',
          titleAr: 'التسوية',
          icon: 'Balance',
          path: '/inventory/reconciliation',
          requiredPermission: 'inventory.adjust'
        }
      ]
    },
    // Reports Group
    {
      id: 'inventory-reports',
      label: 'Reports',
      titleEn: 'Reports',
      titleAr: 'التقارير',
      icon: 'chart-line',
      children: [
        {
          id: 'inventory-on-hand',
          label: 'On Hand',
          titleEn: 'On Hand',
          titleAr: 'الرصيد المتاح',
          icon: 'boxes',
          path: '/inventory/on-hand',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-movements',
          label: 'Movements',
          titleEn: 'Movements',
          titleAr: 'حركة المخزون',
          icon: 'activity',
          path: '/inventory/movements',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-movement-summary',
          label: 'Movement Summary',
          titleEn: 'Movement Summary',
          titleAr: 'ملخص الحركة',
          icon: 'activity',
          path: '/inventory/movement-summary',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-movement-detail',
          label: 'Movement Detail',
          titleEn: 'Movement Detail',
          titleAr: 'تفاصيل الحركة',
          icon: 'list',
          path: '/inventory/movement-detail',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-project-movement-summary',
          label: 'Project Movement Summary',
          titleEn: 'Project Movement Summary',
          titleAr: 'ملخص الحركة حسب المشروع',
          icon: 'bar-chart',
          path: '/inventory/project-movement-summary',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-valuation',
          label: 'Valuation',
          titleEn: 'Valuation',
          titleAr: 'تقييم المخزون',
          icon: 'trending-up',
          path: '/inventory/valuation',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-valuation-by-project',
          label: 'Valuation by Project',
          titleEn: 'Valuation by Project',
          titleAr: 'قيمة المخزون حسب المشروع',
          icon: 'trending-up',
          path: '/inventory/valuation-by-project',
          requiredPermission: 'inventory.view'
        },
        {
          id: 'inventory-ageing',
          label: 'Ageing',
          titleEn: 'Stock Ageing',
          titleAr: 'تقادم المخزون',
          icon: 'clock',
          path: '/inventory/ageing',
          requiredPermission: 'inventory.view'
        }
      ]
    },
    // Settings Group
    {
      id: 'inventory-settings',
      label: 'Settings',
      titleEn: 'Settings',
      titleAr: 'الإعدادات',
      icon: 'settings',
      children: [
        {
          id: 'inventory-settings-page',
          label: 'Inventory Settings',
          titleEn: 'Inventory Settings',
          titleAr: 'إعدادات المخزون',
          icon: 'settings',
          path: '/inventory/settings',
          requiredPermission: 'inventory.manage'
        }
      ]
    }
  ]
} : null;
export const navigationItems: NavigationItem[] = inventorySection
  ? [...baseNavigation, inventorySection]
  : baseNavigation;
