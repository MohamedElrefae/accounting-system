export interface User {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface StatCard {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string;
  value: string | number;
  change?: number;
  color?: string;
  trend?: {
    direction: "up" | "down";
    percentage: number;
  };
  icon?: string;
}

export interface Transaction {
  id: string;
  entry_number: string;
  entry_date: string;
  date?: string;
  description: string;
  amount: number;
  type?: "income" | "expense";
  category?: string;
  is_posted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

export interface NavigationItem {
  id: string;
  label: string;
  titleEn?: string;
  titleAr?: string;
  icon?: string;
  path?: string;
  requiredPermission?: string;
  superAdminOnly?: boolean;
  children?: NavigationItem[];
  badge?: {
    text: string;
    variant: "primary" | "secondary" | "success" | "warning" | "danger";
  };
}

export type Language = "en" | "ar";

export type ThemeMode = "light" | "dark";

export interface AppStore {
  user: User | null;
  language: Language;
  theme: ThemeMode;
  sidebarCollapsed?: boolean;
  notifications?: any[];
  companyName?: string;
  setUser: (user: User | null) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleLanguage?: () => void;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  toggleSidebar?: () => void;
}

export interface Organization {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  address?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  organization_id?: string;
  status: "active" | "inactive" | "completed";
  start_date?: string;
  end_date?: string;
  budget?: number;
  budget_amount?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
