# 🚀 FINAL EXECUTION PLAN — OFFLINE-FIRST ACCOUNTING SYSTEM
## Status: APPROVED FOR IMPLEMENTATION

**Date**: February 18, 2026  
**Status**: ✅ **GO FOR EXECUTION**  
**Review Chain**: Kiro AI → Engineering Review → Engineering Response → Consultant Review → Clarifications → **FINAL APPROVAL**  
**Confidence Level**: 9.2/10 (Very High)

---

## 📋 EXECUTIVE SUMMARY

The offline-first accounting system specification has completed comprehensive review and is **READY FOR IMPLEMENTATION**. All mandatory corrections applied, all critical clarifications resolved, and production-ready solutions documented.

**Review History**:
1. ✅ Initial spec created by Kiro AI (design.md, requirements.md, tasks.md)
2. ✅ Engineering review identified 5 mandatory corrections
3. ✅ Kiro applied all 5 corrections successfully
4. ✅ Consultant review identified 4 critical clarifications needed
5. ✅ All 4 clarifications resolved with production-ready solutions
6. ✅ Final approval granted

**Budget**: $128,000 baseline + $15,000 contingency = **$143,000 total**  
**Timeline**: 13-14 weeks (13 weeks baseline + 1 week buffer)  
**Team Size**: 4 developers  
**Risk Level**: LOW (all major risks mitigated)

---

## ✅ MANDATORY SPEC UPDATES BEFORE EXECUTION

### UPDATE 1: requirements.md Additions

Add these three new acceptance criteria to **Requirement 7 (User Experience)**:

```markdown
## Requirement 7: User Experience (EXISTING)

### Acceptance Criteria (EXISTING 1-7, ADD NEW 7.8-7.10)

7.8 Conflict Resolution UI
WHEN a conflict is detected, THE System SHALL display a modal dialog with:
- Side-by-side comparison of conflicting versions
- Clear action buttons (Keep Both, Keep Mine Only, Keep Server Version, Merge Manually)
- Match score and conflict reasons for suspected duplicates (e.g., "90% match: same supplier, amount within 5%, date within 3 days")
- Notification of other users affected by the resolution decision
- User decision is logged in audit trail with full context
- Conflicting versions are preserved for audit purposes

7.9 Long-Running Sync UX
WHEN sync operations exceed 30 seconds, THE System SHALL:
- Display progress modal with detailed metrics: operations synced, conflicts detected, errors encountered, estimated time remaining
- Allow user to continue working in background while sync proceeds
- Queue new operations separately from in-progress sync to prevent conflicts
- Show toast notification on sync completion with summary: "Sync complete. 145 synced, 5 need review, 0 errors"
- Automatically resume interrupted syncs on next login with "Previous sync incomplete. Resume now?" prompt
- Maintain sync progress in IndexedDB for recovery after browser close

7.10 Sync Interruption Handling
WHEN sync is interrupted (browser close, network drop, system crash), THE System SHALL:
- Mark last successfully synced operation as checkpoint
- On next login, detect incomplete sync and offer to resume: "Resume sync from where you left off? (150 of 500 operations remaining)"
- Never re-sync already completed operations (verify by operation ID)
- Maintain sync state in IndexedDB separate from transaction data
- Provide "Start Fresh" option if user suspects sync corruption
- Log all interruptions with timestamp, cause, and recovery action taken
```

Add new acceptance criteria to **Requirement 6 (Performance Requirements)**:

```markdown
## Requirement 6: Performance Requirements (EXISTING)

### Acceptance Criteria (EXISTING 6.1-6.7, ADD NEW 6.8)

6.8 Platform-Specific Limitations
THE System SHALL document and handle platform-specific limitations:
- iOS PWA: Background Sync API not supported - SHALL use visibility change events as fallback trigger
- iOS PWA: Periodic Sync API not supported - SHALL rely on manual sync and visibility changes only
- iOS Safari: Battery API not available - SHALL skip battery-based optimizations on iOS
- Firefox Private Mode: IndexedDB not persisted across sessions - SHALL warn user on startup
- Safari: Persistent Storage API required - SHALL request on first use to prevent data eviction
- Mobile browsers: Reduced sync frequency (2 hours vs 1 hour desktop) to conserve battery
- 2G networks: Large sync operations (>50 ops) SHALL be deferred until better connection detected
```

---

### UPDATE 2: design.md Section 6 (NEW SECTION)

Add this entirely new section **after Section 5 (current last section)**:

```markdown
## 6. Disaster Recovery Procedures

This section defines comprehensive disaster recovery procedures for all failure modes that could result in data loss or system unavailability.

### 6.1 Corruption Detection and Recovery

**Detection Mechanism**:
```typescript
async function detectCorruption(): Promise<CorruptionReport> {
  try {
    // Attempt to open database
    const db = await Dexie.open('accounting_db');
    
    // Test read operation
    const testRead = await db.transactions.limit(1).toArray();
    
    // Verify data integrity (check hash chains, foreign keys)
    const integrityCheck = await verifyDataIntegrity(testRead);
    
    if (!integrityCheck.valid) {
      return {
        corrupted: true,
        reason: 'integrity_check_failed',
        details: integrityCheck.errors
      };
    }
    
    return { corrupted: false };
  } catch (error) {
    // Safari quota exceeded or database corruption
    return {
      corrupted: true,
      reason: 'database_open_failed',
      details: error.message
    };
  }
}
```

**Recovery Procedure**:
1. **Backup Corrupted Data**: Export all IndexedDB data for forensic analysis
2. **Report to Server**: Send corruption report with browser info, data size, last operation
3. **Delete Corrupted Database**: `await Dexie.delete('accounting_db')`
4. **Rebuild from Server**: Fetch last 1000 transactions from server for current fiscal year
5. **Re-initialize**: Create fresh IndexedDB with server data
6. **Notify User**: Display recovery summary with data loss assessment
7. **Audit Log**: Record corruption event and recovery actions taken

**Data Loss Assessment**:
- Synced transactions: No loss (recoverable from server)
- Unsynced transactions: Lost if not in sync queue
- Pending operations: Recoverable if sync queue intact
- User notified: "Database rebuilt. Last 1000 transactions restored. X unsynced transactions may be lost."

### 6.2 Partial Sync Failure Recovery

**Checkpoint-Based Sync Strategy**:
```typescript
interface SyncCheckpoint {
  id: string;
  timestamp: Date;
  lastSyncedOperationIndex: number;
  totalOperations: number;
  syncedOperations: SyncOperation[];
  pendingOperations: SyncOperation[];
}

