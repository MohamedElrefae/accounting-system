# Enterprise Auth Performance Optimization - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER APPLICATION                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    REACT COMPONENTS                             │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  MemoizedPermissionGate                                │   │  │
│  │  │  • Prevents unnecessary re-renders                    │   │  │
│  │  │  • Custom comparison function                         │   │  │
│  │  │  • Caches permission state                            │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  useBatchPermissions Hook                              │   │  │
│  │  │  • Validates multiple permissions in one call         │   │  │
│  │  │  • Returns permission map                             │   │  │
│  │  │  • Memoized for performance                           │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  usePermissionCheck Hook                               │   │  │
│  │  │  • Single permission check                            │   │  │
│  │  │  • Returns boolean                                    │   │  │
│  │  │  • Cached result                                      │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ▲                                          │
│                              │ useContext(AuthContext)                 │
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    AUTH CONTEXT PROVIDER                         │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  OptimizedAuthProvider                                 │   │  │
│  │  │  • Memoized context value                             │   │  │
│  │  │  • Prevents context re-renders                        │   │  │
│  │  │  • Manages auth state                                 │   │  │
│  │  │  • Provides performance metrics                       │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  AuthContext Value                                     │   │  │
│  │  │  • user: UserProfile                                  │   │  │
│  │  │  • permissions: Map<string, boolean>                  │   │  │
│  │  │  • roles: ScopedRole[]                                │   │  │
│  │  │  • checkPermission(permission): boolean               │   │  │
│  │  │  • checkPermissionsBatch(permissions): Record         │   │  │
│  │  │  • authLoadTime: number                               │   │  │
│  │  │  • cacheHitRate: number                               │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ▲                                          │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               │ useAuthService()
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SERVICE LAYER                                │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  AuthService                                           │   │  │
│  │  │  • Orchestrates auth flow                             │   │  │
│  │  │  • Calls optimized RPC functions                      │   │  │
│  │  │  • Manages session lifecycle                          │   │  │
│  │  │  • Handles auth errors                                │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                   │  │
│  │                              │                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  PermissionService                                     │   │  │
│  │  │  • validatePermissionsBatch()                         │   │  │
│  │  │  • preloadUserPermissions()                           │   │  │
│  │  │  • subscribeToPermissionChanges()                     │   │  │
│  │  │  • Batch processing logic                            │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                   │  │
│  │                              │                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  SessionManager                                        │   │  │
│  │  │  • createSession()                                    │   │  │
│  │  │  • compressSessionData()                              │   │  │
│  │  │  • loadSessionComponent()                             │   │  │
│  │  │  • cleanupExpiredSessions()                           │   │  │
│  │  │  • getMemoryUsage()                                   │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                   │  │
│  │                              │                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  CacheManager                                          │   │  │
│  │  │  • get<T>(key): Promise<T | null>                    │   │  │
│  │  │  • set<T>(key, value, ttl): Promise<void>            │   │  │
│  │  │  • invalidate(pattern): Promise<void>                │   │  │
│  │  │  • warmAuthCache(userId): Promise<void>              │   │  │
│  │  │  • warmPermissionCache(userId, scope): Promise<void> │   │  │
│  │  │  • getStats(): CacheStats                            │   │  │
│  │  │                                                        │   │  │
│  │  │  Multi-tier Strategy:                                 │   │  │
│  │  │  ├─ Memory Cache (2ms response)                      │   │  │
│  │  │  ├─ Redis Cache (5ms response)                       │   │  │
│  │  │  └─ Database Fallback (35ms response)                │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                   │  │
│  │                              │                                   │  │
│  └──────────────────────────────┼───────────────────────────────────┘  │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  │ RPC Calls
                                  │
