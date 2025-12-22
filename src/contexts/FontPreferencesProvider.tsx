import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getUserFontPreferences,
  applyFontPreferencesToCSS,
  clearFontPreferencesCache,
  type FontPreferences,
} from '../services/font-preferences';
import { useAuth } from '../hooks/useAuth';
import {
  FontPreferencesContext,
  type FontPreferencesContextType,
} from './FontPreferencesContext';

interface FontPreferencesProviderProps {
  children: ReactNode;
}

export const FontPreferencesProvider: React.FC<FontPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<FontPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // Migrate legacy localStorage key to namespaced per-user key on first login
      try {
        const uid = (user as any)?.id || null;
        if (uid) {
          const nsKey = `font_prefs_v1/${uid}`;
          const hasNs = localStorage.getItem(nsKey);
          const legacy = localStorage.getItem('font_prefs_v1');
          if (!hasNs && legacy) {
            localStorage.setItem(nsKey, legacy);
            try {
              localStorage.removeItem('font_prefs_v1');
            } catch {}
          }
        }
      } catch {}
      const prefs = await getUserFontPreferences();
      setPreferences(prefs);
      applyFontPreferencesToCSS(prefs);
    } catch (err) {
      console.error('Error loading font preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load font preferences');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const applyPreferences = useCallback((prefs: FontPreferences) => {
    setPreferences(prefs);
    applyFontPreferencesToCSS(prefs);
    // Also persist locally so it sticks across reloads if server unavailable
    try {
      const key = `font_prefs_v1/${prefs.user_id || 'local'}`;
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {}
  }, []);

  // Load preferences when user changes
  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshPreferences();
    } else {
      // Clear preferences when user logs out
      setPreferences(null);
      setLoading(false);
      clearFontPreferencesCache();

      // Reset CSS to defaults
      const root = document.documentElement;
      root.style.removeProperty('--user-font-family');
      root.style.removeProperty('--user-font-size-scale');
      root.style.removeProperty('--user-line-height-scale');
      root.style.removeProperty('--user-font-weight');
      root.style.removeProperty('--user-letter-spacing-scale');
      root.style.removeProperty('--user-arabic-optimized');
      root.classList.remove('arabic-optimized');
      root.className = root.className.replace(/font-scale-\d+/g, '');
    }
  }, [user, refreshPreferences]);

  // Apply CSS overrides based on font preferences
  useEffect(() => {
    if (preferences) {
      // Create dynamic CSS for font scaling
      const existingStyle = document.getElementById('user-font-preferences');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'user-font-preferences';
      style.textContent = `
        /* User Font Preferences - Dynamic CSS */
        :root {
          --user-font-family: ${preferences.font_family};
          --user-font-size-scale: ${preferences.font_size_scale};
          --user-line-height-scale: ${preferences.line_height_scale};
          --user-font-weight: ${preferences.font_weight};
          --user-letter-spacing-scale: ${preferences.letter_spacing_scale};
          --user-arabic-optimized: ${preferences.is_arabic_optimized ? '1' : '0'};
        }

        /* Apply user font preferences to common elements */
        body,
        .MuiTypography-root,
        input,
        select,
        textarea,
        button {
          font-family: var(--user-font-family, var(--font-family)) !important;
          font-size: calc(1em * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.5 * var(--user-line-height-scale, 1)) !important;
          letter-spacing: calc(0.02em * (var(--user-letter-spacing-scale, 1) - 1)) !important;
        }

        /* Headers with appropriate scaling */
        h1, .MuiTypography-h1 {
          font-weight: var(--user-font-weight, 700) !important;
          font-size: calc(2.125rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.2 * var(--user-line-height-scale, 1)) !important;
        }

        h2, .MuiTypography-h2 {
          font-weight: var(--user-font-weight, 600) !important;
          font-size: calc(1.875rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.25 * var(--user-line-height-scale, 1)) !important;
        }

        h3, .MuiTypography-h3 {
          font-weight: var(--user-font-weight, 600) !important;
          font-size: calc(1.5rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.3 * var(--user-line-height-scale, 1)) !important;
        }

        h4, .MuiTypography-h4 {
          font-weight: var(--user-font-weight, 600) !important;
          font-size: calc(1.25rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.35 * var(--user-line-height-scale, 1)) !important;
        }

        h5, .MuiTypography-h5 {
          font-weight: var(--user-font-weight, 600) !important;
          font-size: calc(1.125rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.4 * var(--user-line-height-scale, 1)) !important;
        }

        h6, .MuiTypography-h6 {
          font-weight: var(--user-font-weight, 600) !important;
          font-size: calc(1rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.43 * var(--user-line-height-scale, 1)) !important;
        }

        /* Arabic optimization styles */
        .arabic-optimized {
          --ar-font-adjustment: 1.1;
        }

        .arabic-optimized p,
        .arabic-optimized .arabic-text,
        .arabic-optimized [dir="rtl"] {
          font-size: calc(1em * var(--user-font-size-scale, 1) * var(--ar-font-adjustment, 1)) !important;
          line-height: calc(1.6 * var(--user-line-height-scale, 1)) !important;
          letter-spacing: calc(0.01em * var(--user-letter-spacing-scale, 1)) !important;
        }

        /* Table and data display elements */
        .data-table,
        .table-cell,
        .MuiTableCell-root {
          font-size: calc(0.875rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.43 * var(--user-line-height-scale, 1)) !important;
        }

        /* Form elements */
        .form-field label,
        .MuiFormLabel-root {
          font-weight: var(--user-font-weight, 500) !important;
          font-size: calc(0.9rem * var(--user-font-size-scale, 1)) !important;
        }

        /* Button text */
        button,
        .MuiButton-root {
          font-weight: var(--user-font-weight, 500) !important;
          font-size: calc(0.875rem * var(--user-font-size-scale, 1)) !important;
          letter-spacing: calc(0.02em * var(--user-letter-spacing-scale, 1)) !important;
        }

        /* Small text and captions */
        small,
        .caption,
        .MuiTypography-caption {
          font-size: calc(0.75rem * var(--user-font-size-scale, 1)) !important;
          line-height: calc(1.43 * var(--user-line-height-scale, 1)) !important;
        }

        /* High contrast support */
        @media (prefers-contrast: high) {
          body, .MuiTypography-root {
            font-weight: bolder !important;
          }
        }

        /* Large text accessibility support */
        @media (prefers-reduced-motion: reduce) {
          * {
            transition: none !important;
            animation: none !important;
          }
        }
      `;

      document.head.appendChild(style);
    }
  }, [preferences]);

  const contextValue: FontPreferencesContextType = useMemo(() => ({
    preferences,
    loading,
    error,
    refreshPreferences,
    applyPreferences,
  }), [preferences, loading, error, refreshPreferences, applyPreferences]);

  return (
    <FontPreferencesContext.Provider value={contextValue}>
      {children}
    </FontPreferencesContext.Provider>
  );
};

export default FontPreferencesProvider;
