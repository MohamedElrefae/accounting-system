import { supabase } from '../utils/supabase'
import { getConnectionMonitor } from '../utils/connectionMonitor'

export interface SyncEvent {
  type: 'DATA_CHANGE' | 'USER_UPDATE' | 'SYSTEM_EVENT'
  channelId: string
  timestamp: number
  userId?: string
  metadata?: Record<string, any>
}

export type SyncCallback = (event: SyncEvent) => void

export interface SubscriptionConfig {
  channelId: string
  tables?: string[] // Tables to watch for postgres_changes
  enablePresence?: boolean
  presenceKey?: string
}

class UnifiedSyncManager {
  private static instance: UnifiedSyncManager
  private channels = new Map<string, any>()
  private listeners = new Map<string, Set<SyncCallback>>()
  private isPaused = false
  private pausedChannels = new Set<string>()

  static getInstance(): UnifiedSyncManager {
    if (!UnifiedSyncManager.instance) {
      UnifiedSyncManager.instance = new UnifiedSyncManager()
    }
    return UnifiedSyncManager.instance
  }

  private constructor() {
    this.setupSystemListeners()
    this.setupConnectivityListener()
    
    // Initial state check
    const monitor = getConnectionMonitor()
    if (!monitor.getHealth().isOnline) {
      supabase.realtime.disconnect()
    }
  }

  private setupConnectivityListener() {
    const monitor = getConnectionMonitor()
    monitor.subscribe((health) => {
      if (!health.isOnline) {
        if (import.meta.env.DEV) console.log('[UnifiedSync] Offline: Ensuring Realtime is disconnected');
        supabase.realtime.disconnect()
      } else {
        if (import.meta.env.DEV) console.log('[UnifiedSync] Online: Reconnecting Realtime');
        supabase.realtime.connect()
      }
    })
  }

  private setupSystemListeners() {
    // Handle auth changes to reset connections if needed
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        this.disconnectAll()
      }
    })
  }

  public subscribe(config: SubscriptionConfig, callback: SyncCallback): () => void {
    const { channelId } = config

    // Add listener
    if (!this.listeners.has(channelId)) {
      this.listeners.set(channelId, new Set())
    }
    this.listeners.get(channelId)!.add(callback)

    // Initialize channel if not exists
    if (!this.channels.has(channelId)) {
      this.initChannel(config)
    }

    return () => {
      const set = this.listeners.get(channelId)
      if (set) {
        set.delete(callback)
        if (set.size === 0) {
          this.cleanupChannel(channelId)
        }
      }
    }
  }

  private initChannel(config: SubscriptionConfig) {
    const { channelId, tables, enablePresence } = config
    
    const monitor = getConnectionMonitor()
    if (!monitor.getHealth().isOnline) {
      if (import.meta.env.DEV) console.log(`[UnifiedSync] Offline: Skipping channel init for ${channelId}`);
      return;
    }

    // Create one channel for this ID (e.g., 'report-123' or 'transactions-list')
    const channel = supabase.channel(channelId)

    // Setup Postgres Changes
    if (tables && tables.length > 0) {
      tables.forEach(table => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            this.broadcast(channelId, {
              type: 'DATA_CHANGE',
              channelId,
              timestamp: Date.now(),
              metadata: { event: payload.eventType, ...payload }
            })
          }
        )
      })
    }

    // Setup Presence
    if (enablePresence) {
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          this.broadcast(channelId, {
             type: 'USER_UPDATE',
             channelId,
             timestamp: Date.now(),
             metadata: { presence: state, action: 'sync' }
          })
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
           this.broadcast(channelId, {
             type: 'USER_UPDATE',
             channelId,
             timestamp: Date.now(),
             metadata: { presence: newPresences, action: 'join' }
           })
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
           this.broadcast(channelId, {
             type: 'USER_UPDATE',
             channelId,
             timestamp: Date.now(),
             metadata: { presence: leftPresences, action: 'leave' }
           })
        })
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && enablePresence) {
        const user = await this.getCurrentUserPartial()
        await channel.track(user)
      }
    })

    this.channels.set(channelId, channel)
  }

  private cleanupChannel(channelId: string) {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelId)
    }
    this.listeners.delete(channelId)
  }

  private disconnectAll() {
    this.channels.forEach(ch => ch.unsubscribe())
    this.channels.clear()
    this.listeners.clear()
  }

  public pauseUpdates(channelId?: string) {
    if (channelId) {
      if (this.channels.has(channelId)) {
        this.pausedChannels.add(channelId)
      }
    } else {
      this.isPaused = true
    }
  }

  public resumeUpdates(channelId?: string) {
    if (channelId) {
      this.pausedChannels.delete(channelId)
    } else {
      this.isPaused = false
    }
  }

  public isChannelPaused(channelId: string): boolean {
    return this.isPaused || this.pausedChannels.has(channelId)
  }

  private broadcast(channelId: string, event: SyncEvent) {
    // If global pause or channel specific pause is active, do not broadcast DATA_CHANGE
    // However, we might still want to allow SYSTEM_EVENT or USER_UPDATE (presence)
    if (event.type === 'DATA_CHANGE') {
      if (this.isPaused || this.pausedChannels.has(channelId)) {
        console.warn(`[UnifiedSync] Update suppressed for ${channelId} (Paused)`)
        return
      }
    }

    const set = this.listeners.get(channelId)
    if (set) {
      set.forEach(cb => cb(event))
    }
  }

  public async triggerManualUpdate(channelId: string) {
    // Force update even if paused? Usually yes, manual overrides pause.
    const wasPaused = this.isChannelPaused(channelId)
    if (wasPaused) {
        console.log(`[UnifiedSync] Manual trigger overriding pause for ${channelId}`)
    }

    // Broadcast locally
    const set = this.listeners.get(channelId)
    if (set) {
      set.forEach(cb => cb({
        type: 'DATA_CHANGE',
        channelId,
        timestamp: Date.now(),
        metadata: { source: 'manual', forced: true }
      }))
    }
    
    // Send to others? Only if we have a broadcast channel set up for it.
    // For now, we assume implicit data refresh is what's triggered.
    const channel = this.channels.get(channelId)
    if (channel) {
       await channel.send({
        type: 'broadcast',
        event: 'manual_refresh',
        payload: { timestamp: Date.now() }
      })
    }
  }

  private async getCurrentUserPartial() {
    const { data: { user } } = await supabase.auth.getUser()
    return {
      user_id: user?.id,
      email: user?.email,
      online_at: new Date().toISOString()
    }
  }
}

export const syncManager = UnifiedSyncManager.getInstance()
