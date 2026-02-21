import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export interface ReportUpdateEvent {
  type: 'USER_UPDATE' | 'DATA_CHANGE' | 'PAGE_OPEN'
  reportId: string
  userId?: string
  timestamp: number
  metadata?: Record<string, any>
}

export type SyncMode = 'realtime' | 'manual' | 'interval' | 'idle' | 'off'
export type SyncTrigger = 'data_change' | 'user_action' | 'page_focus' | 'interval' | 'manual'

export interface SyncControlSettings {
  mode: SyncMode
  pauseOnHighVolume?: boolean // Pause when transaction rate is high
  maxUpdatesPerMinute?: number // Throttle updates
  pauseOnUserActivity?: boolean // Pause when user is actively working
  allowedTriggers?: SyncTrigger[] // Which events can trigger sync
  businessHoursOnly?: boolean // Only sync during business hours
  batchSize?: number // Max records to process per sync
}

export interface UniversalReportSyncConfig {
  reportId: string
  tablesToWatch: string[]
  updateInterval?: number // ms
  enableRealTime?: boolean
  enableUserPresence?: boolean
  syncControl?: SyncControlSettings
  onDataChange?: () => void
  onUserUpdate?: (event: ReportUpdateEvent) => void
  onUserPresence?: (users: ReportUser[]) => void
  onSyncPaused?: (reason: string) => void
  onSyncResumed?: () => void
}

export interface ReportUser {
  userId: string
  username?: string
  joinedAt: number
  lastActivity: number
}

interface ReportSyncState {
  isConnected: boolean
  activeUsers: ReportUser[]
  lastUpdate: number | null
  pendingUpdates: boolean
  error: string | null
  syncMode: SyncMode
  isPaused: boolean
  pauseReason?: string
  updateCount: number
  avgUpdatesPerMinute: number
}

class UniversalReportSyncManager {
  private static instance: UniversalReportSyncManager
  private subscriptions = new Map<string, any>()
  private presenceChannels = new Map<string, any>()
  private eventBus = new Map<string, Set<(event: ReportUpdateEvent) => void>>()

  static getInstance(): UniversalReportSyncManager {
    if (!UniversalReportSyncManager.instance) {
      UniversalReportSyncManager.instance = new UniversalReportSyncManager()
    }
    return UniversalReportSyncManager.instance
  }

  private constructor() {
    this.setupGlobalListeners()
  }

