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
        path: "/main-data/work-items"
      },
      {
        id: "document-categories",
        label: "Document Categories",
        titleEn: "Document Categories",
        titleAr: "تصنيفات المستندات",
        icon: "Category",
        path: "/main-data/document-categories"
      },
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
        path: "/main-data/analysis-work-items"
      },
      {
        id: "cost-centers",
        label: "Cost Centers",
        titleEn: "Cost Centers",
        titleAr: "مراكز التكلفة",
        icon: "target",
        path: "/main-data/cost-centers"
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
      },
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
    children: [
      {
        id: "approvals-documents",
        label: "Document Approvals",
        titleEn: "Document Approvals",
        titleAr: "موافقات المستندات",
        icon: "Assignment",
        path: "/approvals/documents"
      },
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
    id: "fiscal",
    label: "Fiscal",
    titleEn: "Fiscal Management",
    titleAr: "الإدارة المالية السنوية",
    icon: "AccountBalance",
    children: [
      {
        id: "fiscal-dashboard",
        label: "Fiscal Dashboard",
        titleEn: "Fiscal Dashboard",
        titleAr: "لوحة السنة المالية",
        icon: "BarChart",
        path: "/fiscal/dashboard"
      },
      {
        id: "opening-balance-import",
        label: "Opening Balance Import",
        titleEn: "Opening Balance Import",
        titleAr: "استيراد الأرصدة الافتتاحية",
        icon: "Summarize",
        path: "/fiscal/opening-balance-import"
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
        id: "construction-dashboard",
        label: "Construction",
        titleEn: "Construction Dashboard",
        titleAr: "لوحة الإنشاءات",
        icon: "TrendingUp",
        path: "/fiscal/construction"
      },
      {
        id: "approval-workflow",
        label: "Approval Workflow",
        titleEn: "Approval Workflow",
        titleAr: "مسار الموافقات",
        icon: "Assignment",
        path: "/fiscal/approval-workflow"
      },
      {
        id: "validation-rules",
        label: "Validation Rules",
        titleEn: "Validation Rules",
        titleAr: "قواعد التحقق",
        icon: "Tune",
        path: "/fiscal/validation-rules"
      },
      {
        id: "reconciliation",
        label: "Reconciliation",
        titleEn: "Reconciliation",
        titleAr: "التسوية",
        icon: "Balance",
        path: "/fiscal/reconciliation"
      },
      {
        id: "audit-trail",
        label: "Audit Trail",
        titleEn: "Audit Trail",
        titleAr: "سجل التدقيق",
        icon: "Security",
        path: "/fiscal/audit-trail"
      },
      {
        id: "approvals-center",
        label: "Approvals Center",
        titleEn: "Approvals Center",
        titleAr: "مركز الموافقات",
        icon: "Assignment",
        path: "/fiscal/approvals"
      },
      {
        id: "opening-balance-import",
        label: "Opening Balance Import",
        titleEn: "Opening Balance Import",
        titleAr: "استيراد الأرصدة الافتتاحية",
        icon: "UploadFile",
        path: "/fiscal/opening-balance-import"
      },
      {
        id: "fiscal-year-dashboard",
        label: "Fiscal Year Dashboard",
        titleEn: "Fiscal Year Dashboard",
        titleAr: "لوحة السنة المالية",
        icon: "Dashboard",
        path: "/fiscal/dashboard"
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
