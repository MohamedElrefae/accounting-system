/**
 * Backward Compatibility and Migration Safety Services
 * 
 * Feature: enterprise-auth-performance-optimization
 * Provides tools for safe deployment of optimizations
 * 
 * Validates: Requirements 7.1, 7.2, 7.4
 */

export {
  APICompatibilityValidator,
  getAPICompatibilityValidator,
  resetAPICompatibilityValidator,
  type APIEndpoint,
  type APISchema,
  type CompatibilityCheckResult,
  type CompatibilityReport,
} from './APICompatibilityValidator';

export {
  RollbackManager,
  getRollbackManager,
  resetRollbackManager,
  type RollbackCheckpoint,
  type DatabaseChange,
  type RollbackPlan,
  type RollbackResult,
  type ValidationResult,
} from './RollbackManager';

export {
  FeatureFlagManager,
  getFeatureFlagManager,
  resetFeatureFlagManager,
  type FeatureFlag,
  type FeatureFlagConfig,
  type FlagChangeEvent,
} from './FeatureFlagManager';