  private setupGlobalListeners() {
    // Listen for browser visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.broadcastEvent({
          type: 'PAGE_OPEN',
          reportId: 'global',
          timestamp: Date.now()
        })
      }
    })

    // Listen for beforeunload to cleanup presence
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })
  }

  subscribe(config: UniversalReportSyncConfig, callback: (event: ReportUpdateEvent) => void): () => void {
    const { reportId, tablesToWatch, enableRealTime = true, enableUserPresence = true } = config

    // Add callback to event bus
    if (!this.eventBus.has(reportId)) {
      this.eventBus.set(reportId, new Set())
    }
    this.eventBus.get(reportId)!.add(callback)

    // Setup real-time table subscriptions
    if (enableRealTime) {
      this.setupTableSubscriptions(reportId, tablesToWatch)
    }

    // Setup user presence
    if (enableUserPresence) {
      this.setupUserPresence(reportId)
    }

    // Broadcast that user opened this report
    this.broadcastEvent({
      type: 'PAGE_OPEN',
      reportId,
      timestamp: Date.now()
    })

    // Return cleanup function
    return () => {
      this.eventBus.get(reportId)?.delete(callback)
      if (this.eventBus.get(reportId)?.size === 0) {
        this.cleanupReport(reportId)
      }
    }
  }

  private setupTableSubscriptions(reportId: string, tables: string[]) {
    if (this.subscriptions.has(reportId)) return

    const subscriptions = tables.map(tableName => {
      return supabase
        .channel(`${reportId}_${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            this.broadcastEvent({
              type: 'DATA_CHANGE',
              reportId,
              timestamp: Date.now(),
              metadata: {
                table: tableName,
                eventType: payload.eventType,
                record: payload.new || payload.old
              }
            })
          }
        )
        .subscribe()
    })

    this.subscriptions.set(reportId, subscriptions)
  }

  private setupUserPresence(reportId: string) {
    if (this.presenceChannels.has(reportId)) return

    const channel = supabase.channel(`presence_${reportId}`, {
      config: {
        presence: {
          key: `user_${Math.random().toString(36).substr(2, 9)}`
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: ReportUser[] = []
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.push({
              userId: presence.userId || 'anonymous',
              username: presence.username,
              joinedAt: presence.joinedAt,
              lastActivity: presence.lastActivity
            })
          })
        })

        this.broadcastEvent({
          type: 'USER_UPDATE',
          reportId,
          timestamp: Date.now(),
          metadata: { activeUsers: users }
        })
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // User joined
        this.broadcastEvent({
          type: 'USER_UPDATE',
          reportId,
          timestamp: Date.now(),
          metadata: { 
            action: 'join',
            user: newPresences[0]
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // User left
        this.broadcastEvent({
          type: 'USER_UPDATE',
          reportId,
          timestamp: Date.now(),
          metadata: {
            action: 'leave', 
            user: leftPresences[0]
          }
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: await this.getCurrentUserId(),
            username: await this.getCurrentUsername(),
            joinedAt: Date.now(),
            lastActivity: Date.now()
          })
        }
      })

    this.presenceChannels.set(reportId, channel)
  }

  private broadcastEvent(event: ReportUpdateEvent) {
    const callbacks = this.eventBus.get(event.reportId)
    if (callbacks) {
      callbacks.forEach(callback => callback(event))
    }

    // Also broadcast to global listeners
    const globalCallbacks = this.eventBus.get('global')
    if (globalCallbacks && event.reportId !== 'global') {
      globalCallbacks.forEach(callback => callback(event))
    }
  }

  private async getCurrentUserId(): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id || `anonymous_${Math.random().toString(36).substr(2, 9)}`
    } catch {
        return `anonymous_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  private async getCurrentUsername(): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.email || 'مستخدم مجهول'
    } catch {
        return 'مستخدم مجهول'
    }
  }

  async triggerManualUpdate(reportId: string, metadata?: Record<string, any>) {
    const userId = await this.getCurrentUserId()
    this.broadcastEvent({
      type: 'USER_UPDATE',
      reportId,
      userId,
      timestamp: Date.now(),
      metadata: { ...metadata, manual: true }
    })
  }

  private cleanupReport(reportId: string) {
    // Cleanup table subscriptions
    const subs = this.subscriptions.get(reportId)
    if (subs) {
      subs.forEach((sub: any) => sub.unsubscribe())
      this.subscriptions.delete(reportId)
    }

    // Cleanup presence channel
    const channel = this.presenceChannels.get(reportId)
    if (channel) {
      channel.unsubscribe()
      this.presenceChannels.delete(reportId)
    }

    // Remove from event bus
    this.eventBus.delete(reportId)
  }

  private cleanup() {
    // Cleanup all subscriptions
    this.subscriptions.forEach((subs) => {
      subs.forEach((sub: any) => sub.unsubscribe())
    })
    this.subscriptions.clear()

    // Cleanup all presence channels
    this.presenceChannels.forEach((channel) => {
      channel.unsubscribe()
    })
    this.presenceChannels.clear()

    // Clear event bus
    this.eventBus.clear()
  }
}

export function useUniversalReportSync(config: UniversalReportSyncConfig): ReportSyncState & {
  triggerUpdate: (metadata?: Record<string, any>) => void
  forceRefresh: () => void
  pauseSync: (reason: string) => void
  resumeSync: () => void
  changeSyncMode: (mode: SyncMode) => void
} {
  const [state, setState] = useState<ReportSyncState>({
    isConnected: false,
    activeUsers: [],
    lastUpdate: null,
    pendingUpdates: false,
    error: null,
    syncMode: config.syncControl?.mode || 'realtime',
    isPaused: false,
    updateCount: 0,
    avgUpdatesPerMinute: 0
  })

  const configRef = useRef(config)
  const managerRef = useRef(UniversalReportSyncManager.getInstance())
  const lastUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  const handleReportEvent = useCallback((event: ReportUpdateEvent) => {
    const currentConfig = configRef.current

    const canTrigger = (t: SyncTrigger) => {
      const allowed = currentConfig.syncControl?.allowedTriggers
      return Array.isArray(allowed) ? allowed.includes(t) : true
    }

    setState(prev => ({
      ...prev,
      isConnected: true,
      lastUpdate: event.timestamp,
      error: null
    }))

    // Set pending updates flag and clear it after a delay
    setState(prev => ({ ...prev, pendingUpdates: true }))
    
    if (lastUpdateTimeoutRef.current) {
      clearTimeout(lastUpdateTimeoutRef.current)
    }
    
    lastUpdateTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, pendingUpdates: false }))
    }, currentConfig.updateInterval || 1500)

    // Handle different event types
    switch (event.type) {
      case 'DATA_CHANGE':
        if (canTrigger('data_change')) currentConfig.onDataChange?.()
        break
      
      case 'USER_UPDATE':
        if (event.metadata?.activeUsers) {
          setState(prev => ({
            ...prev,
            activeUsers: event.metadata!.activeUsers
          }))
        }
        if (canTrigger('user_action')) currentConfig.onUserUpdate?.(event)
        break
      
      case 'PAGE_OPEN':
        // Only refresh on page focus if allowed
        if (canTrigger('page_focus')) {
          setTimeout(() => {
            currentConfig.onDataChange?.()
          }, 300)
        }
        break
    }
  }, [])

  const triggerUpdate = useCallback((metadata?: Record<string, any>) => {
    managerRef.current.triggerManualUpdate(config.reportId, metadata)
  }, [config.reportId])

  const forceRefresh = useCallback(() => {
    config.onDataChange?.()
  }, [config.onDataChange])

  // Sync control functions
  const pauseSync = useCallback((reason: string) => {
    setState(prev => ({
      ...prev,
      isPaused: true,
      pauseReason: reason
    }))
    config.onSyncPaused?.(reason)
  }, [config])

  const resumeSync = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: false,
      pauseReason: undefined
    }))
    config.onSyncResumed?.()
  }, [config])

  const changeSyncMode = useCallback((mode: SyncMode) => {
    setState(prev => ({ ...prev, syncMode: mode }))
  }, [])

  // Volume monitoring and auto-pause logic
  const updateCountRef = useRef<number[]>([])
  const lastUserActivityRef = useRef<number>(Date.now())
  
  useEffect(() => {
    const syncControl = config.syncControl
    if (!syncControl) return

    // Monitor update volume
    if (syncControl.pauseOnHighVolume && syncControl.maxUpdatesPerMinute) {
      const now = Date.now()
      updateCountRef.current.push(now)
      
      // Keep only updates from the last minute
      updateCountRef.current = updateCountRef.current.filter(timestamp => 
        now - timestamp <= 60000
      )
      
      const updatesInLastMinute = updateCountRef.current.length
      
      setState(prev => ({
        ...prev,
        updateCount: updatesInLastMinute,
        avgUpdatesPerMinute: updatesInLastMinute
      }))
      
      // Auto-pause if volume is too high
      if (updatesInLastMinute > syncControl.maxUpdatesPerMinute && !state.isPaused) {
        pauseSync(`معدل التحديثات مرتفع: ${updatesInLastMinute} تحديث/دقيقة`)
      }
    }
    
    // Monitor user activity
    if (syncControl.pauseOnUserActivity) {
      const handleUserActivity = () => {
        lastUserActivityRef.current = Date.now()
        if (state.isPaused && state.pauseReason?.includes('نشاط المستخدم')) {
          resumeSync()
        }
      }
      
      document.addEventListener('keydown', handleUserActivity)
      document.addEventListener('click', handleUserActivity)
      document.addEventListener('scroll', handleUserActivity)
      
      // Check for user inactivity
      const inactivityTimer = setInterval(() => {
        const timeSinceActivity = Date.now() - lastUserActivityRef.current
        if (timeSinceActivity < 2000 && !state.isPaused) { // 2 seconds of activity
          pauseSync('نشاط المستخدم - تم إيقاف المزامنة مؤقتاً')
        }
      }, 1000)
      
      return () => {
        document.removeEventListener('keydown', handleUserActivity)
        document.removeEventListener('click', handleUserActivity) 
        document.removeEventListener('scroll', handleUserActivity)
        clearInterval(inactivityTimer)
      }
    }
  }, [config.syncControl, state.isPaused, state.pauseReason, pauseSync, resumeSync])

  useEffect(() => {
    const cleanup = managerRef.current.subscribe(config, handleReportEvent)
    
    setState(prev => ({
      ...prev,
      isConnected: true,
      error: null
    }))

    return () => {
      cleanup()
      if (lastUpdateTimeoutRef.current) {
        clearTimeout(lastUpdateTimeoutRef.current)
      }
    }
  }, [config.reportId, handleReportEvent])

  // Handle connection errors
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState(prev => ({
          ...prev,
          isConnected: false,
          activeUsers: []
        }))
      }
    })
  }, [])

  return {
    ...state,
    triggerUpdate,
    forceRefresh,
    pauseSync,
    resumeSync,
    changeSyncMode
  }
}

// Utility hook for simpler usage in reports
export function useReportSync(reportId: string, tablesToWatch: string[], onDataChange: () => void) {
  return useUniversalReportSync({
    reportId,
    tablesToWatch,
    onDataChange,
    enableRealTime: true,
    enableUserPresence: true,
    updateInterval: 1500,
    syncControl: { allowedTriggers: ['data_change', 'manual', 'interval'] }
  })
}
