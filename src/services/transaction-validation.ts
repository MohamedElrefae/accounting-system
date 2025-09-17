import { supabase } from '../utils/supabase'

export interface AccountInfo {
  id: string
  code: string
  name: string
  category: string
  normal_balance: 'debit' | 'credit'
  is_postable: boolean
  allow_transactions: boolean
  is_active: boolean
}

export interface ValidationWarning {
  type: 'warning' | 'error'
  field: string
  message: string
  details?: string
}

export interface TransactionValidationResult {
  isValid: boolean
  warnings: ValidationWarning[]
  errors: ValidationWarning[]
}

export interface TransactionData {
  debit_account_id: string
  credit_account_id: string
  amount: number
  description: string
  entry_date: string
}

/**
 * Validates a transaction for backwards entries and accounting logic
 */
export class TransactionValidationService {
  private accounts: AccountInfo[] = []
  private lastAccountsRefresh = 0
  private readonly ACCOUNTS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Refresh accounts data if needed
   */
  private async refreshAccountsIfNeeded(): Promise<void> {
    const now = Date.now()
    if (now - this.lastAccountsRefresh > this.ACCOUNTS_CACHE_TTL) {
      try {
        // First try with all expected columns including is_active
        let data: AccountInfo[] | null = null;
        const { data: initialData, error } = await supabase
          .from('accounts')
          .select('id, code, name, category, normal_balance, is_postable, allow_transactions, is_active')
          .eq('is_active', true)

        // If there's an error mentioning is_active, try without it (graceful degradation)
        if (error && error.message?.includes('is_active')) {
          console.warn('is_active column not found, falling back to other columns:', error)
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('accounts')
            .select('id, code, name, category, normal_balance, is_postable, allow_transactions')
            .eq('allow_transactions', true) // Use allow_transactions as fallback filter
          
          if (fallbackError) {
            throw new Error(`Failed to fetch accounts: ${fallbackError.message}`)
          }
          
          // Map fallback data to expected interface with is_active defaulted to true
          data = fallbackData?.map(account => ({
            ...account,
            is_active: true // default to active if column doesn't exist
          })) || []
        }
        
        // If still error, try with minimal columns
        if (error && !error.message?.includes('is_active')) {
          console.warn('Failed to fetch accounts with standard columns, trying minimal set:', error)
          const { data: minimalData, error: minimalError } = await supabase
            .from('accounts')
            .select('id, code, name')
          
          if (minimalError) {
            throw new Error(`Failed to fetch accounts: ${minimalError.message}`)
          }
          
          // Map minimal data to expected interface with defaults
          data = minimalData?.map(account => ({
            ...account,
            category: 'asset', // default category
            normal_balance: 'debit' as const, // default balance
            is_postable: true,
            allow_transactions: true,
            is_active: true
          })) || []
        }

        if (!error) {
          data = initialData;
        }
        this.accounts = data || []
        this.lastAccountsRefresh = now
        console.log(`Successfully refreshed ${this.accounts.length} accounts`)
      } catch (error) {
        console.error('Failed to refresh accounts:', error)
        // Don't throw - use cached data if available
        if (this.accounts.length === 0) {
          console.warn('No cached accounts available and refresh failed. Some validations may not work.')
        }
      }
    }
  }

  /**
   * Get account info by ID
   */
  private getAccount(accountId: string): AccountInfo | undefined {
    return this.accounts.find(acc => acc.id === accountId)
  }

