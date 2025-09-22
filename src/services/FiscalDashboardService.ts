// Pure summarization helper for testing
export type FiscalSummary = { open:number; locked:number; closed:number; imports:number; warnings:number; errors:number }

export async function summarizeFiscal(orgId?: string, fiscalYearId?: string, client?: any): Promise<FiscalSummary> {
  if (!orgId || !fiscalYearId) return { open:0, locked:0, closed:0, imports:0, warnings:0, errors:0 }
  if (!client) return { open:0, locked:0, closed:0, imports:0, warnings:0, errors:0 }
  // Client must be a Supabase-like interface. This function is kept simple for unit tests.
  const [{ data: periods }, { data: imports }] = await Promise.all([
    client.from('fiscal_periods').select('status').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
    client.from('opening_balance_imports').select('id').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
  ])
  const open = (periods||[]).filter((p:any)=>p.status==='open').length
  const locked = (periods||[]).filter((p:any)=>p.status==='locked').length
  const closed = (periods||[]).filter((p:any)=>p.status==='closed').length
  const importsCount = (imports||[]).length
  // Validation snapshot (optional)
  let warnings=0, errors=0
  try {
    const { data: v } = await client.rpc('validate_opening_balances', { p_org_id: orgId, p_fiscal_year_id: fiscalYearId })
    warnings = v?.warnings?.length || 0
    errors = v?.errors?.length || 0
  } catch {}
  return { open, locked, closed, imports: importsCount, warnings, errors }
}
