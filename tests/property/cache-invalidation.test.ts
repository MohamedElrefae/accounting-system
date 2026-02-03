import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { CacheManager, resetCacheManager } from '../../src/services/cache/CacheManager';
import {
  CacheInvalidationService,
  resetCacheInvalidationService,
  InvalidationEvent,
} from '../../src/services/cache/CacheInvalidationService';
import {
  cacheKeyStrategy,
  cacheInvalidationPatterns,
  CACHE_TTL,
} from '../../src/services/cache/CacheKeyStrategy';

/**
 * Property 5: Cache Invalidation Consistency
 * 
 * For any role or permission change, the cache layer should invalidate affected entries
 * and refresh data without blocking user operations.
 * 
 * Validates: Requirements 2.2, 2.4
 */
describe('Property 5: Cache Invalidation Consistency', () => {
  let cacheManager: CacheManager;
  let invalidationService: CacheInvalidationService;

  beforeEach(() => {
    resetCacheManager();
    resetCacheInvalidationService();
    cacheManager = new CacheManager();
    invalidationService = new CacheInvalidationService(cacheManager);
  });

  afterEach(async () => {
    await cacheManager.clear();
    invalidationService.destroy();
  });

  /**
   * Property: Role change invalidation clears affected cache entries
   * 
   * For any role change event, all cache entries related to that user's roles
   * should be invalidated, while other users' caches remain intact.
   */
  it('should invalidate role-related cache entries on role change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          roleType: fc.constantFrom('org', 'project', 'system') as fc.Arbitrary<'org' | 'project' | 'system'>,
          orgId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          projectId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          // Generate a different user ID for the other user
          const otherUserId = testData.userId + '_other';

          // Setup: Populate cache with role-related entries using long TTL to prevent expiration during test
          const userAuthKey = cacheKeyStrategy.userAuth(testData.userId);
          const userRolesKey = cacheKeyStrategy.roleHierarchy(testData.userId, testData.roleType);
          const otherUserAuthKey = cacheKeyStrategy.userAuth(otherUserId);

          const longTTL = 3600; // 1 hour to prevent expiration during test

          await cacheManager.set(userAuthKey, { userId: testData.userId, roles: [] }, longTTL);
          await cacheManager.set(userRolesKey, { roles: ['admin'] }, longTTL);
          await cacheManager.set(otherUserAuthKey, { userId: otherUserId, roles: [] }, longTTL);

          // Verify cache entries exist
          const authBefore = await cacheManager.get(userAuthKey);
          const rolesBefore = await cacheManager.get(userRolesKey);
          const otherAuthBefore = await cacheManager.get(otherUserAuthKey);

          expect(authBefore).not.toBeNull();
          expect(rolesBefore).not.toBeNull();
          expect(otherAuthBefore).not.toBeNull();

          // Action: Invalidate role change
          await invalidationService.invalidateRoleChange(
            testData.userId,
            testData.roleType,
            testData.orgId || undefined,
            testData.projectId || undefined
          );

          // Wait a tick for async invalidation to complete
          await new Promise(resolve => setTimeout(resolve, 10));

          // Verify: User's role cache is invalidated
          const authAfter = await cacheManager.get(userAuthKey);
          const rolesAfter = await cacheManager.get(userRolesKey);

          expect(authAfter).toBeNull();
          expect(rolesAfter).toBeNull();

          // Verify: Other user's cache remains intact
          const otherAuthAfter = await cacheManager.get(otherUserAuthKey);
          expect(otherAuthAfter).not.toBeNull();
          expect(otherAuthAfter).toEqual(otherAuthBefore);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Permission change invalidation clears affected cache entries
   * 
   * For any permission change event, all cache entries related to that user's permissions
   * should be invalidated, including batch permission checks.
   */
  it('should invalidate permission-related cache entries on permission change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          orgId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          projectId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          permissions: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          // Setup: Populate cache with permission-related entries
          const userPermKey = cacheKeyStrategy.userPermissions(testData.userId, 'global');
          const userAuthKey = cacheKeyStrategy.userAuth(testData.userId);

          await cacheManager.set(userPermKey, { permissions: testData.permissions }, CACHE_TTL.permissions);
          await cacheManager.set(userAuthKey, { userId: testData.userId, permissions: testData.permissions }, CACHE_TTL.userAuth);

          // Verify cache entries exist
          const permBefore = await cacheManager.get(userPermKey);
          const authBefore = await cacheManager.get(userAuthKey);

          expect(permBefore).not.toBeNull();
          expect(authBefore).not.toBeNull();

          // Action: Invalidate permission change
          await invalidationService.invalidatePermissionChange(
            testData.userId,
            testData.orgId || undefined,
            testData.projectId || undefined
          );

          // Wait a tick for async invalidation to complete
          await new Promise(resolve => setTimeout(resolve, 10));

          // Verify: Permission cache is invalidated
          const permAfter = await cacheManager.get(userPermKey);
          const authAfter = await cacheManager.get(userAuthKey);

          expect(permAfter).toBeNull();
          expect(authAfter).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Organization membership change invalidation
   * 
   * For any organization membership change, the user's auth and org-specific caches
   * should be invalidated.
   */
  it('should invalidate org membership cache entries on membership change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          orgId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          // Setup: Populate cache with org membership entries
          const userAuthKey = cacheKeyStrategy.userAuth(testData.userId);
          const orgMemberKey = cacheKeyStrategy.orgMembership(testData.userId, testData.orgId);

          await cacheManager.set(userAuthKey, { userId: testData.userId, orgs: [testData.orgId] }, CACHE_TTL.userAuth);
          await cacheManager.set(orgMemberKey, { orgId: testData.orgId, role: 'member' }, CACHE_TTL.organizations);

          // Verify cache entries exist
          const authBefore = await cacheManager.get(userAuthKey);
          const memberBefore = await cacheManager.get(orgMemberKey);

          expect(authBefore).not.toBeNull();
          expect(memberBefore).not.toBeNull();

          // Action: Invalidate org membership change
          await invalidationService.invalidateOrgMembershipChange(testData.userId, testData.orgId);

          // Wait a tick for async invalidation to complete
          await new Promise(resolve => setTimeout(resolve, 10));

          // Verify: Org membership cache is invalidated
          const authAfter = await cacheManager.get(userAuthKey);
          const memberAfter = await cacheManager.get(orgMemberKey);

          expect(authAfter).toBeNull();
          expect(memberAfter).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Project membership change invalidation
   * 
   * For any project membership change, the user's auth and project-specific caches
   * should be invalidated.
   */
  it('should invalidate project membership cache entries on membership change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          projectId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          // Setup: Populate cache with project membership entries
          const userAuthKey = cacheKeyStrategy.userAuth(testData.userId);
          const projectMemberKey = cacheKeyStrategy.projectMembership(testData.userId, testData.projectId);

          await cacheManager.set(userAuthKey, { userId: testData.userId, projects: [testData.projectId] }, CACHE_TTL.userAuth);
          await cacheManager.set(projectMemberKey, { projectId: testData.projectId, role: 'developer' }, CACHE_TTL.organizations);

          // Verify cache entries exist
          const authBefore = await cacheManager.get(userAuthKey);
          const memberBefore = await cacheManager.get(projectMemberKey);

          expect(authBefore).not.toBeNull();
          expect(memberBefore).not.toBeNull();

          // Action: Invalidate project membership change
          await invalidationService.invalidateProjectMembershipChange(testData.userId, testData.projectId);

          // Verify: Project membership cache is invalidated
          const authAfter = await cacheManager.get(userAuthKey);
          const memberAfter = await cacheManager.get(projectMemberKey);

          expect(authAfter).toBeNull();
          expect(memberAfter).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Background refresh queue management
   * 
   * For any invalidation event, a background refresh task should be queued
   * with appropriate priority, and the queue should be processable without blocking.
   */
  it('should queue background refresh tasks with appropriate priority', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          roleType: fc.constantFrom('org', 'project', 'system') as fc.Arbitrary<'org' | 'project' | 'system'>,
          eventCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          // Action: Generate multiple invalidation events
          for (let i = 0; i < testData.eventCount; i++) {
            await invalidationService.invalidateRoleChange(testData.userId, testData.roleType);
          }

          // Verify: Queue status shows tasks
          const queueStatus = invalidationService.getQueueStatus();
          expect(queueStatus.totalTasks).toBeGreaterThan(0);
          expect(queueStatus.highPriority).toBeGreaterThan(0);

          // Verify: Queue can be cleared without errors
          await invalidationService.clearQueue();
          const clearedStatus = invalidationService.getQueueStatus();
          expect(clearedStatus.totalTasks).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Invalidation event subscription
   * 
   * For any invalidation event, subscribed listeners should be notified
   * without blocking the invalidation operation.
   */
  it('should notify subscribers of invalidation events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          roleType: fc.constantFrom('org', 'project', 'system') as fc.Arbitrary<'org' | 'project' | 'system'>,
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          const receivedEvents: InvalidationEvent[] = [];

          // Setup: Subscribe to role change events
          const unsubscribe = invalidationService.subscribe('role_change', (event) => {
            receivedEvents.push(event);
          });

          // Action: Trigger role change invalidation
          await invalidationService.invalidateRoleChange(testData.userId, testData.roleType);

          // Verify: Event was received
          expect(receivedEvents.length).toBe(1);
          expect(receivedEvents[0].type).toBe('role_change');
          expect(receivedEvents[0].userId).toBe(testData.userId);
          expect(receivedEvents[0].timestamp).toBeGreaterThan(0);

          // Cleanup: Unsubscribe
          unsubscribe();

          // Verify: No more events after unsubscribe
          receivedEvents.length = 0;
          await invalidationService.invalidateRoleChange(testData.userId, testData.roleType);
          expect(receivedEvents.length).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Non-blocking invalidation operations
   * 
   * For any invalidation operation, the operation should complete quickly
   * without blocking other cache operations.
   */
  it('should complete invalidation operations without blocking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          cacheEntryCount: fc.integer({ min: 1, max: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          // Setup: Populate cache with multiple entries
          for (let i = 0; i < testData.cacheEntryCount; i++) {
            const key = `test:${testData.userId}:${i}`;
            await cacheManager.set(key, { data: `value${i}` }, CACHE_TTL.userAuth);
          }

          // Measure invalidation time
          const startTime = performance.now();
          await invalidationService.invalidateRoleChange(testData.userId, 'org');
          const invalidationTime = performance.now() - startTime;

          // Verify: Invalidation completes quickly (< 100ms)
          expect(invalidationTime).toBeLessThan(100);

          // Verify: Cache is still responsive after invalidation
          const testKey = `test:other:user:${testData.userId}`;
          await cacheManager.set(testKey, { data: 'test' }, CACHE_TTL.userAuth);
          const cachedValue = await cacheManager.get(testKey);
          expect(cachedValue).not.toBeNull();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Cache consistency after invalidation and refresh
   * 
   * For any invalidation followed by cache repopulation, the cache should
   * maintain consistency with the source data.
   */
  it('should maintain cache consistency after invalidation and refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          initialData: fc.record({
            permissions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            roles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
          }),
          updatedData: fc.record({
            permissions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            roles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
          }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 5: Cache Invalidation Consistency

          const userAuthKey = cacheKeyStrategy.userAuth(testData.userId);

          // Setup: Cache initial data
          await cacheManager.set(userAuthKey, testData.initialData, CACHE_TTL.userAuth);
          const cachedInitial = await cacheManager.get(userAuthKey);
          expect(cachedInitial).toEqual(testData.initialData);

          // Action: Invalidate cache
          await invalidationService.invalidatePermissionChange(testData.userId);

          // Wait a tick for async invalidation to complete
          await new Promise(resolve => setTimeout(resolve, 10));

          // Verify: Cache is cleared
          const cachedAfterInvalidation = await cacheManager.get(userAuthKey);
          expect(cachedAfterInvalidation).toBeNull();

          // Action: Repopulate cache with updated data
          await cacheManager.set(userAuthKey, testData.updatedData, CACHE_TTL.userAuth);

          // Verify: Cache contains updated data
          const cachedUpdated = await cacheManager.get(userAuthKey);
          expect(cachedUpdated).toEqual(testData.updatedData);
          
          // Verify: If data is different, it should not equal initial data
          if (JSON.stringify(testData.updatedData) !== JSON.stringify(testData.initialData)) {
            expect(cachedUpdated).not.toEqual(testData.initialData);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