async function syncWithCheckpoints(operations: SyncOperation[]): Promise<SyncResult> {
  const checkpoint = await getLastCheckpoint() || createInitialCheckpoint(operations);
  const remaining = operations.slice(checkpoint.lastSyncedOperationIndex);
  
  for (let i = 0; i < remaining.length; i++) {
    try {
      const result = await syncOperation(remaining[i]);
      
      // Save checkpoint every 10 operations
      if (i > 0 && i % 10 === 0) {
        await saveCheckpoint({
          ...checkpoint,
          lastSyncedOperationIndex: checkpoint.lastSyncedOperationIndex + i,
          timestamp: new Date()
        });
      }
    } catch (error) {
      // Sync failed - rollback to last checkpoint
      await rollbackToCheckpoint(checkpoint);
      
      return {
        success: false,
        syncedCount: i,
        failedOperation: remaining[i],
        error: error.message,
        canResume: true,
        resumeFrom: checkpoint.lastSyncedOperationIndex + i
      };
    }
  }
  
  await clearCheckpoints();  // Sync complete, clean up
  return { success: true, syncedCount: remaining.length };
}
```

**Rollback Procedure**:
1. **Identify Operations Since Checkpoint**: Query sync queue for operations after checkpoint timestamp
2. **Reverse Operations**: For each operation, apply inverse operation (CREATE → DELETE, UPDATE → restore old value)
3. **Mark as Pending**: Change status of rolled-back operations to 'pending'
4. **Preserve Audit Trail**: Log rollback event with reason and operations affected
5. **Notify User**: "Sync interrupted. Rolled back to safe state. Resume sync?"

**Resume Capability**:
- User can resume from last checkpoint without re-syncing completed operations
- "Resume sync from operation 150 of 500?" prompt on next login
- Option to "Start Fresh" if user suspects checkpoint corruption

### 6.3 Data Loss Prevention

**Persistent Storage Request**:
```typescript
async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    console.warn('Persistent Storage API not available');
    return false;
  }
  
  // Request permission to prevent browser eviction
  const isPersisted = await navigator.storage.persist();
  
  if (isPersisted) {
    console.log('Storage will not be cleared automatically by browser');
    await logSystemEvent({
      type: 'storage_persistence_granted',
      timestamp: new Date()
    });
    return true;
  } else {
    // Show user prompt explaining importance
    await showPersistenceEducationModal();
    return false;
  }
}
```

**Data Loss Detection**:
```typescript
async function detectDataLoss(): Promise<DataLossReport> {
  // Check localStorage canary (persists when IndexedDB cleared)
  const lastSyncTimestamp = localStorage.getItem('lastSyncTimestamp');
  const lastOperationCount = localStorage.getItem('lastOperationCount');
  
  // Check if IndexedDB exists
  const dbExists = await Dexie.exists('accounting_db');
  
  if (lastSyncTimestamp && !dbExists) {
    const lastSync = new Date(lastSyncTimestamp);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / 1000 / 60 / 60;
    
    return {
      dataLost: true,
      lastSync: lastSync,
      estimatedLoss: parseInt(lastOperationCount) || 0,
      hoursSinceSync: hoursSinceSync,
      severity: hoursSinceSync < 24 ? 'moderate' : 'critical'
    };
  }
  
  return { dataLost: false };
}
```

**User Warning System**:
- On startup, check for data loss
- If detected, show modal: "Your offline data was cleared. Last sync: [timestamp]. Estimated loss: [count] transactions."
- Options: "Restore from Server" (rebuild from server), "Contact Support" (potential data recovery)
- Never silently lose data - always inform user

**Data Loss Policy**:

**Acceptable Data Loss** (can be recovered):
- Synced transactions → Recoverable from server
- Cached reports → Regenerable from server data
- UI preferences → Non-critical, user can reconfigure

**Unacceptable Data Loss** (CRITICAL - must warn):
- Unsynced transactions → Lost forever if not in server
- Pending approvals → Lost if not synced
- Draft entries → Lost if not synced
- User MUST be warned before any of these are lost

### 6.4 Bulk Rejection Handling

**Common Rejection Scenarios**:

**Scenario A: Fiscal Period Closed**
```typescript
async function handleFiscalPeriodClosed(
  rejectedOps: SyncOperation[],
  closedPeriodId: string
): Promise<void> {
  const currentPeriod = await getCurrentOpenPeriod();
  
  const userChoice = await showModal({
    title: 'Fiscal Period Closed',
    message: `The fiscal period for ${rejectedOps.length} offline transactions 
              was closed while you were offline.
              
              Closed Period: ${closedPeriodId}
              Current Period: ${currentPeriod.name}
              
              Would you like to move all transactions to the current period?`,
    actions: [
      { label: 'Move to Current Period', value: 'bulk_move' },
      { label: 'Review Individually', value: 'individual' },
      { label: 'Cancel (Keep Pending)', value: 'cancel' }
    ]
  });
  
  if (userChoice === 'bulk_move') {
    // Bulk update all operations
    await bulkUpdateFiscalPeriod(rejectedOps, currentPeriod.id);
    await retrySync(rejectedOps);
  } else if (userChoice === 'individual') {
    await openBulkEditModal(rejectedOps);
  }
}
```

**Scenario B: Account Codes Changed**
```typescript
async function handleAccountCodesChanged(
  rejectedOps: SyncOperation[]
): Promise<void> {
  // Server returns mapping: old_code → new_code
  const accountMapping = await fetchAccountCodeMapping();
  
  const userChoice = await showModal({
    title: 'Account Codes Updated',
    message: `Some account codes changed while you were offline.
              ${rejectedOps.length} transactions use old codes.
              
              We can automatically remap to new codes.`,
    actions: [
      { label: 'Auto-Remap', value: 'auto' },
      { label: 'Review Changes', value: 'review' },
      { label: 'Manual Edit', value: 'manual' }
    ]
  });
  
  if (userChoice === 'auto') {
    await bulkRemapAccountCodes(rejectedOps, accountMapping);
    await retrySync(rejectedOps);
  }
}
```

**Bulk Edit Interface Requirements**:
- Display all rejected operations in grid view
- Allow bulk selection and editing
- Show rejection reason for each operation
- Provide suggested fixes (e.g., new fiscal period)
- Allow export to CSV for external review
- Never silently discard rejected operations

**Audit Trail for Rejections**:
- Log all rejections with server response
- Log user remediation actions (bulk move, manual edit, etc.)
- Log retry attempts and outcomes
- Preserve original rejected data for compliance

### 6.5 Recovery Metrics and Monitoring

**Track All Recovery Events**:
```typescript
interface RecoveryMetrics {
  recoveryId: string;
  recoveryType: 'corruption' | 'partial_sync' | 'data_loss' | 'bulk_rejection';
  startTime: Date;
  endTime: Date;
  operationsAffected: number;
  operationsRecovered: number;
  operationsLost: number;
  recoverySource: 'server' | 'local_backup' | 'manual';
  userImpact: 'none' | 'minor' | 'major' | 'critical';
  browserInfo: string;
  errorDetails: string;
}

