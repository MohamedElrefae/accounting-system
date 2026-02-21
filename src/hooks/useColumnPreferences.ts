import { useState, useEffect, useCallback } from 'react'
import { getConnectionMonitor } from '../utils/connectionMonitor'

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
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'badge' | 'actions'
  frozen?: boolean
  pinPriority?: number
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

const PREFERENCES_VERSION = 2

export const useColumnPreferences = ({
  storageKey,
  defaultColumns,
  userId
}: UseColumnPreferencesOptions) => {
  const sanitize = (cols: ColumnConfig[]): ColumnConfig[] => cols.map(c => ({
    ...c,
    // Drop maxWidth to allow unlimited width unless explicitly set later by caller
    maxWidth: undefined,
  }))
  const [columns, setColumns] = useState<ColumnConfig[]>(sanitize(defaultColumns))
  const [serverKey] = useState<string>(storageKey)

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
        setColumns(sanitize(defaultColumns))
        return
      }

      const preferences: StoredColumnPreferences = JSON.parse(stored)
      
      // Check version compatibility
      if (preferences.version !== PREFERENCES_VERSION) {
        console.log('Column preferences version mismatch, using defaults')
        setColumns(sanitize(defaultColumns))
        return
      }

      // Merge stored preferences with default columns to handle new columns
      const mergedColumns = mergeWithDefaults(preferences.columns, defaultColumns)
      setColumns(sanitize(mergedColumns))
    } catch (error) {
      console.error('Error loading column preferences:', error)
      setColumns(defaultColumns)
    }
  }, [getStorageKey, defaultColumns])

  // Save preferences to localStorage
  const savePreferences = useCallback((newColumns: ColumnConfig[]) => {
    try {
      const key = getStorageKey()
      const sanitized = sanitize(newColumns)
      const preferences: StoredColumnPreferences = {
        columns: sanitized,
        version: PREFERENCES_VERSION,
        userId,
        timestamp: Date.now()
      }
      
      localStorage.setItem(key, JSON.stringify(preferences))
      setColumns(sanitized)
    } catch (error) {
      console.error('Error saving column preferences:', error)
    }
  }, [getStorageKey, userId])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    try {
      const key = getStorageKey()
      localStorage.removeItem(key)
      setColumns(sanitize(defaultColumns))
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
    // Fire-and-forget server upsert if user is known
    if (userId) {
      ;(async () => {
        const monitor = getConnectionMonitor()
        if (!monitor.getHealth().isOnline) return
        try {
          const mod = await import('../services/column-preferences')
          await mod.upsertUserColumnPreferences({ tableKey: serverKey, columnConfig: { columns: updatedColumns }, version: PREFERENCES_VERSION })
        } catch (e) {
          console.warn('Failed to upsert column resize to server:', e)
        }
      })()
    }
  }, [columns, savePreferences, userId, serverKey])

  // Handle column configuration changes
  const handleColumnConfigChange = useCallback((newColumns: ColumnConfig[]) => {
    savePreferences(newColumns)
    if (userId) {
      ;(async () => {
        const monitor = getConnectionMonitor()
        if (!monitor.getHealth().isOnline) return
        try {
          const mod = await import('../services/column-preferences')
          await mod.upsertUserColumnPreferences({ tableKey: serverKey, columnConfig: { columns: newColumns }, version: PREFERENCES_VERSION })
        } catch (e) {
          console.warn('Failed to upsert column config to server:', e)
        }
      })()
    }
  }, [savePreferences, userId, serverKey])

  // Load preferences on mount or when dependencies change (local first)
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Also try to pull from server when userId is available
  useEffect(() => {
    let cancelled = false
    async function loadServer() {
      if (!userId) return
      const monitor = getConnectionMonitor()
      if (!monitor.getHealth().isOnline) return
      try {
        const mod = await import('../services/column-preferences')
        if (mod.isColumnPreferencesRpcDisabled()) return
        const res = await mod.getUserColumnPreferences(serverKey)
        if (cancelled) return
        if (res && res.column_config && Array.isArray(res.column_config.columns)) {
          const merged = mergeWithDefaults(res.column_config.columns as ColumnConfig[], defaultColumns)
          setColumns(sanitize(merged))
        }
      } catch {
        // Silent: fall back to local
      }
    }
    loadServer()
    return () => { cancelled = true }
  }, [userId, serverKey, defaultColumns])

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
        label: defaultCol.label,
        minWidth: defaultCol.minWidth,
        // Drop maxWidth to remove hard caps on resizing
        maxWidth: undefined,
        type: defaultCol.type,
        resizable: defaultCol.resizable,
        sortable: defaultCol.sortable,
        // Preserve user-configured frozen and pinPriority settings
        frozen: storedCol.frozen,
        pinPriority: storedCol.pinPriority
      }
    }
    // Also strip maxWidth from defaults
    return { ...defaultCol, maxWidth: undefined }
  })

  // Drop any stored columns that no longer exist in defaults to avoid legacy bleed-through
  return merged
}

export default useColumnPreferences
