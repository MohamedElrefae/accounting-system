import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StyledEngineProvider } from '@mui/material/styles'

import { AuthProvider } from './contexts/AuthContext'
import { CustomThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UserProfileProvider } from './contexts/UserProfileContext'
import { FontPreferencesProvider } from './contexts/FontPreferencesContext'

import RtlCacheProvider from './contexts/RtlCacheProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <RtlCacheProvider>
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
      </RtlCacheProvider>
    </StyledEngineProvider>
  </StrictMode>,
)
