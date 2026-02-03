/**
 * Horizontal Scaling Service
 * Implements connection pooling, load distribution, and multi-tenant performance isolation
 * for supporting 6x concurrent users and linear scaling up to 10,000 concurrent users
 * 
 * Validates: Requirements 8.2, 8.4
 */

import { createPool, Pool } from 'pg';
import { EventEmitter } from 'events';

export interface PoolConfig {
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  maxUses?: number;
}

export interface LoadDistributionConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted';
  healthCheckInterval: number;
  failoverThreshold: number;
}

export interface MultiTenantConfig {
  isolationLevel: 'read-committed' | 'repeatable-read' | 'serializable';
  resourceQuotaPerTenant: {
    maxConnections: number;
    maxMemoryMB: number;
    maxQueryTimeMs: number;
  };
}

export interface PoolStats {
  totalConnections: number;
  availableConnections: number;
  waitingRequests: number;
  activeQueries: number;
  connectionErrors: number;
  averageWaitTime: number;
}

export interface LoadDistributionStats {
  activeInstances: number;
  totalRequests: number;
  requestsPerInstance: Record<string, number>;
  failedInstances: string[];
  averageResponseTime: number;
}

export interface TenantResourceUsage {
  tenantId: string;
  connectionsUsed: number;
  memoryUsedMB: number;
  activeQueries: number;
  totalQueryTimeMs: number;
}

/**
 * Connection Pool Manager
 * Manages database connection pooling with health monitoring and auto-recovery
 */
export class ConnectionPoolManager extends EventEmitter {
  private pools: Map<string, Pool> = new Map();
  private poolStats: Map<string, PoolStats> = new Map();
  private config: PoolConfig;
  private healthCheckInterval: NodeJS.Timer | null = null;

  constructor(config: PoolConfig) {
    super();
    this.config = {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ...config
    };
  }

  /**
   * Create a new connection pool for a specific instance
   */
  async createPool(instanceId: string, connectionString: string): Promise<Pool> {
    if (this.pools.has(instanceId)) {
      return this.pools.get(instanceId)!;
    }

    const pool = createPool({
      connectionString,
      max: this.config.max,
      min: this.config.min,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      application_name: `auth-service-${instanceId}`
    });

    // Initialize pool stats
    this.poolStats.set(instanceId, {
      totalConnections: 0,
      availableConnections: this.config.min,
      waitingRequests: 0,
      activeQueries: 0,
      connectionErrors: 0,
      averageWaitTime: 0
    });

    // Setup error handling
    pool.on('error', (err) => {
      console.error(`Pool error for instance ${instanceId}:`, err);
      this.emit('pool-error', { instanceId, error: err });
      this.recordConnectionError(instanceId);
    });

    pool.on('connect', () => {
      const stats = this.poolStats.get(instanceId);
      if (stats) {
        stats.totalConnections++;
        stats.availableConnections++;
      }
    });

    this.pools.set(instanceId, pool);
    return pool;
  }

