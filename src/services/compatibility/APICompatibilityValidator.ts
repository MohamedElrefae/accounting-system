/**
 * API Compatibility Validator
 * Ensures backward compatibility with existing API contracts during optimization
 * 
 * Requirements: 7.1
 * Properties: 19
 */

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestSchema?: Record<string, any>;
  responseSchema: Record<string, any>;
  deprecated?: boolean;
}

export interface APICompatibilityResult {
  endpoint: APIEndpoint;
  isCompatible: boolean;
  issues: CompatibilityIssue[];
  recommendations: string[];
}

export interface CompatibilityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'schema_mismatch' | 'behavior_change' | 'performance_regression' | 'deprecation';
  description: string;
  affectedField?: string;
  suggestedFix: string;
}

/**
 * Validates API compatibility during optimization
 */
export class APICompatibilityValidator {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private originalBehaviors: Map<string, any> = new Map();
  private optimizedBehaviors: Map<string, any> = new Map();

  /**
   * Register an API endpoint for compatibility checking
   */
  registerEndpoint(endpoint: APIEndpoint): void {
    const key = `${endpoint.method} ${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  /**
   * Validate that all registered endpoints maintain compatibility
   * Property 19: API Compatibility Preservation
   */
  async validateAllEndpoints(): Promise<APICompatibilityResult[]> {
    const results: APICompatibilityResult[] = [];

    for (const endpoint of this.endpoints.values()) {
      const result = await this.validateEndpoint(endpoint);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a specific endpoint for compatibility
   */
  async validateEndpoint(endpoint: APIEndpoint): Promise<APICompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const recommendations: string[] = [];

    // Check response schema compatibility
    const schemaIssues = await this.validateResponseSchema(endpoint);
    issues.push(...schemaIssues);

    // Check request schema compatibility
    if (endpoint.requestSchema) {
      const requestIssues = await this.validateRequestSchema(endpoint);
      issues.push(...requestIssues);
    }

    // Check behavior compatibility
    const behaviorIssues = await this.validateBehavior(endpoint);
    issues.push(...behaviorIssues);

    // Check for deprecation warnings
    if (endpoint.deprecated) {
      recommendations.push('This endpoint is deprecated. Consider using the replacement endpoint.');
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Endpoint is fully compatible with existing API contract.');
    } else {
      const criticalIssues = issues.filter((i) => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        recommendations.push('Critical compatibility issues must be resolved before deployment.');
      }
    }

    return {
      endpoint,
      isCompatible: issues.filter((i) => i.severity === 'critical').length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Validate response schema compatibility
   */
  private async validateResponseSchema(endpoint: APIEndpoint): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // Check that response schema has required fields
    const requiredFields = this.getRequiredFields(endpoint.responseSchema);
    for (const field of requiredFields) {
      if (!this.fieldExists(endpoint.responseSchema, field)) {
        issues.push({
          severity: 'critical',
          type: 'schema_mismatch',
          description: `Required response field '${field}' is missing`,
          affectedField: field,
          suggestedFix: `Ensure field '${field}' is included in the response`,
        });
      }
    }

    // Check for field type changes
    const fieldTypes = this.getFieldTypes(endpoint.responseSchema);
    for (const [field, expectedType] of fieldTypes) {
      const actualType = this.getFieldType(endpoint.responseSchema, field);
      if (actualType && actualType !== expectedType) {
        issues.push({
          severity: 'high',
          type: 'schema_mismatch',
          description: `Response field '${field}' type changed from ${expectedType} to ${actualType}`,
          affectedField: field,
          suggestedFix: `Maintain field type as ${expectedType} or provide migration path`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate request schema compatibility
   */
  private async validateRequestSchema(endpoint: APIEndpoint): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    if (!endpoint.requestSchema) {
      return issues;
    }

    // Check that required request fields are still accepted
    const requiredFields = this.getRequiredFields(endpoint.requestSchema);
    for (const field of requiredFields) {
      if (!this.fieldExists(endpoint.requestSchema, field)) {
        issues.push({
          severity: 'high',
          type: 'schema_mismatch',
          description: `Required request field '${field}' is no longer accepted`,
          affectedField: field,
          suggestedFix: `Continue accepting field '${field}' or provide deprecation notice`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate endpoint behavior compatibility
   */
  private async validateBehavior(endpoint: APIEndpoint): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    const key = `${endpoint.method} ${endpoint.path}`;
    const originalBehavior = this.originalBehaviors.get(key);
    const optimizedBehavior = this.optimizedBehaviors.get(key);

    if (originalBehavior && optimizedBehavior) {
      // Check response time
      if (optimizedBehavior.responseTime > originalBehavior.responseTime * 1.5) {
        issues.push({
          severity: 'medium',
          type: 'performance_regression',
          description: `Response time increased from ${originalBehavior.responseTime}ms to ${optimizedBehavior.responseTime}ms`,
          suggestedFix: 'Investigate performance regression and optimize query',
        });
      }

      // Check error handling
      if (optimizedBehavior.errorHandling !== originalBehavior.errorHandling) {
        issues.push({
          severity: 'high',
          type: 'behavior_change',
          description: 'Error handling behavior has changed',
          suggestedFix: 'Ensure error responses match original format and status codes',
        });
      }
    }

    return issues;
  }

  /**
   * Record original endpoint behavior for comparison
   */
  recordOriginalBehavior(
    endpoint: APIEndpoint,
    behavior: {
      responseTime: number;
      errorHandling: string;
      responseFormat: string;
    }
  ): void {
    const key = `${endpoint.method} ${endpoint.path}`;
    this.originalBehaviors.set(key, behavior);
  }

  /**
   * Record optimized endpoint behavior for comparison
   */
  recordOptimizedBehavior(
    endpoint: APIEndpoint,
    behavior: {
      responseTime: number;
      errorHandling: string;
      responseFormat: string;
    }
  ): void {
    const key = `${endpoint.method} ${endpoint.path}`;
    this.optimizedBehaviors.set(key, behavior);
  }

  /**
   * Get compatibility report for all endpoints
   */
  async getCompatibilityReport(): Promise<{
    totalEndpoints: number;
    compatibleEndpoints: number;
    incompatibleEndpoints: number;
    criticalIssues: number;
    results: APICompatibilityResult[];
  }> {
    const results = await this.validateAllEndpoints();

    const compatibleEndpoints = results.filter((r) => r.isCompatible).length;
    const incompatibleEndpoints = results.filter((r) => !r.isCompatible).length;
    const criticalIssues = results.reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === 'critical').length,
      0
    );

    return {
      totalEndpoints: results.length,
      compatibleEndpoints,
      incompatibleEndpoints,
      criticalIssues,
      results,
    };
  }

  // Private helper methods

  private getRequiredFields(schema: Record<string, any>): string[] {
    if (!schema || !schema.required) {
      return [];
    }
    return schema.required;
  }

  private fieldExists(schema: Record<string, any>, field: string): boolean {
    if (!schema || !schema.properties) {
      return false;
    }
    return field in schema.properties;
  }

  private getFieldTypes(schema: Record<string, any>): Map<string, string> {
    const types = new Map<string, string>();
    if (!schema || !schema.properties) {
      return types;
    }

    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      const type = (fieldSchema as any).type || 'unknown';
      types.set(field, type);
    }

    return types;
  }

  private getFieldType(schema: Record<string, any>, field: string): string | null {
    if (!schema || !schema.properties || !schema.properties[field]) {
      return null;
    }
    return (schema.properties[field] as any).type || 'unknown';
  }
}

export default APICompatibilityValidator;
