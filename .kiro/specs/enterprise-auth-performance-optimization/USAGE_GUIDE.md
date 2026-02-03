# How to Use the Performance Optimizations in Your App

## Quick Start

### 1. Initialize Optimized Auth System

```typescript
// src/App.tsx
import { OptimizedAuthProvider } from '@/services/auth/OptimizedAuthProvider';
import { CacheManager } from '@/services/cache/CacheManager';
import { SessionManager } from '@/services/session/SessionManager';

// Create cache manager
const cacheManager = new CacheManager({
  tier: 'both', // Use memory + Redis
  ttl: 300, // 5 minutes
  maxMemorySize: 100 * 1024 * 1024, // 100MB
});

// Create session manager
const sessionManager = new SessionManager({
  cacheManager,
  compressionEnabled: true,
  lazyLoadingEnabled: true,
});

// Wrap app with optimized provider
export function App() {
  return (
    <OptimizedAuthProvider
      cacheManager={cacheManager}
      sessionManager={sessionManager}
    >
      <YourApp />
    </OptimizedAuthProvider>
  );
}
```

## Component Usage Patterns

### 2. Use Memoized Permission Gates

```typescript
// BEFORE: Regular permission gate (causes re-renders)
import { PermissionGate } from '@/components/auth';

function TransactionForm() {
  return (
    <PermissionGate permission="transactions:create">
      <CreateTransactionButton />
    </PermissionGate>
  );
}

// AFTER: Memoized permission gate (optimized)
import { MemoizedPermissionGate } from '@/components/auth';

function TransactionForm() {
  return (
    <MemoizedPermissionGate permission="transactions:create">
      <CreateTransactionButton />
    </MemoizedPermissionGate>
  );
}
```

### 3. Batch Permission Checks

```typescript
// BEFORE: Individual permission checks (inefficient)
function ActionButtons() {
  const canRead = usePermissionCheck('transactions:read');
  const canWrite = usePermissionCheck('transactions:write');
  const canDelete = usePermissionCheck('transactions:delete');
  const canApprove = usePermissionCheck('transactions:approve');
  
  return (
    <>
      {canRead && <ViewButton />}
      {canWrite && <EditButton />}
      {canDelete && <DeleteButton />}
      {canApprove && <ApproveButton />}
    </>
  );
}

// AFTER: Batch permission checks (optimized)
function ActionButtons() {
  const permissions = useBatchPermissions([
    'transactions:read',
    'transactions:write',
    'transactions:delete',
    'transactions:approve',
  ]);
  
  return (
    <>
      {permissions['transactions:read'] && <ViewButton />}
      {permissions['transactions:write'] && <EditButton />}
      {permissions['transactions:delete'] && <DeleteButton />}
      {permissions['transactions:approve'] && <ApproveButton />}
    </>
  );
}
```

### 4. Preload Permissions During Auth

```typescript
// In your login/auth flow
import { useAuthContext } from '@/contexts/AuthContext';

function LoginFlow() {
  const { preloadPermissions } = useAuthContext();
  
  const handleLogin = async (credentials) => {
    const user = await authenticate(credentials);
    
    // Preload common permissions for faster UI rendering
    await preloadPermissions(user.id, 'org');
    
    // UI will now have instant access to cached permissions
    navigate('/dashboard');
  };
  
  return <LoginForm onSubmit={handleLogin} />;
}
```

### 5. Subscribe to Permission Changes

```typescript
// Real-time permission updates without page refresh
import { useAuthContext } from '@/contexts/AuthContext';

function PermissionAwareComponent() {
  const { subscribeToPermissionChanges } = useAuthContext();
  const [permissions, setPermissions] = useState({});
  
  useEffect(() => {
    // Subscribe to permission changes
    const unsubscribe = subscribeToPermissionChanges(
      (changes) => {
        setPermissions(prev => ({
          ...prev,
          ...changes,
        }));
      }
    );
    
    return unsubscribe;
  }, []);
  
  return (
    <div>
      {permissions['transactions:create'] && <CreateButton />}
    </div>
  );
}
```

## Performance Monitoring

### 6. Monitor Performance Metrics

```typescript
// Access real-time performance metrics
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

function PerformanceDashboard() {
  const metrics = usePerformanceMonitoring();
  
  return (
    <div>
      <h2>Performance Metrics</h2>
      <p>Auth Load Time: {metrics.authLoadTime.toFixed(2)}ms</p>
      <p>Cache Hit Rate: {(metrics.cacheHitRate * 100).toFixed(2)}%</p>
      <p>Memory Usage: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</p>
      <p>Concurrent Users: {metrics.concurrentUsers}</p>
      <p>Avg Response Time: {metrics.avgResponseTime.toFixed(2)}ms</p>
    </div>
  );
}
```

