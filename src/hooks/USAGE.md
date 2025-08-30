# Universal Report Sync Hook - Usage Guide

## Overview

The Universal Report Sync hook provides real-time synchronization across all reports in your accounting system. It automatically updates reports when:

1. **User clicks update** - Any user manually refreshes a report
2. **User opens page** - Someone navigates to or refreshes the report page  
3. **Transaction table changes** - Database changes are detected in real-time

## Basic Usage

### Simple Integration (Recommended)

```tsx
import { useReportSync } from '../hooks/useUniversalReportSync'

const MyReport: React.FC = () => {
  // Your data loading function
  const loadData = useCallback(async () => {
    // Load your report data here
    const data = await fetchReportData()
    setReportData(data)
  }, [/* dependencies */])

  // Universal sync integration
  const syncState = useReportSync(
    'my_report_name',                    // Unique report identifier
    ['transactions', 'accounts'],       // Tables to watch for changes
    loadData                            // Function to call on updates
  )

  return (
    <div>
      {/* Optional: Show sync status */}
      <ReportSyncStatus
        isConnected={syncState.isConnected}
        pendingUpdates={syncState.pendingUpdates}
        activeUsers={syncState.activeUsers}
        lastUpdate={syncState.lastUpdate}
        error={syncState.error}
        onRefresh={() => {
          syncState.triggerUpdate()
          loadData()
        }}
      />
      
      {/* Your report content */}
    </div>
  )
}
```

### Advanced Integration

```tsx
import { useUniversalReportSync, ReportUpdateEvent } from '../hooks/useUniversalReportSync'

const AdvancedReport: React.FC = () => {
  const syncState = useUniversalReportSync({
    reportId: 'advanced_report',
    tablesToWatch: ['transactions', 'accounts', 'projects'],
    enableRealTime: true,
    enableUserPresence: true,
    updateInterval: 1000,
    onDataChange: () => {
      console.log('Data changed, refreshing...')
      loadData()
    },
    onUserUpdate: (event: ReportUpdateEvent) => {
      console.log('User event:', event)
      if (event.metadata?.manual) {
        // Handle manual updates differently
        showNotification('Report updated by user')
      }
    },
    onUserPresence: (users) => {
      console.log('Active users:', users.length)
    }
  })

  // Manual trigger with metadata
  const handleSpecialUpdate = () => {
    syncState.triggerUpdate({ 
      source: 'special_action',
      timestamp: Date.now(),
      userId: getCurrentUserId()
    })
  }

  return (
    <div>
      {/* Advanced sync status with custom actions */}
      <div className="sync-bar">
        <span>
          {syncState.isConnected ? '🟢 متصل' : '🔴 غير متصل'}
        </span>
        
        {syncState.pendingUpdates && (
          <span>🔄 جاري التحديث...</span>
        )}
        
        {syncState.activeUsers.length > 1 && (
          <span>👥 {syncState.activeUsers.length} مستخدمين متصلين</span>
        )}
        
        <button onClick={syncState.forceRefresh}>
          تحديث فوري
        </button>
        
        <button onClick={handleSpecialUpdate}>
          إجراء خاص
        </button>
      </div>
      
      {/* Report content */}
    </div>
  )
}
```

## Key Features

### 🔄 **Automatic Updates**
- Real-time database change detection via Supabase subscriptions
- Cross-user manual update notifications
- Page visibility change handling

### 👥 **User Presence**
- See who else is viewing the same report
- Real-time user join/leave notifications
- Active user count display

### 📊 **Status Monitoring**
- Connection status indicator
- Last update timestamp
- Pending updates animation
- Error state handling

