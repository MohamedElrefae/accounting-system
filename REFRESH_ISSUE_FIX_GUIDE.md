# App Refresh Issue - Fix Implementation Guide

## Problem Description
The app was experiencing automatic refreshes after 2 seconds on load and again after 5-8 minutes during usage, disrupting user experience.

## Root Causes Identified

### 1. Error Boundary Auto-Refresh
- `DataLoadingErrorBoundary` was triggering `window.location.reload()` when max retries exceeded
- **Fixed**: Removed automatic reload, now shows permanent error state

### 2. Language Toggle Refreshes
- Language switching in fiscal components was using `window.location.reload()`
- **Fixed**: Replaced with custom events and state updates

### 3. Transaction Approval Refreshes
- Transaction details page was auto-refreshing after approval actions
- **Fixed**: Replaced with callback-based data refresh

### 4. Aggressive Polling Intervals
- Performance dashboards were polling every 2-5 seconds
- **Fixed**: Increased intervals to 10-15 seconds

## Implemented Solutions

### 1. Refresh Prevention Hook (`useRefreshPrevention`)
```typescript
// Prevents unnecessary page refreshes
const { softRefresh, hardRefresh, resetErrorCount } = useRefreshPrevention({
  preventOnError: true,
  preventOnLanguageChange: true,
  preventOnDataUpdate: true,
  maxErrorRetries: 3
});
```

### 2. Language Change Events
```typescript
// Instead of window.location.reload()
window.dispatchEvent(new CustomEvent('languageChanged', { 
  detail: { language: newLang } 
}));
```

### 3. Refresh Monitor (Development)
- Added debug component to track refresh events
- Visible in development mode or with `localStorage.setItem('debug_refresh_monitor', 'true')`

## Testing Instructions

### 1. Enable Debug Monitoring
```javascript
// In browser console
localStorage.setItem('debug_refresh_monitor', 'true');
// Refresh page to see monitor
```

### 2. Test Scenarios
1. **Language Switching**: Change language multiple times - should not refresh
2. **Error Handling**: Trigger errors - should show retry UI instead of refresh
3. **Transaction Actions**: Complete transactions - should update data without refresh
4. **Long Usage**: Use app for 10+ minutes - should not auto-refresh

### 3. Monitor Performance
- Check browser console for refresh prevention logs
- Watch the refresh monitor component (top-right corner)
- Monitor network tab for unnecessary requests

## Configuration Options

### Environment Variables
```env
# Idle timeout (default: 30 minutes)
VITE_IDLE_TIMEOUT_MINUTES=30

# Test mode (shorter timeouts for testing)
VITE_IDLE_TEST_SECONDS=0
```

### Debug Flags
```javascript
// Enable refresh monitoring
localStorage.setItem('debug_refresh_monitor', 'true');

// Enable performance logging
localStorage.setItem('debug_performance', 'true');
```

## Monitoring and Maintenance

### 1. Check for New Refresh Triggers
- Search codebase for `window.location.reload()`
- Monitor `beforeunload` events
- Watch for error boundary triggers

### 2. Performance Monitoring
- Monitor interval frequencies
- Check for memory leaks in long-running timers
- Validate error retry logic

### 3. User Experience Metrics
- Track user session duration
- Monitor error rates
- Measure page load performance

## Emergency Rollback

If issues persist, you can temporarily disable refresh prevention:

```typescript
// In App.tsx, comment out or modify:
useRefreshPrevention({
  preventOnError: false, // Disable error prevention
  preventOnLanguageChange: false, // Allow language refreshes
  preventOnDataUpdate: false, // Allow data update refreshes
  maxErrorRetries: 0 // Immediate fallback to refresh
});
```

## Next Steps

1. **Monitor**: Watch for refresh events in production
2. **Optimize**: Further reduce polling frequencies if needed
3. **Enhance**: Add more sophisticated error recovery
4. **Document**: Update user guides with new behavior

## Files Modified

- `src/hooks/useRefreshPrevention.ts` (new)
- `src/components/Debug/RefreshMonitor.tsx` (new)
- `src/components/Common/DataLoadingErrorBoundary.tsx`
- `src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx`
- `src/pages/Fiscal/EnhancedOpeningBalanceImport.tsx`
- `src/pages/Transactions/TransactionDetails.tsx`
- `src/pages/PerformanceDashboard.tsx`
- `src/components/Common/PerformanceDashboard.tsx`
- `src/App.tsx`

The app should now provide a much smoother user experience without unexpected refreshes.