async function recordRecoveryEvent(metrics: RecoveryMetrics): Promise<void> {
  // Store locally
  await db.recoveryEvents.add(metrics);
  
  // Send to server for analysis
  await fetch('/api/recovery-events', {
    method: 'POST',
    body: JSON.stringify(metrics)
  });
  
  // Alert if critical
  if (metrics.userImpact === 'critical') {
    await alertAdministrators({
      type: 'critical_data_recovery',
      user: currentUser,
      details: metrics
    });
  }
}
```

**System Health Checks**:
```typescript
interface SystemHealthCheck {
  timestamp: Date;
  indexedDBStatus: 'healthy' | 'corrupted' | 'unreachable';
  lastSuccessfulSync: Date;
  pendingOperations: number;
  storageQuotaUsed: number;
  storageQuotaAvailable: number;
  quotaPercentUsed: number;
  hasUnresolvedConflicts: boolean;
  oldestPendingOperation: Date;
}

// Run on startup and hourly
async function performHealthCheck(): Promise<SystemHealthCheck> {
  const health = await {
    timestamp: new Date(),
    indexedDBStatus: await checkIndexedDBStatus(),
    lastSuccessfulSync: await getLastSyncTimestamp(),
    pendingOperations: await getPendingOperationsCount(),
    storageQuotaUsed: await getStorageUsed(),
    storageQuotaAvailable: await getStorageQuota(),
    quotaPercentUsed: await getQuotaPercentage(),
    hasUnresolvedConflicts: await hasConflicts(),
    oldestPendingOperation: await getOldestPendingOperationDate()
  };
  
  // Alert if unhealthy for >24 hours
  if (health.indexedDBStatus !== 'healthy') {
    const lastHealthyCheck = await getLastHealthyCheck();
    const hoursUnhealthy = (Date.now() - lastHealthyCheck.getTime()) / 1000 / 60 / 60;
    
    if (hoursUnhealthy > 24) {
      await alertAdministrators({
        type: 'prolonged_unhealthy_state',
        user: currentUser,
        health: health,
        hoursUnhealthy: hoursUnhealthy
      });
    }
  }
  
  return health;
}
```

**Recovery Testing Requirements**:
- Test corruption detection on Safari, Chrome, Firefox
- Test partial sync failure with network simulator
- Test data loss detection after browser clear
- Test bulk rejection with closed fiscal period
- Test recovery on mobile browsers (iOS Safari, Chrome Mobile)
- All recovery scenarios must be tested in Task 14 (Advanced Testing)
```

---

### UPDATE 3: design.md Section 2.2 (ADD TO EXISTING SECTION)

Add this subsection to the **existing Section 2.2 (Synchronization Engine)**:

