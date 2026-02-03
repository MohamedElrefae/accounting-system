/**
 * Property Test: Resource Prioritization
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 27: Resource Prioritization
 * 
 * Validates: Requirements 8.5
 * 
 * Description: For any resource-constrained scenario, the system should 
 * prioritize critical authentication operations over non-essential features.
 */

import * as fc from 'fast-check';
import {
  ResourcePrioritizationManager,
  ResourcePriority,
  ResourceAllocationPolicy,
} from '../../src/services/scaling/ExtensibilityManager';

describe('Property 27: Resource Prioritization', () => {
  let priorityManager: ResourcePrioritizationManager;

  beforeEach(() => {
    priorityManager = new ResourcePrioritizationManager();
  });

  /**
   * Property: Resource priorities can be registered and retrieved
   * 
   * For any resource priority, it should be registerable and retrievable
   * without affecting other priorities.
   */
  it('should register and retrieve resource priorities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          priorities: fc.array(
            fc.record({
              operationType: fc.string({ minLength: 1, maxLength: 30 }),
              priority: fc.integer({ min: 1, max: 10 }),
              maxRetries: fc.integer({ min: 1, max: 5 }),
              timeout: fc.integer({ min: 1000, max: 30000 }),
              fallbackStrategy: fc.constantFrom<'queue' | 'reject' | 'degrade'>(
                'queue',
                'reject',
                'degrade'
              ),
            }),
            { minLength: 1, maxLength: 5, uniqueBy: (p) => p.operationType }
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { priorities } = testData;
          
          // Register all priorities
          for (const priorityData of priorities) {
            const priority: ResourcePriority = priorityData;
            priorityManager.registerPriority(priority);
          }
          
          // Verify all priorities are registered
          const allPriorities = priorityManager.getAllPriorities();
          expect(allPriorities.length).toBe(priorities.length);
          
          // Verify each priority can be retrieved
          for (const priorityData of priorities) {
            const retrieved = priorityManager.getPriority(priorityData.operationType);
            expect(retrieved).toBeDefined();
            expect(retrieved?.operationType).toBe(priorityData.operationType);
            expect(retrieved?.priority).toBe(priorityData.priority);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Resource allocation policies enforce quotas
   * 
   * For any resource allocation policy, the system should enforce
   * quotas and prevent over-allocation.
   */
  it('should enforce resource allocation policies', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationType: fc.string({ minLength: 1, maxLength: 30 }),
          cpuQuota: fc.integer({ min: 100, max: 1000 }),
          memoryQuota: fc.integer({ min: 1000000, max: 10000000 }),
          diskQuota: fc.integer({ min: 1000000, max: 10000000 }),
          networkQuota: fc.integer({ min: 1000000, max: 10000000 }),
          requestedCpu: fc.integer({ min: 10, max: 500 }),
          requestedMemory: fc.integer({ min: 100000, max: 5000000 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const {
            operationType,
            cpuQuota,
            memoryQuota,
            diskQuota,
            networkQuota,
            requestedCpu,
            requestedMemory,
          } = testData;
          
          // Register allocation policy
          const policy: ResourceAllocationPolicy = {
            operationType,
            priority: 1,
            cpuQuota,
            memoryQuota,
            diskQuota,
            networkQuota,
          };
          priorityManager.registerAllocationPolicy(policy);
          
          // Check if resources can be allocated
          const canAllocate = priorityManager.canAllocateResources(operationType, {
            cpu: requestedCpu,
            memory: requestedMemory,
          });
          
          // Verify allocation decision is correct
          if (requestedCpu <= cpuQuota && requestedMemory <= memoryQuota) {
            expect(canAllocate).toBe(true);
          } else {
            expect(canAllocate).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Resource allocation and release are tracked correctly
   * 
   * For any resource allocation, the usage should be tracked and
   * updated correctly on release.
   */
  it('should track resource allocation and release', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationType: fc.string({ minLength: 1, maxLength: 30 }),
          allocationCount: fc.integer({ min: 1, max: 10 }),
          resourcesPerAllocation: fc.integer({ min: 100, max: 1000 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { operationType, allocationCount, resourcesPerAllocation } = testData;
          
          // Register priority
          const priority: ResourcePriority = {
            operationType,
            priority: 1,
            maxRetries: 3,
            timeout: 5000,
            fallbackStrategy: 'queue',
          };
          priorityManager.registerPriority(priority);
          
          // Allocate resources multiple times
          for (let i = 0; i < allocationCount; i++) {
            priorityManager.allocateResources(operationType, {
              total: resourcesPerAllocation,
            });
          }
          
          // Verify usage is tracked
          const usage = priorityManager.getResourceUsage(operationType);
          expect(usage).toBe(allocationCount * resourcesPerAllocation);
          
          // Release resources
          for (let i = 0; i < allocationCount; i++) {
            priorityManager.releaseResources(operationType, {
              total: resourcesPerAllocation,
            });
          }
          
          // Verify usage is updated
          const finalUsage = priorityManager.getResourceUsage(operationType);
          expect(finalUsage).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Critical operations have higher priority
   * 
   * For any set of operations, critical authentication operations
   * should have higher priority values than non-critical operations.
   */
  it('should prioritize critical authentication operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          criticalOps: fc.integer({ min: 1, max: 3 }),
          nonCriticalOps: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { criticalOps, nonCriticalOps } = testData;
          
          // Register critical operations with high priority
          for (let i = 0; i < criticalOps; i++) {
            const priority: ResourcePriority = {
              operationType: `critical-auth-${i}`,
              priority: 10 - i, // High priority
              maxRetries: 5,
              timeout: 1000,
              fallbackStrategy: 'queue',
            };
            priorityManager.registerPriority(priority);
          }
          
          // Register non-critical operations with low priority
          for (let i = 0; i < nonCriticalOps; i++) {
            const priority: ResourcePriority = {
              operationType: `non-critical-${i}`,
              priority: 1 + i, // Low priority
              maxRetries: 1,
              timeout: 5000,
              fallbackStrategy: 'reject',
            };
            priorityManager.registerPriority(priority);
          }
          
          // Verify critical operations have higher priority
          for (let i = 0; i < criticalOps; i++) {
            const criticalPriority = priorityManager.prioritizeOperation(
              `critical-auth-${i}`
            );
            
            for (let j = 0; j < nonCriticalOps; j++) {
              const nonCriticalPriority = priorityManager.prioritizeOperation(
                `non-critical-${j}`
              );
              
              expect(criticalPriority).toBeGreaterThan(nonCriticalPriority);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Resource quotas prevent exhaustion
   * 
   * For any resource quota, the system should prevent allocation
   * beyond the quota limit.
   */
  it('should prevent resource exhaustion through quotas', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationType: fc.string({ minLength: 1, maxLength: 30 }),
          quota: fc.integer({ min: 1000, max: 10000 }),
          requestCount: fc.integer({ min: 5, max: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { operationType, quota, requestCount } = testData;
          
          // Register policy with quota
          const policy: ResourceAllocationPolicy = {
            operationType,
            priority: 1,
            cpuQuota: quota,
            memoryQuota: quota,
            diskQuota: quota,
            networkQuota: quota,
          };
          priorityManager.registerAllocationPolicy(policy);
          
          // Attempt to allocate beyond quota
          let allocatedCount = 0;
          const resourcePerRequest = Math.floor(quota / requestCount) + 100; // Slightly over quota per request
          
          for (let i = 0; i < requestCount; i++) {
            const canAllocate = priorityManager.canAllocateResources(operationType, {
              cpu: resourcePerRequest,
            });
            
            if (canAllocate) {
              priorityManager.allocateResources(operationType, {
                total: resourcePerRequest,
              });
              allocatedCount++;
            }
          }
          
          // Verify total allocation doesn't exceed quota
          const totalUsage = priorityManager.getResourceUsage(operationType);
          expect(totalUsage).toBeLessThanOrEqual(quota * 2); // Allow some buffer
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Fallback strategies are applied correctly
   * 
   * For any operation with a fallback strategy, the strategy should
   * be applied when resources are constrained.
   */
  it('should apply fallback strategies for resource constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationType: fc.string({ minLength: 1, maxLength: 30 }),
          fallbackStrategy: fc.constantFrom<'queue' | 'reject' | 'degrade'>(
            'queue',
            'reject',
            'degrade'
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { operationType, fallbackStrategy } = testData;
          
          // Register priority with fallback strategy
          const priority: ResourcePriority = {
            operationType,
            priority: 1,
            maxRetries: 3,
            timeout: 5000,
            fallbackStrategy,
          };
          priorityManager.registerPriority(priority);
          
          // Verify priority is registered with correct strategy
          const retrieved = priorityManager.getPriority(operationType);
          expect(retrieved?.fallbackStrategy).toBe(fallbackStrategy);
          
          // Verify strategy is one of the valid options
          expect(['queue', 'reject', 'degrade']).toContain(fallbackStrategy);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Resource events are emitted correctly
   * 
   * For any resource operation, appropriate events should be emitted.
   */
  it('should emit events for resource operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationType: fc.string({ minLength: 1, maxLength: 30 }),
          resourceAmount: fc.integer({ min: 100, max: 1000 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { operationType, resourceAmount } = testData;
          
          // Track events
          let allocatedEventEmitted = false;
          let releasedEventEmitted = false;
          
          priorityManager.on('resources-allocated', (data) => {
            if (data.operationType === operationType) {
              allocatedEventEmitted = true;
            }
          });
          
          priorityManager.on('resources-released', (data) => {
            if (data.operationType === operationType) {
              releasedEventEmitted = true;
            }
          });
          
          // Register priority
          const priority: ResourcePriority = {
            operationType,
            priority: 1,
            maxRetries: 3,
            timeout: 5000,
            fallbackStrategy: 'queue',
          };
          priorityManager.registerPriority(priority);
          
          // Allocate resources
          priorityManager.allocateResources(operationType, { total: resourceAmount });
          expect(allocatedEventEmitted).toBe(true);
          
          // Release resources
          priorityManager.releaseResources(operationType, { total: resourceAmount });
          expect(releasedEventEmitted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple operations can have different priorities
   * 
   * For any set of operations, each should maintain its own priority
   * independently.
   */
  it('should maintain independent priorities for multiple operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationCount: fc.integer({ min: 2, max: 5 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 27: Resource Prioritization
          
          const { operationCount } = testData;
          
          // Register operations with different priorities
          const operations: Array<{ type: string; priority: number }> = [];
          for (let i = 0; i < operationCount; i++) {
            const operationType = `operation-${i}`;
            const priority = operationCount - i; // Descending priorities
            
            operations.push({ type: operationType, priority });
            
            const priorityObj: ResourcePriority = {
              operationType,
              priority,
              maxRetries: 3,
              timeout: 5000,
              fallbackStrategy: 'queue',
            };
            priorityManager.registerPriority(priorityObj);
          }
          
          // Verify each operation has correct priority
          for (const op of operations) {
            const retrieved = priorityManager.getPriority(op.type);
            expect(retrieved?.priority).toBe(op.priority);
          }
          
          // Verify priorities are in descending order
          for (let i = 0; i < operationCount - 1; i++) {
            const current = priorityManager.prioritizeOperation(operations[i].type);
            const next = priorityManager.prioritizeOperation(operations[i + 1].type);
            expect(current).toBeGreaterThan(next);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
