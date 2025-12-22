import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppStore, User, Language, ThemeMode } from '../types';

const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      language: 'ar',
      theme: 'dark',
      demoMode: false,
      sidebarCollapsed: false,
      notifications: [],
      companyName: 'Accounting Pro',
      user: null,

      // Actions
      setLanguage: (language: Language) => {
        set({ language });
        // Update document direction and lang attribute
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
      },

      setTheme: (theme: ThemeMode) => set({ theme }),

      setDemoMode: (demoMode: boolean) => set({ demoMode }),

      toggleDemoMode: () => {
        const { demoMode } = get()
        set({ demoMode: !demoMode })
      },

      setSidebarCollapsed: (sidebarCollapsed: boolean) => set({ sidebarCollapsed }),

      setUser: (user: User | null) => set({ user }),

      toggleTheme: () => {
        const { theme } = get();
        set({ theme: theme === 'light' ? 'dark' : 'light' });
      },

      toggleLanguage: () => {
        const { language } = get();
        const newLanguage = language === 'en' ? 'ar' : 'en';
        
        // Force a complete state update to ensure re-renders
        set((state) => {
          return {
            ...state,
            language: newLanguage
          };
        });
        
        // Update document direction
        document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLanguage;
      },

      toggleSidebar: () => {
        const { sidebarCollapsed } = get();
        set({ sidebarCollapsed: !sidebarCollapsed });
      },
    }),
    {
      name: 'accounting-app-store',
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        demoMode: state.demoMode,
        sidebarCollapsed: state.sidebarCollapsed,
        notifications: state.notifications,
        companyName: state.companyName,
        user: state.user,
      }),
    }
  )
);

export default useAppStore;