```markdown
## Section 2.2 Synchronization Engine (EXISTING)

[... existing content ...]

### Background Sync Strategy (NEW SUBSECTION)

**Sync Triggers**:

The system uses four sync triggers with different priorities and requirements:

1. **User-Initiated Sync** (Highest Priority)
   - Trigger: Manual "Sync" button click
   - Priority: High (immediate execution)
   - Requires: Active user session with valid auth token
   - Behavior: Full sync with progress modal, user can wait or continue in background
   - Timeout: None (runs until complete or user cancels)

2. **Network Connection Restored** (High Priority)
   - Trigger: Browser 'online' event detected
   - Priority: High
   - Requires: Valid auth token or refresh token
   - Behavior: Automatic sync starts after 2-second stabilization delay
   - Timeout: 5 minutes (then switches to background periodic)

3. **Periodic Background Sync** (Medium Priority)
   - Trigger: Browser Periodic Background Sync API (if supported)
   - Interval: 1 hour (desktop), 2 hours (mobile)
   - Priority: Low (can be deferred)
   - Requires: Valid auth token, battery >20% (mobile only), not on 2G network
   - Behavior: Silent background sync, notification only if conflicts detected
   - Timeout: 10 minutes

4. **App Visibility Change** (Medium Priority)
   - Trigger: Browser 'visibilitychange' event (tab becomes active)
   - Priority: Medium
   - Requires: Valid auth token
   - Behavior: Check for pending operations, sync if any exist
   - Throttle: Maximum once per minute
   - Timeout: 2 minutes

**Token Expiry Handling**:

Supabase JWT tokens expire after 1 hour by default. Background sync must handle token expiry gracefully:

```typescript
async function attemptBackgroundSync(): Promise<SyncResult> {
  // Step 1: Retrieve stored token
  const token = await getStoredToken();
  
  if (!token) {
    await logSyncEvent({
      status: 'skipped',
      reason: 'no_token',
      action: 'wait_for_user_login'
    });
    return { success: false, reason: 'no_token' };
  }
  
  // Step 2: Check token validity
  if (isTokenExpired(token)) {
    const refreshToken = await getRefreshToken();
    
    if (refreshToken) {
      try {
        // Attempt automatic refresh via Supabase API
        const newToken = await refreshAuthToken(refreshToken);
        await storeToken(newToken);
        
        await logSyncEvent({
          status: 'token_refreshed',
          action: 'proceeding_with_sync'
        });
      } catch (error) {
        // Refresh failed - queue sync for next user interaction
        await logSyncEvent({
          status: 'skipped',
          reason: 'token_expired_refresh_failed',
          action: 'queue_for_next_user_interaction'
        });
        
        // Show browser notification
        await showNotification({
          title: 'Sync Pending',
          body: 'Please open the app to sync your offline changes.',
          tag: 'sync-auth-required',
          requiresAction: true
        });
        
        return { success: false, reason: 'token_refresh_failed' };
      }
    } else {
      // No refresh token - user must re-authenticate
      await logSyncEvent({
        status: 'skipped',
        reason: 'token_expired_no_refresh',
        action: 'queue_for_next_user_interaction'
      });
      
      return { success: false, reason: 'no_refresh_token' };
    }
  }
  
  // Step 3: Proceed with sync using valid token
  return await performSync(token);
}

// Supabase token refresh implementation
async function refreshAuthToken(refreshToken: string): Promise<AuthToken> {
  const response = await fetch('https://your-project.supabase.co/auth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
  
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
}
```

**Battery & Performance Constraints**:

Mobile browsers require special handling to avoid draining battery and consuming expensive cellular data:

```typescript
async function shouldAttemptBackgroundSync(): Promise<{ allowed: boolean; reason?: string }> {
  const platform = getPlatformConfig();  // desktop vs mobile
  
  // 1. Battery Level Check (mobile only)
  if (platform.isMobile && 'getBattery' in navigator) {
    const battery = await (navigator as any).getBattery();
    
    if (!battery.charging && battery.level < platform.batteryThreshold) {
      await logSyncEvent({
        status: 'skipped',
        reason: 'low_battery',
        batteryLevel: battery.level
      });
      return { allowed: false, reason: 'low_battery' };
    }
    
    // Always allow sync when charging
    if (battery.charging) {
      return { allowed: true };
    }
  }
  
  // 2. Network Type Check (avoid large syncs on slow/expensive connections)
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    const pendingOps = await getPendingOperationsCount();
    const estimatedDataSize = await estimateSyncDataSize(pendingOps);
    
    // Skip large syncs (>50 operations) on 2G networks
    if (connection.effectiveType === '2g' && pendingOps > 50) {
      await logSyncEvent({
        status: 'skipped',
        reason: 'slow_network',
        networkType: connection.effectiveType,
        pendingOps: pendingOps
      });
      return { allowed: false, reason: 'slow_network' };
    }
    
    // Warn user if sync will use significant cellular data
    if (connection.type === 'cellular' && estimatedDataSize > 5 * 1024 * 1024) {
      const userConfirmed = await showModal({
        title: 'Cellular Data Usage',
        message: `Sync will use approximately ${formatBytes(estimatedDataSize)} of cellular data.`,
        actions: ['Sync Now', 'Wait for WiFi']
      });
      
      if (userConfirmed !== 'Sync Now') {
        return { allowed: false, reason: 'user_deferred_cellular' };
      }
    }
  }
  
  return { allowed: true };
}