### ⚡ **Performance Optimized**
- Debounced updates to prevent spam
- Singleton pattern for efficient resource usage
- Automatic cleanup on component unmount

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `reportId` | `string` | Required | Unique identifier for the report |
| `tablesToWatch` | `string[]` | Required | Database tables to monitor for changes |
| `updateInterval` | `number` | `1000` | Debounce interval in milliseconds |
| `enableRealTime` | `boolean` | `true` | Enable real-time database subscriptions |
| `enableUserPresence` | `boolean` | `true` | Enable user presence tracking |
| `onDataChange` | `function` | `undefined` | Called when data should be refreshed |
| `onUserUpdate` | `function` | `undefined` | Called on user-triggered events |
| `onUserPresence` | `function` | `undefined` | Called when user presence changes |

## Event Types

### `DATA_CHANGE`
Triggered when database tables change:
```tsx
{
  type: 'DATA_CHANGE',
  reportId: 'my_report',
  timestamp: 1640995200000,
  metadata: {
    table: 'transactions',
    eventType: 'INSERT', // INSERT, UPDATE, DELETE
    record: { id: '123', ... }
  }
}
```

### `USER_UPDATE`  
Triggered when a user manually updates:
```tsx
{
  type: 'USER_UPDATE',
  reportId: 'my_report',
  userId: 'user-123',
  timestamp: 1640995200000,
  metadata: {
    manual: true,
    source: 'manual_refresh'
  }
}
```

### `PAGE_OPEN`
Triggered when someone opens the report:
```tsx
{
  type: 'PAGE_OPEN',
  reportId: 'my_report',
  timestamp: 1640995200000
}
```

## Best Practices

### 1. **Unique Report IDs**
Use descriptive, unique identifiers:
```tsx
// ✅ Good
useReportSync('transaction_classification_report', ...)
useReportSync('general_ledger_account_123', ...)

// ❌ Avoid
useReportSync('report', ...)
useReportSync('123', ...)
```

### 2. **Relevant Table Watching**
Only watch tables that actually affect your report:
```tsx
// ✅ Good - only watch relevant tables
useReportSync('profit_loss', ['transactions', 'accounts'], ...)

// ❌ Avoid - watching too many tables
useReportSync('profit_loss', ['transactions', 'accounts', 'users', 'sessions'], ...)
```

### 3. **Memoized Data Loading**
Always use `useCallback` for your data loading function:
```tsx
// ✅ Good
const loadData = useCallback(async () => {
  const data = await fetchData()
  setData(data)
}, [dateFrom, dateTo, projectId]) // Include all dependencies

const syncState = useReportSync('my_report', ['transactions'], loadData)

// ❌ Avoid - will cause infinite re-renders
const syncState = useReportSync('my_report', ['transactions'], () => {
  fetchData().then(setData)
})
```

### 4. **Error Handling**
Handle sync errors gracefully:
```tsx
const syncState = useReportSync(...)

if (syncState.error) {
  return <div className="error">خطأ في الاتصال: {syncState.error}</div>
}
```

## Integration with Existing Reports

To add universal sync to an existing report:

1. **Import the hook**:
```tsx
import { useReportSync } from '../hooks/useUniversalReportSync'
import ReportSyncStatus from '../components/Common/ReportSyncStatus'
```

2. **Convert your load function to useCallback**:
```tsx
const load = useCallback(async () => {
  // existing load logic
}, [/* dependencies */])
```

3. **Add the sync hook**:
```tsx
const syncState = useReportSync('your_report_id', ['relevant_tables'], load)
```

4. **Add sync status component** (optional):
```tsx
<ReportSyncStatus {...syncState} onRefresh={() => load()} />
```

That's it! Your report now has enterprise-level real-time synchronization. 🚀

## Enterprise Features

- **Scalable Architecture**: Uses singleton pattern for efficient resource management
- **Real-time WebSocket Communication**: Via Supabase real-time subscriptions  
- **User Presence Tracking**: See who else is viewing reports
- **Cross-tab Synchronization**: Updates work across browser tabs
- **Automatic Cleanup**: Resources are cleaned up when components unmount
- **Error Recovery**: Automatic reconnection on connection loss
- **Performance Optimized**: Debounced updates prevent excessive API calls

Perfect for commercial accounting applications where multiple users need synchronized, real-time data! 💼✨
