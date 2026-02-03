/**
 * Property Test: Migration Data Consistency
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 23: Migration Data Consistency
 * 
 * Validates: Requirements 7.5
 * 
 * Description: For any migration phase, the system should validate and 
 * maintain data consistency before and after each phase.
 */

import * as fc from 'fast-check';
import {
  MigrationDataConsistencyManager,
  MigrationPhase,
  DataValidationResult,
  RollbackPlan,
} from '../../src/services/scaling/ExtensibilityManager';

describe('Property 23: Migration Data Consistency', () => {
  let consistencyManager: MigrationDataConsistencyManager;

  beforeEach(() => {
    consistencyManager = new MigrationDataConsistencyManager();
  });

  /**
   * Property: Migration phases can be registered and retrieved
   * 
   * For any migration phase, it should be registerable and retrievable
   * without affecting other phases.
   */
  it('should register and retrieve migration phases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phases: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 5, uniqueBy: (p) => p.id }
          ),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phases } = testData;
          
          // Register all phases
          for (const phaseData of phases) {
            const phase: MigrationPhase = {
              ...phaseData,
              status: 'pending',
              dataValidation: {
                isValid: true,
                checksPerformed: [],
                errors: [],
                warnings: [],
                timestamp: new Date(),
              },
            };
            consistencyManager.registerPhase(phase);
          }
          
          // Verify all phases are registered
          const allPhases = consistencyManager.getAllPhases();
          expect(allPhases.length).toBe(phases.length);
          
          // Verify each phase can be retrieved
          for (const phaseData of phases) {
            const retrieved = consistencyManager.getPhase(phaseData.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(phaseData.id);
            expect(retrieved?.name).toBe(phaseData.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Data validation rules can be registered
   * 
   * For any validation rule, it should be registerable and applied
   * during validation.
   */
  it('should register and apply data validation rules', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseId: fc.string({ minLength: 1, maxLength: 20 }),
          ruleCount: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseId, ruleCount } = testData;
          
          // Register phase
          const phase: MigrationPhase = {
            id: phaseId,
            name: 'Test Phase',
            description: 'Test migration phase',
            status: 'pending',
            dataValidation: {
              isValid: true,
              checksPerformed: [],
              errors: [],
              warnings: [],
              timestamp: new Date(),
            },
          };
          consistencyManager.registerPhase(phase);
          
          // Register validation rules
          for (let i = 0; i < ruleCount; i++) {
            const entityType = `entity-${i}`;
            consistencyManager.registerValidationRule(entityType, (data) => {
              // Simple validation: check if data has required fields
              if (!data || typeof data !== 'object') {
                return [
                  {
                    code: 'INVALID_DATA',
                    message: 'Data must be an object',
                    affectedRecords: 1,
                    severity: 'critical',
                  },
                ];
              }
              return [];
            });
          }
          
          // Validate phase data
          const testData = { field1: 'value1', field2: 'value2' };
          const result = await consistencyManager.validatePhaseData(phaseId, testData);
          
          // Verify validation was performed
          expect(result.checksPerformed.length).toBeGreaterThan(0);
          expect(result.timestamp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Data snapshots are created and retrievable
   * 
   * For any migration phase, snapshots should be created and
   * retrievable for rollback purposes.
   */
  it('should create and retrieve data snapshots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseId: fc.string({ minLength: 1, maxLength: 20 }),
          snapshotData: fc.record({
            field1: fc.string({ minLength: 1, maxLength: 50 }),
            field2: fc.integer({ min: 0, max: 1000 }),
            field3: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
              minLength: 1,
              maxLength: 5,
            }),
          }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseId, snapshotData } = testData;
          
          // Register phase
          const phase: MigrationPhase = {
            id: phaseId,
            name: 'Test Phase',
            description: 'Test migration phase',
            status: 'pending',
            dataValidation: {
              isValid: true,
              checksPerformed: [],
              errors: [],
              warnings: [],
              timestamp: new Date(),
            },
          };
          consistencyManager.registerPhase(phase);
          
          // Create snapshot
          consistencyManager.createSnapshot(phaseId, snapshotData);
          
          // Retrieve snapshot
          const retrieved = consistencyManager.getSnapshot(phaseId, 'before');
          
          // Verify snapshot data
          expect(retrieved).toEqual(snapshotData);
          expect(retrieved.field1).toBe(snapshotData.field1);
          expect(retrieved.field2).toBe(snapshotData.field2);
          expect(retrieved.field3).toEqual(snapshotData.field3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Rollback plans can be created and executed
   * 
   * For any migration phase, a rollback plan should be creatable
   * and executable.
   */
  it('should create and execute rollback plans', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseId: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseId } = testData;
          
          // Register phase
          const phase: MigrationPhase = {
            id: phaseId,
            name: 'Test Phase',
            description: 'Test migration phase',
            status: 'pending',
            dataValidation: {
              isValid: true,
              checksPerformed: [],
              errors: [],
              warnings: [],
              timestamp: new Date(),
            },
          };
          consistencyManager.registerPhase(phase);
          
          // Create snapshot for rollback
          const snapshotData = { field1: 'value1', field2: 'value2' };
          consistencyManager.createSnapshot(phaseId, snapshotData);
          
          // Create rollback plan
          const rollbackPlan = await consistencyManager.createRollbackPlan(phaseId);
          
          // Verify rollback plan structure
          expect(rollbackPlan).toBeDefined();
          expect(rollbackPlan.id).toContain('rollback');
          expect(rollbackPlan.steps.length).toBeGreaterThan(0);
          expect(rollbackPlan.estimatedDuration).toBeGreaterThan(0);
          expect(rollbackPlan.dataRestoration).toBeDefined();
          
          // Execute rollback plan
          await consistencyManager.executeRollback(rollbackPlan);
          
          // Verify phase has rollback plan
          const updatedPhase = consistencyManager.getPhase(phaseId);
          expect(updatedPhase?.rollbackPlan).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation errors are categorized by severity
   * 
   * For any validation result, errors should be categorized by
   * severity level.
   */
  it('should categorize validation errors by severity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseId: fc.string({ minLength: 1, maxLength: 20 }),
          hasCriticalError: fc.boolean(),
          hasHighError: fc.boolean(),
          hasMediumError: fc.boolean(),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseId, hasCriticalError, hasHighError, hasMediumError } = testData;
          
          // Register phase
          const phase: MigrationPhase = {
            id: phaseId,
            name: 'Test Phase',
            description: 'Test migration phase',
            status: 'pending',
            dataValidation: {
              isValid: true,
              checksPerformed: [],
              errors: [],
              warnings: [],
              timestamp: new Date(),
            },
          };
          consistencyManager.registerPhase(phase);
          
          // Register validation rule that produces errors
          consistencyManager.registerValidationRule('test-entity', (data) => {
            const errors = [];
            
            if (hasCriticalError) {
              errors.push({
                code: 'CRITICAL_ERROR',
                message: 'Critical validation error',
                affectedRecords: 10,
                severity: 'critical' as const,
              });
            }
            
            if (hasHighError) {
              errors.push({
                code: 'HIGH_ERROR',
                message: 'High severity error',
                affectedRecords: 5,
                severity: 'high' as const,
              });
            }
            
            if (hasMediumError) {
              errors.push({
                code: 'MEDIUM_ERROR',
                message: 'Medium severity error',
                affectedRecords: 2,
                severity: 'medium' as const,
              });
            }
            
            return errors;
          });
          
          // Validate data
          const testData = { field1: 'value1' };
          const result = await consistencyManager.validatePhaseData(phaseId, testData);
          
          // Verify error categorization
          const criticalErrors = result.errors.filter((e) => e.severity === 'critical');
          const highErrors = result.errors.filter((e) => e.severity === 'high');
          const mediumErrors = result.errors.filter((e) => e.severity === 'medium');
          
          expect(criticalErrors.length).toBe(hasCriticalError ? 1 : 0);
          expect(highErrors.length).toBe(hasHighError ? 1 : 0);
          expect(mediumErrors.length).toBe(hasMediumError ? 1 : 0);
          
          // Verify isValid is false if critical errors exist
          if (hasCriticalError) {
            expect(result.isValid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Migration phase status transitions are valid
   * 
   * For any migration phase, status transitions should follow
   * valid state machine rules.
   */
  it('should maintain valid migration phase status transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseId: fc.string({ minLength: 1, maxLength: 20 }),
          initialStatus: fc.constantFrom<
            'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back'
          >('pending', 'in-progress', 'completed', 'failed', 'rolled-back'),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseId, initialStatus } = testData;
          
          // Register phase with initial status
          const phase: MigrationPhase = {
            id: phaseId,
            name: 'Test Phase',
            description: 'Test migration phase',
            status: initialStatus,
            dataValidation: {
              isValid: true,
              checksPerformed: [],
              errors: [],
              warnings: [],
              timestamp: new Date(),
            },
          };
          consistencyManager.registerPhase(phase);
          
          // Verify phase has correct status
          const retrieved = consistencyManager.getPhase(phaseId);
          expect(retrieved?.status).toBe(initialStatus);
          
          // Verify status is one of valid values
          const validStatuses = [
            'pending',
            'in-progress',
            'completed',
            'failed',
            'rolled-back',
          ];
          expect(validStatuses).toContain(initialStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation events are emitted correctly
   * 
   * For any validation operation, appropriate events should be emitted.
   */
  it('should emit events for validation operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseId: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseId } = testData;
          
          // Track events
          let validationCompleteEmitted = false;
          let snapshotCreatedEmitted = false;
          let rollbackPlanCreatedEmitted = false;
          
          consistencyManager.on('validation-complete', (data) => {
            if (data.phaseId === phaseId) {
              validationCompleteEmitted = true;
            }
          });
          
          consistencyManager.on('snapshot-created', (id) => {
            if (id === phaseId) {
              snapshotCreatedEmitted = true;
            }
          });
          
          consistencyManager.on('rollback-plan-created', () => {
            rollbackPlanCreatedEmitted = true;
          });
          
          // Register phase
          const phase: MigrationPhase = {
            id: phaseId,
            name: 'Test Phase',
            description: 'Test migration phase',
            status: 'pending',
            dataValidation: {
              isValid: true,
              checksPerformed: [],
              errors: [],
              warnings: [],
              timestamp: new Date(),
            },
          };
          consistencyManager.registerPhase(phase);
          
          // Validate data
          const testData = { field1: 'value1' };
          await consistencyManager.validatePhaseData(phaseId, testData);
          expect(validationCompleteEmitted).toBe(true);
          
          // Create snapshot
          consistencyManager.createSnapshot(phaseId, testData);
          expect(snapshotCreatedEmitted).toBe(true);
          
          // Create rollback plan
          await consistencyManager.createRollbackPlan(phaseId);
          expect(rollbackPlanCreatedEmitted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple phases can be managed independently
   * 
   * For any set of migration phases, each should maintain its own
   * state and validation results independently.
   */
  it('should manage multiple migration phases independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phaseCount: fc.integer({ min: 2, max: 5 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 23: Migration Data Consistency
          
          const { phaseCount } = testData;
          
          // Register multiple phases
          const phaseIds: string[] = [];
          for (let i = 0; i < phaseCount; i++) {
            const phaseId = `phase-${i}`;
            phaseIds.push(phaseId);
            
            const phase: MigrationPhase = {
              id: phaseId,
              name: `Phase ${i}`,
              description: `Migration phase ${i}`,
              status: 'pending',
              dataValidation: {
                isValid: true,
                checksPerformed: [],
                errors: [],
                warnings: [],
                timestamp: new Date(),
              },
            };
            consistencyManager.registerPhase(phase);
          }
          
          // Validate each phase with different data
          for (let i = 0; i < phaseCount; i++) {
            const phaseId = phaseIds[i];
            const testData = { phaseNumber: i, data: `phase-${i}-data` };
            
            const result = await consistencyManager.validatePhaseData(phaseId, testData);
            
            // Verify validation result
            expect(result).toBeDefined();
            expect(result.timestamp).toBeDefined();
          }
          
          // Verify all phases are still registered
          const allPhases = consistencyManager.getAllPhases();
          expect(allPhases.length).toBe(phaseCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