// Platform-specific configuration
const SYNC_CONFIG = {
  desktop: {
    isMobile: false,
    periodicSyncInterval: 3600000,  // 1 hour
    maxConcurrentOperations: 50,
    retryAttempts: 5,
    batteryThreshold: 0  // No battery check on desktop
  },
  mobile: {
    isMobile: true,
    periodicSyncInterval: 7200000,  // 2 hours (less frequent)
    maxConcurrentOperations: 20,    // Smaller batches
    retryAttempts: 3,                // Fewer retries
    batteryThreshold: 0.20,          // Only sync if battery >20%
    preferWiFi: true                 // Prefer WiFi for large syncs
  }
};

function getPlatformConfig(): SyncConfig {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return isMobile ? SYNC_CONFIG.mobile : SYNC_CONFIG.desktop;
}
```

**Exponential Backoff Strategy**:

Failed sync attempts use exponential backoff to avoid overwhelming the server and draining battery:

```typescript
class SyncBackoffStrategy {
  private attempts = 0;
  private readonly maxAttempts = 5;
  private readonly baseDelay = 1000;  // 1 second
  
  async getNextDelay(): Promise<number> {
    if (this.attempts >= this.maxAttempts) {
      // Give up on automatic background sync
      // Queue for next user interaction
      await logSyncEvent({
        status: 'max_retries_exceeded',
        attempts: this.attempts,
        action: 'wait_for_user_interaction'
      });
      return Infinity;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = this.baseDelay * Math.pow(2, this.attempts);
    this.attempts++;
    
    await logSyncEvent({
      status: 'retry_scheduled',
      attempt: this.attempts,
      delayMs: delay
    });
    
    return delay;
  }
  
  reset(): void {
    this.attempts = 0;
  }
}
```

**Service Worker Cache Strategy**:

CRITICAL: Service Worker must NEVER cache financial data. Only static assets are cacheable.

```typescript
// Service Worker cache configuration
const CACHE_STRATEGY = {
  // Static assets: cache-first (safe to cache)
  staticAssets: {
    pattern: /\.(js|css|png|jpg|svg|woff2)$/,
    strategy: 'cache-first',
    cacheName: 'static-assets-v1',
    maxAge: 86400000  // 24 hours
  },
  
  // App shell: cache-first with background update
  appShell: {
    pattern: /^\/$/,
    strategy: 'cache-first',
    cacheName: 'app-shell-v1',
    updateInBackground: true
  },
  
  // API responses: NEVER cache (contains financial data)
  apiResponses: {
    pattern: /\/api\//,
    strategy: 'network-only',  // CRITICAL: Never cache
    cache: false
  },
  
  // Non-sensitive metadata: stale-while-revalidate
  metadata: {
    pattern: /\/api\/metadata/,
    strategy: 'stale-while-revalidate',
    cacheName: 'metadata-v1',
    maxAge: 300000  // 5 minutes
  }
};

// Service Worker fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NEVER cache API responses containing financial data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Cache static assets only
  event.respondWith(cacheFirstStrategy(event.request));
});

async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cache = await caches.open('static-assets-v1');
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  await cache.put(request, networkResponse.clone());
  return networkResponse;
}
```

**iOS PWA Limitations**:

iOS Safari does not support Background Sync API or Periodic Sync API. The system uses fallback strategies:

```typescript
const PLATFORM_CAPABILITIES = {
  chrome_desktop: {
    backgroundSync: true,
    periodicSync: true,
    batteryAPI: true
  },
  safari_ios: {
    backgroundSync: false,  // NOT SUPPORTED
    periodicSync: false,    // NOT SUPPORTED
    batteryAPI: false,      // NOT SUPPORTED
    fallbackStrategy: 'visibility-change-only'
  },
  chrome_android: {
    backgroundSync: true,
    periodicSync: true,
    batteryAPI: true
  }
};

// iOS fallback: Use visibility change events only
if (!('sync' in ServiceWorkerRegistration.prototype)) {
  console.warn('Background Sync API not available. Using visibility fallback.');
  
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const pendingOps = await getPendingOperationsCount();
      if (pendingOps > 0) {
        await attemptSync();
      }
    }
  });
}
```

**Notification Strategy**:

Browser notifications are used sparingly to avoid annoying users:

```typescript
const NOTIFICATION_POLICY = {
  syncComplete: {
    show: false,  // Don't spam - use toast notification in app instead
  },
  syncFailed: {
    show: true,   // Important - user needs to know
    requiresAction: true,
    body: 'Sync failed. Your offline changes are safe. Try again?'
  },
  authRequired: {
    show: true,   // Critical - blocks sync
    requiresAction: true,
    body: 'Please open the app to sync your offline changes.'
  },
  conflictDetected: {
    show: true,   // Requires user decision
    requiresAction: true,
    body: '{count} conflicts detected. Review needed.'
  },
  bulkRejection: {
    show: true,   // Critical - data not synced
    requiresAction: true,
    body: '{count} transactions rejected. Action required.'
  }
};
```
```

---

## 🎯 IMPLEMENTATION SEQUENCE

### Phase 0: Pre-Implementation (COMPLETE THESE FIRST)

**Duration**: 1 day  
**Responsible**: Project lead + Kiro AI

- [ ] Apply UPDATE 1 to requirements.md (new acceptance criteria 7.8, 7.9, 7.10, 6.8)
- [ ] Apply UPDATE 2 to design.md (new Section 6: Disaster Recovery Procedures)
- [ ] Apply UPDATE 3 to design.md (add Background Sync Strategy to Section 2.2)
- [ ] Commit updated specs to repository
- [ ] Review updated specs with stakeholders (optional, 1 hour meeting)
- [ ] Obtain final sign-off from project owner

**Definition of Done**: All spec files updated and committed, stakeholders notified

---

### Phase 1: Foundation & Infrastructure (tasks.md Task 1)

