/**
 * Loading state management utilities to prevent infinite loading loops
 */

let loadingTimeout: NodeJS.Timeout | null = null;
let authStateStable = false;

/**
 * Prevent infinite loading by setting a maximum loading time
 */
export const setLoadingTimeout = (callback: () => void, maxTime = 10000) => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
  }
  
  loadingTimeout = setTimeout(() => {
    console.warn('Loading timeout reached, forcing completion');
    callback();
    authStateStable = true;
  }, maxTime);
};

/**
 * Clear loading timeout when loading completes normally
 */
export const clearLoadingTimeout = () => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
  authStateStable = true;
};

/**
 * Check if auth state is stable (not in loading loop)
 */
export const isAuthStateStable = () => authStateStable;

/**
 * Reset auth state stability (use when starting new auth flow)
 */
export const resetAuthStability = () => {
  authStateStable = false;
  clearLoadingTimeout();
};

/**
 * Debounce function to prevent rapid state changes
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default {
  setLoadingTimeout,
  clearLoadingTimeout,
  isAuthStateStable,
  resetAuthStability,
  debounce
};