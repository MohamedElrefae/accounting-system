import { metricsCollector } from '../metricsCollector';

describe('metricsCollector', () => {
  beforeEach(() => {
    metricsCollector.reset();
  });

  it('records cache hits and misses', () => {
    metricsCollector.recordCacheHit();
    metricsCollector.recordCacheHit();
    metricsCollector.recordCacheMiss();

    const snapshot = metricsCollector.getSnapshot();
    expect(snapshot.cacheHitRate).toBeCloseTo(66.67);
  });

  it('records realtime latency', () => {
    metricsCollector.recordRealtimeEvent(100);
    metricsCollector.recordRealtimeEvent(200);

    const snapshot = metricsCollector.getSnapshot();
    expect(snapshot.avgRealtimeLatency).toBe(150);
    expect(snapshot.totalEventsProcessed).toBe(2);
  });

  it('tracks active subscriptions', () => {
    metricsCollector.recordSubscriptionChange(1);
    metricsCollector.recordSubscriptionChange(1);
    expect(metricsCollector.getSnapshot().activeSubscriptionsCount).toBe(2);

    metricsCollector.recordSubscriptionChange(-1);
    expect(metricsCollector.getSnapshot().activeSubscriptionsCount).toBe(1);
  });
});
