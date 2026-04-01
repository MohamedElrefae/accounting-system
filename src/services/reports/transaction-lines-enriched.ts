// src/services/reports/transaction-lines-enriched.ts
// Service for enriched transaction lines report with cost analysis validation

import { supabase } from '../../utils/supabase'

export interface EnrichedTransactionLine {
  id: string
  transaction_id: string
  entry_number: string
  entry_date: string
  line_no: number
  account_id: string
  account_code: string
  account_name: string
  account_name_ar: string
  debit_amount: number
  credit_amount: number
  description: string
  // Dimensions
  project_id?: string
  project_code?: string
  project_name?: string
  cost_center_id?: string
  cost_center_code?: string
  cost_center_name?: string
  work_item_id?: string
  work_item_code?: string
  work_item_name?: string
  analysis_work_item_id?: string
  analysis_work_item_code?: string
  analysis_work_item_name?: string
  classification_id?: string
  classification_code?: string
  classification_name?: string
  sub_tree_id?: string
  sub_tree_code?: string
  sub_tree_name?: string
  org_id: string
  org_code: string
  org_name: string
  // Cost analysis info
  has_cost_analysis_items: boolean
  cost_analysis_items_count: number
  cost_analysis_total_amount: number
  // Validation status
  dimensions_match: boolean
  validation_errors: string[]
  // Transaction metadata
  approval_status: string
  is_posted: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CostAnalysisValidationResult {
  is_compliant: boolean
  validation_errors: string[]
  opposite_account?: {
    account_id: string
    account_code: string
    account_name: string
    debit_amount: number
    credit_amount: number
  }
}

export interface TransactionLinesReportFilters {
  search?: string
  date_from?: string
  date_to?: string
  org_id?: string
  project_id?: string
  account_id?: string
  has_cost_analysis?: boolean
  is_cost_analysis_compliant?: boolean
  approval_status?: string
  page?: number
  page_size?: number
}

/**
 * Get enriched transaction lines with cost analysis validation
 */
export async function getEnrichedTransactionLines(
  filters: TransactionLinesReportFilters = {}
): Promise<{ data: EnrichedTransactionLine[]; total: number }> {
  const {
    search,
    date_from,
    date_to,
    org_id,
    project_id,
    account_id,
    has_cost_analysis,
    is_cost_analysis_compliant,
    approval_status,
    page,
    page_size,
  } = filters

  try {
    // Group by transaction and validate cost analysis compliance
    const transactionGroups = enrichedData.reduce((groups, line) => {
      if (!groups[line.transaction_id]) {
        groups[line.transaction_id] = []
      }
      groups[line.transaction_id].push(line)
      return groups
    }, {} as Record<string, EnrichedTransactionLine[]>)

    // Validate each transaction's cost analysis compliance
    for (const transactionId in transactionGroups) {
      const lines = transactionGroups[transactionId]
      const validation = validateCostAnalysisCompliance(lines)
      
      // Update each line with validation results
      lines.forEach(line => {
        line.is_cost_analysis_compliant = validation.is_compliant
        line.cost_analysis_validation_errors = validation.validation_errors
      })
    }

    // Apply post-filters for cost analysis specific filters
    let filteredData = enrichedData
    if (has_cost_analysis !== undefined) {
      filteredData = filteredData.filter(line => line.has_cost_analysis_items === has_cost_analysis)
    }
    if (is_cost_analysis_compliant !== undefined) {
      filteredData = filteredData.filter(line => line.is_cost_analysis_compliant === is_cost_analysis_compliant)
    }

    return {
      data: filteredData,
      total: count || 0
    }

  } catch (error) {
    console.error('Error fetching enriched transaction lines:', error)
    throw error
  }
}

/**
 * Get cost analysis data for multiple transaction lines
 */
async function getCostAnalysisForLines(lineIds: string[]): Promise<Record<string, { count: number; total_amount: number }>> {
  if (lineIds.length === 0) return {}

  try {
    const { data, error } = await supabase
      .from('transaction_line_items')
      .select('transaction_line_id, quantity, unit_price, percentage')
      .in('transaction_line_id', lineIds)

    if (error) throw error

    const result: Record<string, { count: number; total_amount: number }> = {}

    data?.forEach(item => {
      const lineId = item.transaction_line_id
      if (!result[lineId]) {
        result[lineId] = { count: 0, total_amount: 0 }
      }
      
      // Calculate line item total: quantity * (percentage/100) * unit_price
      const itemTotal = (item.quantity || 0) * ((item.percentage || 100) / 100) * (item.unit_price || 0)
      
      result[lineId].count += 1
      result[lineId].total_amount += itemTotal
    })

    return result

  } catch (error) {
    console.error('Error fetching cost analysis data:', error)
    return {}
  }
}

/**
 * Validate cost analysis compliance for a transaction's lines
 */
function validateCostAnalysisCompliance(lines: EnrichedTransactionLine[]): CostAnalysisValidationResult {
  const linesWithCostAnalysis = lines.filter(line => line.has_cost_analysis_items)
  
  // If no lines have cost analysis, it's compliant
  if (linesWithCostAnalysis.length === 0) {
    return { is_compliant: true, validation_errors: [] }
  }

  const validationErrors: string[] = []

  // Rule 1: Must have exactly 2 lines
  if (lines.length !== 2) {
    validationErrors.push('Transaction must have exactly 2 lines when cost analysis is present')
  }

  // Rule 2: Must have 1 debit and 1 credit line
  const debitLines = lines.filter(line => line.debit_amount > 0)
  const creditLines = lines.filter(line => line.credit_amount > 0)
  
  if (debitLines.length !== 1 || creditLines.length !== 1) {
    validationErrors.push('Transaction must have exactly 1 debit line and 1 credit line')
  }

  // Rule 3: Validate dimension consistency
  if (lines.length === 2) {
    const line1 = lines[0]
    const line2 = lines[1]

    const checkDimensionConsistency = (dimName: string, val1: string | undefined, val2: string | undefined) => {
      if (val1 && val2 && val1 !== val2) {
        validationErrors.push(`${dimName} dimensions have different values between lines`)
      }
    }

    checkDimensionConsistency('Project', line1.project_id, line2.project_id)
    checkDimensionConsistency('Cost Center', line1.cost_center_id, line2.cost_center_id)
    checkDimensionConsistency('Work Item', line1.work_item_id, line2.work_item_id)
    checkDimensionConsistency('Analysis Work Item', line1.analysis_work_item_id, line2.analysis_work_item_id)
    checkDimensionConsistency('Classification', line1.classification_id, line2.classification_id)
    checkDimensionConsistency('Sub-tree', line1.sub_tree_id, line2.sub_tree_id)
  }

  // Find opposite account for reporting
  let oppositeAccount
  if (lines.length === 2 && debitLines.length === 1 && creditLines.length === 1) {
    const debitLine = debitLines[0]
    const creditLine = creditLines[0]
    
    // Return the opposite account for the first line with cost analysis
    const referenceLine = linesWithCostAnalysis[0]
    if (referenceLine.debit_amount > 0) {
      oppositeAccount = {
        account_id: creditLine.account_id,
        account_code: creditLine.account_code,
        account_name: creditLine.account_name,
        debit_amount: 0,
        credit_amount: creditLine.credit_amount
      }
    } else {
      oppositeAccount = {
        account_id: debitLine.account_id,
        account_code: debitLine.account_code,
        account_name: debitLine.account_name,
        debit_amount: debitLine.debit_amount,
        credit_amount: 0
      }
    }
  }

  return {
    is_compliant: validationErrors.length === 0,
    validation_errors: validationErrors,
    opposite_account: oppositeAccount
  }
}

/**
 * Get cost analysis compliance summary statistics
 */
export async function getCostAnalysisComplianceStats(
  org_id?: string
): Promise<{
  total_transactions: number
  transactions_with_cost_analysis: number
  compliant_transactions: number
  non_compliant_transactions: number
  compliance_rate: number
}> {
  try {
    // Get all transactions with cost analysis items
    let query = supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('is_wizard_draft', false)

    if (org_id) {
      query = query.eq('org_id', org_id)
    }

    const { data: allTransactions, error: allError } = await query
    if (allError) throw allError

    // Get transactions with cost analysis items
    const { data: transactionsWithCostAnalysis, error: costAnalysisError } = await supabase
      .from('transaction_line_items')
      .select('transaction_id')
      .in('transaction_id', allTransactions?.map(t => t.id) || [])

    if (costAnalysisError) throw costAnalysisError

    const transactionIdsWithCostAnalysis = new Set(
      transactionsWithCostAnalysis?.map(item => item.transaction_id) || []
    )

    // Get enriched lines for validation
    const { data: enrichedLines } = await getEnrichedTransactionLines({
      org_id,
      page_size: 10000 // Large page size to get all data
    })

    // Group by transaction and check compliance
    const transactionCompliance = new Map<string, boolean>()
    enrichedLines.forEach(line => {
      if (!transactionCompliance.has(line.transaction_id)) {
        transactionCompliance.set(line.transaction_id, line.is_cost_analysis_compliant)
      }
    })

    const compliantCount = Array.from(transactionCompliance.values()).filter(isCompliant => isCompliant).length
    const nonCompliantCount = transactionCompliance.size - compliantCount

    return {
      total_transactions: allTransactions?.length || 0,
      transactions_with_cost_analysis: transactionIdsWithCostAnalysis.size,
      compliant_transactions: compliantCount,
      non_compliant_transactions: nonCompliantCount,
      compliance_rate: transactionIdsWithCostAnalysis.size > 0 
        ? (compliantCount / transactionIdsWithCostAnalysis.size) * 100 
        : 0
    }

  } catch (error) {
    console.error('Error fetching cost analysis compliance stats:', error)
    throw error
  }
}
