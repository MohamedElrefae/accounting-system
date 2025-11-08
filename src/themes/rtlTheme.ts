import { createTheme } from '@mui/material/styles'
import type { Theme, ThemeOptions } from '@mui/material/styles'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import { ArabicLanguageService } from '@/services/ArabicLanguageService'

// RTL-aware colors for construction accounting
const constructionColors = {
  primary: {
    main: '#1976d2', // Construction blue
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#fff'
  },
  secondary: {
    main: '#ff9800', // Construction orange
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#fff'
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#fff'
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#fff'
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#fff'
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#fff'
  }
}

// Arabic typography configuration
const arabicTypography = {
  fontFamily: [
    // Arabic fonts
    'Noto Sans Arabic',
    'Cairo',
    'Amiri',
    'Scheherazade New',
    // Fallback Latin fonts
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif'
  ].join(','),
  
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: 0
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: 0
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: 0
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: 0
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: 0
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
    letterSpacing: 0
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    letterSpacing: 0
  }
}

// Enhanced theme for construction fiscal management
const getConstructionTheme = (isRTL: boolean): ThemeOptions => ({
  direction: isRTL ? 'rtl' : 'ltr',
  
  palette: {
    mode: 'light',
    ...constructionColors,
    background: {
      default: '#fafafa',
      paper: '#ffffff'
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121'
    }
  },

  typography: arabicTypography,

  spacing: 8,

  shape: {
    borderRadius: 12 // More modern rounded corners
  },

  components: {
    // Global CSS baseline
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          direction: isRTL ? 'rtl' : 'ltr',
          fontFamily: arabicTypography.fontFamily,
          fontSize: '14px',
          lineHeight: 1.6,
          backgroundColor: '#fafafa'
        },
        '*': {
          boxSizing: 'border-box'
        },
        html: {
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }
    },

    // AppBar with RTL support
    MuiAppBar: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(0,0,0,0.08)'
        }
      }
    },

    // Toolbar with RTL spacing
    MuiToolbar: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          minHeight: '64px !important',
          padding: isRTL ? '0 16px 0 24px' : '0 24px 0 16px'
        }
      }
    },

    // Card with construction-themed styling
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }
        }
      }
    },

    // CardContent with RTL padding
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          direction: isRTL ? 'rtl' : 'ltr',
          '&:last-child': {
            paddingBottom: '24px'
          }
        }
      }
    },

    // Button with enhanced styling
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          padding: '10px 24px',
          direction: isRTL ? 'rtl' : 'ltr',
          transition: 'all 0.3s ease'
        },
        contained: {
          boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            transform: 'translateY(-1px)'
          }
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            transform: 'translateY(-1px)'
          }
        }
      }
    },

    // IconButton with RTL awareness
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '12px',
          borderRadius: '50%',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.08)',
            transform: 'scale(1.1)'
          }
        }
      }
    },

    // TextField with RTL support
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            direction: isRTL ? 'rtl' : 'ltr',
            borderRadius: 12
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderWidth: '2px'
            },
            '&:hover fieldset': {
              borderColor: constructionColors.primary.light
            },
            '&.Mui-focused fieldset': {
              borderColor: constructionColors.primary.main,
              borderWidth: '2px'
            }
          }
        }
      }
    },

    // FormControl with RTL
    MuiFormControl: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }
    },

    // InputLabel with RTL positioning
    MuiInputLabel: {
      styleOverrides: {
        root: {
          transformOrigin: isRTL ? 'top right' : 'top left',
          textAlign: isRTL ? 'right' : 'left',
          right: isRTL ? '14px' : 'auto',
          left: isRTL ? 'auto' : '14px'
        },
        shrink: {
          transformOrigin: isRTL ? 'top right' : 'top left'
        }
      }
    },

    // Select with RTL support
    MuiSelect: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        },
        icon: {
          right: isRTL ? 'auto' : '7px',
          left: isRTL ? '7px' : 'auto'
        }
      }
    },

    // MenuItem with RTL
    MuiMenuItem: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
          paddingRight: isRTL ? '16px' : '24px',
          paddingLeft: isRTL ? '24px' : '16px'
        }
      }
    },

    // Table components with RTL
    MuiTableCell: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left'
        },
        head: {
          fontWeight: 700,
          backgroundColor: 'rgba(0,0,0,0.04)',
          borderBottom: '2px solid rgba(0,0,0,0.1)'
        }
      }
    },

    // Dialog with RTL support
    MuiDialog: {
      styleOverrides: {
        paper: {
          direction: isRTL ? 'rtl' : 'ltr',
          borderRadius: 20,
          padding: '8px'
        }
      }
    },

    // DialogTitle with RTL
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left',
          fontWeight: 700,
          fontSize: '1.5rem',
          padding: '24px 24px 16px 24px'
        }
      }
    },

    // DialogContent with RTL
    MuiDialogContent: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          padding: '16px 24px'
        }
      }
    },

    // DialogActions with RTL button alignment
    MuiDialogActions: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
          padding: '16px 24px 24px 24px',
          '& > * + *': {
            marginLeft: isRTL ? 0 : '8px',
            marginRight: isRTL ? '8px' : 0
          }
        }
      }
    },

    // Stepper with RTL support
    MuiStepper: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }
    },

    // Step with RTL
    MuiStep: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }
    },

    // StepLabel with RTL text alignment
    MuiStepLabel: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        },
        label: {
          textAlign: isRTL ? 'right' : 'left'
        }
      }
    },

    // Alert with RTL support
    MuiAlert: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          borderRadius: 12
        },
        message: {
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left'
        }
      }
    },

    // Chip with RTL support
    MuiChip: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          borderRadius: 16
        },
        deleteIcon: {
          marginRight: isRTL ? '5px' : '-6px',
          marginLeft: isRTL ? '-6px' : '5px'
        }
      }
    },

    // Typography with RTL text alignment
    MuiTypography: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }
    },

    // List components with RTL
    MuiListItem: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr',
          paddingRight: isRTL ? '16px' : '24px',
          paddingLeft: isRTL ? '24px' : '16px'
        }
      }
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '48px',
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
          marginRight: isRTL ? 0 : '16px',
          marginLeft: isRTL ? '16px' : 0
        }
      }
    },

    MuiListItemText: {
      styleOverrides: {
        root: {
          textAlign: isRTL ? 'right' : 'left'
        }
      }
    },

    // Breadcrumbs with RTL
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        },
        separator: {
          transform: isRTL ? 'rotate(180deg)' : 'none'
        }
      }
    },

    // Tabs with RTL support
    MuiTabs: {
      styleOverrides: {
        root: {
          direction: isRTL ? 'rtl' : 'ltr'
        }
      }
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          borderRadius: '12px 12px 0 0'
        }
      }
    }
  }
})

