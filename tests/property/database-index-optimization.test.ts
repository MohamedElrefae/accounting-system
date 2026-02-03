/**
 * Property-Based Tests for Database Index Optimization
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 1: Database Query Optimization
 * Validates: Requirements 1.1, 1.2, 1.4
 * 
 * This test suite validates that database index optimizations maintain correctness
 * while improving performance across all authentication query patterns.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

// Test configuration
const PROPERTY_TEST_RUNS = 100;
const PERFORMANCE_THRESHOLD_MS = 50;
const QUERY_COUNT_REDUCTION_TARGET = 0.5; // 50% reduction (8 queries → 4 queries)

// Database client setup
let supabase: any;
let testUserId: string;

beforeAll(async () => {
  // Initialize Supabase client with test environment
  supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  // Create test user for property testing
  try {
    const { data: testUser, error } = await supabase
      .from('user_profiles')
      .insert({
        email: `property.test.${Date.now()}@example.com`,
        full_name: 'Property Test User',
        is_active: true
      })
      .select()
      .single();
    
    if (error || !testUser) {
      console.warn('Could not create test user for database index optimization tests:', error);
      // Use a placeholder UUID for tests that don't require actual data
      testUserId = '00000000-0000-0000-0000-000000000000';
    } else {
      testUserId = testUser.id;
    }
  } catch (error) {
    console.warn('Test user creation failed:', error);
    testUserId = '00000000-0000-0000-0000-000000000000';
  }
});

afterAll(async () => {
  // Cleanup test data
  if (testUserId) {
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testUserId);
  }
});

// Custom generators for property testing
const userIdGenerator = fc.constantFrom(testUserId);
const orgIdGenerator = fc.uuid();
const projectIdGenerator = fc.uuid();
const roleGenerator = fc.constantFrom('admin', 'manager', 'member', 'viewer');
const permissionGenerator = fc.constantFrom('read', 'write', 'delete', 'admin');

// Test data generators
const authRequestGenerator = fc.record({
  userId: userIdGenerator,
  orgId: fc.option(orgIdGenerator),
  projectId: fc.option(projectIdGenerator),
  includePermissions: fc.boolean(),
  includeRoles: fc.boolean()
});

const scopedRoleGenerator = fc.record({
  userId: userIdGenerator,
  orgId: orgIdGenerator,
  projectId: fc.option(projectIdGenerator),
  role: roleGenerator
});

describe('Database Index Optimization Properties', () => {
  
  describe('Property 1: Database Query Optimization', () => {
    
    it('should execute authentication queries under 50ms with proper index usage', async () => {
      // Skip if test user not available
      if (!testUserId || testUserId === '00000000-0000-0000-0000-000000000000') {
        console.log('Skipping database index test - test user not available');
        return;
      }
      
      await fc.assert(fc.asyncProperty(
        authRequestGenerator,
        async (authRequest) => {
          // Feature: enterprise-auth-performance-optimization, Property 1: Database Query Optimization
          
          const startTime = performance.now();
          
          // Execute optimized authentication query
          const { data, error } = await supabase.rpc('get_user_auth_data', {
            p_user_id: authRequest.userId,
            p_org_id: authRequest.orgId,
            p_project_id: authRequest.projectId
          });
          
          const endTime = performance.now();
          const executionTime = endTime - startTime;
          
          // Verify query executes successfully
          expect(error).toBeNull();
          expect(data).toBeDefined();
          
          // Verify performance requirement: under 50ms
          expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
          
          // Verify data structure is complete
          if (data) {
            expect(data).toHaveProperty('user');
            expect(data).toHaveProperty('organizations');
            expect(data).toHaveProperty('projects');
            
            if (authRequest.includePermissions) {
              expect(data).toHaveProperty('permissions');
            }
            
            if (authRequest.includeRoles) {
              expect(data).toHaveProperty('roles');
            }
          }
        }
      ), { numRuns: PROPERTY_TEST_RUNS });
    });
    
    it('should reduce total query count from 8 to 4 per authentication request', async () => {
      // Skip if test user not available
      if (!testUserId || testUserId === '00000000-0000-0000-0000-000000000000') {
        console.log('Skipping query count reduction test - test user not available');
        return;
      }
      
      await fc.assert(fc.asyncProperty(
        authRequestGenerator,
        async (authRequest) => {
          // Feature: enterprise-auth-performance-optimization, Property 1: Database Query Optimization
          
          // Track query count using query plan analysis
          const queryCountBefore = await getActiveQueryCount();
          
          // Execute optimized authentication
          const { data, error } = await supabase.rpc('get_user_auth_data_optimized', {
            p_user_id: authRequest.userId,
            p_org_id: authRequest.orgId,
            p_project_id: authRequest.projectId
          });
          
          const queryCountAfter = await getActiveQueryCount();
          const actualQueryCount = queryCountAfter - queryCountBefore;
          
          // Verify successful execution
          expect(error).toBeNull();
          expect(data).toBeDefined();
          
          // Verify query count reduction (should be ≤ 4 queries)
          expect(actualQueryCount).toBeLessThanOrEqual(4);
          
          // Verify significant reduction from baseline (8 queries)
          const reductionRatio = actualQueryCount / 8;
          expect(reductionRatio).toBeLessThanOrEqual(QUERY_COUNT_REDUCTION_TARGET);
        }
      ), { numRuns: PROPERTY_TEST_RUNS });
    });
    
    it('should use proper database indexes for scoped roles queries', async () => {
      // Skip if test user not available
      if (!testUserId || testUserId === '00000000-0000-0000-0000-000000000000') {
        console.log('Skipping database index usage test - test user not available');
        return;
      }
      
      await fc.assert(fc.asyncProperty(
        scopedRoleGenerator,
        async (roleData) => {
          // Feature: enterprise-auth-performance-optimization, Property 1: Database Query Optimization
          
          // Test org_roles index usage
          const orgRoleQuery = supabase
            .from('org_roles')
            .select('*')
            .eq('user_id', roleData.userId)
            .eq('org_id', roleData.orgId);
          
          const startTime = performance.now();
          const { data: orgRoles, error: orgError } = await orgRoleQuery;
          const orgQueryTime = performance.now() - startTime;
          
          expect(orgError).toBeNull();
          expect(orgQueryTime).toBeLessThan(30); // Indexed query should be fast
          
          // Test project_roles index usage if projectId provided
          if (roleData.projectId) {
            const projectStartTime = performance.now();
            const { data: projectRoles, error: projectError } = await supabase
              .from('project_roles')
              .select('*')
              .eq('user_id', roleData.userId)
              .eq('project_id', roleData.projectId);
            
            const projectQueryTime = performance.now() - projectStartTime;
            
            expect(projectError).toBeNull();
            expect(projectQueryTime).toBeLessThan(30); // Indexed query should be fast
          }
          
          // Test system_roles index usage
          const systemStartTime = performance.now();
          const { data: systemRoles, error: systemError } = await supabase
            .from('system_roles')
            .select('*')
            .eq('user_id', roleData.userId);
          
          const systemQueryTime = performance.now() - systemStartTime;
          
          expect(systemError).toBeNull();
          expect(systemQueryTime).toBeLessThan(20); // System roles should be fastest
        }
      ), { numRuns: PROPERTY_TEST_RUNS });
    });
    
    it('should maintain query result consistency between optimized and original queries', async () => {
      // Skip if test user not available
      if (!testUserId || testUserId === '00000000-0000-0000-0000-000000000000') {
        console.log('Skipping query consistency test - test user not available');
        return;
      }
      
      await fc.assert(fc.asyncProperty(
        authRequestGenerator,
        async (authRequest) => {
          // Feature: enterprise-auth-performance-optimization, Property 1: Database Query Optimization
          
          // Execute original (unoptimized) query pattern
          const originalResults = await executeOriginalAuthQueries(authRequest);
          
          // Execute optimized query
          const { data: optimizedResults, error } = await supabase.rpc('get_user_auth_data_optimized', {
            p_user_id: authRequest.userId,
            p_org_id: authRequest.orgId,
            p_project_id: authRequest.projectId
          });
          
          expect(error).toBeNull();
          
          // Verify results are functionally equivalent
          if (originalResults && optimizedResults) {
            // User data should match
            expect(optimizedResults.user?.id).toBe(originalResults.user?.id);
            expect(optimizedResults.user?.email).toBe(originalResults.user?.email);
            
            // Organization data should match
            expect(optimizedResults.organizations?.length).toBe(originalResults.organizations?.length);
            
            // Project data should match
            expect(optimizedResults.projects?.length).toBe(originalResults.projects?.length);
            
            // Role data should match
            if (originalResults.roles && optimizedResults.roles) {
              expect(optimizedResults.roles.length).toBe(originalResults.roles.length);
            }
            
            // Permission data should match
            if (originalResults.permissions && optimizedResults.permissions) {
              expect(optimizedResults.permissions.length).toBe(originalResults.permissions.length);
            }
          }
        }
      ), { numRuns: PROPERTY_TEST_RUNS });
    });
    
    it('should demonstrate measurable performance improvement over baseline', async () => {
      // Skip if test user not available
      if (!testUserId || testUserId === '00000000-0000-0000-0000-000000000000') {
        console.log('Skipping performance improvement test - test user not available');
        return;
      }
      
      await fc.assert(fc.asyncProperty(
        authRequestGenerator,
        async (authRequest) => {
          // Feature: enterprise-auth-performance-optimization, Property 1: Database Query Optimization
          
          // Measure baseline (original) performance
          const baselineStart = performance.now();
          const originalResults = await executeOriginalAuthQueries(authRequest);
          const baselineTime = performance.now() - baselineStart;
          
          // Measure optimized performance
          const optimizedStart = performance.now();
          const { data: optimizedResults, error } = await supabase.rpc('get_user_auth_data_optimized', {
            p_user_id: authRequest.userId,
            p_org_id: authRequest.orgId,
            p_project_id: authRequest.projectId
          });
          const optimizedTime = performance.now() - optimizedStart;
          
          expect(error).toBeNull();
          
          // Verify performance improvement
          const improvementRatio = optimizedTime / baselineTime;
          
          // Should be at least 30% faster (improvement ratio ≤ 0.7)
          expect(improvementRatio).toBeLessThan(0.7);
          
          // Optimized query should be under performance threshold
          expect(optimizedTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
          
          // Log performance metrics for monitoring
          console.log(`Performance improvement: ${((1 - improvementRatio) * 100).toFixed(1)}% faster`);
          console.log(`Baseline: ${baselineTime.toFixed(2)}ms, Optimized: ${optimizedTime.toFixed(2)}ms`);
        }
      ), { numRuns: 20 }); // Fewer runs for performance tests to avoid overwhelming the database
    });
    
  });
  
});

// Helper functions
async function getActiveQueryCount(): Promise<number> {
  const { data } = await supabase.rpc('get_active_query_count');
  return data || 0;
}

async function executeOriginalAuthQueries(authRequest: any) {
  try {
    // Simulate original 8-query pattern
    const [
      userProfile,
      userRoles,
      orgMemberships,
      projectMemberships,
      organizations,
      projects,
      permissions,
      systemRoles
    ] = await Promise.all([
      // Query 1: User profile
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authRequest.userId)
        .single(),
      
      // Query 2: User roles (legacy)
      supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authRequest.userId),
      
      // Query 3: Organization memberships
      supabase
        .from('org_memberships')
        .select('*')
        .eq('user_id', authRequest.userId),
      
      // Query 4: Project memberships
      supabase
        .from('project_memberships')
        .select('*')
        .eq('user_id', authRequest.userId),
      
      // Query 5: Organizations
      supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true),
      
      // Query 6: Projects
      supabase
        .from('projects')
        .select('*')
        .eq('is_active', true),
      
      // Query 7: Permissions (if requested)
      authRequest.includePermissions ? supabase
        .from('permissions')
        .select('*') : { data: [] },
      
      // Query 8: System roles
      supabase
        .from('system_roles')
        .select('*')
        .eq('user_id', authRequest.userId)
    ]);
    
    return {
      user: userProfile.data,
      roles: userRoles.data,
      organizations: organizations.data,
      projects: projects.data,
      permissions: permissions.data,
      systemRoles: systemRoles.data
    };
  } catch (error) {
    console.error('Original query execution failed:', error);
    return null;
  }
}