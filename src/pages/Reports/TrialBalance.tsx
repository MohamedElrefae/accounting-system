import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import ExportButtons from '../../components/Common/ExportButtons'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'

function getOrgId(): string {
  try {
    const v = localStorage.getItem('org_id')
    if (v && v.length > 0) return v
  } catch {}
  return '00000000-0000-0000-0000-000000000001'
}

interface TrialBalanceRow {
  account_id: string
  code: string
  name: string
  debit_column_minor: number
  credit_column_minor: number
  // optional enrichment
  project_id?: string | null
}

const TrialBalancePage: React.FC = () => {
  const ORG_ID = getOrgId()
  const [balanceMode, setBalanceMode] = useState<'posted' | 'all'>('posted')
  const [projects, setProjects] = useState<{ id: string; code: string; name: string; name_ar?: string }[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [asOf, setAsOf] = useState<string>('')

  useEffect(() => {
    loadProjects().catch(() => {})
  }, [])

  useEffect(() => {
    loadTrialBalance().catch(() => {})
  }, [balanceMode, selectedProject])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, code, name, name_ar')
      .eq('status', 'active')
      .order('code', { ascending: true })
    setProjects(data || [])
  }

  async function loadTrialBalance() {
    setLoading(true)

    if (asOf) {
      // As-of variant using balances-as-of RPC, then map to trial-balance columns
      const { data, error } = await supabase.rpc('get_account_balances_as_of_tx', {
        p_org_id: ORG_ID,
        p_as_of: new Date(asOf).toISOString(),
        p_mode: balanceMode,
      })
      if (!error) {
        const mapped: TrialBalanceRow[] = (data as any[] | null)?.map((r: any) => {
          const signed: number = r.balance_signed_minor || 0
          const debit_column_minor = signed > 0 ? signed : 0
          const credit_column_minor = signed < 0 ? Math.abs(signed) : 0
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_column_minor,
            credit_column_minor,
          } as TrialBalanceRow
        }) || []
        setRows(mapped)
        setLoading(false)
        return
      }
      // fall through to current variant if error
    }

    // Current variant (with optional project filter)
    const { data, error } = await supabase.rpc('get_trial_balance_current_tx_enhanced', {
      p_org_id: ORG_ID,
      p_mode: balanceMode,
      p_project_id: selectedProject || null,
    })
    if (!error) {
      setRows((data || []) as TrialBalanceRow[])
    } else {
      // Fallback to base RPC if enhanced not yet created
      const { data: baseData, error: baseErr } = await supabase.rpc('get_trial_balance_current_tx', {
        p_org_id: ORG_ID,
        p_mode: balanceMode,
      })
      if (!baseErr) setRows((baseData || []) as TrialBalanceRow[])
    }
    setLoading(false)
  }

  const filtered = useMemo(() => rows, [rows])

  const totals = useMemo(() => {
    const debit = filtered.reduce((s, r) => s + (r.debit_column_minor || 0), 0)
    const credit = filtered.reduce((s, r) => s + (r.credit_column_minor || 0), 0)
    return { debit, credit }
  }, [filtered])

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'رمز الحساب', type: 'text' },
      { key: 'name', header: 'اسم الحساب', type: 'text' },
      { key: 'debit', header: 'مدين', type: 'currency' },
      { key: 'credit', header: 'دائن', type: 'currency' },
    ])
    const data = filtered.map(r => ({
      code: r.code,
      name: r.name,
      debit: (r.debit_column_minor || 0) / 100,
      credit: (r.credit_column_minor || 0) / 100,
    }))
    return prepareTableData(columns, data)
  }, [filtered])

  if (loading) return <div className="accounts-page" dir="rtl" style={{ padding: '2rem' }}>جاري التحميل...</div>

  return (
    <div className="accounts-page" dir="rtl">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">ميزان المراجعة</h1>
        </div>
        <div className="page-actions">
          <ExportButtons
            data={exportData}
            config={{ title: 'ميزان المراجعة', rtlLayout: true, useArabicNumerals: true }}
            size="small"
            layout="horizontal"
          />
        </div>
      </div>

      <div className="controls-container">
        <div className="search-and-filters">
          <select value={balanceMode} onChange={(e) => setBalanceMode(e.target.value as any)} className="filter-select">
            <option value="posted">المنشورة فقط</option>
            <option value="all">جميع العمليات</option>
          </select>

          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="filter-select" disabled={!!asOf}>
            <option value="">جميع المشاريع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name_ar || p.name}</option>
            ))}
          </select>

          {/* As-of date (disables project filter for now) */}
          <input
            type="date"
            className="filter-input"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            title="تاريخ حتى (As of)"
          />
          <button className="ultimate-btn" onClick={() => setAsOf('')}><div className="btn-content"><span className="btn-text">اليوم</span></div></button>
        </div>
      </div>

      <div className="content-area">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>رمز الحساب</th>
                <th>اسم الحساب</th>
                <th>مدين (وحدات صغرى)</th>
                <th>دائن (وحدات صغرى)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.account_id}>
                  <td className="table-code-cell">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="table-center">{r.debit_column_minor > 0 ? formatArabicCurrency(r.debit_column_minor / 100, 'EGP') : '—'}</td>
                  <td className="table-center">{r.credit_column_minor > 0 ? formatArabicCurrency(r.credit_column_minor / 100, 'EGP') : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>الإجمالي</td>
                <td className="table-center" style={{ fontWeight: 700 }}>{formatArabicCurrency(totals.debit / 100, 'EGP')}</td>
                <td className="table-center" style={{ fontWeight: 700 }}>{formatArabicCurrency(totals.credit / 100, 'EGP')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TrialBalancePage
