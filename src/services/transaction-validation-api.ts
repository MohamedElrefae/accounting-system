import { supabase } from '../utils/supabase'

export interface TransactionValidationRequest {
  debit_account_id: string
  credit_account_id: string
  amount: number
  description: string
  entry_date: string
  transaction_id?: string // For updates
}

export interface ValidationResult {
  is_valid: boolean
  errors: Array<{
    field: string
    message: string
    code?: string
  }>
  warnings: Array<{
    field: string
    message: string
    details?: string
    code?: string
  }>
}

export interface ValidationLogEntry {
  id: string
  transaction_id: string | null
  validation_type: 'pre_save' | 'pre_post' | 'manual'
  validation_result: 'passed' | 'failed' | 'warning'
  error_message: string | null
  warning_messages: string[] | null
  field_errors: Record<string, string> | null
  validated_at: string
  validated_by: string | null
}

/**
 * Transaction validation API service that works with Supabase backend
 */
export class TransactionValidationAPI {

  /**
   * Validate a transaction before saving
   */
  async validateTransactionBeforeSave(request: TransactionValidationRequest): Promise<ValidationResult> {
    try {
      // Use client-side validation service instead of missing database functions
      const { transactionValidator } = await import('./transaction-validation')
      
      const clientResult = await transactionValidator.validateTransaction({
        debit_account_id: request.debit_account_id,
        credit_account_id: request.credit_account_id,
        amount: request.amount,
        description: request.description,
        entry_date: request.entry_date
      })

      // Convert client validation result to API format
      return {
        is_valid: clientResult.isValid,
        errors: clientResult.errors.map(err => ({
          field: err.field,
          message: err.message,
          code: err.type === 'error' ? 'validation_error' : undefined
        })),
        warnings: clientResult.warnings.map(warn => ({
          field: warn.field,
          message: warn.message,
          details: warn.details,
          code: warn.type === 'warning' ? 'validation_warning' : undefined
        }))
      }
    } catch (error) {
      console.error('Transaction validation API error:', error)
      return {
        is_valid: true,
        errors: [],
        warnings: [{
          field: 'general',
          message: 'تحذير: لم يتم التحقق من صحة المعاملة',
          details: 'خطأ في خدمة التحقق'
        }]
      }
    }
  }

  /**
   * Validate a transaction for posting
   */
  async validateTransactionForPosting(transactionId: string): Promise<ValidationResult> {
    try {
      // Get transaction data first
      const { data: transactionData, error: fetchError } = await supabase
        .from('transactions')
        .select('debit_account_id, credit_account_id, amount, description, entry_date')
        .eq('id', transactionId)
        .single()

      if (fetchError) {
        return {
          is_valid: false,
          errors: [{
            field: 'general',
            message: 'فشل في جلب بيانات المعاملة',
            code: fetchError.code
          }],
          warnings: []
        }
      }

      // Use client-side validation
      const { transactionValidator } = await import('./transaction-validation')
      
      const clientResult = await transactionValidator.validateTransaction({
        debit_account_id: transactionData.debit_account_id,
        credit_account_id: transactionData.credit_account_id,
        amount: transactionData.amount,
        description: transactionData.description,
        entry_date: transactionData.entry_date
      })

      // Convert client validation result to API format
      return {
        is_valid: clientResult.isValid,
        errors: clientResult.errors.map(err => ({
          field: err.field,
          message: err.message,
          code: err.type === 'error' ? 'posting_error' : undefined
        })),
        warnings: clientResult.warnings.map(warn => ({
          field: warn.field,
          message: warn.message,
          details: warn.details,
          code: warn.type === 'warning' ? 'posting_warning' : undefined
        }))
      }
    } catch (error) {
      console.error('Posting validation error:', error)
      return {
        is_valid: false,
        errors: [{
          field: 'general',
          message: 'خطأ في التحقق من صحة المعاملة للترحيل'
        }],
        warnings: []
      }
    }
  }

