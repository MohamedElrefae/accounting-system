import { createTheme, type Theme } from '@mui/material/styles';
import type { Language, ThemeMode } from '../types';

// Common theme overrides
const commonTheme = {
  typography: {
    fontFamily: '"Segoe UI", "Tahoma", "Geneva", "Verdana", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.125rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.875rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.43,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
  },
};

// Light theme (Unified Color System)
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2076FF', // accent
      light: '#4A90FF',
      dark: '#1A5FE6',
    },
    secondary: {
      main: '#21C197', // success
    },
    background: {
      default: '#F5F6FA', // background
      paper: '#FFFFFF',   // surface
    },
    text: {
      primary: '#181C23',   // text
      secondary: '#70778A', // muted_text
    },
    divider: '#E2E6ED',    // border
    error: {
      main: '#DE3F3F',
      light: '#FF6B6B',
      dark: '#C53030',
    },
    warning: {
      main: '#FFC048',
      light: '#FFD369',
      dark: '#F6A000',
    },
    success: {
      main: '#21C197',
      light: '#4ED4A8',
      dark: '#16A085',
    },
    info: {
      main: '#2076FF',
      light: '#4A90FF',
      dark: '#1A5FE6',
    },
  },
  ...commonTheme,
});

// Dark theme (Unified Color System)
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2076FF', // accent
      light: '#4A90FF',
      dark: '#1A5FE6',
    },
    secondary: {
      main: '#21C197', // success
    },
    background: {
      default: '#181A20', // background
      paper: '#23272F',   // surface
    },
    text: {
      primary: '#EDEDED',   // text
      secondary: '#8D94A2', // muted_text
    },
    divider: '#393C43',    // border
    error: {
      main: '#DE3F3F',
      light: '#FF6B6B',
      dark: '#C53030',
    },
    warning: {
      main: '#FFC048',
      light: '#FFD369',
      dark: '#F6A000',
    },
    success: {
      main: '#21C197',
      light: '#4ED4A8',
      dark: '#16A085',
    },
    info: {
      main: '#2076FF',
      light: '#4A90FF',
      dark: '#1A5FE6',
    },
    action: {
      hover: 'rgba(32, 118, 255, 0.08)',
      selected: 'rgba(32, 118, 255, 0.12)',
    },
  },
  ...commonTheme,
});

// RTL theme configuration
export const createAppTheme = (mode: ThemeMode, language: Language): Theme => {
  const baseTheme = mode === 'light' ? lightTheme : darkTheme;
  
  return createTheme({
    ...baseTheme,
    direction: language === 'ar' ? 'rtl' : 'ltr',
    typography: {
      ...baseTheme.typography,
      fontFamily: language === 'ar' 
        ? '"Segoe UI", "Tahoma", "Arial", sans-serif'
        : '"Segoe UI", "Tahoma", "Geneva", "Verdana", sans-serif',
    },
  });
};

export { lightTheme, darkTheme };
