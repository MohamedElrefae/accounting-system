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

// Light theme (Professional Light)
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2c3e50',
      light: '#34495e',
      dark: '#1a252f',
    },
    secondary: {
      main: '#3498db',
    },
    background: {
      default: '#ecf0f1',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
  },
  ...commonTheme,
});

// Dark theme (Professional Dark - matching reference)
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4A90E2',
      light: '#6BA3E7',
      dark: '#357ABD',
    },
    secondary: {
      main: '#50C878',
    },
    background: {
      default: '#1E2329',
      paper: '#252A31',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8A9099',
    },
    divider: '#3A3F47',
    action: {
      hover: 'rgba(74, 144, 226, 0.08)',
      selected: 'rgba(74, 144, 226, 0.12)',
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