// Theme factory
export const createRTLTheme = (language: 'ar' | 'en' = 'en'): Theme => {
  const isRTL = language === 'ar'
  const themeOptions = getConstructionTheme(isRTL)
  
  return createTheme(themeOptions)
}

// Theme hook for components
export const useRTLTheme = (): Theme => {
  const currentLanguage = ArabicLanguageService.getCurrentLanguage()
  return createRTLTheme(currentLanguage as 'ar' | 'en')
}

// CSS-in-JS plugins for RTL
export const rtlCache = {
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin]
}

export const ltrCache = {
  key: 'mui',
  stylisPlugins: [prefixer]
}

// Helper function to get appropriate cache
export const getEmotionCache = (isRTL: boolean) => {
  return isRTL ? rtlCache : ltrCache
}

// Construction-specific theme utilities
export const constructionThemeUtils = {
  // Project status colors
  projectStatus: {
    planning: '#2196f3',
    active: '#4caf50',
    onHold: '#ff9800',
    completed: '#9c27b0',
    cancelled: '#f44336'
  },
  
  // Budget status colors
  budgetStatus: {
    underBudget: '#4caf50',
    onBudget: '#2196f3',
    overBudget: '#f44336',
    warning: '#ff9800'
  },
  
  // Construction phase colors
  phases: {
    design: '#9c27b0',
    foundation: '#795548',
    structure: '#607d8b',
    finishing: '#ff9800',
    handover: '#4caf50'
  },
  
  // Financial period status
  periodStatus: {
    draft: '#9e9e9e',
    active: '#4caf50',
    closed: '#f44336',
    locked: '#424242'
  }
}

export default createRTLTheme