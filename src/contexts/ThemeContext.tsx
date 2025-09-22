import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from '../styles/theme';
import type { ThemeMode } from '../types';
import useAppStore from '../store/useAppStore';
interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [forceRender, setForceRender] = useState(0);
  
  // Get language from the app store to stay synchronized
  const { language } = useAppStore();

  // Load theme preferences from localStorage on mount
  useEffect(() => {
    const savedThemeMode = localStorage.getItem('themeMode') as ThemeMode;
    
    if (savedThemeMode && (savedThemeMode === 'light' || savedThemeMode === 'dark')) {
      setThemeMode(savedThemeMode);
    }
  }, []);

  // Save theme preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // Force re-render when language changes to ensure theme updates
  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [language]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Keep a CSS data-theme attribute in sync for CSS variable tokens
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  // Create the Material-UI theme using our unified theme system
  // Include forceRender in dependencies to ensure recreation
  const theme = React.useMemo(() => {
    console.log('[ThemeContext] Creating theme with mode:', themeMode, 'language:', language, 'forceRender:', forceRender);
    const newTheme = createAppTheme(themeMode, language);
    console.log('[ThemeContext] Created theme direction:', newTheme.direction);
    return newTheme;
  }, [themeMode, language, forceRender]);

  // Sync MUI palette values into CSS custom properties for perfect parity
  useEffect(() => {
    const root = document.documentElement;
    const p = theme.palette as any;
    const mode = p?.mode || themeMode;
    const set = (name: string, value?: string) => {
      if (typeof value === 'string' && value.length) {
        root.style.setProperty(name, value);
      }
    };

    // Unified Color System tokens
    set('--background', p?.background?.default);
    set('--surface', p?.background?.paper);
    set('--border', p?.divider);
    set('--accent', p?.primary?.main);
    set('--text', p?.text?.primary);
    set('--muted_text', p?.text?.secondary);
    set('--heading', p?.text?.primary);
    set('--error', p?.error?.main);
    set('--success', p?.success?.main);
    set('--warning', p?.warning?.main);
    
    // Specific component tokens based on mode
    if (mode === 'dark') {
      set('--field_bg', p?.background?.paper);
      set('--selected_bg', '#343940');
      set('--sidebar_bg', '#22262A');
      set('--topbar_bg', p?.background?.paper);
      set('--button_bg', p?.primary?.main);
      set('--button_text', '#FFFFFF');
      set('--table_header_bg', '#22262A');
      set('--table_row_bg', p?.background?.paper);
      set('--modal_bg', p?.background?.paper);
      set('--active_tab_bg', '#343940');
      set('--overlay_background', 'rgba(0, 0, 0, 0.6)');
    } else {
      set('--field_bg', '#F1F3F7');
      set('--selected_bg', '#E4EAFE');
      set('--sidebar_bg', '#FFFFFF');
      set('--topbar_bg', p?.background?.default);
      set('--button_bg', p?.primary?.main);
      set('--button_text', '#FFFFFF');
      set('--table_header_bg', '#F1F3F7');
      set('--table_row_bg', '#FFFFFF');
      set('--modal_bg', '#FFFFFF');
      set('--active_tab_bg', '#E4EAFE');
      set('--overlay_background', 'rgba(0, 0, 0, 0.4)');
    }

    // Legacy aliases for backward compatibility
    set('--accent-primary', p?.primary?.main);
    set('--accent-primary-hover', p?.primary?.dark || p?.primary?.main);
    set('--content-bg', p?.background?.paper);
    set('--text-primary', p?.text?.primary);
    set('--text-secondary', p?.text?.secondary);
    set('--border-color', p?.divider);
    set('--border-light', p?.divider);
    set('--primary-blue', p?.primary?.main);
    
    try {
      const onAccent = p?.getContrastText ? p.getContrastText(p?.primary?.main) : undefined;
      set('--on-accent', onAccent || '#ffffff');
    } catch {
      set('--on-accent', '#ffffff');
    }

    // Status colors
    set('--success-strong', p?.success?.dark || p?.success?.main);
    set('--warning-strong', p?.warning?.dark || p?.warning?.main);
    set('--error-strong', p?.error?.dark || p?.error?.main);
    set('--info', p?.info?.main);
    set('--info-strong', p?.info?.dark || p?.info?.main);

    // Interaction states
    set('--hover-bg', p?.action?.hover || (mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'));
    set('--chip-bg', p?.action?.selected || (mode === 'dark' ? 'rgba(255,255,255,0.10)' : '#e5e7eb'));
    set('--row-alt-bg', p?.action?.selected || (mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f7fafc'));
    set('--info-bg', mode === 'dark' ? 'rgba(32, 118, 255, 0.08)' : 'rgba(32, 118, 255, 0.08)');

    // Layout and Control System tokens
    // Shape/radius
    set('--radius-sm', '8px');
    set('--radius-md', '12px');
    set('--radius-lg', '16px');
    set('--radius-xl', '20px');

    // Shadows
    set('--shadow-sm', '0 1px 3px rgba(0,0,0,0.08)');
    set('--shadow-md', '0 4px 12px rgba(0,0,0,0.12)');
    set('--shadow-lg', '0 10px 24px rgba(0,0,0,0.16)');

    // Controls sizing
    set('--control-height', '40px');
    set('--control-gap', '12px');
    set('--section-gap', '16px');
    set('--toolbar-gap', '24px');

    // Containers
    set('--container-max', '1600px');
    set('--content-padding', '16px');

    // ControlBar colors
    set('--controlbar-bg', p?.background?.paper);
    set('--controlbar-border', p?.divider);
  }, [theme, themeMode]);

  const contextValue: ThemeContextType = {
    themeMode,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider');
  }
  return context;
};
