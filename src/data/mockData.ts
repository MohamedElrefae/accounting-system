import type { StatCard, Transaction, User, ChartData } from "../types";

export const user: User = {
  id: "1",
  name: "Ahmad Mohamed",
  email: "ahmad@example.com",
  full_name: "Ahmad Mohamed",
  role: "admin",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z"
};

export const statCards: StatCard[] = [
  {
    id: "revenue",
    title: "Total Revenue", 
    titleEn: "Total Revenue",
    titleAr: "إجمالي الإيرادات",
    value: "125,420 ر.س",
    change: 12.5,
    icon: "trending-up",
    color: "success"
  },
  {
    id: "expenses", 
    title: "Total Expenses",
    titleEn: "Total Expenses", 
    titleAr: "إجمالي المصروفات",
    value: "89,320 ر.س",
    change: -5.2,
    icon: "trending-down",
    color: "error"
  },
  {
    id: "profit",
    title: "Net Profit", 
    titleEn: "Net Profit",
    titleAr: "صافي الربح", 
    value: "36,100 ر.س",
    change: 8.3,
    icon: "dollar-sign",
    color: "primary"
  },
  {
    id: "pending",
    title: "Pending Invoices",
    titleEn: "Pending Invoices",
    titleAr: "الفواتير المعلقة",
    value: "23",
    change: -2.1,
    icon: "clock",
    color: "warning"
  }
];

export const transactions: Transaction[] = [
  {
    id: "1",
    entry_number: "JE-202401-001",
    entry_date: "2024-01-20",
    date: "2024-01-20", 
    description: "مبيعات نقدية",
    amount: 15000,
    type: "income",
    category: "Sales",
    is_posted: true,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z"
  },
  {
    id: "2", 
    entry_number: "JE-202401-002",
    entry_date: "2024-01-19",
    date: "2024-01-19",
    description: "مشتريات مواد خام",
    amount: 8500,
    type: "expense", 
    category: "Purchases",
    is_posted: true,
    created_at: "2024-01-19T00:00:00Z",
    updated_at: "2024-01-19T00:00:00Z"
  },
  {
    id: "3",
    entry_number: "JE-202401-003", 
    entry_date: "2024-01-19",
    date: "2024-01-19",
    description: "رواتب موظفين",
    amount: 25000,
    type: "expense",
    category: "Salaries", 
    is_posted: false,
    created_at: "2024-01-19T00:00:00Z",
    updated_at: "2024-01-19T00:00:00Z"
  },
  {
    id: "4",
    entry_number: "JE-202401-004",
    entry_date: "2024-01-18", 
    date: "2024-01-18",
    description: "خدمات استشارية",
    amount: 12000,
    type: "income",
    category: "Services",
    is_posted: true,
    created_at: "2024-01-18T00:00:00Z", 
    updated_at: "2024-01-18T00:00:00Z"
  },
  {
    id: "5",
    entry_number: "JE-202401-005",
    entry_date: "2024-01-18",
    date: "2024-01-18", 
    description: "مصاريف مكتب",
    amount: 3500,
    type: "expense",
    category: "Office Expenses",
    is_posted: true,
    created_at: "2024-01-18T00:00:00Z",
    updated_at: "2024-01-18T00:00:00Z"
  }
];

// Chart data
export const monthlyRevenueData: ChartData = {
  labels: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"],
  datasets: [
    {
      label: "الإيرادات",
      data: [125420, 138950, 142300, 156800, 165200, 178900],
      backgroundColor: "#4f46e5",
      borderColor: "#4f46e5"
    },
    {
      label: "المصروفات",
      data: [89320, 95250, 98100, 105200, 112300, 118900],
      backgroundColor: "#ef4444",
      borderColor: "#ef4444"
    }
  ]
};

export const expenseBreakdown: ChartData = {
  labels: ["الرواتب", "المشتريات", "الإيجار", "الكهرباء", "أخرى"],
  datasets: [
    {
      label: "المصروفات",
      data: [45000, 32000, 15000, 8000, 12000],
      backgroundColor: [
        "#ef4444",
        "#f97316", 
        "#eab308",
        "#22c55e",
        "#3b82f6"
      ]
    }
  ]
};

// Missing exports for backward compatibility
export const dashboardStats = statCards;
export const recentTransactions = transactions;

// Translation object
export const translations = {
  en: {
    welcome: "Welcome",
    goodMorning: "Good Morning", 
    goodAfternoon: "Good Afternoon",
    goodEvening: "Good Evening",
    dashboard: "Dashboard",
    recentTransactions: "Recent Transactions",
    monthlyRevenue: "Monthly Revenue",
    expenseBreakdown: "Expense Breakdown",
    viewAll: "View All",
    totalRevenue: "Total Revenue",
    totalExpenses: "Total Expenses", 
    netProfit: "Net Profit",
    pendingInvoices: "Pending Invoices",
    income: "Income",
    expense: "Expense",
    sales: "Sales",
    purchases: "Purchases",
    salaries: "Salaries",
    services: "Services",
    officeExpenses: "Office Expenses",
    english: "English",
    arabic: "Arabic"
  },
  ar: {
    welcome: "أهلاً وسهلاً",
    goodMorning: "صباح الخير",
    goodAfternoon: "مساء الخير", 
    goodEvening: "مساء الخير",
    dashboard: "لوحة التحكم",
    recentTransactions: "المعاملات الأخيرة",
    monthlyRevenue: "الإيرادات الشهرية",
    expenseBreakdown: "تفصيل المصروفات",
    viewAll: "عرض الكل",
    totalRevenue: "إجمالي الإيرادات",
    totalExpenses: "إجمالي المصروفات",
    netProfit: "صافي الربح", 
    pendingInvoices: "الفواتير المعلقة",
    income: "دخل",
    expense: "مصروف",
    sales: "مبيعات",
    purchases: "مشتريات",
    salaries: "رواتب",
    services: "خدمات",
    officeExpenses: "مصاريف مكتبية",
    english: "English",
    arabic: "العربية"
  }
};

// Additional missing translation keys
export const additionalTranslations = {
  en: {
    notifications: "Notifications",
    profile: "Profile", 
    settings: "Settings",
    logout: "Logout",
    date: "Date",
    description: "Description", 
    category: "Category",
    type: "Type",
    amount: "Amount"
  },
  ar: {
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    settings: "الإعدادات", 
    logout: "تسجيل الخروج",
    date: "التاريخ",
    description: "الوصف",
    category: "الفئة",
    type: "النوع",
    amount: "المبلغ"
  }
};

// Merge with existing translations
export const mergedTranslations = {
  en: { ...translations.en, ...additionalTranslations.en },
  ar: { ...translations.ar, ...additionalTranslations.ar }
};

