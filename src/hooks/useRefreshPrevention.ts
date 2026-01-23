import { useEffect, useRef } from 'react';

interface RefreshPreventionOptions {
  preventOnError?: boolean;
  preventOnLanguageChange?: boolean;
  preventOnDataUpdate?: boolean;
  maxErrorRetries?: number;
}

/**
 * Hook to prevent unnecessary page refreshes and provide alternative solutions
 */
export const useRefreshPrevention = (options: RefreshPreventionOptions = {}) => {
  const {
    preventOnError = true,
    preventOnLanguageChange = true,
    preventOnDataUpdate = true,
    maxErrorRetries = 3
  } = options;

  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);

  // Prevent page refresh on unhandled errors
  useEffect(() => {
    if (!preventOnError) return;

    const handleError = (event: ErrorEvent) => {
      const now = Date.now();
      
      // Reset error count if it's been more than 5 minutes since last error
      if (now - lastErrorTimeRef.current > 5 * 60 * 1000) {
        errorCountRef.current = 0;
      }
      
      errorCountRef.current++;
      lastErrorTimeRef.current = now;
      
      // Only prevent refresh if we haven't exceeded max retries
      if (errorCountRef.current <= maxErrorRetries) {
        console.warn(`[RefreshPrevention] Preventing page refresh due to error (${errorCountRef.current}/${maxErrorRetries})`);
        event.preventDefault();
        
        // Dispatch custom event for error handling
        window.dispatchEvent(new CustomEvent('preventedRefresh', {
          detail: { 
            reason: 'error',
            errorCount: errorCountRef.current,
            maxRetries: maxErrorRetries
          }
        }));
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [preventOnError, maxErrorRetries]);

  // Prevent refresh on language changes
  useEffect(() => {
    if (!preventOnLanguageChange) return;

    const handleLanguageChange = (event: CustomEvent) => {
      console.log('[RefreshPrevention] Language changed, updating UI without refresh');
      
      // Update document direction
      const newLang = event.detail?.language;
      if (newLang) {
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
      }
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
  }, [preventOnLanguageChange]);

  // Provide alternative refresh methods
  const softRefresh = () => {
    // Trigger React re-render without page reload
    window.dispatchEvent(new CustomEvent('softRefresh'));
  };

  const hardRefresh = () => {
    // Only allow hard refresh if really necessary
    console.warn('[RefreshPrevention] Performing hard refresh as last resort');
    window.location.reload();
  };

  const resetErrorCount = () => {
    errorCountRef.current = 0;
    lastErrorTimeRef.current = 0;
  };

  return {
    softRefresh,
    hardRefresh,
    resetErrorCount,
    errorCount: errorCountRef.current,
    canHardRefresh: errorCountRef.current > maxErrorRetries
  };
};

export default useRefreshPrevention;