import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
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
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
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

    // Core brand and text
    set('--accent-primary', p?.primary?.main);
    set('--accent-primary-hover', p?.primary?.dark || p?.primary?.main);
    try {
      const onAccent = p?.getContrastText ? p.getContrastText(p?.primary?.main) : undefined;
      set('--on-accent', onAccent || (mode === 'dark' ? '#ffffff' : '#ffffff'));
    } catch {
      set('--on-accent', mode === 'dark' ? '#ffffff' : '#ffffff');
    }

    // Surfaces and backgrounds
    set('--background', p?.background?.default);
    set('--surface', p?.background?.paper);
    set('--content-bg', p?.background?.paper);

    // Text
    set('--text-primary', p?.text?.primary);
    set('--text-secondary', p?.text?.secondary);

    // Borders
    set('--border-color', p?.divider || (mode === 'dark' ? '#3A3F47' : '#dfe6ea'));
    set('--border-light', p?.divider || (mode === 'dark' ? '#374151' : '#e5e7eb'));

    // Status colors
    set('--success', p?.success?.main);
    set('--success-strong', p?.success?.dark || p?.success?.main);
    set('--warning', p?.warning?.main);
    set('--warning-strong', p?.warning?.dark || p?.warning?.main);
    set('--error', p?.error?.main);
    set('--error-strong', p?.error?.dark || p?.error?.main);
    set('--info', p?.info?.main);
    set('--info-strong', p?.info?.dark || p?.info?.main);

    // Interaction states
    set('--hover-bg', p?.action?.hover || (mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'));
    set('--chip-bg', p?.action?.selected || (mode === 'dark' ? 'rgba(255,255,255,0.10)' : '#e5e7eb'));
    set('--row-alt-bg', p?.action?.selected || (mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f7fafc'));
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

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};
