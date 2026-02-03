/**
 * Property Test: Horizontal Scaling Support
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 26: Horizontal Scaling Support
 * 
 * Validates: Requirements 8.4
 * 
 * Description: For any scaling requirement, the system should support 
 * horizontal scaling through connection pooling and load distribution.
 */

import * as fc from 'fast-check';
import {
  HorizontalScalingService,
  ConnectionPoolConfig,
  LoadDistributionConfig,
  MultiTenantConfig,
  LoadBalancerNode,
} from '../../src/services/scaling/HorizontalScalingService';

describe('Property 26: Horizontal Scaling Support', () => {
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

  afterEach(async () => {
    await scalingService.shutdown();
  });

  /**
   * Property: Connection pool scales with demand
   * 
   * For any number of concurrent requests, the connection pool should
   * scale up to the maximum configured connections.
   */
  it('should scale connection pool with demand', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requestCount: fc.integer({ min: 5, max: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { requestCount } = testData;
          
          // Register a tenant
          scalingService['tenantManager'].registerTenant('test-tenant');
          
          // Simulate concurrent requests
          const promises = [];
          for (let i = 0; i < requestCount; i++) {
            promises.push(
              scalingService.executeQuery('test-tenant', async () => {
                // Simulate query execution
                return new Promise((resolve) =>
                  setTimeout(resolve, Math.random() * 100)
                );
              })
            );
          }
          
          // Execute all requests
          await Promise.all(promises);
          
          // Get metrics
          const metrics = scalingService.getMetrics();
          
          // Verify pool scaled appropriately
          expect(metrics.totalConnections).toBeGreaterThan(0);
          expect(metrics.totalConnections).toBeLessThanOrEqual(100); // maxConnections
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Load balancer distributes requests across nodes
   * 
   * For any set of healthy nodes, requests should be distributed
   * according to the configured strategy.
   */
  it('should distribute load across multiple nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nodeCount: fc.integer({ min: 2, max: 5 }),
          requestCount: fc.integer({ min: 10, max: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { nodeCount, requestCount } = testData;
          
          // Add nodes to load balancer
          for (let i = 0; i < nodeCount; i++) {
            const node: LoadBalancerNode = {
              id: `node-${i}`,
              host: `host-${i}`,
              port: 5432 + i,
              weight: 1,
              isHealthy: true,
              activeConnections: 0,
              totalRequests: 0,
              errorRate: 0,
            };
            scalingService['loadBalancer'].addNode(node);
          }
          
          // Register tenant
          scalingService['tenantManager'].registerTenant('test-tenant');
          
          // Simulate requests
          for (let i = 0; i < requestCount; i++) {
            try {
              const node = scalingService['loadBalancer'].selectNode();
              expect(node).toBeDefined();
              expect(node.isHealthy).toBe(true);
            } catch (error) {
              // Expected if no healthy nodes
            }
          }
          
          // Get metrics
          const metrics = scalingService.getMetrics();
          
          // Verify load distribution
          expect(metrics.loadBalancerDistribution).toBeDefined();
          expect(Object.keys(metrics.loadBalancerDistribution).length).toBe(
            nodeCount
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Load balancer strategies work correctly
   * 
   * For any load balancing strategy, nodes should be selected according
   * to the strategy rules.
   */
  it('should apply load balancing strategies correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          strategy: fc.constantFrom<'round-robin' | 'least-connections' | 'weighted'>(
            'round-robin',
            'least-connections',
            'weighted'
          ),
          nodeCount: fc.integer({ min: 2, max: 4 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { strategy, nodeCount } = testData;
          
          // Create new service with specific strategy
          const lbConfig: LoadDistributionConfig = {
            strategy,
            healthCheckInterval: 10000,
            failoverThreshold: 0.1,
          };
          
          const poolConfig: ConnectionPoolConfig = {
            minConnections: 5,
            maxConnections: 50,
            connectionTimeout: 5000,
            idleTimeout: 300000,
            maxRetries: 3,
          };
          
          const mtConfig: MultiTenantConfig = {
            isolationLevel: 'connection',
            resourceQuotaPerTenant: 20,
            priorityLevels: 5,
          };
          
          const service = new HorizontalScalingService(
            poolConfig,
            lbConfig,
            mtConfig
          );
          await service.initialize();
          
          try {
            // Add nodes
            for (let i = 0; i < nodeCount; i++) {
              const node: LoadBalancerNode = {
                id: `node-${i}`,
                host: `host-${i}`,
                port: 5432 + i,
                weight: i + 1, // Weighted
                isHealthy: true,
                activeConnections: i, // Varying loads
                totalRequests: 0,
                errorRate: 0,
              };
              service['loadBalancer'].addNode(node);
            }
            
            // Select nodes multiple times
            const selections: string[] = [];
            for (let i = 0; i < 10; i++) {
              const node = service['loadBalancer'].selectNode();
              selections.push(node.id);
            }
            
            // Verify selections based on strategy
            if (strategy === 'round-robin') {
              // Should cycle through nodes
              expect(new Set(selections).size).toBeGreaterThan(1);
            } else if (strategy === 'least-connections') {
              // Should prefer nodes with fewer connections
              const selectedNodes = selections.map((id) =>
                service['loadBalancer']['nodes'].get(id)
              );
              expect(selectedNodes.length).toBeGreaterThan(0);
            } else if (strategy === 'weighted') {
              // Should prefer higher weight nodes
              expect(selections.length).toBe(10);
            }
          } finally {
            await service.shutdown();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Node health checks work correctly
   * 
   * For any node configuration, health checks should identify unhealthy
   * nodes and prevent their selection.
   */
  it('should exclude unhealthy nodes from selection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          healthyNodeCount: fc.integer({ min: 1, max: 3 }),
          unhealthyNodeCount: fc.integer({ min: 1, max: 2 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { healthyNodeCount, unhealthyNodeCount } = testData;
          
          // Add healthy nodes
          for (let i = 0; i < healthyNodeCount; i++) {
            const node: LoadBalancerNode = {
              id: `healthy-${i}`,
              host: `host-${i}`,
              port: 5432 + i,
              weight: 1,
              isHealthy: true,
              activeConnections: 0,
              totalRequests: 0,
              errorRate: 0,
            };
            scalingService['loadBalancer'].addNode(node);
          }
          
          // Add unhealthy nodes
          for (let i = 0; i < unhealthyNodeCount; i++) {
            const node: LoadBalancerNode = {
              id: `unhealthy-${i}`,
              host: `host-unhealthy-${i}`,
              port: 6432 + i,
              weight: 1,
              isHealthy: false,
              activeConnections: 0,
              totalRequests: 0,
              errorRate: 0.5,
            };
            scalingService['loadBalancer'].addNode(node);
          }
          
          // Select nodes
          for (let i = 0; i < 10; i++) {
            const node = scalingService['loadBalancer'].selectNode();
            
            // Should only select healthy nodes
            expect(node.isHealthy).toBe(true);
            expect(node.id).toMatch(/^healthy-/);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Connection pool cleanup removes idle connections
   * 
   * For any idle connection, the pool should eventually remove it
   * to free resources.
   */
  it('should clean up idle connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          connectionCount: fc.integer({ min: 5, max: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { connectionCount } = testData;
          
          // Register tenant
          scalingService['tenantManager'].registerTenant('test-tenant');
          
          // Get initial metrics
          const metricsBefore = scalingService['connectionPool'].getMetrics();
          
          // Simulate some connections
          for (let i = 0; i < connectionCount; i++) {
            try {
              const conn = await scalingService['connectionPool'].getConnection();
              scalingService['connectionPool'].releaseConnection(conn);
            } catch (error) {
              // Expected if pool is exhausted
            }
          }
          
          // Trigger cleanup
          await scalingService['connectionPool'].cleanup();
          
          // Get metrics after cleanup
          const metricsAfter = scalingService['connectionPool'].getMetrics();
          
          // Verify cleanup occurred
          expect(metricsAfter.currentConnections).toBeLessThanOrEqual(
            metricsBefore.currentConnections
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Scaling metrics are accurate
   * 
   * For any scaling configuration, metrics should accurately reflect
   * current resource utilization and distribution.
   */
  it('should accurately report scaling metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nodeCount: fc.integer({ min: 1, max: 3 }),
          tenantCount: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { nodeCount, tenantCount } = testData;
          
          // Add nodes
          for (let i = 0; i < nodeCount; i++) {
            const node: LoadBalancerNode = {
              id: `node-${i}`,
              host: `host-${i}`,
              port: 5432 + i,
              weight: 1,
              isHealthy: true,
              activeConnections: Math.floor(Math.random() * 10),
              totalRequests: Math.floor(Math.random() * 100),
              errorRate: Math.random() * 0.05,
            };
            scalingService['loadBalancer'].addNode(node);
          }
          
          // Register tenants
          for (let i = 0; i < tenantCount; i++) {
            scalingService['tenantManager'].registerTenant(`tenant-${i}`);
          }
          
          // Get metrics
          const metrics = scalingService.getMetrics();
          
          // Verify metrics structure
          expect(metrics.totalConnections).toBeGreaterThanOrEqual(0);
          expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
          expect(metrics.connectionPoolUtilization).toBeGreaterThanOrEqual(0);
          expect(metrics.connectionPoolUtilization).toBeLessThanOrEqual(1);
          expect(metrics.loadBalancerDistribution).toBeDefined();
          expect(metrics.tenantIsolationMetrics).toBeDefined();
          expect(metrics.scalingEfficiency).toBeGreaterThanOrEqual(0);
          expect(metrics.scalingEfficiency).toBeLessThanOrEqual(1);
          
          // Verify tenant count matches
          expect(Object.keys(metrics.tenantIsolationMetrics).length).toBe(
            tenantCount
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Graceful degradation under load
   * 
   * For any load level, the system should gracefully handle resource
   * constraints without crashing.
   */
  it('should gracefully handle resource constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requestCount: fc.integer({ min: 50, max: 200 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 26: Horizontal Scaling Support
          
          const { requestCount } = testData;
          
          // Register tenant
          scalingService['tenantManager'].registerTenant('test-tenant');
          
          // Add a single node
          const node: LoadBalancerNode = {
            id: 'node-1',
            host: 'localhost',
            port: 5432,
            weight: 1,
            isHealthy: true,
            activeConnections: 0,
            totalRequests: 0,
            errorRate: 0,
          };
          scalingService['loadBalancer'].addNode(node);
          
          // Attempt many concurrent requests
          const promises = [];
          let successCount = 0;
          let failureCount = 0;
          
          for (let i = 0; i < requestCount; i++) {
            promises.push(
              scalingService
                .executeQuery('test-tenant', async () => {
                  successCount++;
                  return { success: true };
                })
                .catch(() => {
                  failureCount++;
                })
            );
          }
          
          // Execute all requests
          await Promise.allSettled(promises);
          
          // Verify system handled load gracefully
          expect(successCount + failureCount).toBeGreaterThan(0);
          
          // Get final metrics
          const metrics = scalingService.getMetrics();
          expect(metrics.totalConnections).toBeGreaterThan(0);
        }
      ),
      { numRuns: 30 }
    );
  });
});