┌─────────────────────────────────┼───────────────────────────────────────┐
│                                 │                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    DATABASE LAYER                               │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Optimized RPC Functions                               │   │  │
│  │  │                                                         │   │  │
│  │  │  getUserAuthDataOptimized(userId, orgId?, projectId?)  │   │  │
│  │  │  ├─ Returns: {                                         │   │  │
│  │  │  │   user: UserProfile,                               │   │  │
│  │  │  │   permissions: Permission[],                       │   │  │
│  │  │  │   roles: ScopedRole[],                             │   │  │
│  │  │  │   organizations: Organization[],                   │   │  │
│  │  │  │   projects: Project[]                              │   │  │
│  │  │  │ }                                                   │   │  │
│  │  │  ├─ Execution: <50ms                                  │   │  │
│  │  │  └─ Replaces 8 separate queries                       │   │  │
│  │  │                                                         │   │  │
│  │  │  validatePermissionsBatch(userId, permissions[])       │   │  │
│  │  │  ├─ Returns: PermissionResult[]                       │   │  │
│  │  │  ├─ Execution: <10ms                                  │   │  │
│  │  │  └─ Batch validation in single call                   │   │  │
│  │  │                                                         │   │  │
│  │  │  getRoleHierarchyCached(userId, scope)                │   │  │
│  │  │  ├─ Returns: RoleHierarchy                            │   │  │
│  │  │  ├─ Execution: <5ms (cached)                          │   │  │
│  │  │  └─ Cached role hierarchy lookup                      │   │  │
│  │  │                                                         │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                   │  │
│  │                              │                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Critical Database Indexes                             │   │  │
│  │  │                                                         │   │  │
│  │  │  User Authentication:                                  │   │  │
│  │  │  ├─ idx_users_auth_lookup (id, email, is_active)     │   │  │
│  │  │  └─ idx_user_profiles_auth (user_id, org_id)         │   │  │
│  │  │                                                         │   │  │
│  │  │  Scoped Roles:                                         │   │  │
│  │  │  ├─ idx_org_roles_user_org (user_id, org_id, role_id)│   │  │
│  │  │  ├─ idx_project_roles_user_project (user_id, proj_id)│   │  │
│  │  │  └─ idx_system_roles_user (user_id, role_id)         │   │  │
│  │  │                                                         │   │  │
│  │  │  Permissions:                                          │   │  │
│  │  │  ├─ idx_role_permissions_lookup (role_id, perm_id)   │   │  │
│  │  │  └─ idx_permissions_resource (resource, action)       │   │  │
│  │  │                                                         │   │  │
│  │  │  Memberships:                                          │   │  │
│  │  │  ├─ idx_org_memberships_user (user_id, org_id)       │   │  │
│  │  │  └─ idx_project_memberships_user (user_id, proj_id)  │   │  │
│  │  │                                                         │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                   │  │
│  │                              │                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Database Tables                                       │   │  │
│  │  │                                                         │   │  │
│  │  │  ├─ users                                              │   │  │
│  │  │  ├─ user_profiles                                      │   │  │
│  │  │  ├─ org_roles                                          │   │  │
│  │  │  ├─ project_roles                                      │   │  │
│  │  │  ├─ system_roles                                       │   │  │
│  │  │  ├─ permissions                                        │   │  │
│  │  │  ├─ role_permissions                                   │   │  │
│  │  │  ├─ organization_memberships                           │   │  │
│  │  │  ├─ project_memberships                                │   │  │
│  │  │  └─ organizations, projects                            │   │  │
│  │  │                                                         │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CACHING INFRASTRUCTURE                        │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Memory Cache                                          │   │  │
│  │  │  • In-process cache                                   │   │  │
│  │  │  • Response time: 2ms                                 │   │  │
│  │  │  • Max size: 100MB                                    │   │  │
│  │  │  • TTL: 5 minutes                                     │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Redis Cache                                           │   │  │
│  │  │  • Distributed cache                                  │   │  │
│  │  │  • Response time: 5ms                                 │   │  │
│  │  │  • Shared across instances                            │   │  │
│  │  │  • TTL: 10 minutes                                    │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Authentication Flow (Optimized)

