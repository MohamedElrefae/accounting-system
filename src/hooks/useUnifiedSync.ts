import { useEffect, useState, useRef, useCallback } from 'react'
import { syncManager, type SubscriptionConfig, type SyncEvent } from '../lib/UnifiedSyncManager'

export interface UnifiedSyncState {
  isConnected: boolean
  lastUpdate: number
  activeUsers: any[]
  isSynced: boolean
}

export function useUnifiedSync(config: SubscriptionConfig & {
  onDataChange?: (event: SyncEvent) => void
  onUserUpdate?: (users: any[]) => void
}) {
  const [state, setState] = useState<UnifiedSyncState>({
    isConnected: false,
    lastUpdate: Date.now(),
    activeUsers: [],
    isSynced: true
  })

  // Use refs to prevent recreating subscription on every render if callback changes
  const onDataChangeRef = useRef(config.onDataChange)
  onDataChangeRef.current = config.onDataChange

  const configRef = useRef(config)
  configRef.current = config

  // Extract complex expression for static checking
  const tablesJson = JSON.stringify(config.tables)
  const channelId = config.channelId
  
  useEffect(() => {
    const handleEvent = (event: SyncEvent) => {
      if (event.type === 'DATA_CHANGE') {
        setState(s => ({ ...s, lastUpdate: event.timestamp }))
        onDataChangeRef.current?.(event)
      } else if (event.type === 'USER_UPDATE') {
        // Simple presence state update
        if (event.metadata?.presence) {
           // This logic depends on how supabase returns presence state structure (key -> array)
           // Simplify for now
           setState(s => ({ ...s, activeUsers: Object.values(event.metadata!.presence).flat() }))
        }
      }
    }

    const unsubscribe = syncManager.subscribe(configRef.current, handleEvent)
    setState(s => (s.isConnected ? s : { ...s, isConnected: true }))

    return () => {
      unsubscribe()
    }
  }, [channelId, tablesJson]) // Deep compare tables array

  const triggerUpdate = useCallback(() => {
    syncManager.triggerManualUpdate(config.channelId)
  }, [config.channelId])

  return {
    ...state,
    triggerUpdate
  }
}