**Duration**: 1 week  
**Responsible**: Kiro AI

**Objectives**:
- Set up TypeScript project with enterprise configuration
- Configure Dexie.js (IndexedDB wrapper) with proper schema
- Implement basic data models (Transaction, TransactionLine)
- Set up testing framework with property-based testing (fast-check)
- Implement storage quota monitoring

**Success Criteria**:
- Dexie.js successfully opens IndexedDB
- Basic CRUD operations work for transactions
- Storage quota monitoring reports usage correctly
- All tests pass

**Checkpoint**: Report status before proceeding to Phase 2

---

### Phase 2: ACID & Data Integrity (tasks.md Tasks 2, 3)

**Duration**: 1.5 weeks  
**Responsible**: Kiro AI

**Objectives**:
- Implement ACID transaction management with optimistic locking
- Create cryptographic integrity system (hash generation, verification)
- Build immutable audit trail with blockchain-style linking
- Implement accounting equation validation (Assets = Liabilities + Equity)
- Create referential integrity validation

**Success Criteria**:
- Property tests pass for ACID compliance (Property 1)
- Hash verification detects tampered data (Property 2)
- Audit trail cannot be modified (Property 3)
- Accounting equation validation rejects unbalanced transactions (Property 4)
- Foreign key constraints enforced (Property 5)

**Checkpoint**: Report status before proceeding to Phase 3

---

### Phase 3: Security Layer (tasks.md Task 9 - MOVED UP)

**Duration**: 2 weeks  
**Responsible**: Kiro AI

**CRITICAL**: This phase MUST execute BEFORE Phase 4 (Offline Data Management)

**Objectives**:
- Implement SecurityManager with authentication and session management
- Create AES-256-GCM encryption for all offline data
- Implement PBKDF2 key derivation (100,000 iterations)
- Add field-level encryption for sensitive data
- Create auto-lock mechanism (5 min idle timeout)
- Implement secure wipe on logout

**Success Criteria**:
- All IndexedDB data encrypted at rest
- PIN authentication required for decryption
- Auto-lock triggers after 5 minutes
- Secure wipe overwrites data before delete
- Property tests pass for encryption (Property 14, 15, 16)

**Checkpoint**: Report status before proceeding to Phase 4

---

### Phase 4: Offline Data Management (tasks.md Task 5)

**Duration**: 2 weeks  
**Responsible**: Kiro AI

**PREREQUISITE**: Phase 3 (Security Layer) must be complete

**Objectives**:
- Implement OfflineDataManager with CRUD operations
- Create offline queue system with priority handling
- Implement storage management with fiscal year prioritization
- Add 200MB mobile storage cap
- Implement attachment cloud-reference strategy
- Create storage dashboard

**Success Criteria**:
- All writes go through encryption layer
- Offline queue supports 1000+ operations without degradation
- Storage dashboard displays quota usage correctly
- Mobile cap prevents quota exhaustion
- Attachments use cloud references by default
- Property tests pass for queue performance (Property 18)

**Checkpoint**: Report status before proceeding to Phase 5

---

### Phase 5: Synchronization Engine (tasks.md Task 6)

**Duration**: 3 weeks  
**Responsible**: Kiro AI

**Objectives**:
- Implement SynchronizationEngine with hybrid conflict detection (server sequence + vector clocks)
- Create four sync triggers (user, network, periodic, visibility)
- Implement token expiry handling with automatic refresh
- Add battery-aware sync (skip if <20% on mobile)
- Implement platform-specific configs (desktop vs mobile)
- Create exponential backoff for failed syncs
- Implement checkpoint-based sync (save every 10 operations)
- Add Service Worker with proper cache strategy (never cache financial data)

**Success Criteria**:
- Sync triggers fire correctly on all events
- Token refresh works automatically
- Battery checks prevent drain on mobile
- Exponential backoff prevents server overload
- Checkpoints allow resume after interruption
- Service Worker never caches API responses
- Property tests pass for automatic sync (Property 27)
- Property tests pass for incremental sync (Property 28)
- Property tests pass for sync failure recovery (Property 29)

**Checkpoint**: Report status before proceeding to Phase 6

---

### Phase 6: Conflict Resolution (tasks.md Task 7)

**Duration**: 3 weeks  
**Responsible**: Kiro AI

**Objectives**:
- Implement ConflictResolver with accounting-specific strategies
- Add semantic duplicate detection (same supplier, ±5% amount, ±3 days)
- Create conflict resolution UI with side-by-side comparison
- Implement "Keep Both", "Keep Mine", "Keep Server", "Merge" workflows
- Add long-running sync progress modal
- Implement background sync continuation
- Create sync interruption recovery (resume from checkpoint)

**Success Criteria**:
- Duplicate payments detected and flagged for manual review
- Amount discrepancies show conflict modal
- Long-running syncs (>30 sec) show progress modal
- User can continue working during background sync
- Interrupted syncs resume on next login
- Property tests pass for sequence rebasing (Property 6)
- Property tests pass for conflict preservation (Property 7)
- Property tests pass for fiscal period protection (Property 8)

**Checkpoint**: Report status before proceeding to Phase 7

---

### Phase 7: Performance Optimization (tasks.md Task 10)

**Duration**: 1 week  
**Responsible**: Kiro AI

**Objectives**:
- Implement performance monitoring with overhead measurement
- Add memory usage optimization and cleanup
- Create graceful degradation for poor connections
- Implement system health checks (startup + hourly)

