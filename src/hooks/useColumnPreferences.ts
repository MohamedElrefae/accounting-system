import { useState, useEffect, useCallback } from 'react'

// Column configuration interface - defined inline to avoid import issues
export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  width: number
  minWidth?: number
  maxWidth?: number
  resizable?: boolean
  sortable?: boolean
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'actions'
}

// Local interfaces for this hook
interface UseColumnPreferencesOptions {
  storageKey: string
  defaultColumns: ColumnConfig[]
  userId?: string
}

interface StoredColumnPreferences {
  columns: ColumnConfig[]
  version: number
  userId?: string
  timestamp: number
}

const PREFERENCES_VERSION = 1

export const useColumnPreferences = ({
  storageKey,
  defaultColumns,
  userId
}: UseColumnPreferencesOptions) => {
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns)

  // Generate the full storage key including user ID if provided
  const getStorageKey = useCallback(() => {
    return userId ? `${storageKey}_${userId}` : storageKey
  }, [storageKey, userId])

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const key = getStorageKey()
      const stored = localStorage.getItem(key)
      
      if (!stored) {
        setColumns(defaultColumns)
        return
      }

      const preferences: StoredColumnPreferences = JSON.parse(stored)
      
      // Check version compatibility
      if (preferences.version !== PREFERENCES_VERSION) {
        console.log('Column preferences version mismatch, using defaults')
        setColumns(defaultColumns)
        return
      }

      // Merge stored preferences with default columns to handle new columns
      const mergedColumns = mergeWithDefaults(preferences.columns, defaultColumns)
      setColumns(mergedColumns)
    } catch (error) {
      console.error('Error loading column preferences:', error)
      setColumns(defaultColumns)
    }
  }, [getStorageKey, defaultColumns])

  // Save preferences to localStorage
  const savePreferences = useCallback((newColumns: ColumnConfig[]) => {
    try {
      const key = getStorageKey()
      const preferences: StoredColumnPreferences = {
        columns: newColumns,
        version: PREFERENCES_VERSION,
        userId,
        timestamp: Date.now()
      }
      
      localStorage.setItem(key, JSON.stringify(preferences))
      setColumns(newColumns)
    } catch (error) {
      console.error('Error saving column preferences:', error)
    }
  }, [getStorageKey, userId])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    try {
      const key = getStorageKey()
      localStorage.removeItem(key)
      setColumns(defaultColumns)
    } catch (error) {
      console.error('Error resetting column preferences:', error)
    }
  }, [getStorageKey, defaultColumns])

  // Handle column resizing
  const handleColumnResize = useCallback((columnKey: string, newWidth: number) => {
    const updatedColumns = columns.map(col =>
      col.key === columnKey
        ? { ...col, width: newWidth }
        : col
    )
    savePreferences(updatedColumns)
  }, [columns, savePreferences])

  // Handle column configuration changes
  const handleColumnConfigChange = useCallback((newColumns: ColumnConfig[]) => {
    savePreferences(newColumns)
  }, [savePreferences])

  // Load preferences on mount or when dependencies change
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults,
    savePreferences
  }
}

// Helper function to merge stored preferences with defaults
function mergeWithDefaults(stored: ColumnConfig[], defaults: ColumnConfig[]): ColumnConfig[] {
  // Create a map of stored columns by key
  const storedMap = new Map(stored.map(col => [col.key, col]))
  
  // Start with defaults and override with stored preferences
  const merged = defaults.map(defaultCol => {
    const storedCol = storedMap.get(defaultCol.key)
    if (storedCol) {
      // Preserve default settings for new properties while keeping user preferences
      return {
        ...defaultCol,
        ...storedCol,
        // Ensure these properties come from defaults in case they've changed
        minWidth: defaultCol.minWidth,
        maxWidth: defaultCol.maxWidth,
        type: defaultCol.type,
        resizable: defaultCol.resizable,
        sortable: defaultCol.sortable
      }
    }
    return defaultCol
  })

  // Add any stored columns that don't exist in defaults (in case of column removal)
  stored.forEach(storedCol => {
    if (!defaults.find(defaultCol => defaultCol.key === storedCol.key)) {
      // Add legacy column but mark it as possibly outdated
      merged.push({
        ...storedCol,
        // Mark legacy columns as potentially removable
        label: `${storedCol.label} (قديم)`
      })
    }
  })

  return merged
}

export default useColumnPreferences
