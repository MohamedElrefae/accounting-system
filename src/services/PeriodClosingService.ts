import { supabase } from '@/utils/supabase'

export class PeriodClosingService {
  static async initiatePeriodClosing(_periodId: string) {
    // Placeholder: could create checklist items here in the future
    return { ok: true }
  }

  static async closePeriod(periodId: string, notes?: string) {
    const { data, error } = await supabase.rpc('close_fiscal_period', {
      p_period_id: periodId,
      p_closing_notes: notes ?? null,
    })

    if (error) throw new Error(`close_fiscal_period failed: ${error.message}`)
    return data as boolean
  }

  static async lockPeriod(periodId: string) {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .eq('id', periodId)
    if (error) throw new Error(`lockPeriod failed: ${error.message}`)
    return true
  }

  static async unlockPeriod(periodId: string) {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', periodId)
    if (error) throw new Error(`unlockPeriod failed: ${error.message}`)
    return true
  }

  static async getChecklist(orgId: string, fiscalPeriodId: string) {
    const { data, error } = await supabase
      .from('period_closing_checklists')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_period_id', fiscalPeriodId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`getChecklist failed: ${error.message}`)
    return data
  }

  // Generate default checklist if absent
  static async generateClosingChecklist(periodId: string) {
    const { data: p, error } = await supabase.from('fiscal_periods').select('org_id,fiscal_year_id').eq('id', periodId).maybeSingle()
    if (error) throw error
    if (!p) throw new Error('Period not found')
    const { data: existing } = await supabase
      .from('period_closing_checklists')
      .select('id')
      .eq('org_id', p.org_id)
      .eq('fiscal_period_id', periodId)
      .limit(1)
    if (existing && existing.length > 0) return { ok: true }
    await supabase.from('period_closing_checklists').insert({
      org_id: p.org_id,
      fiscal_year_id: p.fiscal_year_id,
      fiscal_period_id: periodId,
      name_en: 'Default Closing Checklist',
      status: 'pending',
      items: [
        { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), code: 'BANK_REC', title_en: 'Bank reconciliation', status: 'pending' },
        { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), code: 'PROJECT_COST', title_en: 'Project cost review', status: 'pending' },
      ],
    })
    return { ok: true }
  }

  static async getChecklistStatus(orgId: string, periodId: string) {
    const { data, error } = await supabase
      .from('period_closing_checklists')
      .select('status,items')
      .eq('org_id', orgId)
      .eq('fiscal_period_id', periodId)
    if (error) throw error
    const items = (data || []).flatMap((c: any) => (Array.isArray(c.items) ? c.items : []))
    const pending = items.filter((i: any) => i.status !== 'completed').length
    return { pending, total: items.length }
  }

  static async completeChecklistItem(checklistId: string, itemId: string) {
    // Fetch, mutate, update items JSON
    const { data: cl, error } = await supabase.from('period_closing_checklists').select('items').eq('id', checklistId).maybeSingle()
    if (error) throw error
    const items = Array.isArray(cl?.items) ? cl.items : []
    const next = items.map((it: any) => (it.id === itemId ? { ...it, status: 'completed', completed_at: new Date().toISOString() } : it))
    const allCompleted = next.every((it: any) => it.status === 'completed')
    const { error: upErr } = await supabase
      .from('period_closing_checklists')
      .update({ items: next, status: allCompleted ? 'completed' : 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', checklistId)
    if (upErr) throw upErr
    return { ok: true }
  }

  static async updateChecklistItem(checklistId: string, itemId: string, patch: Partial<{ assigned_to: string; due_date: string; notes: string; title_en: string }>) {
    const { data: cl, error } = await supabase.from('period_closing_checklists').select('items').eq('id', checklistId).maybeSingle()
    if (error) throw error
    const items = Array.isArray(cl?.items) ? cl.items : []
    const next = items.map((it: any) => (it.id === itemId ? { ...it, ...patch } : it))
    const { error: upErr } = await supabase
      .from('period_closing_checklists')
      .update({ items: next, updated_at: new Date().toISOString() })
      .eq('id', checklistId)
    if (upErr) throw upErr
    return { ok: true }
  }

  static async escalateOverdueItems(orgId: string, periodId: string) {
    // Simple heuristic: mark any item with due_date < now and not completed as needs_attention: true
    const { data: rows, error } = await supabase
      .from('period_closing_checklists')
      .select('id,items')
      .eq('org_id', orgId)
      .eq('fiscal_period_id', periodId)
    if (error) throw error
    for (const r of rows || []) {
      const items = Array.isArray(r.items) ? r.items : []
      let changed = false
      const next = items.map((it: any) => {
        if (it.due_date && it.status !== 'completed' && new Date(it.due_date).getTime() < Date.now()) {
          changed = true
          return { ...it, needs_attention: true }
        }
        return it
      })
      if (changed) {
        await supabase
          .from('period_closing_checklists')
          .update({ items: next, updated_at: new Date().toISOString() })
          .eq('id', r.id)
      }
    }
    return { ok: true }
  }

  // Fetch validation JSON (base or construction-specific)
  static async getValidation(orgId: string, fiscalYearId: string, constructionSpecific = false) {
    const fn = constructionSpecific ? 'validate_construction_opening_balances' : 'validate_opening_balances'
    const { data, error } = await supabase.rpc(fn, { p_org_id: orgId, p_fiscal_year_id: fiscalYearId })
    if (error) throw error
    return data
  }

  // Rough reconciliation: opening_total from opening_balances for FY; gl_total from transactions within period dates
  static async getReconciliation(orgId: string, fiscalYearId: string, periodId: string) {
    const { data: p, error: perr } = await supabase
      .from('fiscal_periods')
      .select('start_date,end_date')
      .eq('id', periodId)
      .maybeSingle()
    if (perr) throw perr
    if (!p) throw new Error('Period not found')

    const [{ data: obSum }, { data: txSum }] = await Promise.all([
      supabase
        .from('opening_balances')
        .select('amount')
        .eq('org_id', orgId)
        .eq('fiscal_year_id', fiscalYearId),
      supabase
        .from('transactions')
        .select('amount, entry_date')
        .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
        .eq('org_id', orgId)
        .gte('entry_date', p.start_date)
        .lte('entry_date', p.end_date),
    ])

    const openingTotal = (obSum || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const glTotal = (txSum || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const difference = glTotal - openingTotal
    return { glTotal, openingTotal, difference }
  }
}
