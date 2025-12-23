// Import polyfills first
import './polyfills'

// Import z-index fixes FIRST to ensure they apply globally
import './styles/z-index-fixes.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/performanceMetrics'
import App from './OptimizedApp.tsx'
import { initAuthCleanup } from './utils/authCleanup'
import { initErrorTracking } from './utils/errorTracking'
import { initWebVitals } from './utils/webVitals'
import { StyledEngineProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { CustomThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UserProfileProvider } from './contexts/UserProfileProvider'
import { FontPreferencesProvider } from './contexts/FontPreferencesProvider'
import { ScopeProvider } from './contexts/ScopeProvider'


import RtlCacheProvider from './contexts/RtlCacheProvider'
import { TourProvider, TourOverlay } from './tours'

// Optimized QueryClient for maximum performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time for better performance
      cacheTime: 10 * 60 * 1000, // 10 minutes cache time
      suspense: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <StyledEngineProvider injectFirst>
        <RtlCacheProvider>
          <FontPreferencesProvider>
            <CustomThemeProvider>
              <ToastProvider>
                <UserProfileProvider>
                  <ScopeProvider>
                    <TourProvider>
                      <App />
                      <TourOverlay />
                    </TourProvider>
                  </ScopeProvider>
                </UserProfileProvider>
              </ToastProvider>
            </CustomThemeProvider>
          </FontPreferencesProvider>
        </RtlCacheProvider>
      </StyledEngineProvider>
    </QueryClientProvider>
  </StrictMode>,
)

// Initialize auth cleanup for better performance
initAuthCleanup();

// Initialize error tracking and performance monitoring
initErrorTracking();
initWebVitals();

// Register service worker for caching and offline support
if (import.meta.env.PROD) {
  import('./utils/serviceWorker').then(({ registerSW }) => {
    registerSW();
  });
}
