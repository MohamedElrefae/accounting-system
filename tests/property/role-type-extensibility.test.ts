/**
 * Property Test: Role Type Extensibility
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 25: Role Type Extensibility
 * 
 * Validates: Requirements 8.3
 * 
 * Description: For any new role type introduction, the system should 
 * accommodate new scoped role categories without architectural changes.
 */

import * as fc from 'fast-check';
import { RoleCategoryManager, RoleCategory } from '../../src/services/scaling/ExtensibilityManager';

describe('Property 25: Role Type Extensibility', () => {
  let categoryManager: RoleCategoryManager;

  beforeEach(() => {
    categoryManager = new RoleCategoryManager();
  });

  /**
   * Property: New role categories can be registered without conflicts
   * 
   * For any new role category, it should be registerable without
   * affecting existing categories.
   */
  it('should register new role categories without conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.string({ minLength: 1, maxLength: 100 }),
              scope: fc.constantFrom<'system' | 'organization' | 'project'>(
                'system',
                'organization',
                'project'
              ),
              permissions: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
                minLength: 1,
                maxLength: 5,
              }),
            }),
            { minLength: 1, maxLength: 5, uniqueBy: (c) => c.id }
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { categories } = testData;
          
          // Register all categories
          for (const categoryData of categories) {
            const category: RoleCategory = {
              ...categoryData,
              isActive: true,
              createdAt: new Date(),
            };
            
            categoryManager.registerCategory(category);
          }
          
          // Verify all categories are registered
          const allCategories = categoryManager.getAllCategories();
          expect(allCategories.length).toBe(categories.length);
          
          // Verify each category can be retrieved
          for (const categoryData of categories) {
            const retrieved = categoryManager.getCategory(categoryData.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(categoryData.id);
            expect(retrieved?.name).toBe(categoryData.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role categories can be filtered by scope
   * 
   * For any scope type, the system should return only categories
   * matching that scope.
   */
  it('should filter role categories by scope', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          systemCategories: fc.integer({ min: 1, max: 3 }),
          orgCategories: fc.integer({ min: 1, max: 3 }),
          projectCategories: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { systemCategories, orgCategories, projectCategories } = testData;
          
          // Register system categories
          for (let i = 0; i < systemCategories; i++) {
            const category: RoleCategory = {
              id: `system-${i}`,
              name: `System Role ${i}`,
              description: `System role category ${i}`,
              scope: 'system',
              permissions: ['read', 'write'],
              isActive: true,
              createdAt: new Date(),
            };
            categoryManager.registerCategory(category);
          }
          
          // Register org categories
          for (let i = 0; i < orgCategories; i++) {
            const category: RoleCategory = {
              id: `org-${i}`,
              name: `Org Role ${i}`,
              description: `Organization role category ${i}`,
              scope: 'organization',
              permissions: ['read', 'write', 'admin'],
              isActive: true,
              createdAt: new Date(),
            };
            categoryManager.registerCategory(category);
          }
          
          // Register project categories
          for (let i = 0; i < projectCategories; i++) {
            const category: RoleCategory = {
              id: `project-${i}`,
              name: `Project Role ${i}`,
              description: `Project role category ${i}`,
              scope: 'project',
              permissions: ['read', 'write', 'delete'],
              isActive: true,
              createdAt: new Date(),
            };
            categoryManager.registerCategory(category);
          }
          
          // Verify filtering by scope
          const systemRoles = categoryManager.getCategoriesByScope('system');
          expect(systemRoles.length).toBe(systemCategories);
          expect(systemRoles.every((c) => c.scope === 'system')).toBe(true);
          
          const orgRoles = categoryManager.getCategoriesByScope('organization');
          expect(orgRoles.length).toBe(orgCategories);
          expect(orgRoles.every((c) => c.scope === 'organization')).toBe(true);
          
          const projectRoles = categoryManager.getCategoriesByScope('project');
          expect(projectRoles.length).toBe(projectCategories);
          expect(projectRoles.every((c) => c.scope === 'project')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role category hierarchy can be established
   * 
   * For any parent-child relationship, the hierarchy should be
   * maintained and retrievable.
   */
  it('should maintain role category hierarchy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          parentId: fc.string({ minLength: 1, maxLength: 20 }),
          childCount: fc.integer({ min: 1, max: 5 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { parentId, childCount } = testData;
          
          // Register parent category
          const parentCategory: RoleCategory = {
            id: parentId,
            name: 'Parent Role',
            description: 'Parent role category',
            scope: 'organization',
            permissions: ['read', 'write'],
            isActive: true,
            createdAt: new Date(),
          };
          categoryManager.registerCategory(parentCategory);
          
          // Register child categories
          const childIds: string[] = [];
          for (let i = 0; i < childCount; i++) {
            const childId = `${parentId}-child-${i}`;
            childIds.push(childId);
            
            const childCategory: RoleCategory = {
              id: childId,
              name: `Child Role ${i}`,
              description: `Child role category ${i}`,
              scope: 'project',
              permissions: ['read'],
              isActive: true,
              createdAt: new Date(),
            };
            categoryManager.registerCategory(childCategory);
          }
          
          // Establish hierarchy
          for (const childId of childIds) {
            categoryManager.addCategoryHierarchy(parentId, childId);
          }
          
          // Verify hierarchy
          const children = categoryManager.getChildCategories(parentId);
          expect(children.length).toBe(childCount);
          expect(children.map((c) => c.id).sort()).toEqual(childIds.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role category validation works correctly
   * 
   * For any role category, validation should identify missing or
   * invalid fields.
   */
  it('should validate role category extensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasId: fc.boolean(),
          hasName: fc.boolean(),
          hasValidScope: fc.boolean(),
          hasPermissions: fc.boolean(),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { hasId, hasName, hasValidScope, hasPermissions } = testData;
          
          const category: RoleCategory = {
            id: hasId ? 'test-role' : '',
            name: hasName ? 'Test Role' : '',
            description: 'Test role category',
            scope: hasValidScope ? 'organization' : ('invalid' as any),
            permissions: hasPermissions ? ['read', 'write'] : (null as any),
            isActive: true,
            createdAt: new Date(),
          };
          
          const errors = categoryManager.validateCategoryExtension(category);
          
          // Verify validation results
          if (!hasId || !hasName) {
            expect(errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
          }
          
          if (!hasValidScope) {
            expect(errors.some((e) => e.code === 'INVALID_SCOPE')).toBe(true);
          }
          
          if (!hasPermissions) {
            expect(errors.some((e) => e.code === 'INVALID_PERMISSIONS')).toBe(true);
          }
          
          // If all fields are valid, no errors should be present
          if (hasId && hasName && hasValidScope && hasPermissions) {
            expect(errors.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role categories can be unregistered
   * 
   * For any registered category, it should be unregisterable without
   * affecting other categories.
   */
  it('should unregister role categories independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categoryCount: fc.integer({ min: 2, max: 5 }),
          unregisterIndex: fc.integer({ min: 0, max: 4 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { categoryCount, unregisterIndex } = testData;
          
          // Skip if unregisterIndex is out of bounds
          if (unregisterIndex >= categoryCount) {
            return;
          }
          
          // Register categories
          const categoryIds: string[] = [];
          for (let i = 0; i < categoryCount; i++) {
            const categoryId = `category-${i}`;
            categoryIds.push(categoryId);
            
            const category: RoleCategory = {
              id: categoryId,
              name: `Category ${i}`,
              description: `Category ${i}`,
              scope: 'organization',
              permissions: ['read'],
              isActive: true,
              createdAt: new Date(),
            };
            categoryManager.registerCategory(category);
          }
          
          // Verify all categories are registered
          expect(categoryManager.getAllCategories().length).toBe(categoryCount);
          
          // Unregister one category
          const categoryToUnregister = categoryIds[unregisterIndex];
          categoryManager.unregisterCategory(categoryToUnregister);
          
          // Verify category is unregistered
          expect(categoryManager.getCategory(categoryToUnregister)).toBeUndefined();
          
          // Verify other categories are still registered
          expect(categoryManager.getAllCategories().length).toBe(categoryCount - 1);
          
          for (let i = 0; i < categoryCount; i++) {
            if (i !== unregisterIndex) {
              expect(categoryManager.getCategory(categoryIds[i])).toBeDefined();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role category metadata is preserved
   * 
   * For any role category with metadata, the metadata should be
   * preserved and retrievable.
   */
  it('should preserve role category metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 20 }),
          metadata: fc.record({
            customField1: fc.string({ minLength: 1, maxLength: 50 }),
            customField2: fc.integer({ min: 0, max: 1000 }),
            customField3: fc.boolean(),
          }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { categoryId, metadata } = testData;
          
          const category: RoleCategory = {
            id: categoryId,
            name: 'Test Category',
            description: 'Test category with metadata',
            scope: 'organization',
            permissions: ['read', 'write'],
            isActive: true,
            createdAt: new Date(),
            metadata,
          };
          
          categoryManager.registerCategory(category);
          
          // Retrieve category and verify metadata
          const retrieved = categoryManager.getCategory(categoryId);
          expect(retrieved?.metadata).toEqual(metadata);
          expect(retrieved?.metadata?.customField1).toBe(metadata.customField1);
          expect(retrieved?.metadata?.customField2).toBe(metadata.customField2);
          expect(retrieved?.metadata?.customField3).toBe(metadata.customField3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role category events are emitted correctly
   * 
   * For any category operation, appropriate events should be emitted.
   */
  it('should emit events for role category operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 25: Role Type Extensibility
          
          const { categoryId } = testData;
          
          // Track events
          let registeredEventEmitted = false;
          let unregisteredEventEmitted = false;
          
          categoryManager.on('category-registered', (category) => {
            if (category.id === categoryId) {
              registeredEventEmitted = true;
            }
          });
          
          categoryManager.on('category-unregistered', (id) => {
            if (id === categoryId) {
              unregisteredEventEmitted = true;
            }
          });
          
          // Register category
          const category: RoleCategory = {
            id: categoryId,
            name: 'Test Category',
            description: 'Test category',
            scope: 'organization',
            permissions: ['read'],
            isActive: true,
            createdAt: new Date(),
          };
          
          categoryManager.registerCategory(category);
          expect(registeredEventEmitted).toBe(true);
          
          // Unregister category
          categoryManager.unregisterCategory(categoryId);
          expect(unregisteredEventEmitted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
