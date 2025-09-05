import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CustomThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UserProfileProvider } from './contexts/UserProfileContext'
import { FontPreferencesProvider } from './contexts/FontPreferencesContext'

import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'

const muiCache = createCache({ key: 'css', prepend: true })

// Probe so we can confirm top-level CacheProvider is active
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).TOP_CACHE = 'active'
// eslint-disable-next-line no-console
console.log('[app] CacheProvider active')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={muiCache}>
      <AuthProvider>
        <FontPreferencesProvider>
          <CustomThemeProvider>
            <ToastProvider>
              <UserProfileProvider>
                <App />
              </UserProfileProvider>
            </ToastProvider>
          </CustomThemeProvider>
        </FontPreferencesProvider>
      </AuthProvider>
    </CacheProvider>
  </StrictMode>,
)
