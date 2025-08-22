export type Language = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface NavigationItem {
  id: string;
  titleEn: string;
  titleAr: string;
  icon: string;
  path?: string;
  children?: NavigationItem[];
  badge?: number;
  superAdminOnly?: boolean;
}

export interface StatCard {
  id: string;
  titleEn: string;
  titleAr: string;
  value: string;
  change: number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'error';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  account: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }>;
}

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  notifications: boolean;
  companyName: string;
}

export interface AppStore extends AppSettings {
  user: User | null;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  toggleSidebar: () => void;
}
