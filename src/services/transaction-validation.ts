import { supabase } from '../utils/supabase'

export interface AccountInfo {
  id: string
  code: string
  name: string
  category: string
  normal_balance: 'debit' | 'credit'
  is_postable: boolean
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
        const { data, error } = await supabase
          .from('accounts')
          .select('id, code, name, category, normal_balance, is_postable, is_active')
          .eq('is_active', true)

        if (error) throw error

        this.accounts = data || []
        this.lastAccountsRefresh = now
      } catch (error) {
        console.error('Failed to refresh accounts:', error)
        // Don't throw - use cached data if available
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
    const desc = description.toLowerCase()

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
}

// Export singleton instance
export const transactionValidator = new TransactionValidationService()