  /**
   * Get a connection from the pool with timeout handling
   */
  async getConnection(instanceId: string): Promise<any> {
    const pool = this.pools.get(instanceId);
    if (!pool) {
      throw new Error(`Pool not found for instance: ${instanceId}`);
    }

    const stats = this.poolStats.get(instanceId);
    if (stats) {
      stats.waitingRequests++;
    }

    try {
      const startTime = Date.now();
      const client = await pool.connect();
      
      if (stats) {
        stats.waitingRequests--;
        stats.activeQueries++;
        const waitTime = Date.now() - startTime;
        stats.averageWaitTime = (stats.averageWaitTime + waitTime) / 2;
      }

      return client;
    } catch (error) {
      if (stats) {
        stats.waitingRequests--;
        stats.connectionErrors++;
      }
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(instanceId: string, client: any): void {
    const stats = this.poolStats.get(instanceId);
    if (stats) {
      stats.activeQueries--;
      stats.availableConnections++;
    }
    client.release();
  }

  /**
   * Get pool statistics
   */
  getPoolStats(instanceId: string): PoolStats | null {
    return this.poolStats.get(instanceId) || null;
  }

  /**
   * Get all pool statistics
   */
  getAllPoolStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    this.poolStats.forEach((stat, instanceId) => {
      stats[instanceId] = stat;
    });
    return stats;
  }

  /**
   * Record a connection error
   */
  private recordConnectionError(instanceId: string): void {
    const stats = this.poolStats.get(instanceId);
    if (stats) {
      stats.connectionErrors++;
    }
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck(interval: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.pools.forEach(async (pool, instanceId) => {
        try {
          const client = await pool.connect();
          client.release();
          this.emit('pool-healthy', { instanceId });
        } catch (error) {
          this.emit('pool-unhealthy', { instanceId, error });
        }
      });
    }, interval);
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Close all pools
   */
  async closeAllPools(): Promise<void> {
    this.stopHealthCheck();
    
    for (const [instanceId, pool] of this.pools) {
      try {
        await pool.end();
        this.pools.delete(instanceId);
        this.poolStats.delete(instanceId);
      } catch (error) {
        console.error(`Error closing pool for instance ${instanceId}:`, error);
      }
    }
  }
}

/**
 * Load Distribution Manager
 * Distributes requests across multiple database instances using various strategies
 */
export class LoadDistributionManager extends EventEmitter {
  private instances: Map<string, { connectionString: string; weight: number; healthy: boolean }> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private config: LoadDistributionConfig;
  private currentRoundRobinIndex: number = 0;

  constructor(config: LoadDistributionConfig) {
    super();
    this.config = {
      strategy: 'round-robin',
      healthCheckInterval: 30000,
      failoverThreshold: 3,
      ...config
    };
  }

  /**
   * Register a database instance
   */
  registerInstance(instanceId: string, connectionString: string, weight: number = 1): void {
    this.instances.set(instanceId, {
      connectionString,
      weight,
      healthy: true
    });
    this.requestCounts.set(instanceId, 0);
  }

  /**
   * Select an instance based on the configured strategy
   */
  selectInstance(): string {
    const healthyInstances = Array.from(this.instances.entries())
      .filter(([_, config]) => config.healthy)
      .map(([id, _]) => id);

    if (healthyInstances.length === 0) {
      throw new Error('No healthy instances available');
    }

    switch (this.config.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(healthyInstances);
      case 'least-connections':
        return this.selectLeastConnections(healthyInstances);
      case 'weighted':
        return this.selectWeighted(healthyInstances);
      default:
        return healthyInstances[0];
    }
  }

  /**
   * Round-robin selection strategy
   */
  private selectRoundRobin(instances: string[]): string {
    const selected = instances[this.currentRoundRobinIndex % instances.length];
    this.currentRoundRobinIndex++;
    return selected;
  }

  /**
   * Least connections selection strategy
   */
  private selectLeastConnections(instances: string[]): string {
    let minConnections = Infinity;
    let selectedInstance = instances[0];

    for (const instanceId of instances) {
      const count = this.requestCounts.get(instanceId) || 0;
      if (count < minConnections) {
        minConnections = count;
        selectedInstance = instanceId;
      }
    }

    return selectedInstance;
  }

  /**
   * Weighted selection strategy
   */
  private selectWeighted(instances: string[]): string {
    const weights = instances.map(id => this.instances.get(id)?.weight || 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < instances.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return instances[i];
      }
    }

    return instances[0];
  }

  /**
   * Record a request to an instance
   */
  recordRequest(instanceId: string): void {
    const count = this.requestCounts.get(instanceId) || 0;
    this.requestCounts.set(instanceId, count + 1);
  }

  /**
   * Mark an instance as healthy or unhealthy
   */
  setInstanceHealth(instanceId: string, healthy: boolean): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.healthy = healthy;
      this.emit('instance-health-changed', { instanceId, healthy });
    }
  }

  /**
   * Get load distribution statistics
   */
  getStats(): LoadDistributionStats {
    const requestsPerInstance: Record<string, number> = {};
    let totalRequests = 0;
    const failedInstances: string[] = [];

    this.requestCounts.forEach((count, instanceId) => {
      requestsPerInstance[instanceId] = count;
      totalRequests += count;
    });

    this.instances.forEach((config, instanceId) => {
      if (!config.healthy) {
        failedInstances.push(instanceId);
      }
    });

    return {
      activeInstances: Array.from(this.instances.values()).filter(c => c.healthy).length,
      totalRequests,
      requestsPerInstance,
      failedInstances,
      averageResponseTime: 0 // To be populated by monitoring
    };
  }

  /**
   * Get all registered instances
   */
  getInstances(): Record<string, any> {
    const instances: Record<string, any> = {};
    this.instances.forEach((config, instanceId) => {
      instances[instanceId] = {
        ...config,
        requestCount: this.requestCounts.get(instanceId) || 0
      };
    });
    return instances;
  }
}