  /**
   * Log validation results
   */
  async logValidationResult(
    transactionId: string | null,
    validationType: 'pre_save' | 'pre_post' | 'manual',
    result: ValidationResult
  ): Promise<void> {
    try {
      const validationResult = result.is_valid ? 
        (result.warnings.length > 0 ? 'warning' : 'passed') : 
        'failed'

      // Try to insert directly into validation logs table if it exists
      const { error } = await supabase
        .from('transaction_validation_logs')
        .insert({
          transaction_id: transactionId,
          validation_type: validationType,
          validation_result: validationResult,
          error_message: result.errors.length > 0 ? result.errors[0].message : null,
          warning_messages: result.warnings.map(w => w.message),
          field_errors: result.errors.reduce((acc, err) => {
            acc[err.field] = err.message
            return acc
          }, {} as Record<string, string>),
          validated_at: new Date().toISOString(),
          validated_by: null // Will be set by RLS if available
        })
        
      if (error) {
        console.warn('Validation logging not available:', error.message)
        // This is non-critical, don't throw
      }
    } catch (error) {
      console.error('Failed to log validation result:', error)
      // Don't fail the main operation due to logging errors
    }
  }

  /**
   * Get validation history for a transaction
   */
  async getValidationHistory(transactionId: string): Promise<ValidationLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_validation_logs')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('validated_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get validation history:', error)
      return []
    }
  }

  /**
   * Get validation report for all transactions
   */
  async getValidationReport(filters: {
    dateFrom?: string
    dateTo?: string
    validationResult?: 'passed' | 'failed' | 'warning'
    limit?: number
  } = {}): Promise<{
    summary: {
      total_validations: number
      passed: number
      failed: number
      warnings: number
    }
    entries: ValidationLogEntry[]
  }> {
    try {
      // Try to query from validation logs table directly
      let query = supabase
        .from('transaction_validation_logs')
        .select('*')

      if (filters.dateFrom) {
        query = query.gte('validated_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('validated_at', filters.dateTo)
      }
      if (filters.validationResult) {
        query = query.eq('validation_result', filters.validationResult)
      }

      query = query
        .order('validated_at', { ascending: false })
        .limit(filters.limit || 100)

      const { data, error } = await query

      if (error) {
        console.warn('Validation logs table not available:', error.message)
        // Return empty report if table doesn't exist
        return {
          summary: {
            total_validations: 0,
            passed: 0,
            failed: 0,
            warnings: 0
          },
          entries: []
        }
      }

      const entries = data || []

      // Calculate summary
      const summary = entries.reduce((acc, entry) => {
        acc.total_validations++
        switch (entry.validation_result) {
          case 'passed': acc.passed++; break
          case 'failed': acc.failed++; break
          case 'warning': acc.warnings++; break
        }
        return acc
      }, {
        total_validations: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      })

      return { summary, entries }
    } catch (error) {
      console.error('Failed to get validation report:', error)
      return {
        summary: {
          total_validations: 0,
          passed: 0,
          failed: 0,
          warnings: 0
        },
        entries: []
      }
    }
  }


  /**
   * Test transaction validation (for debugging)
   */
  async testValidation(request: TransactionValidationRequest): Promise<{
    client_validation: ValidationResult
    server_validation: ValidationResult
    comparison: {
      errors_match: boolean
      warnings_match: boolean
      differences: string[]
    }
  }> {
    try {
      // Get client-side validation
      const { transactionValidator } = await import('./transaction-validation')
      const clientResult = await transactionValidator.validateTransaction({
        debit_account_id: request.debit_account_id,
        credit_account_id: request.credit_account_id,
        amount: request.amount,
        description: request.description,
        entry_date: request.entry_date
      })

      // Get server-side validation
      const serverResult = await this.validateTransactionBeforeSave(request)

      // Compare results
      const differences: string[] = []
      const errorsMatch = clientResult.errors.length === serverResult.errors.length
      const warningsMatch = clientResult.warnings.length === serverResult.warnings.length

      if (!errorsMatch) {
        differences.push(`Error count mismatch: client(${clientResult.errors.length}) vs server(${serverResult.errors.length})`)
      }
      if (!warningsMatch) {
        differences.push(`Warning count mismatch: client(${clientResult.warnings.length}) vs server(${serverResult.warnings.length})`)
      }

      return {
        client_validation: {
          is_valid: clientResult.isValid,
          errors: clientResult.errors.map(e => ({ field: e.field, message: e.message })),
          warnings: clientResult.warnings.map(w => ({ field: w.field, message: w.message, details: w.details }))
        },
        server_validation: serverResult,
        comparison: {
          errors_match: errorsMatch,
          warnings_match: warningsMatch,
          differences
        }
      }
    } catch (error) {
      console.error('Test validation failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const transactionValidationAPI = new TransactionValidationAPI()
