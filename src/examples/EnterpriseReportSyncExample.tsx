import React, { useState } from 'react'
import { useUniversalReportSync, type SyncControlSettings } from '../hooks/useUniversalReportSync'
import ReportSyncStatus from '../components/Common/ReportSyncStatus'

/**
 * Enterprise Report Sync Example
 * 
 * This example demonstrates how to implement enterprise-level sync controls
 * for high-volume transaction systems where you need granular control over
 * when and how synchronization occurs.
 */
const EnterpriseReportSyncExample: React.FC = () => {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Enterprise sync configuration
  const enterpriseSyncConfig: SyncControlSettings = {
    mode: 'realtime', // Start in real-time mode
    pauseOnHighVolume: true, // Auto-pause when transaction rate is high
    maxUpdatesPerMinute: 30, // Throttle to max 30 updates per minute
    pauseOnUserActivity: true, // Pause when user is actively working
    allowedTriggers: ['data_change', 'manual'], // Only allow data changes and manual triggers
    businessHoursOnly: false, // Allow sync 24/7 (set to true for business hours only)
    batchSize: 100 // Process max 100 records per sync
  }

  // Load report data function
  const loadData = async () => {
    setLoading(true)
    try {
      // Your data loading logic here
      console.log('Loading enterprise report data...')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      setData([]) // Replace with actual data
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Enhanced sync hook with enterprise controls
  const syncState = useUniversalReportSync({
    reportId: 'enterprise_transactions_report',
    tablesToWatch: ['transactions', 'accounts', 'projects', 'organizations'],
    enableRealTime: true,
    enableUserPresence: true,
    updateInterval: 2000, // 2 second delay for pending updates
    syncControl: enterpriseSyncConfig,
    onDataChange: () => {
      // Only reload if not paused and sync mode allows it
      if (!syncState.isPaused && syncState.syncMode !== 'off') {
        console.log('Data changed - reloading...')
        loadData()
      }
    },
    onSyncPaused: (reason) => {
      console.log('🔄 Sync paused:', reason)
      // You could show a notification here
    },
    onSyncResumed: () => {
      console.log('▶️ Sync resumed')
      // You could show a notification here
    },
    onUserUpdate: (event) => {
      console.log('👥 User update:', event)
    }
  })

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🏢 Enterprise Report Sync Control</h1>
      <p style={{ color: 'var(--muted_text)', marginBottom: '24px' }}>
        This example shows how to implement enterprise-level sync controls for high-volume systems.
      </p>

      {/* Enhanced Sync Status with Full Controls */}
      <ReportSyncStatus
        isConnected={syncState.isConnected}
        pendingUpdates={syncState.pendingUpdates}
        activeUsers={syncState.activeUsers}
        lastUpdate={syncState.lastUpdate}
        error={syncState.error}
        syncMode={syncState.syncMode}
        isPaused={syncState.isPaused}
        pauseReason={syncState.pauseReason}
        updateCount={syncState.updateCount}
        avgUpdatesPerMinute={syncState.avgUpdatesPerMinute}
        onRefresh={() => {
          console.log('📱 Manual refresh triggered')
          syncState.triggerUpdate({ source: 'manual_button' })
          loadData()
        }}
        onPauseSync={syncState.pauseSync}
        onResumeSync={syncState.resumeSync}
        onChangeSyncMode={syncState.changeSyncMode}
      />

      {/* Report Content */}
      <div style={{ 
        marginTop: '24px', 
        padding: '20px', 
        backgroundColor: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: '8px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>📊 Transaction Report</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {loading && <span style={{ color: 'var(--muted_text)' }}>Loading...</span>}
            <button 
              onClick={loadData}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--accent)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Data
            </button>
          </div>
        </div>

        {/* Sync Mode Explanations */}
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--field_bg)', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>🔧 Available Sync Modes:</h3>
          <div style={{ fontSize: '12px', color: 'var(--muted_text)' }}>
            <p><strong>🔄 Real-time:</strong> Updates immediately when data changes (default)</p>
            <p><strong>✋ Manual:</strong> Updates only when user clicks refresh</p>
            <p><strong>⏱️ Interval:</strong> Updates on fixed time intervals</p>
            <p><strong>⏸️ Idle:</strong> Pauses sync when user is inactive</p>
            <p><strong>❌ Off:</strong> Completely disables automatic sync</p>
          </div>
        </div>

        {/* Enterprise Features Showcase */}
        <div style={{ padding: '12px', backgroundColor: 'var(--field_bg)', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>🏢 Enterprise Features Active:</h3>
          <div style={{ fontSize: '12px', color: 'var(--muted_text)' }}>
            <p>✅ Auto-pause on high volume (&gt;{enterpriseSyncConfig.maxUpdatesPerMinute} updates/min)</p>
            <p>✅ User activity monitoring - pauses sync during active work</p>
            <p>✅ Volume throttling and statistics tracking</p>
            <p>✅ Real-time user presence across reports</p>
            <p>✅ Granular sync trigger control</p>
            <p>✅ Business hours scheduling support</p>
          </div>
        </div>

        {/* Sample Data Display */}
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>📋 Report Data:</h3>
          {data.length === 0 ? (
            <p style={{ color: 'var(--muted_text)', fontStyle: 'italic' }}>
              No data loaded. Click "Reload Data" or trigger an update to see content.
            </p>
          ) : (
            <div>
              {/* Your actual report data would go here */}
              <p>Loaded {data.length} records</p>
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        backgroundColor: 'var(--warning-bg)', 
        border: '1px solid var(--warning)', 
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--warning-text)' }}>💡 Usage Instructions:</h3>
        <ol style={{ margin: '0', paddingLeft: '20px', color: 'var(--warning-text)' }}>
          <li>Click the ⚙️ settings button to access advanced sync controls</li>
          <li>Try switching sync modes to see how behavior changes</li>
          <li>Use ⏸️/▶️ buttons for manual pause/resume control</li>
          <li>Monitor update volume - system will auto-pause if too high</li>
          <li>Check user activity detection by typing/clicking rapidly</li>
        </ol>
      </div>
    </div>
  )
}

export default EnterpriseReportSyncExample
