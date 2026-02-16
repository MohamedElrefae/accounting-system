/**
 * Backward Compatibility and Migration Safety Services
 * 
 * Feature: enterprise-auth-performance-optimization
 * Provides tools for safe deployment of optimizations
 * 
 * Validates: Requirements 7.1, 7.2, 7.4
 */

import APICompatibilityValidator from './APICompatibilityValidator';
import RollbackManager from './RollbackManager';
import FeatureFlagManager from './FeatureFlagManager';

// Singleton instances
let apiCompatibilityValidatorInstance: APICompatibilityValidator | null = null;
let rollbackManagerInstance: RollbackManager | null = null;
let featureFlagManagerInstance: FeatureFlagManager | null = null;

// API Compatibility Validator exports
export { default as APICompatibilityValidator } from './APICompatibilityValidator';
export type {
  APIEndpoint,
  APICompatibilityResult,
  CompatibilityIssue,
} from './APICompatibilityValidator';

export function getAPICompatibilityValidator(): APICompatibilityValidator {
  if (!apiCompatibilityValidatorInstance) {
    apiCompatibilityValidatorInstance = new APICompatibilityValidator();
  }
  return apiCompatibilityValidatorInstance;
}

export function resetAPICompatibilityValidator(): void {
  apiCompatibilityValidatorInstance = null;
}

// Rollback Manager exports
export { default as RollbackManager } from './RollbackManager';
export type {
  RollbackProcedure,
  RollbackStep,
  RollbackResult,
  RollbackError,
} from './RollbackManager';

export function getRollbackManager(): RollbackManager {
  if (!rollbackManagerInstance) {
    rollbackManagerInstance = new RollbackManager();
  }
  return rollbackManagerInstance;
}

export function resetRollbackManager(): void {
  rollbackManagerInstance = null;
}

// Feature Flag Manager exports
export { default as FeatureFlagManager } from './FeatureFlagManager';
export type {
  FeatureFlag,
  FeatureFlagConfig,
  FeatureFlagEvaluationContext,
} from './FeatureFlagManager';

export function getFeatureFlagManager(): FeatureFlagManager {
  if (!featureFlagManagerInstance) {
    featureFlagManagerInstance = new FeatureFlagManager();
  }
  return featureFlagManagerInstance;
}

export function resetFeatureFlagManager(): void {
  featureFlagManagerInstance = null;
}
