// Enterprise UI theme tokens for consistent look & feel across pages and services
// These tokens can be consumed by MUI theme configuration or directly in components

export const tokens = {
  palette: {
    primary: {
      main: '#2E7D32', // earth green
      light: '#60AD5E',
      dark: '#005005',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#6D4C41', // brown
      light: '#9C786C',
      dark: '#40241A',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#1565C0',
      light: '#5E92F3',
      dark: '#003C8F',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2E7D32',
      light: '#60AD5E',
      dark: '#005005',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#ED6C02',
      light: '#FF9800',
      dark: '#E65100',
      contrastText: '#000000',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F7F7F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#4B5563',
      disabled: '#9CA3AF',
    },
    divider: '#E5E7EB',
  },
  spacing: (factor: number) => `${factor * 8}px`,
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
  },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.06)',
    panel: '0 4px 16px rgba(0,0,0,0.08)',
  },
  layout: {
    pageMaxWidth: 1400,
    contentGutter: 24,
  },
} as const