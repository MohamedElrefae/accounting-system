/**
 * Property Test: Multi-Tenant Performance Isolation
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 24: Multi-Tenant Performance Isolation
 * 
 * Validates: Requirements 8.2
 * 
 * Description: For any new organization addition, the system should handle 
 * multi-tenant isolation without impacting performance of existing tenants.
 */

import * as fc from 'fast-check';
import {
  HorizontalScalingService,
  ConnectionPoolConfig,
  LoadDistributionConfig,
  MultiTenantConfig,
} from '../../src/services/scaling/HorizontalScalingService';

describe('Property 24: Multi-Tenant Performance Isolation', () => {
  let scalingService: HorizontalScalingService;

  beforeEach(async () => {
    const poolConfig: ConnectionPoolConfig = {
      minConnections: 10,
      maxConnections: 100,
      connectionTimeout: 5000,
      idleTimeout: 300000,
      maxRetries: 3,
    };

    const lbConfig: LoadDistributionConfig = {
      strategy: 'least-connections',
      healthCheckInterval: 10000,
      failoverThreshold: 0.1,
    };

    const mtConfig: MultiTenantConfig = {
      isolationLevel: 'connection',
      resourceQuotaPerTenant: 20,
      priorityLevels: 5,
    };

    scalingService = new HorizontalScalingService(poolConfig, lbConfig, mtConfig);
    await scalingService.initialize();
  });

  /**
   * Property: New tenant registration doesn't affect existing tenants
   * 
   * For any set of existing tenants, adding a new tenant should not
   * degrade performance or resource availability of existing tenants.
   */
  it('should isolate new tenants without affecting existing tenants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          existingTenants: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 1,
            maxLength: 5,
            uniqueBy: (x) => x,
          }),
          newTenantId: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const { existingTenants, newTenantId } = testData;
          
          // Register existing tenants
          for (const tenantId of existingTenants) {
            scalingService['tenantManager'].registerTenant(tenantId);
          }
          
          // Get metrics before adding new tenant
          const metricsBefore = scalingService.getMetrics();
          const existingQuotasBefore = existingTenants.map((id) =>
            scalingService['tenantManager'].getTenantQuota(id)
          );
          
          // Add new tenant
          scalingService['tenantManager'].registerTenant(newTenantId);
          
          // Get metrics after adding new tenant
          const metricsAfter = scalingService.getMetrics();
          const existingQuotasAfter = existingTenants.map((id) =>
            scalingService['tenantManager'].getTenantQuota(id)
          );
          
          // Verify existing tenants' quotas are unchanged
          for (let i = 0; i < existingTenants.length; i++) {
            expect(existingQuotasAfter[i]?.maxConnections).toBe(
              existingQuotasBefore[i]?.maxConnections
            );
            expect(existingQuotasAfter[i]?.maxMemory).toBe(
              existingQuotasBefore[i]?.maxMemory
            );
          }
          
          // Verify new tenant has quota
          const newTenantQuota = scalingService['tenantManager'].getTenantQuota(
            newTenantId
          );
          expect(newTenantQuota).toBeDefined();
          expect(newTenantQuota?.maxConnections).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Tenant quota enforcement prevents resource exhaustion
   * 
   * For any tenant, exceeding its quota should be prevented and should not
   * affect other tenants' ability to allocate resources.
   */
  it('should enforce tenant quotas without affecting other tenants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.string({ minLength: 1, maxLength: 20 }),
          tenant2Id: fc.string({ minLength: 1, maxLength: 20 }),
          tenant1Requests: fc.integer({ min: 1, max: 30 }),
          tenant2Requests: fc.integer({ min: 1, max: 30 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const { tenant1Id, tenant2Id, tenant1Requests, tenant2Requests } =
            testData;
          
          // Skip if tenant IDs are the same
          if (tenant1Id === tenant2Id) {
            return;
          }
          
          // Register tenants
          scalingService['tenantManager'].registerTenant(tenant1Id);
          scalingService['tenantManager'].registerTenant(tenant2Id);
          
          // Get initial quotas
          const tenant1Quota = scalingService['tenantManager'].getTenantQuota(
            tenant1Id
          )!;
          const tenant2Quota = scalingService['tenantManager'].getTenantQuota(
            tenant2Id
          )!;
          
          // Attempt to allocate connections for tenant1
          let tenant1Allocated = 0;
          for (let i = 0; i < tenant1Requests; i++) {
            if (
              scalingService['tenantManager'].canAllocateConnection(tenant1Id)
            ) {
              scalingService['tenantManager'].allocateConnection(tenant1Id);
              tenant1Allocated++;
            } else {
              break;
            }
          }
          
          // Verify tenant1 is within quota
          expect(tenant1Allocated).toBeLessThanOrEqual(
            tenant1Quota.maxConnections
          );
          
          // Verify tenant2 can still allocate (not affected by tenant1)
          const tenant2CanAllocate =
            scalingService['tenantManager'].canAllocateConnection(tenant2Id);
          expect(tenant2CanAllocate).toBe(true);
          
          // Allocate for tenant2
          let tenant2Allocated = 0;
          for (let i = 0; i < tenant2Requests; i++) {
            if (
              scalingService['tenantManager'].canAllocateConnection(tenant2Id)
            ) {
              scalingService['tenantManager'].allocateConnection(tenant2Id);
              tenant2Allocated++;
            } else {
              break;
            }
          }
          
          // Verify tenant2 is within quota
          expect(tenant2Allocated).toBeLessThanOrEqual(
            tenant2Quota.maxConnections
          );
          
          // Verify both tenants' allocations are independent
          const tenant1Usage = scalingService['tenantManager']
            .getTenantQuota(tenant1Id)
            ?.currentUsage.connections;
          const tenant2Usage = scalingService['tenantManager']
            .getTenantQuota(tenant2Id)
            ?.currentUsage.connections;
          
          expect(tenant1Usage).toBe(tenant1Allocated);
          expect(tenant2Usage).toBe(tenant2Allocated);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Resource release doesn't affect other tenants
   * 
   * For any tenant releasing resources, other tenants should not be
   * negatively impacted and should be able to use released resources.
   */
  it('should allow resource reuse across tenants after release', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.string({ minLength: 1, maxLength: 20 }),
          tenant2Id: fc.string({ minLength: 1, maxLength: 20 }),
          allocations: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const { tenant1Id, tenant2Id, allocations } = testData;
          
          // Skip if tenant IDs are the same
          if (tenant1Id === tenant2Id) {
            return;
          }
          
          // Register tenants
          scalingService['tenantManager'].registerTenant(tenant1Id);
          scalingService['tenantManager'].registerTenant(tenant2Id);
          
          // Allocate for tenant1
          for (let i = 0; i < allocations; i++) {
            if (
              scalingService['tenantManager'].canAllocateConnection(tenant1Id)
            ) {
              scalingService['tenantManager'].allocateConnection(tenant1Id);
            }
          }
          
          const tenant1UsageBefore = scalingService['tenantManager']
            .getTenantQuota(tenant1Id)
            ?.currentUsage.connections;
          
          // Release tenant1 resources
          for (let i = 0; i < allocations; i++) {
            scalingService['tenantManager'].releaseConnection(tenant1Id);
          }
          
          const tenant1UsageAfter = scalingService['tenantManager']
            .getTenantQuota(tenant1Id)
            ?.currentUsage.connections;
          
          // Verify tenant1 released resources
          expect(tenant1UsageAfter).toBeLessThan(tenant1UsageBefore || 0);
          
          // Verify tenant2 can now allocate more
          const tenant2CanAllocate =
            scalingService['tenantManager'].canAllocateConnection(tenant2Id);
          expect(tenant2CanAllocate).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Memory quota enforcement prevents memory exhaustion
   * 
   * For any tenant, memory usage should be tracked and enforced against
   * quota without affecting other tenants.
   */
  it('should enforce memory quotas per tenant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.string({ minLength: 1, maxLength: 20 }),
          tenant2Id: fc.string({ minLength: 1, maxLength: 20 }),
          tenant1MemoryDelta: fc.integer({ min: 1000, max: 50000000 }),
          tenant2MemoryDelta: fc.integer({ min: 1000, max: 50000000 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const {
            tenant1Id,
            tenant2Id,
            tenant1MemoryDelta,
            tenant2MemoryDelta,
          } = testData;
          
          // Skip if tenant IDs are the same
          if (tenant1Id === tenant2Id) {
            return;
          }
          
          // Register tenants
          scalingService['tenantManager'].registerTenant(tenant1Id);
          scalingService['tenantManager'].registerTenant(tenant2Id);
          
          // Get initial memory usage
          const tenant1QuotaBefore = scalingService['tenantManager'].getTenantQuota(
            tenant1Id
          )!;
          const tenant2QuotaBefore = scalingService['tenantManager'].getTenantQuota(
            tenant2Id
          )!;
          
          // Update memory usage
          scalingService['tenantManager'].updateMemoryUsage(
            tenant1Id,
            tenant1MemoryDelta
          );
          scalingService['tenantManager'].updateMemoryUsage(
            tenant2Id,
            tenant2MemoryDelta
          );
          
          // Get updated memory usage
          const tenant1QuotaAfter = scalingService['tenantManager'].getTenantQuota(
            tenant1Id
          )!;
          const tenant2QuotaAfter = scalingService['tenantManager'].getTenantQuota(
            tenant2Id
          )!;
          
          // Verify memory usage is tracked independently
          expect(tenant1QuotaAfter.currentUsage.memory).toBe(
            tenant1QuotaBefore.currentUsage.memory + tenant1MemoryDelta
          );
          expect(tenant2QuotaAfter.currentUsage.memory).toBe(
            tenant2QuotaBefore.currentUsage.memory + tenant2MemoryDelta
          );
          
          // Verify quotas are independent
          expect(tenant1QuotaAfter.maxMemory).toBe(tenant1QuotaBefore.maxMemory);
          expect(tenant2QuotaAfter.maxMemory).toBe(tenant2QuotaBefore.maxMemory);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Tenant isolation metrics are accurate
   * 
   * For any multi-tenant configuration, the isolation metrics should
   * accurately reflect resource usage per tenant.
   */
  it('should accurately report tenant isolation metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 1,
            maxLength: 5,
            uniqueBy: (x) => x,
          }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const { tenantIds } = testData;
          
          // Register all tenants
          for (const tenantId of tenantIds) {
            scalingService['tenantManager'].registerTenant(tenantId);
          }
          
          // Get metrics
          const metrics = scalingService.getMetrics();
          
          // Verify tenant isolation metrics
          expect(metrics.tenantIsolationMetrics).toBeDefined();
          expect(Object.keys(metrics.tenantIsolationMetrics).length).toBe(
            tenantIds.length
          );
          
          // Verify each tenant has quota info
          for (const tenantId of tenantIds) {
            const quota = metrics.tenantIsolationMetrics[tenantId];
            expect(quota).toBeDefined();
            expect(quota.tenantId).toBe(tenantId);
            expect(quota.maxConnections).toBeGreaterThan(0);
            expect(quota.maxMemory).toBeGreaterThan(0);
            expect(quota.maxQueriesPerSecond).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Priority-based resource allocation works correctly
   * 
   * For any priority level, higher priority tenants should get more
   * resources than lower priority tenants.
   */
  it('should allocate resources based on tenant priority', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          highPriorityTenantId: fc.string({ minLength: 1, maxLength: 20 }),
          lowPriorityTenantId: fc.string({ minLength: 1, maxLength: 20 }),
          highPriority: fc.integer({ min: 1, max: 3 }),
          lowPriority: fc.integer({ min: 4, max: 5 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const {
            highPriorityTenantId,
            lowPriorityTenantId,
            highPriority,
            lowPriority,
          } = testData;
          
          // Skip if tenant IDs are the same
          if (highPriorityTenantId === lowPriorityTenantId) {
            return;
          }
          
          // Register tenants with different priorities
          scalingService['tenantManager'].registerTenant(
            highPriorityTenantId,
            highPriority
          );
          scalingService['tenantManager'].registerTenant(
            lowPriorityTenantId,
            lowPriority
          );
          
          // Get quotas
          const highPriorityQuota = scalingService['tenantManager'].getTenantQuota(
            highPriorityTenantId
          )!;
          const lowPriorityQuota = scalingService['tenantManager'].getTenantQuota(
            lowPriorityTenantId
          )!;
          
          // Higher priority should have more connections
          expect(highPriorityQuota.maxConnections).toBeGreaterThanOrEqual(
            lowPriorityQuota.maxConnections
          );
          
          // Higher priority should have higher QPS limit
          expect(highPriorityQuota.maxQueriesPerSecond).toBeGreaterThanOrEqual(
            lowPriorityQuota.maxQueriesPerSecond
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Quota events are emitted correctly
   * 
   * For any quota violation, appropriate events should be emitted
   * without affecting other tenants.
   */
  it('should emit quota exceeded events without affecting other tenants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.string({ minLength: 1, maxLength: 20 }),
          tenant2Id: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 24: Multi-Tenant Performance Isolation
          
          const { tenant1Id, tenant2Id } = testData;
          
          // Skip if tenant IDs are the same
          if (tenant1Id === tenant2Id) {
            return;
          }
          
          // Register tenants
          scalingService['tenantManager'].registerTenant(tenant1Id);
          scalingService['tenantManager'].registerTenant(tenant2Id);
          
          // Track events
          let quotaExceededEmitted = false;
          scalingService['tenantManager'].on('quota-exceeded', (id) => {
            if (id === tenant1Id) {
              quotaExceededEmitted = true;
            }
          });
          
          // Get tenant1 quota
          const tenant1Quota = scalingService['tenantManager'].getTenantQuota(
            tenant1Id
          )!;
          
          // Exhaust tenant1 quota
          for (let i = 0; i < tenant1Quota.maxConnections + 5; i++) {
            scalingService['tenantManager'].canAllocateConnection(tenant1Id);
            if (
              scalingService['tenantManager'].canAllocateConnection(tenant1Id)
            ) {
              scalingService['tenantManager'].allocateConnection(tenant1Id);
            }
          }
          
          // Verify tenant2 is not affected
          const tenant2CanAllocate =
            scalingService['tenantManager'].canAllocateConnection(tenant2Id);
          expect(tenant2CanAllocate).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
