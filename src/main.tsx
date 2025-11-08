import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
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

// Create a client with optimized settings for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds - fresh data
      cacheTime: 5 * 60 * 1000, // 5 minutes
      suspense: false, // Disable suspense for better performance
      useErrorBoundary: false, // Handle errors locally
      refetchOnMount: true, // Always get fresh data on mount
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
