# ENTERPRISE DATA SYNCHRONIZATION
## Technical Review + Windsurf AI Implementation Plan (Combined)

**System:** Custom Enterprise Accounting Platform  
**Stack:** React, TypeScript, Supabase, React Query  
**Date:** December 17, 2025  
**Author:** Technical Review Panel  
**Audience:** CEO, Tech Lead, Windsurf AI Agent

---

# PART 1 — TECHNICAL REVIEW & APPROVAL MEMO
## Enterprise Data Synchronization Architecture Study (v1.0)

**TO:** CEO / Product Leadership  
**FROM:** Technical Review Panel  
**DATE:** December 17, 2025  
**SUBJECT:** Enterprise Data Synchronization Implementation — Recommended with Modifications  
**STATUS:** ✅ **APPROVED WITH CRITICAL NOTES**

---

## 1. EXECUTIVE SUMMARY

**Verdict:** The proposed React Query + Supabase Realtime hybrid architecture is **sound and strategically correct** for phase 2 scaling. The document effectively identifies real pain points and proposes industry-standard solutions. **Implementation is recommended**, with five critical modifications outlined below to ensure production readiness.

**Key Achievement:** This plan transforms the system from MVP ("manual refresh anxiety") to enterprise-grade ("always fresh, never stale").

---

## 2. STRENGTHS OF THE PROPOSAL

