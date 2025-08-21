// Theme configuration types
export interface FontConfig {
  primary: string;
  secondary: string;
  monospace: string;
  arabic: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: {
    default: string;
    paper: string;
    surface: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  divider: string;
}

export interface TypographyScale {
  h1: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  h2: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  h3: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  h4: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  h5: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  h6: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  body1: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  body2: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  caption: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
  };
  button: {
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: string;
    textTransform: string;
  };
}

export interface CustomTheme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  fonts: FontConfig;
  colors: ColorPalette;
  typography: TypographyScale;
  borderRadius: number;
  spacing: number;
  language: 'en' | 'ar' | 'mixed';
  direction: 'ltr' | 'rtl';
}

// Predefined theme presets
export const FONT_PRESETS = {
  windows_professional: {
    primary: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    secondary: '"Segoe UI", Tahoma, sans-serif',
    monospace: 'Consolas, "Courier New", monospace',
    arabic: '"Segoe UI", Tahoma, Arial, sans-serif'
  },
  modern_clean: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    secondary: '"Inter", sans-serif',
    monospace: '"JetBrains Mono", "Fira Code", monospace',
    arabic: '"Inter", "Noto Sans Arabic", sans-serif'
  },
  classic_professional: {
    primary: '"Times New Roman", Georgia, serif',
    secondary: 'Arial, Helvetica, sans-serif',
    monospace: '"Courier New", Courier, monospace',
    arabic: 'Arial, "Traditional Arabic", sans-serif'
  },
  tech_modern: {
    primary: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    secondary: '"Roboto", sans-serif',
    monospace: '"Roboto Mono", monospace',
    arabic: '"Roboto", "Noto Sans Arabic", sans-serif'
  }
} as const;

export const COLOR_PRESETS = {
  corporate_blue: {
    primary: '#1976d2',
    secondary: '#dc004e',
    accent: '#ed6c02',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      surface: '#f5f5f5'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)'
    },
    divider: 'rgba(0, 0, 0, 0.12)'
  },
  corporate_green: {
    primary: '#2e7d32',
    secondary: '#1976d2',
    accent: '#ed6c02',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      surface: '#f5f5f5'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)'
    },
    divider: 'rgba(0, 0, 0, 0.12)'
  },
  professional_gray: {
    primary: '#424242',
    secondary: '#1976d2',
    accent: '#ff9800',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    background: {
      default: '#fafafa',
      paper: '#ffffff',
      surface: '#f5f5f5'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)'
    },
    divider: 'rgba(0, 0, 0, 0.12)'
  },
  dark_professional: {
    primary: '#90caf9',
    secondary: '#f48fb1',
    accent: '#ffb74d',
    success: '#81c784',
    warning: '#ffb74d',
    error: '#ef5350',
    info: '#64b5f6',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
      surface: '#2d2d2d'
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)'
    },
    divider: 'rgba(255, 255, 255, 0.12)'
  }
} as const;

// Professional typography scale matching your requirements
export const TYPOGRAPHY_PRESETS = {
  professional: {
    h1: { fontSize: '2.125rem', fontWeight: 300, lineHeight: 1.167, letterSpacing: '-0.01562em' },
    h2: { fontSize: '1.5rem', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.00833em' },
    h3: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.167, letterSpacing: '0em' },
    h4: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.235, letterSpacing: '0.00735em' },
    h5: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.334, letterSpacing: '0em' },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.6, letterSpacing: '0.0075em' },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.00938em' },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.43, letterSpacing: '0.01071em' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.66, letterSpacing: '0.03333em' },
    button: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.75, letterSpacing: '0.02857em', textTransform: 'uppercase' }
  },
  compact: {
    h1: { fontSize: '1.875rem', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.01562em' },
    h2: { fontSize: '1.375rem', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.00833em' },
    h3: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.2, letterSpacing: '0em' },
    h4: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.2, letterSpacing: '0.00735em' },
    h5: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.3, letterSpacing: '0em' },
    h6: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.0075em' },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.4, letterSpacing: '0.00938em' },
    body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.4, letterSpacing: '0.01071em' },
    caption: { fontSize: '0.6875rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.03333em' },
    button: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.6, letterSpacing: '0.02857em', textTransform: 'uppercase' }
  },
  readable: {
    h1: { fontSize: '2.5rem', fontWeight: 300, lineHeight: 1.167, letterSpacing: '-0.01562em' },
    h2: { fontSize: '1.75rem', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.00833em' },
    h3: { fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.167, letterSpacing: '0em' },
    h4: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.235, letterSpacing: '0.00735em' },
    h5: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.334, letterSpacing: '0em' },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.6, letterSpacing: '0.0075em' },
    body1: { fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.00938em' },
    body2: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.43, letterSpacing: '0.01071em' },
    caption: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.66, letterSpacing: '0.03333em' },
    button: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.75, letterSpacing: '0.02857em', textTransform: 'uppercase' }
  }
} as const;
