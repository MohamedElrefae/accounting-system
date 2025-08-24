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
