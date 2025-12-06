// ============================================
// FISCAL SYSTEM LOGGING
// ============================================

const isProduction = import.meta.env?.PROD ?? false
const enableDebug = !isProduction || (typeof localStorage !== 'undefined' && localStorage.getItem('FISCAL_DEBUG') === 'true')

export const fiscalLogger = {
  debug: (action: string, data?: unknown) => {
    if (enableDebug) {
      console.log(`[FISCAL:DEBUG] ${action}`, data ?? '')
    }
  },

  info: (action: string, data?: unknown) => {
    console.log(`[FISCAL:INFO] ${action}`, data ?? '')
  },

  warn: (action: string, data?: unknown) => {
    console.warn(`[FISCAL:WARN] ${action}`, data ?? '')
  },

  error: (action: string, error: unknown) => {
    console.error(`[FISCAL:ERROR] ${action}`, error)
    
    // Send to error tracking service if available
    if (isProduction && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(`Fiscal: ${action}`), {
        extra: { error },
      })
    }
  },
}
