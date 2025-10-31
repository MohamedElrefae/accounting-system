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