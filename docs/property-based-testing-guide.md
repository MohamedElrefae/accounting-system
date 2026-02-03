# Property-Based Testing Guide

## Overview

This guide covers the property-based testing implementation for the Enterprise Authentication Performance Optimization project. Property-based tests validate universal correctness properties across all possible inputs, ensuring robust performance and correctness guarantees.

## Property 1: Database Query Optimization

**Feature**: enterprise-auth-performance-optimization  
**Validates**: Requirements 1.1, 1.2, 1.4  
**Test File**: `tests/property/database-index-optimization.test.ts`

### What This Property Tests

The Database Query Optimization property validates that:

1. **Performance**: Authentication queries execute under 50ms
2. **Efficiency**: Query count reduces from 8 to 4 per request
3. **Index Usage**: Proper database indexes are utilized
4. **Consistency**: Results match between optimized and original queries
5. **Improvement**: Measurable performance gains over baseline

### Test Structure

```typescript
describe('Property 1: Database Query Optimization', () => {
  it('should execute authentication queries under 50ms', async () => {
    await fc.assert(fc.asyncProperty(
      authRequestGenerator,
      async (authRequest) => {
        // Test implementation
      }
    ), { numRuns: 100 });
  });
});
```

### Custom Generators

The tests use custom generators to create realistic test data:

- **authRequestGenerator**: Creates authentication request patterns
- **scopedRoleGenerator**: Creates scoped role assignments
- **userIdGenerator**: Provides valid user IDs for testing
- **orgIdGenerator**: Generates organization IDs
- **projectIdGenerator**: Generates project IDs

### Performance Thresholds

| Metric | Threshold | Requirement |
|--------|-----------|-------------|
| Query Execution Time | < 50ms | Performance |
| Query Count Reduction | ≤ 4 queries | Efficiency |
| Index Query Time | < 30ms | Index Usage |
| Performance Improvement | > 30% | Optimization |

## Running Property Tests

### Prerequisites

1. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   # Configure SUPABASE_URL and SUPABASE_ANON_KEY
   ```

2. **Deploy Test Support Functions**:
   ```bash
   node scripts/deploy-test-support-functions.js
   ```

3. **Install Dependencies**:
   ```bash
   npm install fast-check @supabase/supabase-js vitest
   ```

### Execution Commands

```bash
# Run all property tests
npm run test:property

# Run specific property test
npm run test:property -- database-index-optimization

# Run with verbose output
npm run test:property -- --reporter=verbose

# Run with custom iteration count
npm run test:property -- --numRuns=200
```

### Test Configuration

Property tests are configured in `tests/property/test-config.ts`:

```typescript
export const propertyTestConfig = {
  numRuns: 100,
  timeout: 30000,
  performance: {
    authQueryThreshold: 50,
    cacheHitRateThreshold: 0.96,
    memoryReductionTarget: 0.38,
    queryCountReduction: 0.5,
  }
};
```

## Test Support Functions

The property tests rely on SQL functions deployed to the database:

### Core Functions

1. **get_user_auth_data_optimized()**: Consolidated authentication query
2. **get_active_query_count()**: Tracks active database queries
3. **validate_index_usage()**: Verifies index utilization
4. **measure_query_time()**: Measures query execution time
5. **get_db_performance_stats()**: Provides performance metrics

### Test Data Management

1. **create_test_auth_data()**: Creates test users, orgs, projects
2. **cleanup_test_auth_data()**: Removes test data after tests

## Interpreting Results

### Success Criteria

✅ **PASS**: All properties hold across 100+ test iterations  
⚠️ **IMPROVED**: Performance better than baseline but below target  
❌ **NEEDS WORK**: Properties fail or performance regression detected

### Performance Metrics

The tests output detailed performance metrics:

```
Performance improvement: 45.2% faster
Baseline: 220.15ms, Optimized: 120.67ms
Cache hit ratio: 97.3%
Query count: 4 (reduced from 8)
```

### Common Issues

1. **Index Not Used**: Check if indexes were created successfully
2. **Slow Queries**: Verify database connection and load
3. **Test Data Conflicts**: Run cleanup between test sessions
4. **Permission Errors**: Ensure service role key is configured

## Integration with CI/CD

Property tests are integrated into the deployment pipeline:

```yaml
# .github/workflows/property-tests.yml
- name: Run Property Tests
  run: |
    npm run deploy:test-functions
    npm run test:property
    npm run cleanup:test-data
```

## Monitoring and Alerting

Property tests include performance monitoring:

- **Response Time Tracking**: Logs execution times
- **Regression Detection**: Alerts on performance degradation
- **Cache Hit Rate Monitoring**: Tracks caching effectiveness
- **Database Load Monitoring**: Measures query impact

## Next Steps

After Property 1 passes:

1. **Task 1.3**: Implement optimized RPC functions
2. **Task 1.4**: Write property test for RPC function performance
3. **Phase 1 Continuation**: Service layer caching implementation

## Troubleshooting

### Common Errors

**Connection Timeout**:
```bash
# Increase timeout in test config
timeout: 60000
```

**Test Data Conflicts**:
```bash
# Manual cleanup
npm run cleanup:test-data
```

**Index Missing**:
```bash
# Redeploy indexes
npm run deploy:indexes
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=property-tests npm run test:property
```

This provides detailed execution logs and performance metrics for troubleshooting.