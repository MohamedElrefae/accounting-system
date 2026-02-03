/**
 * Batch Permission Processor
 * 
 * Implements efficient batch processing of permission operations with:
 * - Automatic batching and deduplication
 * - Configurable batch size and timeout
 * - Retry logic with exponential backoff
 * - Cache integration for performance
 * - Comprehensive metrics and monitoring
 * 
 * Validates: Requirements 2.5, 3.1
 * Feature: enterprise-auth-performance-optimization
 */

import { PermissionService } from './PermissionService';
import { CacheManager } from '../cache/CacheManager';

/**
 * Batch permission request
 */
export interface BatchPermissionRequest {
  userId: string;
  roleId: string;
  scopeId?: string;
  scopeType?: 'organization' | 'project';
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    request: BatchPermissionRequest;
    error: string;
  }>;
  duration: number;
  timestamp: Date;
}

/**
 * Processor metrics
 */
export interface ProcessorMetrics {
  totalProcessed: number;
  totalErrors: number;
  averageProcessingTime: number;
  queueSize: number;
  isProcessing: boolean;
}

/**
 * Processor configuration
 */
export interface ProcessorConfig {
  batchSize?: number;
  processingTimeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
  cacheTTL?: number;
}

/**
 * Batch Permission Processor
 * 
 * Efficiently processes permission operations in batches to reduce
 * database queries and improve overall system performance.
 */
export class BatchPermissionProcessor {
  private queue: Map<string, BatchPermissionRequest> = new Map();
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private metrics = {
    totalProcessed: 0,
    totalErrors: 0,
    totalDuration: 0,
    processingCount: 0,
  };

  private readonly config: Required<ProcessorConfig>;

  constructor(
    private permissionService: PermissionService,
    private cacheManager: CacheManager,
    config?: ProcessorConfig
  ) {
    this.config = {
      batchSize: config?.batchSize ?? 10,
      processingTimeout: config?.processingTimeout ?? 100,
      maxRetries: config?.maxRetries ?? 2,
      enableCache: config?.enableCache ?? true,
      cacheTTL: config?.cacheTTL ?? 3600,
    };
  }

  /**
   * Add a single request to the batch
   */
  async addRequest(request: BatchPermissionRequest): Promise<void> {
    const key = this.generateRequestKey(request);
    this.queue.set(key, request);

    // Check if we should process immediately
    if (this.queue.size >= this.config.batchSize) {
      await this.processBatch();
    } else {
      // Schedule processing if not already scheduled
      this.scheduleProcessing();
    }
  }

  /**
   * Add multiple requests to the batch
   */
  async addRequests(requests: BatchPermissionRequest[]): Promise<void> {
    for (const request of requests) {
      const key = this.generateRequestKey(request);
      this.queue.set(key, request);
    }

    // Check if we should process immediately
    if (this.queue.size >= this.config.batchSize) {
      await this.processBatch();
    } else {
      // Schedule processing if not already scheduled
      this.scheduleProcessing();
    }
  }

  /**
   * Process all pending requests in the batch
   */
  async processBatch(): Promise<BatchProcessingResult> {
    if (this.isProcessing || this.queue.size === 0) {
      return {
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        duration: 0,
        timestamp: new Date(),
      };
    }

    this.isProcessing = true;
    this.clearProcessingTimer();

    const startTime = performance.now();
    const result: BatchProcessingResult = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Get all requests from queue
      const requests = Array.from(this.queue.values());
      this.queue.clear();

      // Process requests in chunks
      for (let i = 0; i < requests.length; i += this.config.batchSize) {
        const chunk = requests.slice(i, i + this.config.batchSize);
        await this.processChunk(chunk, result);
      }

      // Update metrics
      this.metrics.totalProcessed += result.successful;
      this.metrics.totalErrors += result.failed;
      this.metrics.totalDuration += result.duration;
      this.metrics.processingCount++;
    } finally {
      this.isProcessing = false;
      result.duration = performance.now() - startTime;
    }

    return result;
  }

  /**
   * Process a chunk of requests
   */
  private async processChunk(
    requests: BatchPermissionRequest[],
    result: BatchProcessingResult
  ): Promise<void> {
    for (const request of requests) {
      try {
        // Check cache first
        if (this.config.enableCache) {
          const cacheKey = this.generateCacheKey(request);
          const cached = await this.cacheManager.get(cacheKey);

          if (cached) {
            result.skipped++;
            continue;
          }
        }

        // Process with retries
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
          try {
            await this.permissionService.assignPermission(
              request.userId,
              request.roleId,
              request.scopeId,
              request.scopeType
            );

            // Cache successful result
            if (this.config.enableCache) {
              const cacheKey = this.generateCacheKey(request);
              await this.cacheManager.set(cacheKey, true, this.config.cacheTTL);
            }

            result.successful++;
            break;
          } catch (error) {
            lastError = error as Error;
            if (attempt < this.config.maxRetries - 1) {
              // Wait before retry with exponential backoff
              await this.delay(Math.pow(2, attempt) * 10);
            }
          }
        }

        if (lastError) {
          result.failed++;
          result.errors.push({
            request,
            error: lastError.message,
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          request,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Flush all pending requests immediately
   */
  async flush(): Promise<BatchProcessingResult> {
    this.clearProcessingTimer();
    return this.processBatch();
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get processor metrics
   */
  getMetrics(): ProcessorMetrics {
    const avgProcessingTime = this.metrics.processingCount > 0
      ? this.metrics.totalDuration / this.metrics.processingCount
      : 0;

    return {
      totalProcessed: this.metrics.totalProcessed,
      totalErrors: this.metrics.totalErrors,
      averageProcessingTime: avgProcessingTime,
      queueSize: this.queue.size,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.clear();
    this.clearProcessingTimer();
  }

  // Private helper methods

  /**
   * Generate unique key for request deduplication
   */
  private generateRequestKey(request: BatchPermissionRequest): string {
    const scope = request.scopeId ? `${request.scopeType}:${request.scopeId}` : 'global';
    return `${request.userId}:${request.roleId}:${scope}`;
  }

  /**
   * Generate cache key for permission
   */
  private generateCacheKey(request: BatchPermissionRequest): string {
    const scope = request.scopeId ? `${request.scopeType}:${request.scopeId}` : 'global';
    return `perm:${request.userId}:${request.roleId}:${scope}`;
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(): void {
    if (this.processingTimer) {
      return; // Already scheduled
    }

    this.processingTimer = setTimeout(() => {
      this.processingTimer = null;
      this.processBatch();
    }, this.config.processingTimeout);
  }

  /**
   * Clear processing timer
   */
  private clearProcessingTimer(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