**Success Criteria**:
- Operation overhead <100ms (Property 17)
- Queue handles 1000+ operations without degradation (Property 18)
- Background sync non-blocking (Property 19)
- Health checks detect corruption within 1 hour

**Checkpoint**: Report status before proceeding to Phase 8

---

### Phase 8: Compliance & Regulatory (tasks.md Task 11)

**Duration**: 1 week  
**Responsible**: Kiro AI

**Objectives**:
- Implement SOX compliance with server-side hash chain
- Create GDPR compliance (data portability, deletion)
- Add GAAP transaction validation

**Success Criteria**:
- Audit trail hash chain implemented on server (Supabase Edge Function)
- Data export works for GDPR
- GAAP validation rejects non-compliant transactions
- Property tests pass for compliance (Properties 31, 32, 33, 34)

---

### Phase 9: Migration & Deployment (tasks.md Task 12)

**Duration**: 1 week  
**Responsible**: Kiro AI

**Objectives**:
- Create feature flag system
- Implement database migration with rollback
- Add parallel operation support

**Success Criteria**:
- Features can be toggled without deployment
- Migration rollback tested and working
- System runs alongside existing features

**Checkpoint**: Report status before proceeding to Phase 10

---

### Phase 10: Advanced Testing (tasks.md Task 14)

**Duration**: 2 weeks  
**Responsible**: Kiro AI + QA

**Objectives**:
- Test all disaster recovery scenarios (corruption, partial sync, data loss, bulk rejection)
- Test on multiple browsers (Chrome, Safari, Firefox) and platforms (desktop, iOS, Android)
- Chaos engineering tests (network failures, data corruption)
- Mobile browser specific tests (Safari iOS quota, Chrome Android)
- Property-based tests for all 34 correctness properties

**Success Criteria**:
- All disaster recovery procedures tested and working
- All browsers tested (desktop + mobile)
- All 34 property tests pass
- Chaos tests reveal no critical bugs

**Checkpoint**: Report status before proceeding to Phase 11

---

### Phase 11: UX Layer (tasks.md Task 15)

**Duration**: 1 week  
**Responsible**: Kiro AI

**Objectives**:
- Implement offline capability toggle
- Create pending operations management UI
- Add conflict resolution modals (duplicate, discrepancy, bulk rejection)
- Implement progress modals for long-running syncs
- Add toast notifications for sync events

**Success Criteria**:
- All UX flows from UPDATE 1 implemented
- Conflict modals match ASCII mockups
- Progress modal shows accurate metrics
- Users can continue working during background sync

---

### Phase 12: Final Integration (tasks.md Task 17)

**Duration**: 1 week  
**Responsible**: Kiro AI

**Objectives**:
- Wire all components together
- Create unified API layer
- Add comprehensive error handling
- Final end-to-end testing

**Success Criteria**:
- All components integrated successfully
- End-to-end workflows tested
- Error handling covers all scenarios

**Final Checkpoint**: Production readiness validation

---

## 📊 SUCCESS METRICS

### Technical Metrics

- [ ] All 34 correctness properties pass property-based tests
- [ ] Operation overhead <100ms (99th percentile)
- [ ] Offline queue handles 1000+ operations without degradation
- [ ] Storage quota monitoring accurate to within 5%
- [ ] All data encrypted at rest (AES-256-GCM)
- [ ] Background sync battery impact <5% per hour on mobile
- [ ] Sync success rate >99.5% under normal conditions
- [ ] Conflict resolution accuracy >95% (automatic resolution)
- [ ] Zero data loss incidents in disaster recovery scenarios

### User Experience Metrics

- [ ] Sync operation transparent to users (no blocking)
- [ ] Conflict resolution modals intuitive (>90% user success rate)
- [ ] Long-running syncs interruptible and resumable
- [ ] Average time to resolve conflict <2 minutes
- [ ] User can continue working during sync 100% of the time
- [ ] Storage dashboard understandable (>90% comprehension in user testing)

### Business Metrics

- [ ] Zero financial data loss incidents
- [ ] 100% audit trail integrity (no gaps or tampering)
- [ ] SOX, GDPR, GAAP compliance verified by external audit
- [ ] System uptime >99.9% (excluding planned maintenance)
- [ ] Customer satisfaction >4.5/5 for offline feature

---

## 🚨 RISK MITIGATION

### Risk 1: Mobile Browser Storage Eviction (HIGH)

**Risk**: iOS Safari may evict IndexedDB data without warning despite persistent storage request

**Mitigation**:
- Request persistent storage API on first use
- Implement data loss detection (localStorage canary)
- Warn users if data eviction detected
- Provide "Restore from Server" one-click recovery
- Test extensively on iOS Safari 15, 16, 17

**Owner**: Kiro AI (Phase 4)

---

### Risk 2: Conflict Resolution Complexity (MEDIUM)

**Risk**: Users may struggle with complex conflict resolution workflows

**Mitigation**:
- Provide guided conflict resolution wizard
- Default to safest option (Keep Both, manual review)
- Add contextual help tooltips
- Include "Ask Colleague" escalation path
- User testing on conflict modals before launch

**Owner**: Kiro AI (Phase 6) + UX review

---

### Risk 3: Background Sync Token Expiry (MEDIUM)

**Risk**: Tokens expire during long offline periods, blocking background sync

**Mitigation**:
- Implement automatic token refresh using Supabase refresh tokens
- Show user notification if refresh fails
- Queue sync for next user interaction if token expired
- Never silently fail sync attempts
- Test token expiry scenarios in Phase 10

**Owner**: Kiro AI (Phase 5)

---