/**
 * Multi-Tenant Resource Manager
 * Enforces resource quotas and isolation between tenants
 */
export class MultiTenantResourceManager extends EventEmitter {
  private tenantUsage: Map<string, TenantResourceUsage> = new Map();
  private config: MultiTenantConfig;

  constructor(config: MultiTenantConfig) {
    super();
    this.config = {
      isolationLevel: 'read-committed',
      resourceQuotaPerTenant: {
        maxConnections: 10,
        maxMemoryMB: 100,
        maxQueryTimeMs: 30000
      },
      ...config
    };
  }

  /**
   * Initialize tenant resource tracking
   */
  initializeTenant(tenantId: string): void {
    this.tenantUsage.set(tenantId, {
      tenantId,
      connectionsUsed: 0,
      memoryUsedMB: 0,
      activeQueries: 0,
      totalQueryTimeMs: 0
    });
  }

  /**
   * Check if tenant can acquire a connection
   */
  canAcquireConnection(tenantId: string): boolean {
    const usage = this.tenantUsage.get(tenantId);
    if (!usage) {
      return false;
    }

    return usage.connectionsUsed < this.config.resourceQuotaPerTenant.maxConnections;
  }

  /**
   * Record connection acquisition
   */
  recordConnectionAcquisition(tenantId: string): void {
    const usage = this.tenantUsage.get(tenantId);
    if (usage) {
      usage.connectionsUsed++;
    }
  }

  /**
   * Record connection release
   */
  recordConnectionRelease(tenantId: string): void {
    const usage = this.tenantUsage.get(tenantId);
    if (usage && usage.connectionsUsed > 0) {
      usage.connectionsUsed--;
    }
  }

  /**
   * Record query execution
   */
  recordQueryExecution(tenantId: string, queryTimeMs: number): void {
    const usage = this.tenantUsage.get(tenantId);
    if (usage) {
      usage.activeQueries++;
      usage.totalQueryTimeMs += queryTimeMs;

      // Check if query exceeded max time
      if (queryTimeMs > this.config.resourceQuotaPerTenant.maxQueryTimeMs) {
        this.emit('query-timeout', { tenantId, queryTimeMs });
      }
    }
  }

  /**
   * Record query completion
   */
  recordQueryCompletion(tenantId: string): void {
    const usage = this.tenantUsage.get(tenantId);
    if (usage && usage.activeQueries > 0) {
      usage.activeQueries--;
    }
  }

  /**
   * Get tenant resource usage
   */
  getTenantUsage(tenantId: string): TenantResourceUsage | null {
    return this.tenantUsage.get(tenantId) || null;
  }

  /**
   * Get all tenant resource usage
   */
  getAllTenantUsage(): TenantResourceUsage[] {
    return Array.from(this.tenantUsage.values());
  }

  /**
   * Get isolation level for tenant
   */
  getIsolationLevel(): string {
    return this.config.isolationLevel;
  }

  /**
   * Check resource quotas for all tenants
   */
  checkResourceQuotas(): Record<string, { exceeded: boolean; reason?: string }> {
    const results: Record<string, { exceeded: boolean; reason?: string }> = {};

    this.tenantUsage.forEach((usage, tenantId) => {
      const quota = this.config.resourceQuotaPerTenant;
      
      if (usage.connectionsUsed > quota.maxConnections) {
        results[tenantId] = {
          exceeded: true,
          reason: `Connections exceeded: ${usage.connectionsUsed}/${quota.maxConnections}`
        };
      } else if (usage.memoryUsedMB > quota.maxMemoryMB) {
        results[tenantId] = {
          exceeded: true,
          reason: `Memory exceeded: ${usage.memoryUsedMB}/${quota.maxMemoryMB}MB`
        };
      } else {
        results[tenantId] = { exceeded: false };
      }
    });

    return results;
  }
}

