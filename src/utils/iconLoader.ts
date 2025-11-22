// Optimized icon loader to avoid "too many open files" error
import { lazy } from 'react'

// Pre-define commonly used icons to avoid dynamic imports
export const CommonIcons = {
  Dashboard: lazy(() => import('@mui/icons-material/Dashboard')),
  Person: lazy(() => import('@mui/icons-material/Person')),
  Settings: lazy(() => import('@mui/icons-material/Settings')),
  Menu: lazy(() => import('@mui/icons-material/Menu')),
  Close: lazy(() => import('@mui/icons-material/Close')),
  Add: lazy(() => import('@mui/icons-material/Add')),
  Edit: lazy(() => import('@mui/icons-material/Edit')),
  Delete: lazy(() => import('@mui/icons-material/Delete')),
  Save: lazy(() => import('@mui/icons-material/Save')),
  Cancel: lazy(() => import('@mui/icons-material/Cancel')),
  Search: lazy(() => import('@mui/icons-material/Search')),
  FilterList: lazy(() => import('@mui/icons-material/FilterList')),
  Visibility: lazy(() => import('@mui/icons-material/Visibility')),
  VisibilityOff: lazy(() => import('@mui/icons-material/VisibilityOff')),
  ArrowBack: lazy(() => import('@mui/icons-material/ArrowBack')),
  ArrowForward: lazy(() => import('@mui/icons-material/ArrowForward')),
  Home: lazy(() => import('@mui/icons-material/Home')),
  Logout: lazy(() => import('@mui/icons-material/Logout')),
  AccountCircle: lazy(() => import('@mui/icons-material/AccountCircle')),
  Notifications: lazy(() => import('@mui/icons-material/Notifications')),
}

// Icon cache to prevent multiple imports
const iconCache = new Map()

// Optimized icon loader function
export const loadIcon = async (iconName: string) => {
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)
  }

  try {
    const iconModule = await import(`@mui/icons-material/${iconName}`)
    const IconComponent = iconModule.default
    iconCache.set(iconName, IconComponent)
    return IconComponent
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`, error)
    // Return a default icon or null
    return null
  }
}

// Batch icon loader for multiple icons
export const loadIcons = async (iconNames: string[]) => {
  const promises = iconNames.map(name => loadIcon(name))
  return Promise.all(promises)
}