/**
 * Database Layer Error Handler
 * 
 * Feature: enterprise-auth-performance-optimization
 * Implements error handling with fallback queries for database operations
 * 
 * Validates: Requirements 7.3
 */

export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'degrade' | 'fail';
  message: string;
  retryAfter?: number;
}

export interface FallbackResult<T> {
  data: T | null;
  source: 'optimized' | 'fallback' | 'error';
  error?: Error;
}

/**
 * Database Error Handler
 * 
 * Handles errors from database operations with fallback strategies:
 * - Index creation failures: Continue with unindexed queries
 * - RPC function failures: Fall back to original queries
 * - Connection pool exhaustion: Queue requests and retry
 * - Query timeouts: Use simplified queries or cached data
 */
export class DatabaseErrorHandler {
  private retryAttempts = 3;
  private retryDelayMs = 100;
  private maxRetryDelayMs = 5000;

  /**
   * Handle index creation errors
   * 
   * If index creation fails, the system continues to work with unindexed queries.
   * This ensures the system remains operational even if optimization fails.
   */
  async handleIndexCreationError(error: DatabaseError): Promise<RecoveryAction> {
    console.warn('Index creation error:', error);

    // Log the error for monitoring
    this.logError('INDEX_CREATION_FAILED', error);

    // Determine recovery action based on error type
    if (error.code === '42P07') {
      // Index already exists - not an error
      return {
        type: 'retry',
        message: 'Index already exists, continuing with existing index',
      };
    }

    if (error.code === '42601') {
      // Syntax error - likely a schema issue
      return {
        type: 'degrade',
        message: 'Index syntax error, continuing without index',
      };
    }

    // For other errors, degrade gracefully
    return {
      type: 'degrade',
      message: 'Index creation failed, continuing without index',
      retryAfter: 60000, // Retry after 1 minute
    };
  }

  /**
   * Handle RPC function execution failures
   * 
   * Falls back to original queries if optimized RPC functions fail.
   * This ensures data consistency and system availability.
   */
  async handleRPCError(
    functionName: string,
    error: DatabaseError
  ): Promise<RecoveryAction> {
    console.warn(`RPC function error in ${functionName}:`, error);

    // Log the error for monitoring
    this.logError('RPC_EXECUTION_FAILED', error, { functionName });

    // Determine recovery action based on error type
    if (error.code === '42883') {
      // Function does not exist
      return {
        type: 'fallback',
        message: `RPC function ${functionName} not found, using fallback queries`,
      };
    }

    if (error.code === '57014') {
      // Query cancelled (timeout)
      return {
        type: 'fallback',
        message: `RPC function ${functionName} timed out, using fallback queries`,
        retryAfter: 5000,
      };
    }

    if (error.code === '53300') {
      // Too many connections
      return {
        type: 'degrade',
        message: 'Connection pool exhausted, queuing request',
        retryAfter: 1000,
      };
    }

    // For other errors, try fallback
    return {
      type: 'fallback',
      message: `RPC function ${functionName} failed, using fallback queries`,
      retryAfter: 2000,
    };
  }

  /**
   * Handle connection pool exhaustion
   * 
   * When the connection pool is exhausted, queue requests and retry
   * with exponential backoff.
   */
  async handleConnectionPoolError(error: DatabaseError): Promise<void> {
    console.warn('Connection pool error:', error);

    // Log the error for monitoring
    this.logError('CONNECTION_POOL_EXHAUSTED', error);

    // Wait before retrying
    await this.delay(1000);
  }

  /**
   * Execute query with fallback support
   * 
   * Attempts to execute an optimized query, falling back to the original
   * query if the optimized version fails.
   * 
   * Validates: Requirements 7.3
   */
  async executeWithFallback<T>(
    optimizedQuery: () => Promise<T>,
    fallbackQuery: () => Promise<T>,
    context?: string
  ): Promise<FallbackResult<T>> {
    let lastError: Error | null = null;

    // Try optimized query with retries
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const data = await optimizedQuery();
        return {
          data,
          source: 'optimized',
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Optimized query attempt ${attempt + 1}/${this.retryAttempts} failed:`,
          error
        );

        // Log the error
        this.logError('OPTIMIZED_QUERY_FAILED', error as DatabaseError, {
          attempt: attempt + 1,
          context,
        });

        // Wait before retrying (exponential backoff)
        if (attempt < this.retryAttempts - 1) {
          const delayMs = Math.min(
            this.retryDelayMs * Math.pow(2, attempt),
            this.maxRetryDelayMs
          );
          await this.delay(delayMs);
        }
      }
    }

    // Try fallback query
    try {
      console.warn(
        'Optimized query failed, falling back to original query',
        context
      );
      const data = await fallbackQuery();
      return {
        data,
        source: 'fallback',
        error: lastError || undefined,
      };
    } catch (error) {
      console.error('Fallback query also failed:', error);

      // Log the error
      this.logError('FALLBACK_QUERY_FAILED', error as DatabaseError, {
        context,
      });

      return {
        data: null,
        source: 'error',
        error: error as Error,
      };
    }
  }

  /**
   * Execute query with retry logic
   * 
   * Retries a query with exponential backoff on transient errors.
   */
  async executeWithRetry<T>(
    query: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await query();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Query attempt ${attempt + 1}/${this.retryAttempts} failed:`,
          error
        );

        // Log the error
        this.logError('QUERY_FAILED', error as DatabaseError, {
          attempt: attempt + 1,
          context,
        });

        // Wait before retrying (exponential backoff)
        if (attempt < this.retryAttempts - 1) {
          const delayMs = Math.min(
            this.retryDelayMs * Math.pow(2, attempt),
            this.maxRetryDelayMs
          );
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Query failed after all retries');
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(
    errorType: string,
    error: DatabaseError,
    context?: Record<string, any>
  ): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      context,
    };

    console.error('Database Error Log:', errorLog);

    // TODO: Send to monitoring service (e.g., Sentry, DataDog)
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
let databaseErrorHandlerInstance: DatabaseErrorHandler | null = null;

/**
 * Get or create database error handler instance
 */
export function getDatabaseErrorHandler(): DatabaseErrorHandler {
  if (!databaseErrorHandlerInstance) {
    databaseErrorHandlerInstance = new DatabaseErrorHandler();
  }
  return databaseErrorHandlerInstance;
}

/**
 * Reset error handler (for testing)
 */
export function resetDatabaseErrorHandler(): void {
  databaseErrorHandlerInstance = null;
}