/**
 * Horizontal Scaling Service
 * Orchestrates connection pooling, load distribution, and multi-tenant resource management
 */
export class HorizontalScalingService extends EventEmitter {
  private poolManager: ConnectionPoolManager;
  private loadDistribution: LoadDistributionManager;
  private resourceManager: MultiTenantResourceManager;

  constructor(
    poolConfig: PoolConfig,
    loadConfig: LoadDistributionConfig,
    tenantConfig: MultiTenantConfig
  ) {
    super();
    this.poolManager = new ConnectionPoolManager(poolConfig);
    this.loadDistribution = new LoadDistributionManager(loadConfig);
    this.resourceManager = new MultiTenantResourceManager(tenantConfig);

    // Wire up event forwarding
    this.poolManager.on('pool-error', (event) => this.emit('pool-error', event));
    this.poolManager.on('pool-healthy', (event) => this.emit('pool-healthy', event));
    this.poolManager.on('pool-unhealthy', (event) => this.emit('pool-unhealthy', event));
    this.loadDistribution.on('instance-health-changed', (event) => this.emit('instance-health-changed', event));
    this.resourceManager.on('query-timeout', (event) => this.emit('query-timeout', event));
  }

  /**
   * Initialize horizontal scaling with multiple database instances
   */
  async initialize(instances: Array<{ id: string; connectionString: string; weight?: number }>): Promise<void> {
    for (const instance of instances) {
      // Create connection pool
      await this.poolManager.createPool(instance.id, instance.connectionString);
      
      // Register for load distribution
      this.loadDistribution.registerInstance(instance.id, instance.connectionString, instance.weight || 1);
    }

    // Start health checks
    this.poolManager.startHealthCheck();
  }

  /**
   * Execute a query with automatic load distribution and resource management
   */
  async executeQuery(
    tenantId: string,
    query: string,
    params?: any[]
  ): Promise<any> {
    // Check resource quotas
    if (!this.resourceManager.canAcquireConnection(tenantId)) {
      throw new Error(`Tenant ${tenantId} has exceeded connection quota`);
    }

    // Select instance based on load distribution
    const instanceId = this.loadDistribution.selectInstance();
    this.loadDistribution.recordRequest(instanceId);

    // Record resource usage
    this.resourceManager.recordConnectionAcquisition(tenantId);

    try {
      // Get connection from pool
      const client = await this.poolManager.getConnection(instanceId);

      try {
        // Set isolation level
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${this.resourceManager.getIsolationLevel()}`);

        // Execute query
        const startTime = Date.now();
        const result = await client.query(query, params);
        const queryTimeMs = Date.now() - startTime;

        // Record query execution
        this.resourceManager.recordQueryExecution(tenantId, queryTimeMs);
        this.resourceManager.recordQueryCompletion(tenantId);

        return result;
      } finally {
        // Release connection back to pool
        this.poolManager.releaseConnection(instanceId, client);
        this.resourceManager.recordConnectionRelease(tenantId);
      }
    } catch (error) {
      this.resourceManager.recordConnectionRelease(tenantId);
      throw error;
    }
  }

  /**
   * Get comprehensive scaling statistics
   */
  getScalingStats(): {
    poolStats: Record<string, PoolStats>;
    loadDistribution: LoadDistributionStats;
    tenantUsage: TenantResourceUsage[];
    resourceQuotas: Record<string, { exceeded: boolean; reason?: string }>;
  } {
    return {
      poolStats: this.poolManager.getAllPoolStats(),
      loadDistribution: this.loadDistribution.getStats(),
      tenantUsage: this.resourceManager.getAllTenantUsage(),
      resourceQuotas: this.resourceManager.checkResourceQuotas()
    };
  }

  /**
   * Shutdown horizontal scaling service
   */
  async shutdown(): Promise<void> {
    await this.poolManager.closeAllPools();
  }
}

export default HorizontalScalingService;