### ✅ Problem Definition (Excellent)
- **Stale Data Issue:** Correctly identified the core UX problem (transactions in one tab don't reflect across Reports/Dashboard tabs)
- **Server Load Problem:** Accurately diagnoses N+1 fetching patterns causing unnecessary database queries
- **Fragmented Logic:** Right observation that "Refresh" is inconsistently implemented across pages

**Impact Assessment:** These are real blocking issues for commercial adoption. Users will abandon a system where "Report last updated 10 minutes ago?"

### ✅ Architecture Design (Sound)
The three-layer model is conceptually correct:
- **Layer 1 (React Query):** Solves the "deduplication + caching" problem elegantly
- **Layer 2 (Realtime):** Addresses low-latency updates for multi-user scenarios
- **Layer 3 (Master Data):** Recognizes that Chart of Accounts changes must cascade globally

This mirrors proven patterns used by:
- Stripe Dashboard (React Query + WebSocket invalidations)
- Linear (Realtime sync with optimistic updates)
- ERPNext (Real-time form updates across sessions)

### ✅ Business Case (Compelling)
- **40% server cost reduction** through cache deduplication is realistic (Makerkit case studies show 30-50% reductions)
- **Multi-user collaboration** unlocks new use cases (shared cost center edits, concurrent transaction entry)
- **Data integrity confidence** ("Is this report current?") drives adoption in enterprise accounting

---

## 3. CRITICAL MODIFICATIONS REQUIRED

### ⚠️ ISSUE #1: Supabase Realtime Scalability Ceiling
**Severity:** HIGH | **Implementation Impact:** Medium  
**Current Plan Risk:** Document assumes unlimited Realtime capacity

**The Problem:**
Your proposal doesn't address Supabase Realtime's documented throughput limits:
- **Production Benchmark:** ~10,000 events/sec across ALL users (practical upper range)
- **Your Expected Scale (Phase 3):** 5–20 construction companies × 20 users/company = 100–400 concurrent users
- **Transaction Volume:** Construction accounting ≈ 50–200 transactions/day per company ≈ 5–10 events/sec per company at peak

**Assessment:** You're well **within safe margins** for Phase 2 (< 100 concurrent), but will **need a fallback strategy** by Phase 3 if you hit:
- Real-time broadcast to 500+ concurrent users
- Batch imports (CSV uploads triggering 1000s of DB inserts)
- End-of-month report recalculation (cascading updates to Trial Balance)

**Recommendation:**
```text
Phase 2: Full Realtime for all tables (safe)
  ↓
Phase 2.5: Implement Realtime "Backpressure Handler"
  - If event queue exceeds 500/sec → switch Transaction updates to polling
  - Keep Master Data (Accounts/Cost Centers) on Realtime (lower volume)
  - Log metrics to Supabase / monitoring to track approaching limits

Phase 3: Migration Path Ready
  - If scaling beyond 1000 events/sec, move to:
    Option A: Kafka + PostgreSQL Logical Decoding (self-hosted)
    Option B: Supabase native "Scheduled Refresh" + React Query polling
```

**Action Item:** Add this paragraph to Section 5 (Technical Recommendations):
> "Supabase Realtime is production-tested to high event throughput. Phase 2 will observe <1000 events/sec and is safe. By Phase 3 (multi-tenant), implement event volume monitoring and a documented fallback to polling-based invalidation if throughput exceeds a defined threshold (for example 5,000 events/sec)."

---

### ⚠️ ISSUE #2: Missing Conflict Resolution Strategy
**Severity:** HIGH | **Implementation Impact:** Medium  
**Current Plan Risk:** No handling of simultaneous edits across users

**The Problem:**
Your document mentions race conditions but doesn't address Supabase's **lack of built-in optimistic locking**:

**Scenario:**
```text
User A (Cairo): Edits Account "Revenue" name to "Sales Revenue"
User B (Alexandria): Edits Account "Revenue" name to "Operating Revenue"
Both fire simultaneously → Last-Write-Wins (LWW)
Result: One user loses their edit silently
```

This is **unacceptable in accounting systems** (audit trail broken, data integrity questioned).

**Recommendation:**
Implement **Last-Write-Wins + Conflict Log** for Phase 2:

```typescript
// Add to accounts table schema:
ALTER TABLE accounts ADD COLUMN (
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT now(),
  version_number INT DEFAULT 1,
  conflict_resolution_status 
    ENUM('no_conflict', 'resolved', 'needs_review')
);

// Pseudocode: BEFORE UPDATE TRIGGER check_conflict
// (You will implement this in PostgreSQL/SQL)
// - Compare OLD.updated_at or OLD.version_number with current row
// - If mismatch → log conflict to audit_log and mark row as `needs_review`
```

**User Experience:**
- User A saves "Sales Revenue" ✅
- User B saves "Operating Revenue" → Toast: "⚠️ Account was edited. Your change is saved as a *Pending Change* and requires review."
- User sees review modal, chooses to keep B's version or merge manually

**For Phase 1 Only:** Document this as a known limitation:
> "**Known Limitation:** Concurrent edits to the same master data (Accounts/Projects) currently use Last-Write-Wins. This will be addressed in Phase 2.5 with conflict detection. Acceptable for single-admin setups in early rollout."

---

### ⚠️ ISSUE #3: Realtime Subscription Cleanup Not Specified
**Severity:** MEDIUM | **Implementation Impact:** Low  
**Current Plan Risk:** Memory leaks from orphaned subscriptions

**The Problem:**
The proposal mentions `useRealtimeSubscription` but doesn't specify cleanup:
- If user navigates away → subscription may still be active
- If user closes tab → subscription can linger server-side
- After many navigations → multiple active subscriptions for the same user

**Recommendation:**
Add to Phase 1 implementation spec:

```typescript
// Example pattern – final code will live in useRealtimeSubscription.ts

useEffect(() => {
  const channel = supabase
    .channel(`${table}:changes`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table },
      (payload) => {
        queryClient.invalidateQueries({
          queryKey: [table, filters],
          exact: false,
        });
      },
    )
    .subscribe();

  // ✅ CRITICAL: Cleanup on unmount
  return () => {
    channel.unsubscribe();
  };
}, [table, filters, queryClient]);
```

---

### ⚠️ ISSUE #4: Reports Invalidation Strategy is Too Broad
**Severity:** MEDIUM | **Implementation Impact:** High  
**Current Plan Risk:** Re-running expensive Trial Balance queries too frequently

**The Problem:**
Your draft says: "When a Transaction is modified → Invalidate ['reports']." This guarantees freshness but is **computationally expensive**.

If a user batch-imports 500 transactions:
- Each INSERT → fires Realtime event
- Each event → invalidates `['reports', 'trial-balance']`
- Each invalidation → re-runs large aggregation queries
- Result: up to 500 redundant expensive queries

**Recommendation:**
Implement **Smart Invalidation with Debouncing**:

```typescript
// High-level pattern, detailed implementation in Part 2 plan

export const useSmartReportInvalidation = () => {
  const queryClient = useQueryClient();
  const invalidationTimeoutRef = useRef<NodeJS.Timeout>();

  const scheduleReportInvalidation = useCallback((reportType: string) => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }

    invalidationTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ['reports', reportType],
      });
    }, 2000); // 2-second debounce window
  }, [queryClient]);

  // Subscribe to transaction changes and call scheduleReportInvalidation
};
```

**Impact:**
- Batch import 500 transactions → **single** report re-fetch (2 seconds after last insert)
- Normal interactive use → reports update within ~2 seconds
- Server load for batch operations reduced dramatically

---

### ⚠️ ISSUE #5: Master Data Propagation Not Atomic
**Severity:** MEDIUM | **Implementation Impact:** Medium  
**Current Plan Risk:** Dropdowns show deleted accounts mid-transaction entry

**The Problem:**
When an admin deletes an Account from CoA, real-time invalidation may:
- Remove that account from dropdowns while a user is mid-entry
- Cause validation errors on submit
- Create a jarring UX and confusion

**Recommendation:**
Implement a **Soft Delete** workflow for Phase 2:

```sql
ALTER TABLE accounts ADD COLUMN (
  status TEXT DEFAULT 'active', -- use CHECK or ENUM in real schema
  archived_at TIMESTAMP,
  can_be_deleted_after TIMESTAMP
);

-- Deletion becomes:
-- UPDATE accounts SET status = 'archived', archived_at = now(), can_be_deleted_after = now() + interval '30 days'
```

**Business & UX Logic:**
- New forms **exclude archived accounts** from dropdowns
- In-flight forms referencing archived accounts receive a clear error:
  - "⚠️ Account 'Old Account' was archived. Please select a different account."
- Historical transactions **keep link** to archived account for reporting
- After a retention window (e.g., 30 days), a background job can hard-delete truly unused rows

---

## 4. IMPLEMENTATION TIMELINE REVIEW

**Proposed:** 3 weeks  
**Recommended:** 4 weeks (more realistic given complexity of reporting and invalidation)

| Phase | Proposed | Risk | Recommendation |
|-------|----------|------|-----------------|
| **Phase 1 (Core Engine)** | Week 1 | ✅ LOW | Feasible. Allocate 4 days + 1 day testing |
| **Phase 2 (Transactions)** | Week 1–2 | ⚠️ MEDIUM | Feasible if Phase 1 hooks are solid. Add integration testing buffer |
| **Phase 3 (Reports)** | Week 2–3 | ⚠️ MEDIUM | Extend to 4 weeks total if reports (TB, IS, CF) are complex |

**Revised Macro Plan:**
```text
Week 1: Phase 1 – Core Engine (Realtime hook, AppSync, Context refactor)
Week 2: Phase 2 – Transactions module refactor + hardening
Week 3: Phase 3 – Reports integration + conflict handling groundwork
Week 4: Scaling strategies, soft-delete, monitoring, documentation
```

---

## 5. MISSING DOCUMENTATION SECTIONS

### 5.1 Monitoring & Observability
Add a section to the architecture document:

```text
Performance Metrics to Track:
- React Query cache hit rate (target: >70%)
- Realtime event latency (p95 < 100ms)
- Subscription count per user session
- Database query count before/after (target: -40%)
- User feedback: "Does data feel fresh?" (surveys or UX interviews)

Alerting Rules:
- Realtime events/sec exceeds threshold → alert DevOps
- Subscription count > N per user → potential memory leak
- Cache miss rate > 30% → tuning required
```

### 5.2 Offline Support Roadmap
Add a future phase:

```text
Phase 4 (Post-Launch):
- Service Worker caching for offline-first transaction forms
- Local queue of pending writes
- Conflict merge strategy for offline → online edits
```

### 5.3 Cost Analysis
Add an estimated cost impact section:

```text
Estimated Monthly Impact (100–400 concurrent users):
- Supabase Realtime: within current plan limits
- Database queries: ~40% reduction → meaningful cost savings
- Bandwidth: slight increase due to realtime streams
Net: lower backend compute cost, better UX, higher perceived value
```

---

## 6. APPROVAL DECISION

### ✅ **APPROVED FOR IMPLEMENTATION**

**Conditions:**
1. Implement **scaling fallback strategy** (Issue #1) before Phase 3
2. Design & schedule **conflict resolution** (Issue #2) for Phase 2.5
3. Ensure **subscription cleanup** pattern (Issue #3) is implemented in Phase 1
4. Implement **smart invalidation** (Issue #4) for heavy reports in Phase 3
5. Implement **soft delete workflow** (Issue #5) for master data before public Phase 2 launch

**Sign-Off:**
- Technical feasibility: **CONFIRMED**  
- Industry best practices: **ALIGNED** (React Query + Realtime stack)  
- Business impact: **POSITIVE** (trust, performance, cost)  
- Risk level: **LOW→MEDIUM**, manageable with listed mitigations

**Immediate Next Steps:**
1. Create engineering tickets for Issues #1–5  
2. Share this memo with development & product teams  
3. Kick off Phase 1 with a clear, detailed implementation plan (see Part 2 below)

---

# PART 2 — WINDSURF AI IMPLEMENTATION PLAN
## Phase 1: Core Synchronization Engine (Week 1)

**Target:** Implement the **Core Synchronization Engine** for the enterprise accounting system.  
**Audience:** Windsurf AI Agent / Engineering Team  
**Status:** ✅ Ready for execution

---

## 1. MISSION BRIEF FOR WINDSURF

You are implementing **Phase 1 of 4** of the Enterprise Data Synchronization system.

**System Context:**
- Frontend: React + TypeScript
- Backend: Supabase (PostgreSQL + Realtime)
- Data Layer: @tanstack/react-query

**Primary Goal of Phase 1:**
- Implement foundational hooks, cache keys, and monitoring so that:
  - Data fetching is consolidated via React Query
  - Realtime subscriptions are robust and memory-safe
  - Core master data (Accounts, Cost Centers, Projects) is served via a shared cache
  - Metrics are collected to validate Phase 2 and Phase 3 behavior

**Success Criteria:**
- All hooks fully typed, tested, and documented
- Zero memory leaks (subscriptions cleanup correctly)
- Cache keys follow a strict naming convention and are centralized
- Monitoring framework is available for future dashboards
- No TODO placeholders left in production code

**Timeline:** 5 working days (Mon–Fri)

---

## 2. DELIVERABLES CHECKLIST

### Tier 1 — MUST COMPLETE (Core Engine)
- [ ] `src/hooks/useRealtimeSubscription.ts` – Generic DB listener with cleanup
- [ ] `src/hooks/useAppSync.ts` – Global refresh controller
- [ ] `src/lib/queryKeys.ts` – Centralized cache key definitions
- [ ] `src/context/TransactionsDataContext.tsx` – Refactored to use React Query
- [ ] `src/lib/monitoring/metricsCollector.ts` – Track cache hit rate, latency, etc.
- [ ] Unit tests for all hooks (Jest + React Testing Library)
- [ ] TypeScript type definitions for monitoring & metrics

### Tier 2 — MUST COMPLETE (Phase 1 Hardening)
- [ ] Integration test: `TransactionsDataContext` after React Query refactor
- [ ] Subscription cleanup verification (no orphan channels)
- [ ] Cache key validation tests (no collisions, stable keys)
- [ ] Performance baseline script / notes

### Tier 3 — DOCUMENTATION
- [ ] Implementation guide for developers (how to use hooks & keys)
- [ ] Type exports for external use
- [ ] Basic monitoring view (even if console-only for now)

---

## 3. TASK BREAKDOWN BY FILE

### FILE #1: `src/hooks/useRealtimeSubscription.ts`

**Purpose:** Encapsulate Supabase Realtime subscription logic with:
- Automatic cleanup
- Optional debouncing for cache invalidation
- Tight integration with React Query

**Dependencies:**
- `@tanstack/react-query`
- Supabase client (`supabase` instance from `@/lib/supabase`)

**Specification (Skeleton):**
```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RealtimeFilter {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string; // default 'public'
  filter?: string; // optional RLS-style filter
}

interface UseRealtimeSubscriptionOptions {
  queryKeyToInvalidate: unknown[];
  debounceMs?: number;
  enabled?: boolean;
}

export const useRealtimeSubscription = (
  filter: RealtimeFilter,
  options: UseRealtimeSubscriptionOptions,
) => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IMPLEMENTATION REQUIREMENTS:
  // - Create Supabase channel with postgres_changes handler
  // - On event, debounce invalidation of queryKeyToInvalidate
  // - Respect enabled flag
  // - Cleanup: unsubscribe channel and clear timeout on unmount

  useEffect(() => {
    if (!options.enabled) return;

    const { table, event = '*', schema = 'public' } = filter;
    const { queryKeyToInvalidate, debounceMs = 0 } = options;

    const channel = supabase
      .channel(`${table}:changes`)
      .on('postgres_changes', { event, schema, table }, () => {
        if (debounceMs > 0) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
          }, debounceMs);
        } else {
          queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
        }
      })
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      channel.unsubscribe();
    };
  }, [filter.table, filter.event, filter.schema, options.enabled]);
};
```

**Acceptance Criteria:**
- Subscribes on mount, unsubscribes on unmount
- Debouncing batches events correctly
- Works with any React Query key passed in
- Fully typed, no `any`
- Tested for lifecycle & invalidation behavior

---

### FILE #2: `src/hooks/useAppSync.ts`

**Purpose:** Provide a global "Refresh All" control leveraging React Query.

**Specification (Skeleton):**
```typescript
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface UseAppSyncOptions {
  showToast?: (message: string) => void;
  excludePatterns?: string[]; // e.g. ['draft_']
}

export const useAppSync = (options?: UseAppSyncOptions) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);

    // IMPLEMENTATION REQUIREMENTS:
    // - Invalidate major data groups: transactions, accounts, cost centers, projects, reports
    // - Respect excludePatterns (skip keys matching patterns)

    const keysToRefresh: unknown[][] = [
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.costCenters.all(),
      queryKeys.projects.all(),
      queryKeys.reports.all(),
    ];

    await Promise.all(
      keysToRefresh.map((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      ),
    );

    if (options?.showToast) {
      options.showToast('✅ All data refreshed');
    }

    setIsRefreshing(false);
  }, [queryClient, options?.showToast, options?.excludePatterns]);

  return { refreshAll, isRefreshing };
};
```

**Acceptance Criteria:**
- Single call invalidates all core caches
- Optional toast hook integrated
- No hard-coded strings outside `queryKeys`
- Tested for multiple calls & state behavior

---

### FILE #3: `src/lib/queryKeys.ts`

**Purpose:** Centralize all React Query cache keys.

**Specification (Skeleton):**
```typescript
export const queryKeys = {
  transactions: {
    all: () => ['transactions'] as const,
    by: (filters: {
      orgId?: string;
      costCenterId?: string;
      dateRange?: string;
      status?: 'draft' | 'posted' | 'all';
    }) => {
      const cleaned = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v != null),
      );
      return ['transactions', cleaned] as const;
    },
    detail: (id: string) => ['transactions', id] as const,
  },

  accounts: {
    all: () => ['accounts'] as const,
    active: () => ['accounts', { status: 'active' }] as const,
    detail: (id: string) => ['accounts', id] as const,
  },

  costCenters: {
    all: () => ['cost_centers'] as const,
    active: () => ['cost_centers', { status: 'active' }] as const,
    detail: (id: string) => ['cost_centers', id] as const,
  },

  projects: {
    all: () => ['projects'] as const,
    active: () => ['projects', { status: 'active' }] as const,
    detail: (id: string) => ['projects', id] as const,
  },

  reports: {
    all: () => ['reports'] as const,
    trialBalance: (filters?: { dateRange?: string; orgId?: string }) =>
      ['reports', 'trial-balance', filters ?? {}] as const,
    incomeStatement: (filters?: { dateRange?: string; orgId?: string }) =>
      ['reports', 'income-statement', filters ?? {}] as const,
    cashFlow: (filters?: { dateRange?: string; orgId?: string }) =>
      ['reports', 'cash-flow', filters ?? {}] as const,
  },
};

export type QueryKeyFactory = typeof queryKeys;
```

**Acceptance Criteria:**
- All keys follow a predictable pattern
- No duplication of string literals across app
- Tested for deterministic behavior (same filters → identical key)

---

### FILE #4: `src/context/TransactionsDataContext.tsx`

**Purpose:** Refactor to use React Query under the hood while preserving the public API for components.

**Requirements:**
- Replace manual `useEffect` + `useState` data loading for master data with `useQuery`
- Provide `accounts`, `costCenters`, `projects`, `isLoading`, `error`, `refreshAll`
- Internally use `useRealtimeSubscription` to subscribe to changes on master data tables

**High-Level Pattern:**
```typescript
const useAccountsMasterData = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.accounts.all(),
    queryFn: fetchAccountsFromSupabase,
  });

  useRealtimeSubscription(
    { table: 'accounts' },
    { queryKeyToInvalidate: queryKeys.accounts.all(), debounceMs: 250, enabled: true },
  );

  return { accounts: data ?? [], isLoading, error };
};
```

Then build similar hooks for cost centers and projects, and compose them in the context provider.

**Acceptance Criteria:**
- Existing consumers of `TransactionsDataContext` require no code changes
- Data is cached and shared across all consumers
- Master data updates propagate automatically via Realtime
- All subscriptions are cleaned up correctly

---

### FILE #5: `src/lib/monitoring/metricsCollector.ts`

**Purpose:** Provide a simple in-memory metrics collector for:
- Cache hits & misses
- Realtime event latency
- Subscription counts
- Invalidation counts

**Skeleton:**
```typescript
export interface MetricsSnapshot {
  timestamp: number;
  cacheHitRate: number;
  avgRealtimeLatency: number;
  activeSubscriptionCount: number;
  invalidationCount: number;
}

const state = {
  hits: 0,
  misses: 0,
  events: [] as number[],
  activeSubscriptions: 0,
  invalidations: 0,
};

export const metricsCollector = {
  recordCacheHit: () => {
    state.hits += 1;
  },
  recordCacheMiss: () => {
    state.misses += 1;
  },
  recordRealtimeEvent: (latencyMs: number) => {
    state.events.push(latencyMs);
  },
  recordSubscriptionChange: (delta: 1 | -1) => {
    state.activeSubscriptions += delta;
  },
  recordInvalidation: () => {
    state.invalidations += 1;
  },
  getSnapshot: (): MetricsSnapshot => {
    const total = state.hits + state.misses;
    const cacheHitRate = total === 0 ? 0 : (state.hits / total) * 100;
    const avgRealtimeLatency =
      state.events.length === 0
        ? 0
        : state.events.reduce((a, b) => a + b, 0) / state.events.length;

    return {
      timestamp: Date.now(),
      cacheHitRate,
      avgRealtimeLatency,
      activeSubscriptionCount: state.activeSubscriptions,
      invalidationCount: state.invalidations,
    };
  },
  reset: () => {
    state.hits = 0;
    state.misses = 0;
    state.events = [];
    state.activeSubscriptions = 0;
    state.invalidations = 0;
  },
};

// Optionally attach to window for debugging in dev
if (typeof window !== 'undefined') {
  (window as any).__metricsCollector = metricsCollector;
}
```

**Acceptance Criteria:**
- No external dependencies
- No impact on production performance (simple in-memory operations)
- Can be inspected via `window.__metricsCollector.getSnapshot()`

---

### FILE #6: Tests for Hooks & Monitoring

Create tests for:
- `useRealtimeSubscription`
- `useAppSync`
- `metricsCollector`
- Query keys (deterministic behavior)

Use Jest + React Testing Library `renderHook` patterns. Focus on:
- Subscription lifecycle
- Debouncing behavior
- Correct invalidation calls

---

### FILE #7: `src/types/monitoring.ts`

Define shared interfaces used by monitoring & possibly UI later.

```typescript
export interface CacheMetrics {
  queryKey: unknown[];
  hitCount: number;
  missCount: number;
  lastAccessedAt: number;
}

export interface RealtimeMetrics {
  table: string;
  eventCount: number;
  avgLatencyMs: number;
  lastEventAt: number;
}

export interface SubscriptionMetrics {
  channelName: string;
  isActive: boolean;
  createdAt: number;
  lastEventAt?: number;
}

export interface PerformanceSummary {
  cacheHitRate: number;
  avgLatencyMs: number;
  totalEventsProcessed: number;
  activeSubscriptionsCount: number;
  peakQueriesPerSecond: number;
}
```

---

## 4. DAY-BY-DAY EXECUTION PLAN

### DAY 1 – Foundations
- Implement `queryKeys.ts` fully
- Implement `types/monitoring.ts`
- Add basic unit tests for query key determinism

### DAY 2 – Realtime & Monitoring Core
- Implement `useRealtimeSubscription.ts`
- Implement `metricsCollector.ts`
- Add unit tests for both

### DAY 3 – Global Sync
- Implement `useAppSync.ts`
- Add tests

### DAY 4 – Context Refactor
- Refactor `TransactionsDataContext.tsx` to use React Query
- Wire in `useRealtimeSubscription` for accounts, cost centers, projects
- Add integration tests

### DAY 5 – Hardening & Documentation
- Fill any remaining test gaps
- Run baseline performance measurements
- Create `IMPLEMENTATION_GUIDE.md` explaining how to use new hooks & keys

---

## 5. SUCCESS METRICS AFTER PHASE 1

- **Cache Hit Rate:** > 50% for master data
- **Memory Leaks:** None observed via React DevTools after repeated navigation
- **Test Coverage:** > 80% on new modules
- **TypeScript:** No errors (`tsc --noEmit` passes)
- **Lint:** No serious warnings

---

## 6. HOW TO USE THIS FILE WITH WINDSURF AI

1. Save this file as:
   - `/docs/enterprise-sync-combined.md`

2. In Windsurf AI, provide this instruction:

```text
You are implementing Phase 1 of the Enterprise Data Synchronization Engine.
Read the file: /docs/enterprise-sync-combined.md

Follow Part 2 (Windsurf Implementation Plan) EXACTLY:
- Implement files 1–7 as specified
- Follow the day-by-day breakdown
- Meet all acceptance criteria

Do not change public APIs of existing consumers.
Ask clarification questions if anything is ambiguous.
Start with queryKeys.ts.
```

3. Review daily outputs and confirm they match specifications.

---

**End of Combined Document**
