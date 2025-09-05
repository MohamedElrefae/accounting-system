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
