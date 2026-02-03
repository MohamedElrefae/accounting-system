/**
 * Rollback Manager
 * Manages rollback procedures for database changes and optimizations
 * 
 * Requirements: 7.2
 * Properties: 20
 */

export interface RollbackProcedure {
  id: string;
  name: string;
  description: string;
  steps: RollbackStep[];
  estimatedDuration: number; // in seconds
  createdAt: Date;
  testedAt?: Date;
}

export interface RollbackStep {
  order: number;
  action: string;
  sql?: string;
  description: string;
  rollbackSql?: string;
  timeout?: number;
}

export interface RollbackResult {
  success: boolean;
  procedureId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  stepsCompleted: number;
  totalSteps: number;
  errors: RollbackError[];
  warnings: string[];
}

export interface RollbackError {
  step: number;
  action: string;
  error: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recoveryAction?: string;
}

/**
 * Manages rollback procedures for database changes
 */
export class RollbackManager {
  private procedures: Map<string, RollbackProcedure> = new Map();
  private rollbackHistory: RollbackResult[] = [];

  /**
   * Register a rollback procedure
   */
  registerProcedure(procedure: RollbackProcedure): void {
    this.procedures.set(procedure.id, procedure);
  }

  /**
   * Execute a rollback procedure
   * Property 20: Rollback Capability
   */
  async executeProcedure(procedureId: string): Promise<RollbackResult> {
    const procedure = this.procedures.get(procedureId);
    if (!procedure) {
      throw new Error(`Rollback procedure not found: ${procedureId}`);
    }

    const result: RollbackResult = {
      success: true,
      procedureId,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      stepsCompleted: 0,
      totalSteps: procedure.steps.length,
      errors: [],
      warnings: [],
    };

    try {
      // Execute each step
      for (const step of procedure.steps) {
        try {
          await this.executeStep(step);
          result.stepsCompleted++;
        } catch (error) {
          result.success = false;
          result.errors.push({
            step: step.order,
            action: step.action,
            error: String(error),
            severity: 'high',
            recoveryAction: `Manual intervention required for step ${step.order}`,
          });

          // Continue with next step if not critical
          if (step.action.includes('critical')) {
            break;
          }
        }
      }
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
    }

    // Store in history
    this.rollbackHistory.push(result);

    return result;
  }

  /**
   * Execute a single rollback step
   */
  private async executeStep(step: RollbackStep): Promise<void> {
    if (!step.sql) {
      return;
    }

    // In a real implementation, this would execute the SQL
    // For now, we'll simulate it
    return new Promise((resolve, reject) => {
      const timeout = step.timeout || 30000;
      const timer = setTimeout(() => {
        reject(new Error(`Step ${step.order} timed out after ${timeout}ms`));
      }, timeout);

      try {
        // Simulate SQL execution
        setTimeout(() => {
          clearTimeout(timer);
          resolve();
        }, 100);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Validate that a rollback procedure can be executed within 15 minutes
   */
  async validateRollbackTime(procedureId: string): Promise<boolean> {
    const procedure = this.procedures.get(procedureId);
    if (!procedure) {
      return false;
    }

    const totalDuration = procedure.steps.reduce((sum, step) => sum + (step.timeout || 30), 0);
    const fifteenMinutes = 15 * 60 * 1000;

    return totalDuration <= fifteenMinutes;
  }

  /**
   * Get rollback procedure by ID
   */
  getProcedure(procedureId: string): RollbackProcedure | undefined {
    return this.procedures.get(procedureId);
  }

  /**
   * Get all registered rollback procedures
   */
  getAllProcedures(): RollbackProcedure[] {
    return Array.from(this.procedures.values());
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(limit: number = 100): RollbackResult[] {
    return this.rollbackHistory.slice(-limit);
  }

  /**
   * Test a rollback procedure without executing it
   */
  async testProcedure(procedureId: string): Promise<{
    valid: boolean;
    issues: string[];
    estimatedDuration: number;
  }> {
    const procedure = this.procedures.get(procedureId);
    if (!procedure) {
      return {
        valid: false,
        issues: [`Procedure not found: ${procedureId}`],
        estimatedDuration: 0,
      };
    }

    const issues: string[] = [];
    let estimatedDuration = 0;

    // Validate each step
    for (const step of procedure.steps) {
      if (!step.action) {
        issues.push(`Step ${step.order} has no action`);
      }

      if (!step.description) {
        issues.push(`Step ${step.order} has no description`);
      }

      if (step.action.includes('sql') && !step.sql) {
        issues.push(`Step ${step.order} requires SQL but none provided`);
      }

      estimatedDuration += step.timeout || 30;
    }

    // Check if procedure can complete within 15 minutes
    const fifteenMinutes = 15 * 60 * 1000;
    if (estimatedDuration > fifteenMinutes) {
      issues.push(
        `Estimated duration ${estimatedDuration}ms exceeds 15 minute limit (${fifteenMinutes}ms)`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      estimatedDuration,
    };
  }

  /**
   * Create a rollback procedure for database index creation
   */
  createIndexRollbackProcedure(indexNames: string[]): RollbackProcedure {
    const steps: RollbackStep[] = indexNames.map((indexName, index) => ({
      order: index + 1,
      action: 'drop_index',
      sql: `DROP INDEX IF EXISTS ${indexName};`,
      description: `Drop index ${indexName}`,
      timeout: 30000,
    }));

    const procedure: RollbackProcedure = {
      id: `rollback-indexes-${Date.now()}`,
      name: `Rollback Index Creation`,
      description: `Rollback creation of ${indexNames.length} indexes`,
      steps,
      estimatedDuration: steps.length * 30,
      createdAt: new Date(),
    };

    this.registerProcedure(procedure);
    return procedure;
  }

  /**
   * Create a rollback procedure for RPC function creation
   */
  createRPCRollbackProcedure(functionNames: string[]): RollbackProcedure {
    const steps: RollbackStep[] = functionNames.map((functionName, index) => ({
      order: index + 1,
      action: 'drop_function',
      sql: `DROP FUNCTION IF EXISTS ${functionName} CASCADE;`,
      description: `Drop function ${functionName}`,
      timeout: 30000,
    }));

    const procedure: RollbackProcedure = {
      id: `rollback-functions-${Date.now()}`,
      name: `Rollback RPC Function Creation`,
      description: `Rollback creation of ${functionNames.length} RPC functions`,
      steps,
      estimatedDuration: steps.length * 30,
      createdAt: new Date(),
    };

    this.registerProcedure(procedure);
    return procedure;
  }

  /**
   * Get rollback status
   */
  getRollbackStatus(): {
    totalProcedures: number;
    testedProcedures: number;
    successfulRollbacks: number;
    failedRollbacks: number;
    lastRollback?: RollbackResult;
  } {
    const testedProcedures = Array.from(this.procedures.values()).filter((p) => p.testedAt).length;
    const successfulRollbacks = this.rollbackHistory.filter((r) => r.success).length;
    const failedRollbacks = this.rollbackHistory.filter((r) => !r.success).length;

    return {
      totalProcedures: this.procedures.size,
      testedProcedures,
      successfulRollbacks,
      failedRollbacks,
      lastRollback: this.rollbackHistory[this.rollbackHistory.length - 1],
    };
  }
}

export default RollbackManager;
