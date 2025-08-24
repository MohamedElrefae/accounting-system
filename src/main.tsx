import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CustomThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { UserProfileProvider } from './contexts/UserProfileContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CustomThemeProvider>
        <ToastProvider>
          <UserProfileProvider>
            <App />
          </UserProfileProvider>
        </ToastProvider>
      </CustomThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