  /**
   * Check if transaction appears to be backwards based on account categories and normal balances
   */
  private detectBackwardsEntry(debitAccount: AccountInfo, creditAccount: AccountInfo, description: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = []
    const _desc = description.toLowerCase()

    // Common backwards patterns
    const backwardsPatterns = [
      {
        condition: (debit: AccountInfo, credit: AccountInfo, desc: string) => {
          // Cash received but credited to cash (should be debited)
          return (
            debit.category.toLowerCase() === 'revenue' &&
            credit.category.toLowerCase() === 'asset' &&
            credit.name.toLowerCase().includes('نقد')
          ) && (desc.includes('استلام') || desc.includes('تحصيل'))
        },
        warning: 'قد يكون هناك خطأ: عادة يتم خصم النقد عند الاستلام، وليس دائناً'
      },
      {
        condition: (debit: AccountInfo, credit: AccountInfo, desc: string) => {
          // Payment made but debited to cash (should be credited)
          return (
            debit.category.toLowerCase() === 'asset' &&
            debit.name.toLowerCase().includes('نقد') &&
            credit.category.toLowerCase() === 'expense'
          ) && (desc.includes('دفع') || desc.includes('سداد'))
        },
        warning: 'قد يكون هناك خطأ: عادة يتم دفع النقد (دائن) عند السداد'
      },
      {
        condition: (debit: AccountInfo, credit: AccountInfo) => {
          // Revenue account debited (usually should be credited)
          return debit.category.toLowerCase() === 'revenue' &&
                 debit.normal_balance === 'credit'
        },
        warning: 'تحذير: حساب الإيرادات عادة ما يكون دائناً وليس مديناً'
      },
      {
        condition: (debit: AccountInfo, credit: AccountInfo) => {
          // Expense account credited (usually should be debited)
          return credit.category.toLowerCase() === 'expense' &&
                 credit.normal_balance === 'debit'
        },
        warning: 'تحذير: حساب المصروفات عادة ما يكون مديناً وليس دائناً'
      },
      {
        condition: (debit: AccountInfo, credit: AccountInfo) => {
          // Asset decrease not properly recorded
          return debit.category.toLowerCase() === 'liability' &&
                 credit.category.toLowerCase() === 'asset' &&
                 credit.normal_balance === 'debit'
        },
        warning: 'تأكد من صحة الإدخال: تقليل الأصول يتطلب إدخال دائن للأصل'
      },
      {
        condition: (debit: AccountInfo, credit: AccountInfo) => {
          // Liability increase not properly recorded  
          return credit.category.toLowerCase() === 'asset' &&
                 debit.category.toLowerCase() === 'liability' &&
                 debit.normal_balance === 'credit'
        },
        warning: 'تأكد من صحة الإدخال: زيادة الالتزامات تتطلب إدخال دائن للالتزام'
      }
    ]

    // Check each pattern
    for (const pattern of backwardsPatterns) {
      if (pattern.condition(debitAccount, creditAccount, description)) {
        warnings.push({
          type: 'warning',
          field: 'debit_account_id',
          message: pattern.warning,
          details: `الحساب المدين: ${debitAccount.name} | الحساب الدائن: ${creditAccount.name}`
        })
      }
    }

    return warnings
  }

  /**
   * Check for suspicious account combinations
   */
  private detectSuspiciousPatterns(debitAccount: AccountInfo, creditAccount: AccountInfo, amount: number): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    // Same category transactions (might be suspicious)
    if (debitAccount.category === creditAccount.category) {
      warnings.push({
        type: 'warning',
        field: 'credit_account_id',
        message: `تحذير: كلا الحسابين من نفس الفئة (${debitAccount.category})`,
        details: 'تأكد من صحة المعاملة - قد تحتاج إلى مراجعة'
      })
    }

    // Both accounts have same normal balance (unusual)
    if (debitAccount.normal_balance === creditAccount.normal_balance) {
      const balanceType = debitAccount.normal_balance === 'debit' ? 'مدين' : 'دائن'
      warnings.push({
        type: 'warning',
        field: 'amount',
        message: `تحذير: كلا الحسابين لهما نفس الرصيد الطبيعي (${balanceType})`,
        details: 'هذا قد يؤثر على الأرصدة بطريقة غير متوقعة'
      })
    }

    // Large amounts (configurable threshold)
    const largeAmountThreshold = 100000 // 100K SAR
    if (amount > largeAmountThreshold) {
      warnings.push({
        type: 'warning',
        field: 'amount',
        message: 'تحذير: مبلغ كبير - يرجى المراجعة',
        details: `المبلغ: ${amount.toLocaleString('ar-SA')} ريال`
      })
    }

