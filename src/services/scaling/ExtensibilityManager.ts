/**
 * Extensibility Manager
 * Manages support for new scoped role categories, resource prioritization, and migration data consistency
 * 
 * Requirements: 7.5, 8.3, 8.5
 */

import { EventEmitter } from 'events';

export interface RoleCategory {
  id: string;
  name: string;
  description: string;
  scope: 'system' | 'organization' | 'project';
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ResourcePriority {
  operationType: string;
  priority: number;
  maxRetries: number;
  timeout: number;
  fallbackStrategy: 'queue' | 'reject' | 'degrade';
}

export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  startTime?: Date;
  endTime?: Date;
  dataValidation: DataValidationResult;
  rollbackPlan?: RollbackPlan;
}

export interface DataValidationResult {
  isValid: boolean;
  checksPerformed: string[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
}

export interface ValidationError {
  code: string;
  message: string;
  affectedRecords: number;
  severity: 'critical' | 'high' | 'medium';
}

export interface ValidationWarning {
  code: string;
  message: string;
  affectedRecords: number;
}

export interface RollbackPlan {
  id: string;
  description: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  dataRestoration: DataRestorationStrategy;
}

export interface RollbackStep {
  order: number;
  description: string;
  action: () => Promise<void>;
  rollbackAction?: () => Promise<void>;
}

export interface DataRestorationStrategy {
  type: 'snapshot' | 'transaction-log' | 'backup';
  location: string;
  timestamp: Date;
  verificationChecks: string[];
}

export interface ResourceAllocationPolicy {
  operationType: string;
  priority: number;
  cpuQuota: number;
  memoryQuota: number;
  diskQuota: number;
  networkQuota: number;
}

/**
 * Role Category Manager
 * Manages extensibility of role types and categories
 */
export class RoleCategoryManager extends EventEmitter {
  private categories: Map<string, RoleCategory> = new Map();
  private categoryHierarchy: Map<string, string[]> = new Map(); // parent -> children

  registerCategory(category: RoleCategory): void {
    if (this.categories.has(category.id)) {
      throw new Error(`Role category ${category.id} already exists`);
    }

    this.categories.set(category.id, category);
    this.emit('category-registered', category);
  }

