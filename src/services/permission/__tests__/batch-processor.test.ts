import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchPermissionProcessor, type BatchPermissionRequest, type BatchProcessingResult } from '../BatchPermissionProcessor';
import { PermissionService } from '../PermissionService';
import { CacheManager } from '../../cache/CacheManager';

// Mock implementations
const createMockPermissionService = (): PermissionService => {
  return {
    assignPermission: vi.fn().mockResolvedValue(undefined),
    revokePermission: vi.fn().mockResolvedValue(undefined),
    getPermissions: vi.fn().mockResolvedValue([]),
    hasPermission: vi.fn().mockResolvedValue(true),
  } as unknown as PermissionService;
};

const createMockCacheManager = (): CacheManager => {
  const cache = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => cache.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      cache.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      cache.delete(key);
    }),
    clear: vi.fn(async () => {
      cache.clear();
    }),
  } as unknown as CacheManager;
};

describe('BatchPermissionProcessor', () => {
  let processor: BatchPermissionProcessor;
  let mockPermissionService: PermissionService;
  let mockCacheManager: CacheManager;

  beforeEach(() => {
    mockPermissionService = createMockPermissionService();
    mockCacheManager = createMockCacheManager();
    processor = new BatchPermissionProcessor(mockPermissionService, mockCacheManager, {
      batchSize: 10,
      processingTimeout: 100,
      maxRetries: 2,
      enableCache: true,
      cacheTTL: 3600,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    processor.clear();
  });

  describe('addRequest', () => {
    it('should add a single request to the batch', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      expect(processor.getQueueSize()).toBe(1);
    });

    it('should process immediately when batch size is reached', async () => {
      const requests: BatchPermissionRequest[] = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        roleId: 'role1',
      }));

      for (const request of requests) {
        await processor.addRequest(request);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPermissionService.assignPermission).toHaveBeenCalled();
      expect(processor.getQueueSize()).toBe(0);
    });

    it('should deduplicate identical requests', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      await processor.addRequest(request);
      await processor.addRequest(request);

      const result = await processor.flush();

      // Should only process once due to deduplication
      expect(result.successful).toBe(1);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(1);
    });

    it('should handle requests with different scopes', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1', scopeId: 'org1', scopeType: 'organization' },
        { userId: 'user1', roleId: 'role1', scopeId: 'proj1', scopeType: 'project' },
        { userId: 'user1', roleId: 'role1' }, // global scope
      ];

      await processor.addRequests(requests);
      const result = await processor.flush();

      expect(result.successful).toBe(3);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(3);
    });
  });

  describe('addRequests', () => {
    it('should add multiple requests to the batch', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
        { userId: 'user3', roleId: 'role3' },
      ];

      await processor.addRequests(requests);
      expect(processor.getQueueSize()).toBe(3);
    });

    it('should process immediately when batch size is reached', async () => {
      const requests: BatchPermissionRequest[] = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        roleId: 'role1',
      }));

      await processor.addRequests(requests);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPermissionService.assignPermission).toHaveBeenCalled();
      expect(processor.getQueueSize()).toBe(0);
    });

    it('should deduplicate across multiple addRequests calls', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequests([request]);
      await processor.addRequests([request]);
      await processor.addRequests([request]);

      const result = await processor.flush();

      expect(result.successful).toBe(1);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(1);
    });
  });

  describe('processBatch', () => {
    it('should process all requests in the batch', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
        { userId: 'user3', roleId: 'role3' },
      ];

      await processor.addRequests(requests);
      const result = await processor.processBatch();

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(3);
    });

    it('should handle processing errors', async () => {
      const error = new Error('Permission denied');
      (mockPermissionService.assignPermission as any).mockRejectedValueOnce(error);

      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      const result = await processor.processBatch();

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Permission denied');
    });

    it('should retry failed requests', async () => {
      (mockPermissionService.assignPermission as any)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(undefined);

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      const result = await processor.processBatch();

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(2);
    });

    it('should skip cached permissions', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      // Pre-populate cache
      await mockCacheManager.set('perm:user1:role1:global', true);

      await processor.addRequest(request);
      const result = await processor.processBatch();

      expect(result.successful).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockPermissionService.assignPermission).not.toHaveBeenCalled();
    });

    it('should return empty result when queue is empty', async () => {
      const result = await processor.processBatch();

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track processing duration', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      const result = await processor.processBatch();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle all retries exhausted', async () => {
      const error = new Error('Persistent error');
      (mockPermissionService.assignPermission as any).mockRejectedValue(error);

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      const result = await processor.processBatch();

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(2); // maxRetries = 2
    });

    it('should process large batches in chunks', async () => {
      const requests: BatchPermissionRequest[] = Array.from({ length: 25 }, (_, i) => ({
        userId: `user${i}`,
        roleId: 'role1',
      }));

      await processor.addRequests(requests);
      const result = await processor.processBatch();

      expect(result.successful).toBe(25);
      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(25);
    });
  });

  describe('flush', () => {
    it('should process pending requests immediately', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      const result = await processor.flush();

      expect(result.successful).toBe(2);
      expect(processor.getQueueSize()).toBe(0);
    });

    it('should return empty result if no pending requests', async () => {
      const result = await processor.flush();

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should clear processing timer', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      expect(processor.getQueueSize()).toBe(1);

      await processor.flush();
      expect(processor.getQueueSize()).toBe(0);
    });
  });

  describe('metrics', () => {
    it('should track total processed count', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      await processor.processBatch();

      const metrics = processor.getMetrics();
      expect(metrics.totalProcessed).toBe(2);
    });

    it('should track total errors count', async () => {
      (mockPermissionService.assignPermission as any).mockRejectedValue(new Error('Error'));

      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      await processor.processBatch();

      const metrics = processor.getMetrics();
      expect(metrics.totalErrors).toBe(2);
    });

    it('should calculate average processing time', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      await processor.processBatch();

      const metrics = processor.getMetrics();
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should report queue size', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      const metrics = processor.getMetrics();

      expect(metrics.queueSize).toBe(2);
    });

    it('should report processing status', async () => {
      const metrics = processor.getMetrics();
      expect(metrics.isProcessing).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all pending requests', async () => {
      const requests: BatchPermissionRequest[] = [
        { userId: 'user1', roleId: 'role1' },
        { userId: 'user2', roleId: 'role2' },
      ];

      await processor.addRequests(requests);
      expect(processor.getQueueSize()).toBe(2);

      processor.clear();
      expect(processor.getQueueSize()).toBe(0);
    });

    it('should clear processing timer', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      processor.clear();

      // Wait to ensure timer doesn't fire
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockPermissionService.assignPermission).not.toHaveBeenCalled();
    });
  });

  describe('isCurrentlyProcessing', () => {
    it('should return false when not processing', () => {
      expect(processor.isCurrentlyProcessing()).toBe(false);
    });

    it('should return true during processing', async () => {
      // Mock a slow operation
      (mockPermissionService.assignPermission as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const requests: BatchPermissionRequest[] = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        roleId: 'role1',
      }));

      await processor.addRequests(requests);

      // Check immediately after triggering batch processing
      const processingPromise = processor.processBatch();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(processor.isCurrentlyProcessing()).toBe(true);

      await processingPromise;
      expect(processor.isCurrentlyProcessing()).toBe(false);
    });
  });

  describe('cache integration', () => {
    it('should cache successful permission assignments', async () => {
      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      await processor.processBatch();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'perm:user1:role1:global',
        true,
        3600
      );
    });

    it('should not cache failed permission assignments', async () => {
      (mockPermissionService.assignPermission as any).mockRejectedValue(new Error('Error'));

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      await processor.processBatch();

      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should disable cache when enableCache is false', async () => {
      processor = new BatchPermissionProcessor(mockPermissionService, mockCacheManager, {
        enableCache: false,
      });

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      await processor.processBatch();

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should use custom batch size', async () => {
      processor = new BatchPermissionProcessor(mockPermissionService, mockCacheManager, {
        batchSize: 5,
      });

      const requests: BatchPermissionRequest[] = Array.from({ length: 5 }, (_, i) => ({
        userId: `user${i}`,
        roleId: 'role1',
      }));

      for (const request of requests) {
        await processor.addRequest(request);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPermissionService.assignPermission).toHaveBeenCalled();
    });

    it('should use custom processing timeout', async () => {
      processor = new BatchPermissionProcessor(mockPermissionService, mockCacheManager, {
        processingTimeout: 50,
      });

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockPermissionService.assignPermission).toHaveBeenCalled();
    });

    it('should use custom max retries', async () => {
      processor = new BatchPermissionProcessor(mockPermissionService, mockCacheManager, {
        maxRetries: 5,
      });

      (mockPermissionService.assignPermission as any).mockRejectedValue(new Error('Error'));

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      await processor.processBatch();

      expect(mockPermissionService.assignPermission).toHaveBeenCalledTimes(5);
    });

    it('should use custom cache TTL', async () => {
      processor = new BatchPermissionProcessor(mockPermissionService, mockCacheManager, {
        cacheTTL: 7200,
      });

      const request: BatchPermissionRequest = {
        userId: 'user1',
        roleId: 'role1',
      };

      await processor.addRequest(request);
      await processor.processBatch();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'perm:user1:role1:global',
        true,
        7200
      );
    });
  });
});
