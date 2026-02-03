/**
 * Feature Flag Manager
 * Manages feature flags for independent optimization control
 * 
 * Requirements: 7.4
 * Properties: 22
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetAudience?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FeatureFlagConfig {
  flags: Map<string, FeatureFlag>;
  globalOverride?: boolean;
}

export interface FeatureFlagEvaluationContext {
  userId?: string;
  orgId?: string;
  projectId?: string;
  userEmail?: string;
  customAttributes?: Record<string, any>;
}

/**
 * Manages feature flags for optimization control
 */
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluationHistory: Array<{
    flagId: string;
    context: FeatureFlagEvaluationContext;
    result: boolean;
    timestamp: Date;
  }> = [];

  /**
   * Create or update a feature flag
   * Property 22: Feature Flag Control
   */
  setFlag(flag: FeatureFlag): void {
    flag.updatedAt = new Date();
    this.flags.set(flag.id, flag);
  }

  /**
   * Get a feature flag by ID
   */
  getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  /**
   * Enable a feature flag
   */
  enableFlag(flagId: string): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.enabled = true;
      flag.updatedAt = new Date();
    }
  }

  /**
   * Disable a feature flag
   */
  disableFlag(flagId: string): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.enabled = false;
      flag.updatedAt = new Date();
    }
  }

  /**
   * Set rollout percentage for a feature flag
   */
  setRolloutPercentage(flagId: string, percentage: number): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      flag.updatedAt = new Date();
    }
  }

  /**
   * Evaluate a feature flag for a given context
   */
  evaluateFlag(flagId: string, context?: FeatureFlagEvaluationContext): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return false;
    }

    // If flag is disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashContext(context);
      const rolloutValue = hash % 100;
      if (rolloutValue >= flag.rolloutPercentage) {
        return false;
      }
    }

    // Check target audience
    if (flag.targetAudience && flag.targetAudience.length > 0) {
      const isInAudience = this.isInTargetAudience(context, flag.targetAudience);
      if (!isInAudience) {
        return false;
      }
    }

    // Record evaluation
    this.evaluationHistory.push({
      flagId,
      context: context || {},
      result: true,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get feature flags by category
   */
  getFlagsByCategory(category: string): FeatureFlag[] {
    return Array.from(this.flags.values()).filter((flag) => flag.name.startsWith(category));
  }

  /**
   * Get feature flag status
   */
  getFlagStatus(): {
    totalFlags: number;
    enabledFlags: number;
    disabledFlags: number;
    averageRolloutPercentage: number;
    flags: FeatureFlag[];
  } {
    const allFlags = Array.from(this.flags.values());
    const enabledFlags = allFlags.filter((f) => f.enabled).length;
    const disabledFlags = allFlags.filter((f) => !f.enabled).length;
    const averageRolloutPercentage =
      allFlags.length > 0
        ? allFlags.reduce((sum, f) => sum + f.rolloutPercentage, 0) / allFlags.length
        : 0;

    return {
      totalFlags: allFlags.length,
      enabledFlags,
      disabledFlags,
      averageRolloutPercentage,
      flags: allFlags,
    };
  }

  /**
   * Get evaluation history
   */
  getEvaluationHistory(limit: number = 100): Array<{
    flagId: string;
    context: FeatureFlagEvaluationContext;
    result: boolean;
    timestamp: Date;
  }> {
    return this.evaluationHistory.slice(-limit);
  }

  /**
   * Get evaluation statistics for a flag
   */
  getEvaluationStats(flagId: string): {
    totalEvaluations: number;
    enabledCount: number;
    disabledCount: number;
    enabledPercentage: number;
  } {
    const evaluations = this.evaluationHistory.filter((e) => e.flagId === flagId);
    const enabledCount = evaluations.filter((e) => e.result).length;
    const disabledCount = evaluations.length - enabledCount;
    const enabledPercentage =
      evaluations.length > 0 ? (enabledCount / evaluations.length) * 100 : 0;

    return {
      totalEvaluations: evaluations.length,
      enabledCount,
      disabledCount,
      enabledPercentage,
    };
  }

  /**
   * Create optimization feature flags
   */
  createOptimizationFlags(): void {
    // Database optimization flag
    this.setFlag({
      id: 'opt-database-indexes',
      name: 'Database Index Optimization',
      description: 'Enable optimized database indexes for authentication queries',
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // RPC optimization flag
    this.setFlag({
      id: 'opt-rpc-functions',
      name: 'RPC Function Optimization',
      description: 'Enable optimized RPC functions for authentication',
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // Cache optimization flag
    this.setFlag({
      id: 'opt-cache-layer',
      name: 'Cache Layer Optimization',
      description: 'Enable unified cache manager for authentication data',
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // Session optimization flag
    this.setFlag({
      id: 'opt-session-compression',
      name: 'Session Compression',
      description: 'Enable session data compression for memory optimization',
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // Batch processing flag
    this.setFlag({
      id: 'opt-batch-processing',
      name: 'Batch Permission Processing',
      description: 'Enable batch processing for permission checks',
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // UI optimization flag
    this.setFlag({
      id: 'opt-ui-memoization',
      name: 'UI Component Memoization',
      description: 'Enable memoization for authentication components',
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });
  }

  /**
   * Enable all optimization flags for testing
   */
  enableAllOptimizations(): void {
    const optimizationFlags = [
      'opt-database-indexes',
      'opt-rpc-functions',
      'opt-cache-layer',
      'opt-session-compression',
      'opt-batch-processing',
      'opt-ui-memoization',
    ];

    for (const flagId of optimizationFlags) {
      this.enableFlag(flagId);
      this.setRolloutPercentage(flagId, 100);
    }
  }

  /**
   * Disable all optimization flags for rollback
   */
  disableAllOptimizations(): void {
    const optimizationFlags = [
      'opt-database-indexes',
      'opt-rpc-functions',
      'opt-cache-layer',
      'opt-session-compression',
      'opt-batch-processing',
      'opt-ui-memoization',
    ];

    for (const flagId of optimizationFlags) {
      this.disableFlag(flagId);
      this.setRolloutPercentage(flagId, 0);
    }
  }

  /**
   * Perform canary rollout (gradual enablement)
   */
  performCanaryRollout(flagId: string, stages: number[] = [10, 25, 50, 75, 100]): void {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return;
    }

    // Start with first stage
    this.setRolloutPercentage(flagId, stages[0]);
    this.enableFlag(flagId);
  }

  // Private helper methods

  private hashContext(context?: FeatureFlagEvaluationContext): number {
    if (!context) {
      return Math.floor(Math.random() * 100);
    }

    const key = context.userId || context.orgId || context.projectId || 'default';
    let hash = 0;

    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash);
  }

  private isInTargetAudience(
    context: FeatureFlagEvaluationContext | undefined,
    targetAudience: string[]
  ): boolean {
    if (!context) {
      return false;
    }

    if (context.userId && targetAudience.includes(context.userId)) {
      return true;
    }

    if (context.userEmail && targetAudience.includes(context.userEmail)) {
      return true;
    }

    if (context.orgId && targetAudience.includes(context.orgId)) {
      return true;
    }

    return false;
  }
}

export default FeatureFlagManager;
