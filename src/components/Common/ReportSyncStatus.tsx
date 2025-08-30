import React, { useState } from 'react'
import type { ReportUser, SyncMode } from '../../hooks/useUniversalReportSync'

interface ReportSyncStatusProps {
  isConnected: boolean
  pendingUpdates: boolean
  activeUsers: ReportUser[]
  lastUpdate: number | null
  error: string | null
  syncMode?: SyncMode
  isPaused?: boolean
  pauseReason?: string
  updateCount?: number
  avgUpdatesPerMinute?: number
  onRefresh?: () => void
  onPauseSync?: (reason: string) => void
  onResumeSync?: () => void
  onChangeSyncMode?: (mode: SyncMode) => void
  className?: string
}

const ReportSyncStatus: React.FC<ReportSyncStatusProps> = ({
  isConnected,
  pendingUpdates,
  activeUsers,
  lastUpdate,
  error,
  syncMode = 'realtime',
  isPaused = false,
  pauseReason,
  updateCount = 0,
  avgUpdatesPerMinute = 0,
  onRefresh,
  onPauseSync,
  onResumeSync,
  onChangeSyncMode,
  className = ''
}) => {
  const [showControls, setShowControls] = useState(false)
  const formatLastUpdate = (timestamp: number | null) => {
    if (!timestamp) return 'لم يتم التحديث'
    
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'منذ لحظات'
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`
    
    return new Date(timestamp).toLocaleDateString('ar-EG')
  }

  const getStatusColor = () => {
    if (error) return '#ef4444' // red
    if (pendingUpdates) return '#f59e0b' // amber
    if (isConnected) return '#10b981' // green
    return '#6b7280' // gray
  }

  const getStatusIcon = () => {
    if (error) return '⚠️'
    if (pendingUpdates) return '🔄'
    if (isConnected) return '🟢'
    return '🔘'
  }

  const getStatusText = () => {
    if (error) return `خطأ: ${error}`
    if (isPaused) return `متوقف: ${pauseReason}`
    if (pendingUpdates) return 'جاري التحديث...'
    if (isConnected) return 'متصل ومحدث'
    return 'غير متصل'
  }

  const getSyncModeLabel = (mode: SyncMode) => {
    switch (mode) {
      case 'realtime': return '🔄 آني'
      case 'manual': return '✋ يدوي'
      case 'interval': return '⏱️ فتري'
      case 'idle': return '⏸️ خمول'
      case 'off': return '❌ متوقف'
      default: return mode
    }
  }

  return (
    <>
      <div 
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--text)',
          direction: 'rtl'
        }}
      >
      {/* Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px' }}>{getStatusIcon()}</span>
        <span style={{ color: getStatusColor(), fontWeight: '500' }}>
          {getStatusText()}
        </span>
      </div>

      {/* Last Update Time */}
      {lastUpdate && (
        <div style={{ fontSize: '12px', color: 'var(--muted_text)' }}>
          آخر تحديث: {formatLastUpdate(lastUpdate)}
        </div>
      )}

      {/* Active Users Count */}
      {activeUsers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>👥</span>
          <span style={{ fontSize: '12px', color: 'var(--muted_text)' }}>
            {activeUsers.length} مستخدم متصل
          </span>
        </div>
      )}

      {/* Manual Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            padding: '4px 8px',
            backgroundColor: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
        >
          تحديث يدوي
        </button>
      )}

        {/* Sync Mode Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted_text)' }}>
            {getSyncModeLabel(syncMode)}
          </span>
          {avgUpdatesPerMinute > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--muted_text)' }}>
              ({avgUpdatesPerMinute}/دقيقة)
            </span>
          )}
        </div>

        {/* Pause/Resume Controls */}
        {(onPauseSync || onResumeSync) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isPaused ? (
              onResumeSync && (
                <button
                  onClick={onResumeSync}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title="استئناف المزامنة"
                >
                  ▶️
                </button>
              )
            ) : (
              onPauseSync && (
                <button
                  onClick={() => onPauseSync('توقف يدوي')}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title="إيقاف المزامنة مؤقتاً"
                >
                  ⏸️
                </button>
              )
            )}
          </div>
        )}

        {/* Sync Controls Toggle */}
        {(onChangeSyncMode || onPauseSync) && (
          <button
            onClick={() => setShowControls(!showControls)}
            style={{
              padding: '4px 6px',
              backgroundColor: 'transparent',
              color: 'var(--muted_text)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            title="إعدادات المزامنة"
          >
            ⚙️
          </button>
        )}

        {/* Pending Updates Animation */}
        {pendingUpdates && (
          <div
            className="pulse-animation"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b'
            }}
          />
        )}
      </div>

      {/* Advanced Sync Control Panel */}
      {showControls && (onChangeSyncMode || onPauseSync) && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          direction: 'rtl'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>🔧 إعدادات المزامنة المتقدمة</h4>
            <button
              onClick={() => setShowControls(false)}
              style={{
                padding: '2px 6px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted_text)'
              }}
            >
              ✕
            </button>
          </div>

          {/* Sync Mode Selection */}
          {onChangeSyncMode && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                وضع المزامنة:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['realtime', 'manual', 'interval', 'idle', 'off'] as SyncMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => onChangeSyncMode(mode)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: syncMode === mode ? 'var(--accent)' : 'var(--field_bg)',
                      color: syncMode === mode ? 'var(--on-accent)' : 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {getSyncModeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Volume Statistics */}
          {updateCount > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--muted_text)' }}>
              📊 إحصائيات التحديث:
              <div style={{ marginTop: '4px' }}>
                • التحديثات في الدقيقة الماضية: {updateCount}
                • متوسط المعدل: {avgUpdatesPerMinute} تحديث/دقيقة
                {updateCount > 10 && (
                  <div style={{ color: '#f59e0b', marginTop: '2px' }}>
                    ⚠️ معدل التحديثات مرتفع - قد يتم الإيقاف المؤقت تلقائياً
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pause Reason Display */}
          {isPaused && pauseReason && (
            <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '8px' }}>
              ⏸️ سبب التوقف: {pauseReason}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          .pulse-animation {
            animation: pulse 1.5s ease-in-out infinite;
          }
        `
      }} />
    </>
  )
}

export default ReportSyncStatus
