import type { PerformanceSummary } from '../../types/monitoring';

export interface MetricsSnapshot extends PerformanceSummary {
  timestamp: number;
  invalidationCount: number;
}

const state = {
  hits: 0,
  misses: 0,
  events: [] as number[],
  activeSubscriptions: 0,
  invalidations: 0,
  startTime: Date.now(),
};

export const metricsCollector = {
  recordCacheHit: () => {
    state.hits += 1;
  },
  recordCacheMiss: () => {
    state.misses += 1;
  },
  recordRealtimeEvent: (latencyMs: number) => {
    // Keep only last 100 events to save memory
    if (state.events.length >= 100) state.events.shift();
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

    const runtimeSec = (Date.now() - state.startTime) / 1000;
    const peakQueriesPerSecond = runtimeSec > 0 ? total / runtimeSec : 0;

    return {
      timestamp: Date.now(),
      cacheHitRate,
      avgRealtimeLatency,
      activeSubscriptionsCount: state.activeSubscriptions,
      invalidationCount: state.invalidations,
      totalEventsProcessed: state.events.length, // approximate in window
      peakQueriesPerSecond,
    };
  },
  reset: () => {
    state.hits = 0;
    state.misses = 0;
    state.events = [];
    state.activeSubscriptions = 0;
    state.invalidations = 0;
    state.startTime = Date.now();
  },
};

// Attach to window for debugging in dev
if (typeof window !== 'undefined') {
  (window as any).__metricsCollector = metricsCollector;
}
