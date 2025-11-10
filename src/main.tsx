// Import polyfills first
import './polyfills'

import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './OptimizedApp.tsx'
import { initAuthCleanup } from './utils/authCleanup'
import { StyledEngineProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { AuthProvider } from './contexts/AuthContext'
import { CustomThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UserProfileProvider } from './contexts/UserProfileContext'
import { FontPreferencesProvider } from './contexts/FontPreferencesContext'


import RtlCacheProvider from './contexts/RtlCacheProvider'

// Optimized QueryClient for maximum performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time for better performance
      gcTime: 10 * 60 * 1000, // 10 minutes cache time (renamed from cacheTime)
      suspense: false,
      throwOnError: false,
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
            <AuthProvider>
              <FontPreferencesProvider>
                <CustomThemeProvider>
                  <ToastProvider>
                    <UserProfileProvider>
                      <App />
                      {import.meta.env.DEV ? (
                        <ReactQueryDevtools initialIsOpen={false} />
                      ) : null}
                    </UserProfileProvider>
                  </ToastProvider>
                </CustomThemeProvider>
              </FontPreferencesProvider>
            </AuthProvider>
          </RtlCacheProvider>
        </StyledEngineProvider>
      </QueryClientProvider>
  </StrictMode>,
)

// Initialize auth cleanup for better performance
initAuthCleanup();

// Register service worker for caching and offline support
if (import.meta.env.PROD) {
  import('./utils/serviceWorker').then(({ registerSW }) => {
    registerSW();
  });
}