```
User Login
    │
    ├─→ AuthService.login(credentials)
    │
    ├─→ Validate credentials
    │
    ├─→ Call getUserAuthDataOptimized(userId)
    │   │
    │   ├─→ Check Memory Cache (2ms)
    │   │   └─→ HIT: Return cached data
    │   │
    │   ├─→ Check Redis Cache (5ms)
    │   │   └─→ HIT: Return cached data
    │   │
    │   └─→ Execute Optimized RPC (35ms)
    │       └─→ Single consolidated query
    │
    ├─→ SessionManager.createSession(authData)
    │   │
    │   ├─→ Compress session data (38% reduction)
    │   │
    │   ├─→ Store in cache
    │   │
    │   └─→ Return optimized session
    │
    ├─→ PermissionService.preloadUserPermissions(userId)
    │   │
    │   ├─→ Batch load common permissions
    │   │
    │   └─→ Warm cache for instant access
    │
    └─→ Return to UI (Total: 60-100ms)
        │
        └─→ UI renders with cached permissions
            └─→ No additional DB queries needed
```

### Permission Check Flow (Optimized)

```
Component needs permission check
    │
    ├─→ useBatchPermissions(['perm1', 'perm2', 'perm3'])
    │
    ├─→ Check cache (96% hit rate)
    │   │
    │   ├─→ HIT: Return cached permissions (2ms)
    │   │
    │   └─→ MISS: Call validatePermissionsBatch()
    │       │
    │       └─→ Single DB query for all permissions (5ms)
    │
    ├─→ Update cache with results
    │
    └─→ Return permission map to component
        │
        └─→ Component renders with permissions
            └─→ No re-renders on permission state change
```

## Cache Key Strategy

```
Cache Key Hierarchy:

auth:user:{userId}
├─ TTL: 5 minutes
├─ Contains: User profile, roles, permissions, orgs, projects
└─ Invalidated on: User profile change, role assignment change

perm:{userId}:{scope}
├─ TTL: 10 minutes
├─ Scope: 'org', 'project', 'system'
├─ Contains: Permissions for specific scope
└─ Invalidated on: Permission assignment change

roles:{userId}:{roleType}
├─ TTL: 15 minutes
├─ RoleType: 'org', 'project', 'system'
├─ Contains: Role hierarchy for specific type
└─ Invalidated on: Role assignment change

org:{userId}:{orgId}
├─ TTL: 30 minutes
├─ Contains: Organization membership data
└─ Invalidated on: Membership change

batch:perm:{userId}:{checksum}
├─ TTL: 5 minutes
├─ Checksum: Hash of permission list
├─ Contains: Batch permission validation results
└─ Invalidated on: Any permission change
```

## Performance Metrics Collection

```
PerformanceMonitor tracks:

├─ authLoadTime
│  └─ Time from login request to session ready
│
├─ cacheHitRate
│  └─ Percentage of cache hits vs misses
│
├─ memoryUsage
│  └─ Per-session memory footprint
│
├─ concurrentUsers
│  └─ Current active sessions
│
├─ avgResponseTime
│  └─ Average permission check response time
│
├─ dbQueryCount
│  └─ Number of database queries per request
│
├─ errorRate
│  └─ Percentage of failed operations
│
└─ performanceRegression
   └─ Alerts when metrics exceed thresholds
```

## Error Handling & Fallback

```
Cache Failure
    │
    ├─→ Memory Cache fails
    │   └─→ Try Redis Cache
    │
    ├─→ Redis Cache fails
    │   └─→ Try Database Query
    │
    └─→ Database Query fails
        └─→ Return cached data (stale)
            └─→ If no cache: Return error

Permission Check Failure
    │
    ├─→ Batch validation fails
    │   └─→ Fall back to individual checks
    │
    └─→ Individual check fails
        └─→ Deny permission (secure default)
```

This architecture ensures optimal performance while maintaining security, reliability, and scalability.