### 7. Set Up Performance Alerts

```typescript
// Configure performance regression alerts
import { PerformanceMonitor } from '@/services/performance/PerformanceMonitor';

const monitor = new PerformanceMonitor({
  thresholds: {
    authLoadTime: 150, // Alert if > 150ms
    cacheHitRate: 0.90, // Alert if < 90%
    errorRate: 0.02, // Alert if > 2%
  },
  alertCallback: (alert) => {
    console.warn('Performance Alert:', alert);
    // Send to monitoring service
    sendToMonitoring(alert);
  },
});

monitor.start();
```

## Advanced Usage

### 8. Custom Cache Strategies

```typescript
// Implement custom cache warming
import { CacheManager } from '@/services/cache/CacheManager';

async function warmAuthCache(userId: string) {
  const cacheManager = getCacheManager();
  
  // Preload user auth data
  await cacheManager.warmAuthCache(userId);
  
  // Preload organization permissions
  await cacheManager.warmPermissionCache(userId, 'org');
  
  // Preload project permissions
  await cacheManager.warmPermissionCache(userId, 'project');
}
```

### 9. Handle Cache Failures Gracefully

```typescript
// Graceful degradation when cache fails
import { useAuthContext } from '@/contexts/AuthContext';

function CriticalComponent() {
  const { checkPermission, useBasicAuth } = useAuthContext();
  
  // If cache fails, system falls back to direct DB queries
  if (useBasicAuth) {
    console.warn('Cache unavailable, using basic auth');
  }
  
  const hasPermission = checkPermission('critical:action');
  
  return hasPermission ? <CriticalAction /> : <AccessDenied />;
}
```

### 10. Batch Operations

```typescript
// Batch multiple operations for efficiency
import { PermissionService } from '@/services/permission/PermissionService';

async function validateMultipleActions(userId: string, actions: string[]) {
  const permissionService = new PermissionService();
  
  // Batch validate all permissions in one call
  const results = await permissionService.validatePermissionsBatch(
    userId,
    actions.map(action => ({
      resource: 'transactions',
      action,
    }))
  );
  
  return results; // All results in one DB query
}
```

## Performance Comparison

### Before Optimization
```typescript
// 4 separate permission checks = 4 DB queries
const canRead = await checkPermission('transactions:read');    // 5ms
const canWrite = await checkPermission('transactions:write');  // 5ms
const canDelete = await checkPermission('transactions:delete'); // 5ms
const canApprove = await checkPermission('transactions:approve'); // 5ms
// Total: 20ms + network latency
```

### After Optimization
```typescript
// 1 batch permission check = 1 DB query
const permissions = await validatePermissionsBatch(userId, [
  { resource: 'transactions', action: 'read' },
  { resource: 'transactions', action: 'write' },
  { resource: 'transactions', action: 'delete' },
  { resource: 'transactions', action: 'approve' },
]);
// Total: 5ms + network latency (75% faster)
```

## Troubleshooting

### Cache Not Working?
```typescript
// Check cache status
const cacheManager = getCacheManager();
const stats = cacheManager.getStats();

console.log('Cache Hit Rate:', stats.hitRate);
console.log('Memory Usage:', stats.memoryUsage);
console.log('Redis Connections:', stats.redisConnections);

// If hit rate is low, warm the cache
await cacheManager.warmAuthCache(userId);
```

### Performance Still Slow?
```typescript
// Check performance metrics
const metrics = usePerformanceMonitoring();

if (metrics.authLoadTime > 150) {
  console.warn('Auth load time exceeds threshold');
  // Check if cache is working
  // Check database query performance
  // Check network latency
}
```

## Best Practices

1. **Always use MemoizedPermissionGate** for permission checks
2. **Batch permission checks** instead of individual checks
3. **Preload permissions** during authentication
4. **Monitor performance metrics** regularly
5. **Set up alerts** for performance regressions
6. **Use lazy loading** for non-critical data
7. **Enable cache warming** for common operations
8. **Test with realistic load** before deployment

## Migration Checklist

- [ ] Initialize OptimizedAuthProvider
- [ ] Replace PermissionGate with MemoizedPermissionGate
- [ ] Convert individual permission checks to batch checks
- [ ] Add permission preloading to auth flow
- [ ] Set up performance monitoring
- [ ] Configure performance alerts
- [ ] Test with 6x concurrent users
- [ ] Verify cache hit rate > 96%
- [ ] Verify auth load time < 100ms
- [ ] Deploy to production
