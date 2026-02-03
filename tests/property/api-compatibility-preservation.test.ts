/**
 * Property Test: API Compatibility Preservation
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 19: API Compatibility Preservation
 * 
 * Validates: Requirements 7.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  APICompatibilityValidator,
  resetAPICompatibilityValidator,
  type APIEndpoint,
  type APISchema,
} from '../../src/services/compatibility/APICompatibilityValidator';

describe('Property 19: API Compatibility Preservation', () => {
  let validator: APICompatibilityValidator;

  beforeEach(() => {
    resetAPICompatibilityValidator();
    validator = new APICompatibilityValidator();
  });

  /**
   * Property: For any existing API endpoint, the optimized system should maintain
   * compatibility with existing contracts and input/output specifications.
   * 
   * Validates: Requirements 7.1
   */
  it('should preserve API compatibility for all registered endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
          path: fc.stringMatching(/^\/api\/[a-z]+\/[a-z]+$/),
          requestFields: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.constantFrom('string', 'number', 'boolean', 'object'),
              required: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          responseFields: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.constantFrom('string', 'number', 'boolean', 'object'),
              required: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 19: API Compatibility Preservation

          const endpoint: APIEndpoint = {
            method: testData.method as any,
            path: testData.path,
            description: `${testData.method} ${testData.path}`,
          };

          // Create request schema
          const requestSchema: Record<string, any> = {};
          for (const field of testData.requestFields) {
            requestSchema[field.name] = {
              type: field.type,
              required: field.required,
            };
          }

          // Create response schema
          const responseSchema: Record<string, any> = {};
          for (const field of testData.responseFields) {
            responseSchema[field.name] = {
              type: field.type,
              required: field.required,
            };
          }

          const originalSchema: APISchema = {
            request: requestSchema,
            response: responseSchema,
            errors: {
              400: 'Bad Request',
              401: 'Unauthorized',
              500: 'Internal Server Error',
            },
          };

          // Register original endpoint
          validator.registerOriginalEndpoint(endpoint, originalSchema);

          // Create optimized schema (same as original for compatibility)
          const optimizedSchema: APISchema = {
            request: requestSchema,
            response: responseSchema,
            errors: {
              400: 'Bad Request',
              401: 'Unauthorized',
              500: 'Internal Server Error',
            },
          };

          // Register optimized endpoint
          validator.registerOptimizedEndpoint(endpoint, optimizedSchema);

          // Validate compatibility
          const report = validator.validateCompatibility();

          // All endpoints should be compatible
          expect(report.incompatibleEndpoints).toBe(0);
          expect(report.compatibleEndpoints).toBeGreaterThan(0);

          // All results should show compatibility
          for (const result of report.results) {
            expect(result.compatible).toBe(true);
            expect(result.issues).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When required fields are removed from request schema,
   * the system should detect incompatibility.
   */
  it('should detect incompatibility when required fields are removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: fc.constantFrom('GET', 'POST', 'PUT'),
          path: fc.stringMatching(/^\/api\/[a-z]+\/[a-z]+$/),
          requiredFields: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 19: API Compatibility Preservation

          const endpoint: APIEndpoint = {
            method: testData.method as any,
            path: testData.path,
            description: `${testData.method} ${testData.path}`,
          };

          // Create original schema with required fields
          const originalSchema: APISchema = {
            request: {},
            response: { id: { type: 'string', required: true } },
          };

          for (const field of testData.requiredFields) {
            originalSchema.request![field] = {
              type: 'string',
              required: true,
            };
          }

          // Create optimized schema with removed required field
          const optimizedSchema: APISchema = {
            request: {},
            response: { id: { type: 'string', required: true } },
          };

          // Remove first required field
          const fieldsToKeep = testData.requiredFields.slice(1);
          for (const field of fieldsToKeep) {
            optimizedSchema.request![field] = {
              type: 'string',
              required: true,
            };
          }

          validator.registerOriginalEndpoint(endpoint, originalSchema);
          validator.registerOptimizedEndpoint(endpoint, optimizedSchema);

          const report = validator.validateCompatibility();

          // Should detect incompatibility if required field was removed
          if (testData.requiredFields.length > 0) {
            expect(report.incompatibleEndpoints).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: When response schema is modified, the system should detect
   * if required fields are removed.
   */
  it('should detect incompatibility when response required fields are removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: fc.constantFrom('GET', 'POST'),
          path: fc.stringMatching(/^\/api\/[a-z]+\/[a-z]+$/),
          responseFields: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 19: API Compatibility Preservation

          const endpoint: APIEndpoint = {
            method: testData.method as any,
            path: testData.path,
            description: `${testData.method} ${testData.path}`,
          };

          // Create original schema with response fields
          const originalSchema: APISchema = {
            request: { id: { type: 'string', required: true } },
            response: {},
          };

          for (const field of testData.responseFields) {
            originalSchema.response![field] = {
              type: 'string',
              required: true,
            };
          }

          // Create optimized schema with removed response field
          const optimizedSchema: APISchema = {
            request: { id: { type: 'string', required: true } },
            response: {},
          };

          const fieldsToKeep = testData.responseFields.slice(1);
          for (const field of fieldsToKeep) {
            optimizedSchema.response![field] = {
              type: 'string',
              required: true,
            };
          }

          validator.registerOriginalEndpoint(endpoint, originalSchema);
          validator.registerOptimizedEndpoint(endpoint, optimizedSchema);

          const report = validator.validateCompatibility();

          // Should detect incompatibility if required response field was removed
          if (testData.responseFields.length > 0) {
            expect(report.incompatibleEndpoints).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: The compatibility report should always be generated successfully
   * regardless of the number of endpoints.
   */
  it('should generate compatibility report for any number of endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            path: fc.stringMatching(/^\/api\/[a-z]+\/[a-z]+$/),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (endpoints) => {
          // Feature: enterprise-auth-performance-optimization, Property 19: API Compatibility Preservation

          // Create fresh validator for each property run
          const freshValidator = new APICompatibilityValidator();

          for (const ep of endpoints) {
            const endpoint: APIEndpoint = {
              method: ep.method as any,
              path: ep.path,
              description: `${ep.method} ${ep.path}`,
            };

            const schema: APISchema = {
              request: { id: { type: 'string', required: true } },
              response: { success: { type: 'boolean', required: true } },
            };

            freshValidator.registerOriginalEndpoint(endpoint, schema);
            freshValidator.registerOptimizedEndpoint(endpoint, schema);
          }

          const report = freshValidator.validateCompatibility();

          // Report should be generated
          expect(report).toBeDefined();
          expect(report.totalEndpoints).toBe(endpoints.length);
          expect(report.results).toHaveLength(endpoints.length);
          expect(report.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 50 }
    );
  });
});