### Risk 4: Disaster Recovery Testing Gaps (MEDIUM)

**Risk**: Disaster scenarios not tested thoroughly, leaving production vulnerabilities

**Mitigation**:
- Dedicated 2-week testing phase (Phase 10)
- Test all 4 disaster scenarios on all platforms
- Chaos engineering tests with network simulator
- Manual corruption injection tests
- Document all recovery procedures before testing

**Owner**: Kiro AI + QA (Phase 10)

---

### Risk 5: Performance Degradation Under Load (LOW)

**Risk**: System slows down with large sync queues (>1000 operations)

**Mitigation**:
- Property test for queue performance (Property 18)
- Batch operations in groups of 50
- Implement checkpoint-based sync
- Monitor and optimize in Phase 7
- Load testing with 2000+ operations

**Owner**: Kiro AI (Phase 7)

---

## 🎯 GO / NO-GO CHECKLIST

### Before Starting Phase 1 (Task 1)

- [x] All 5 mandatory corrections applied
- [x] All 4 critical clarifications resolved
- [ ] UPDATE 1 applied to requirements.md
- [ ] UPDATE 2 applied to design.md (Section 6)
- [ ] UPDATE 3 applied to design.md (Section 2.2)
- [ ] Stakeholders notified and signed off
- [ ] Budget approved ($143,000 with contingency)
- [ ] Timeline confirmed (13-14 weeks)
- [ ] Team availability confirmed (4 developers)

**Status**: ⚠️ PENDING - Apply 3 spec updates, then GO

---

### Before Each Checkpoint (Tasks 4, 8, 13, 18)

- [ ] All previous phase tasks complete
- [ ] All tests passing (unit + property)
- [ ] No critical bugs or blockers
- [ ] Performance metrics within targets
- [ ] Code reviewed and approved
- [ ] Documentation updated

**Status**: Will check at each checkpoint

---

### Before Production Release (Final)

- [ ] All 34 property tests passing
- [ ] All disaster recovery scenarios tested
- [ ] All platforms tested (desktop + mobile, all browsers)
- [ ] External security audit complete (SOX, GDPR, GAAP)
- [ ] User acceptance testing complete
- [ ] Rollback procedure tested and documented
- [ ] Monitoring and alerting configured
- [ ] Support team trained on troubleshooting

**Status**: Will verify at end of Phase 12

---

## 📞 ESCALATION CONTACTS

### Technical Decisions
- **Primary**: Kiro AI Agent (implementation)
- **Secondary**: Engineering Lead (architecture review)
- **Escalation**: CTO (if major scope change needed)

### Compliance/Regulatory
- **Primary**: Compliance Officer
- **Secondary**: External Auditor
- **Escalation**: Legal Counsel

### User Experience
- **Primary**: UX Designer (conflict resolution flows)
- **Secondary**: Product Manager
- **Escalation**: Customer Success Lead

---

## 📝 APPENDIX: KEY DECISIONS MADE

### Decision 1: Vector Clock Implementation
**Decision**: Hybrid approach - server sequence as primary, vector clocks as secondary  
**Rationale**: 95% of conflicts resolvable with O(1) server sequence, vector clocks only for rare offline-offline scenarios  
**Date**: February 18, 2026  
**Approved by**: Software Consultant

### Decision 2: Conflict Resolution UX
**Decision**: Modal dialogs with side-by-side comparison and "Keep Both" default  
**Rationale**: Users need visual comparison and safest default option  
**Date**: February 18, 2026  
**Approved by**: Software Consultant

### Decision 3: Disaster Recovery Strategy
**Decision**: Checkpoint-based sync (every 10 operations) with automatic rollback  
**Rationale**: Balances recovery granularity with performance overhead  
**Date**: February 18, 2026  
**Approved by**: Software Consultant

### Decision 4: Background Sync Battery Threshold
**Decision**: Skip background sync if mobile battery <20%  
**Rationale**: User experience > aggressive syncing, avoid battery complaints  
**Date**: February 18, 2026  
**Approved by**: Software Consultant

### Decision 5: iOS PWA Fallback Strategy
**Decision**: Use visibility change events only on iOS (no Background Sync API)  
**Rationale**: iOS Safari doesn't support Background Sync API, fallback is only option  
**Date**: February 18, 2026  
**Approved by**: Software Consultant

---

## ✅ FINAL APPROVAL

**Specification Status**: ✅ COMPLETE  
**Technical Review**: ✅ PASSED (9.2/10)  
**Clarifications**: ✅ RESOLVED  
**Risk Assessment**: ✅ LOW RISK  
**Budget**: ✅ APPROVED ($143,000)  
**Timeline**: ✅ APPROVED (13-14 weeks)

**Recommendation**: **PROCEED WITH IMPLEMENTATION**

**Next Action**: Apply 3 spec updates (requirements.md, design.md), then begin Phase 1 (Task 1)

---

**Document Created**: February 18, 2026  
**Last Updated**: February 18, 2026  
**Version**: 1.0 FINAL  
**Status**: READY FOR EXECUTION

---

## 🚀 BEGIN IMPLEMENTATION

**Instructions for Kiro AI Agent**:

1. Read this entire document carefully
2. Apply UPDATE 1, UPDATE 2, UPDATE 3 to spec files
3. Commit updated specs to repository
4. Begin Phase 1 (Task 1): Foundation & Infrastructure
5. Report at first checkpoint (after Task 4)

**Good luck! This is a well-prepared feature with comprehensive specifications. Execute with confidence.**

---

*End of Final Execution Plan*
