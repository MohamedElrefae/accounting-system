/**
 * Property-Based Testing Configuration
 * 
 * Configuration for enterprise authentication performance optimization
 * property-based tests using fast-check framework.
 */

import { configDefaults, defineConfig } from 'vitest/config';

export const propertyTestConfig = {
  // Property test execution settings
  numRuns: 100,
  timeout: 30000, // 30 seconds per property test
  
  // Performance thresholds
  performance: {
    authQueryThreshold: 50, // ms
    cacheHitRateThreshold: 0.96, // 96%
    memoryReductionTarget: 0.38, // 38% reduction
    queryCountReduction: 0.5, // 50% reduction (8 → 4 queries)
  },
  
  // Database connection settings
  database: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 10000,
  },
  
  // Test data generation settings
  generators: {
    maxUsers: 100,
    maxOrgs: 20,
    maxProjects: 50,
    maxRoles: 10,
  }
};

export default defineConfig({
  test: {
    ...configDefaults,
    include: ['tests/property/**/*.test.ts'],
    timeout: propertyTestConfig.timeout,
    setupFiles: ['tests/property/setup.ts'],
    teardownTimeout: 10000,
  }
});