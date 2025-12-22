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