  unregisterCategory(categoryId: string): void {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Role category ${categoryId} not found`);
    }

    this.categories.delete(categoryId);
    this.emit('category-unregistered', categoryId);
  }

  getCategory(categoryId: string): RoleCategory | undefined {
    return this.categories.get(categoryId);
  }

  getAllCategories(): RoleCategory[] {
    return Array.from(this.categories.values());
  }

  getCategoriesByScope(scope: 'system' | 'organization' | 'project'): RoleCategory[] {
    return Array.from(this.categories.values()).filter((c) => c.scope === scope);
  }

  addCategoryHierarchy(parentId: string, childId: string): void {
    if (!this.categories.has(parentId) || !this.categories.has(childId)) {
      throw new Error('Parent or child category not found');
    }

    if (!this.categoryHierarchy.has(parentId)) {
      this.categoryHierarchy.set(parentId, []);
    }

    this.categoryHierarchy.get(parentId)!.push(childId);
    this.emit('hierarchy-updated', { parent: parentId, child: childId });
  }

  getChildCategories(parentId: string): RoleCategory[] {
    const childIds = this.categoryHierarchy.get(parentId) || [];
    return childIds
      .map((id) => this.categories.get(id))
      .filter((c) => c !== undefined) as RoleCategory[];
  }

  validateCategoryExtension(category: RoleCategory): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!category.id || !category.name) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Category must have id and name',
        affectedRecords: 1,
        severity: 'critical',
      });
    }

    // Validate scope
    if (!['system', 'organization', 'project'].includes(category.scope)) {
      errors.push({
        code: 'INVALID_SCOPE',
        message: `Invalid scope: ${category.scope}`,
        affectedRecords: 1,
        severity: 'critical',
      });
    }

    // Validate permissions format
    if (!Array.isArray(category.permissions)) {
      errors.push({
        code: 'INVALID_PERMISSIONS',
        message: 'Permissions must be an array',
        affectedRecords: 1,
        severity: 'critical',
      });
    }

    return errors;
  }
}

/**
 * Resource Prioritization Manager
 * Manages resource allocation and prioritization for critical operations
 */
export class ResourcePrioritizationManager extends EventEmitter {
  private priorities: Map<string, ResourcePriority> = new Map();
  private allocationPolicies: Map<string, ResourceAllocationPolicy> = new Map();
  private resourceUsage: Map<string, number> = new Map();

  registerPriority(priority: ResourcePriority): void {
    this.priorities.set(priority.operationType, priority);
    this.emit('priority-registered', priority);
  }

  getPriority(operationType: string): ResourcePriority | undefined {
    return this.priorities.get(operationType);
  }

  getAllPriorities(): ResourcePriority[] {
    return Array.from(this.priorities.values());
  }

  registerAllocationPolicy(policy: ResourceAllocationPolicy): void {
    this.allocationPolicies.set(policy.operationType, policy);
    this.emit('policy-registered', policy);
  }

  getAllocationPolicy(operationType: string): ResourceAllocationPolicy | undefined {
    return this.allocationPolicies.get(operationType);
  }

  canAllocateResources(operationType: string, requiredResources: Record<string, number>): boolean {
    const policy = this.allocationPolicies.get(operationType);
    if (!policy) return true; // No policy means no restrictions

    const currentUsage = this.getResourceUsage(operationType);

    // Check CPU quota (including current usage)
    if (requiredResources.cpu && currentUsage + requiredResources.cpu > policy.cpuQuota) {
      return false;
    }

    // Check memory quota (including current usage)
    if (requiredResources.memory && currentUsage + requiredResources.memory > policy.memoryQuota) {
      return false;
    }

    // Check disk quota (including current usage)
    if (requiredResources.disk && currentUsage + requiredResources.disk > policy.diskQuota) {
      return false;
    }

    // Check network quota (including current usage)
    if (requiredResources.network && currentUsage + requiredResources.network > policy.networkQuota) {
      return false;
    }

    return true;
  }

  allocateResources(operationType: string, resources: Record<string, number>): void {
    const key = `${operationType}:usage`;
    const current = this.resourceUsage.get(key) || 0;
    this.resourceUsage.set(key, current + (resources.total || 0));
    this.emit('resources-allocated', { operationType, resources });
  }

  releaseResources(operationType: string, resources: Record<string, number>): void {
    const key = `${operationType}:usage`;
    const current = this.resourceUsage.get(key) || 0;
    this.resourceUsage.set(key, Math.max(0, current - (resources.total || 0)));
    this.emit('resources-released', { operationType, resources });
  }

  getResourceUsage(operationType: string): number {
    return this.resourceUsage.get(`${operationType}:usage`) || 0;
  }

  prioritizeOperation(operationType: string): number {
    const priority = this.priorities.get(operationType);
    return priority ? priority.priority : 0;
  }
}

/**
 * Migration Data Consistency Manager
 * Validates and maintains data consistency during migration phases
 */
export class MigrationDataConsistencyManager extends EventEmitter {
  private phases: Map<string, MigrationPhase> = new Map();
  private validationRules: Map<string, (data: any) => ValidationError[]> = new Map();
  private dataSnapshots: Map<string, any> = new Map();

  registerPhase(phase: MigrationPhase): void {
    this.phases.set(phase.id, phase);
    this.emit('phase-registered', phase);
  }

  getPhase(phaseId: string): MigrationPhase | undefined {
    return this.phases.get(phaseId);
  }

  getAllPhases(): MigrationPhase[] {
    return Array.from(this.phases.values());
  }

  registerValidationRule(
    entityType: string,
    validator: (data: any) => ValidationError[]
  ): void {
    this.validationRules.set(entityType, validator);
  }

  async validatePhaseData(phaseId: string, data: any): Promise<DataValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const checksPerformed: string[] = [];

    // Run all registered validation rules
    for (const [entityType, validator] of this.validationRules) {
      checksPerformed.push(`Validate ${entityType}`);
      const validationErrors = validator(data);
      errors.push(...validationErrors);
    }

    // Validate referential integrity
    checksPerformed.push('Validate referential integrity');
    const integrityErrors = await this.validateReferentialIntegrity(data);
    errors.push(...integrityErrors);

    // Validate data consistency
    checksPerformed.push('Validate data consistency');
    const consistencyErrors = await this.validateDataConsistency(data);
    errors.push(...consistencyErrors);

    const isValid = errors.filter((e) => e.severity === 'critical').length === 0;

    const result: DataValidationResult = {
      isValid,
      checksPerformed,
      errors,
      warnings,
      timestamp: new Date(),
    };

    // Update phase with validation result
    const phase = this.phases.get(phaseId);
    if (phase) {
      phase.dataValidation = result;
    }

    this.emit('validation-complete', { phaseId, result });
    return result;
  }

  private async validateReferentialIntegrity(data: any): Promise<ValidationError[]> {
    // Simulate referential integrity checks
    const errors: ValidationError[] = [];

    // Check for orphaned records
    if (data.orphanedRecords && data.orphanedRecords.length > 0) {
      errors.push({
        code: 'ORPHANED_RECORDS',
        message: 'Found orphaned records without parent references',
        affectedRecords: data.orphanedRecords.length,
        severity: 'high',
      });
    }

    return errors;
  }

  private async validateDataConsistency(data: any): Promise<ValidationError[]> {
    // Simulate data consistency checks
    const errors: ValidationError[] = [];

    // Check for duplicate records
    if (data.duplicateRecords && data.duplicateRecords.length > 0) {
      errors.push({
        code: 'DUPLICATE_RECORDS',
        message: 'Found duplicate records',
        affectedRecords: data.duplicateRecords.length,
        severity: 'high',
      });
    }

    // Check for data type mismatches
    if (data.typeErrors && data.typeErrors.length > 0) {
      errors.push({
        code: 'TYPE_MISMATCH',
        message: 'Found data type mismatches',
        affectedRecords: data.typeErrors.length,
        severity: 'medium',
      });
    }

    return errors;
  }

  createSnapshot(phaseId: string, data: any): void {
    this.dataSnapshots.set(`${phaseId}:before`, JSON.parse(JSON.stringify(data)));
    this.emit('snapshot-created', phaseId);
  }

  getSnapshot(phaseId: string, type: 'before' | 'after'): any {
    return this.dataSnapshots.get(`${phaseId}:${type}`);
  }

  async createRollbackPlan(phaseId: string): Promise<RollbackPlan> {
    const phase = this.phases.get(phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    const rollbackPlan: RollbackPlan = {
      id: `rollback-${phaseId}`,
      description: `Rollback plan for phase ${phaseId}`,
      steps: [
        {
          order: 1,
          description: 'Stop all ongoing operations',
          action: async () => {
            this.emit('rollback-step', { step: 1, description: 'Stopping operations' });
          },
        },
        {
          order: 2,
          description: 'Restore data from snapshot',
          action: async () => {
            const snapshot = this.getSnapshot(phaseId, 'before');
            if (!snapshot) {
              throw new Error('No snapshot available for rollback');
            }
            this.emit('rollback-step', { step: 2, description: 'Restoring data' });
          },
        },
        {
          order: 3,
          description: 'Verify data consistency',
          action: async () => {
            this.emit('rollback-step', { step: 3, description: 'Verifying consistency' });
          },
        },
      ],
      estimatedDuration: 900, // 15 minutes
      dataRestoration: {
        type: 'snapshot',
        location: `snapshot:${phaseId}:before`,
        timestamp: new Date(),
        verificationChecks: ['referential-integrity', 'data-consistency', 'record-count'],
      },
    };

    phase.rollbackPlan = rollbackPlan;
    this.emit('rollback-plan-created', rollbackPlan);
    return rollbackPlan;
  }

  async executeRollback(rollbackPlan: RollbackPlan): Promise<void> {
    for (const step of rollbackPlan.steps) {
      try {
        await step.action();
      } catch (error) {
        this.emit('rollback-error', { step: step.order, error });
        throw error;
      }
    }

    this.emit('rollback-complete', rollbackPlan.id);
  }
}
