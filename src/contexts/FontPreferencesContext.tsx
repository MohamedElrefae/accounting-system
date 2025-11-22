import { createContext, useContext } from 'react'
import type { FontPreferences } from '../services/font-preferences'

export interface FontPreferencesContextType {
  preferences: FontPreferences | null
  loading: boolean
  error: string | null
  refreshPreferences: () => Promise<void>
  applyPreferences: (prefs: FontPreferences) => void
}

export const FontPreferencesContext = createContext<FontPreferencesContextType | undefined>(undefined)

export const useFontPreferences = (): FontPreferencesContextType => {
  const context = useContext(FontPreferencesContext)
  if (!context) {
    throw new Error('useFontPreferences must be used within a FontPreferencesProvider')
  }
  return context
}

export default FontPreferencesContext