    return warnings
  }

  /**
   * Validate basic account rules
   */
  private validateBasicRules(debitAccount: AccountInfo, creditAccount: AccountInfo, amount: number): ValidationWarning[] {
    const errors: ValidationWarning[] = []

    // Check if accounts exist and are active
    if (!debitAccount) {
      errors.push({
        type: 'error',
        field: 'debit_account_id',
        message: 'الحساب المدين غير موجود أو غير نشط'
      })
    }

    if (!creditAccount) {
      errors.push({
        type: 'error',
        field: 'credit_account_id', 
        message: 'الحساب الدائن غير موجود أو غير نشط'
      })
    }

    // Check if accounts are postable
    if (debitAccount && !debitAccount.is_postable) {
      errors.push({
        type: 'error',
        field: 'debit_account_id',
        message: 'الحساب المدين غير قابل للترحيل - اختر حساباً تفصيلياً'
      })
    }

    if (creditAccount && !creditAccount.is_postable) {
      errors.push({
        type: 'error',
        field: 'credit_account_id',
        message: 'الحساب الدائن غير قابل للترحيل - اختر حساباً تفصيلياً'
      })
    }

    // Check if accounts allow transactions
    if (debitAccount && !debitAccount.allow_transactions) {
      errors.push({
        type: 'error',
        field: 'debit_account_id',
        message: 'الحساب المدين لا يسمح بالمعاملات'
      })
    }

    if (creditAccount && !creditAccount.allow_transactions) {
      errors.push({
        type: 'error',
        field: 'credit_account_id',
        message: 'الحساب الدائن لا يسمح بالمعاملات'
      })
    }

    // Check if accounts are active
    if (debitAccount && !debitAccount.is_active) {
      errors.push({
        type: 'error',
        field: 'debit_account_id',
        message: 'الحساب المدين غير نشط'
      })
    }

    if (creditAccount && !creditAccount.is_active) {
      errors.push({
        type: 'error',
        field: 'credit_account_id',
        message: 'الحساب الدائن غير نشط'
      })
    }

    // Validate amount
    if (amount <= 0) {
      errors.push({
        type: 'error',
        field: 'amount',
        message: 'المبلغ يجب أن يكون أكبر من الصفر'
      })
    }

    return errors
  }

  /**
   * Main validation function
   */
  async validateTransaction(transactionData: TransactionData): Promise<TransactionValidationResult> {
    await this.refreshAccountsIfNeeded()

    const {
      debit_account_id,
      credit_account_id,
      amount,
      description
    } = transactionData

    // Get account information
    const debitAccount = this.getAccount(debit_account_id)
    const creditAccount = this.getAccount(credit_account_id)

    const warnings: ValidationWarning[] = []
    const errors: ValidationWarning[] = []

    // Basic validation
    if (debitAccount && creditAccount && amount > 0) {
      errors.push(...this.validateBasicRules(debitAccount, creditAccount, amount))
      
      // Advanced validation only if basic rules pass
      if (errors.length === 0) {
        warnings.push(...this.detectBackwardsEntry(debitAccount, creditAccount, description))
        warnings.push(...this.detectSuspiciousPatterns(debitAccount, creditAccount, amount))
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }

  /**
   * Get account balance information
   */
  async getAccountBalanceInfo(accountId: string): Promise<{
    account: AccountInfo | null
    currentBalance: number
    isContraSide: boolean
  }> {
    await this.refreshAccountsIfNeeded()
    
    const account = this.getAccount(accountId)
    if (!account) {
      return {
        account: null,
        currentBalance: 0,
        isContraSide: false
      }
    }

    try {
      // Get current account balance using the database function
      const { data, error } = await supabase.rpc('get_account_balance_details', {
        p_account_id: accountId
      })

      if (error) throw error

      const balanceData = data || { current_balance: 0, is_contra_side: false }
      
      return {
        account,
        currentBalance: balanceData.current_balance || 0,
        isContraSide: balanceData.is_contra_side || false
      }
    } catch (error) {
      console.error('Failed to get account balance:', error)
      return {
        account,
        currentBalance: 0,
        isContraSide: false
      }
    }
  }

  /**
   * Clear accounts cache (useful after account changes)
   */
  clearCache(): void {
    this.accounts = []
    this.lastAccountsRefresh = 0
  }

  /**
   * Safe wrapper for customValidator that ensures proper return format
   */
  createCustomValidator() {
    return async (data: Record<string, unknown>) => {
      try {
        const transactionData = {
          debit_account_id: data.debit_account_id as string,
          credit_account_id: data.credit_account_id as string,
          amount: typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount || 0),
          description: data.description as string || '',
          entry_date: data.entry_date as string || new Date().toISOString().split('T')[0]
        }

        // Only run validation if we have the required fields
        if (!transactionData.debit_account_id || !transactionData.credit_account_id || transactionData.amount <= 0) {
          return {
            isValid: true,
            errors: [],
            warnings: []
          }
        }

        const result = await this.validateTransaction(transactionData)
        
        // Convert validation warnings to form validation format
        const errors = result.errors.map(err => ({
          field: err.field,
          message: err.message
        }))
        
        const warnings = result.warnings.map(warn => ({
          field: warn.field,
          message: `⚠️ ${warn.message}${warn.details ? ' - ' + warn.details : ''}`
        }))
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings
        }
      } catch (error) {
        console.error('Transaction validation error:', error)
        // Return safe fallback - don't block form submission due to validation service errors
        return {
          isValid: true,
          errors: [],
          warnings: [{
            field: 'description',
            message: '⚠️ نظام التحقق من المعاملات غير متوفر حالياً'
          }]
        }
      }
    }
  }
}

// Export singleton instance
export const transactionValidator = new TransactionValidationService()
