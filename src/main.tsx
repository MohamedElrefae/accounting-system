import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CustomThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UserProfileProvider } from './contexts/UserProfileContext'
import { FontPreferencesProvider } from './contexts/FontPreferencesContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
