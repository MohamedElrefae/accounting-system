import { supabase } from '@/utils/supabase'

export type TxLineInput = {
  line_no: number
  account_id: string
  debit_amount?: number
  credit_amount?: number
  description?: string | null
  org_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  classification_id?: string | null
  sub_tree_id?: string | null
}

export async function replaceTransactionLines(transactionId: string, lines: TxLineInput[]) {
  if (!transactionId) throw new Error('transactionId is required')
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('At least two lines are required')
  }

  // Basic client-side validation
  let totalDebits = 0
  let totalCredits = 0
  for (const l of lines) {
    const d = Number(l.debit_amount || 0)
    const c = Number(l.credit_amount || 0)
    if (d < 0 || c < 0) throw new Error('Amounts cannot be negative')
    if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
      throw new Error(`Line ${l.line_no}: must have either debit or credit (exclusively)`) 
    }
    totalDebits += d
    totalCredits += c
  }
  if (Math.abs(totalDebits - totalCredits) >= 0.01) {
    throw new Error(`Not balanced: debits ${totalDebits} vs credits ${totalCredits}`)
  }

  // Replace lines in a single transaction using RPC-less approach
  // 1) Delete existing lines
  {
    const { error } = await supabase
      .from('transaction_lines')
      .delete()
      .eq('transaction_id', transactionId)
    if (error) {
      let errorMsg = 'Failed to delete existing lines'
      try {
        errorMsg = error.code || error.hint || error.details || errorMsg
      } catch {}
      console.error('❌ Delete existing lines failed')
      throw new Error(errorMsg)
    }
  }

  // 2) Insert new lines
  const payload = lines.map(l => ({
    transaction_id: transactionId,
    line_no: l.line_no,
    account_id: l.account_id,
    debit_amount: l.debit_amount || 0,
    credit_amount: l.credit_amount || 0,
    description: l.description || null,
    org_id: l.org_id ?? null,
    project_id: l.project_id ?? null,
    cost_center_id: l.cost_center_id ?? null,
    work_item_id: l.work_item_id ?? null,
    analysis_work_item_id: l.analysis_work_item_id ?? null,
    classification_id: l.classification_id ?? null,
    sub_tree_id: l.sub_tree_id ?? null
  }))
  
  console.log('📤 About to insert payload with fields:', Object.keys(payload[0] || {}))

  // Insert lines one-by-one to isolate failing row and avoid deep stack from bulk insert
  for (let i = 0; i < payload.length; i++) {
    const row = payload[i]
    console.log(`📥 Inserting line ${i + 1}/${payload.length} (line_no=${row.line_no})`)
    const { error } = await supabase.from('transaction_lines').insert(row)
    if (error) {
      let errorMsg = `Failed to insert line_no=${row.line_no}`
      try {
        errorMsg = error.code || error.hint || error.details || errorMsg
      } catch {}
      console.error('❌ Insert failed for specific row')
      console.error('  line_no:', row.line_no, 'account_id:', row.account_id)
      console.error('  error.code:', (error as any)?.code)
      console.error('  error.hint:', (error as any)?.hint)
      console.error('  error.details:', (error as any)?.details)
      throw new Error(errorMsg)
    }
  }

  return { totalDebits, totalCredits }
}

export async function addTransactionLine(transactionId: string, line: TxLineInput) {
  if (!transactionId) throw new Error('transactionId is required')
  const d = Number(line.debit_amount || 0)
  const c = Number(line.credit_amount || 0)
  if (d < 0 || c < 0) throw new Error('Amounts cannot be negative')
  if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
    throw new Error('Line must have either debit or credit (exclusively)')
  }

  const { error } = await supabase
    .from('transaction_lines')
    .insert({
      transaction_id: transactionId,
      line_no: line.line_no,
      account_id: line.account_id,
      debit_amount: d,
      credit_amount: c,
      description: line.description || null,
      org_id: line.org_id ?? null,
      project_id: line.project_id ?? null,
      cost_center_id: line.cost_center_id ?? null,
      work_item_id: line.work_item_id ?? null,
      analysis_work_item_id: line.analysis_work_item_id ?? null,
      classification_id: line.classification_id ?? null,
      sub_tree_id: line.sub_tree_id ?? null
    })

  if (error) {
    let errorMsg = 'Failed to add transaction line'
    try {
      errorMsg = error.code || error.hint || error.details || errorMsg
    } catch {}
    console.error('❌ Add transaction line failed')
    throw new Error(errorMsg)
  }
}

export async function getTransactionLines(transactionId: string) {
  const { data, error } = await supabase
    .from('transaction_lines')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('line_no', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Fetches transaction lines with enriched data AND aggregated cost analysis totals.
 * Handles the merging of 'line_items_total' which is critical for the UI.
 */
export async function getTransactionLinesWithCosts(transactionId: string) {
  // Use enriched view if possible for better data
  const { data: lines, error } = await supabase
    .from('v_transaction_lines_enriched')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('line_no', { ascending: true })

  if (error) {
    // Fallback to raw table if view fails (though view is preferred)
    console.warn('⚠️ v_transaction_lines_enriched failed, falling back to transaction_lines', error)
    return getTransactionLines(transactionId)
  }

  if (!lines || lines.length === 0) return []

  // Fetch cost analysis summary for these lines
  try {
    const lineIds = lines.map(l => l.id)
    if (lineIds.length > 0) {
      const { data: costs } = await supabase
        .from('transaction_line_items')
        .select('transaction_line_id, total_amount')
        .in('transaction_line_id', lineIds)

      if (costs) {
        const costMap = new Map<string, number>()
        costs.forEach(c => {
          const current = costMap.get(c.transaction_line_id) || 0
          costMap.set(c.transaction_line_id, current + (c.total_amount || 0))
        })
        
        // Merge costs into lines
        return lines.map(line => ({
          ...line,
          line_items_total: costMap.get(line.id) || 0,
          total_cost: costMap.get(line.id) || 0 
        }))
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to fetch line costs, returning basic data:', err)
  }

  return lines
}