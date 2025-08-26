import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import ExportButtons from '../../components/Common/ExportButtons'
import PresetBar from '../../components/Common/PresetBar'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import styles from './TrialBalance.module.css'
import { useReportPresets } from '../../hooks/useReportPresets'

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
  debit_amount: number
  credit_amount: number
  // optional enrichment
  project_id?: string | null
}

interface AccountMeta {
  id: string
  code: string
  name: string
  name_ar?: string | null
  level?: number | null
  parent_id?: string | null
}

const TrialBalancePage: React.FC = () => {
  const ORG_ID = getOrgId()
  const reportKey = 'trial-balance'
  const { presets, selectedPresetId, setSelectedPresetId, newPresetName, setNewPresetName, loadPresetsAndApplyLast, selectPresetAndApply, saveCurrentPreset, deleteSelectedPreset } = useReportPresets(reportKey)
  const [balanceMode, setBalanceMode] = useState<'posted' | 'all'>('posted')
  const [projects, setProjects] = useState<{ id: string; code: string; name: string; name_ar?: string }[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [asOf, setAsOf] = useState<string>('')
  const [hideZero, setHideZero] = useState<boolean>(true)
  const [showHierarchy, setShowHierarchy] = useState<boolean>(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [includeSubtotalsInExport, setIncludeSubtotalsInExport] = useState<boolean>(true)
  const [useArabicNums, setUseArabicNums] = useState<boolean>(true)
  const [accountsMap, setAccountsMap] = useState<Map<string, AccountMeta>>(new Map())
  // Compare mode and pagination guardrails
  const [compareMode, setCompareMode] = useState<boolean>(false)
  const [prevAsOf, setPrevAsOf] = useState<string>('')
  const [prevSignedMap, setPrevSignedMap] = useState<Map<string, number>>(new Map())
  const [pageSize, setPageSize] = useState<number>(200)
  const [visibleCount, setVisibleCount] = useState<number>(200)
  const [serverCursor, setServerCursor] = useState<string | null>(null)
  const [hasMoreServer, setHasMoreServer] = useState<boolean>(false)
  // Compare-mode paging (flat)
  const [compareCursor, setCompareCursor] = useState<string | null>(null)
  const [hasMoreCompare, setHasMoreCompare] = useState<boolean>(false)
  // Column chooser
  const normalColumnOptions = [
    { key: 'code', label: 'رمز الحساب' },
    { key: 'name', label: 'اسم الحساب' },
    { key: 'debit', label: 'مدين (ج.م)' },
    { key: 'credit', label: 'دائن (ج.م)' },
  ] as const
  const compareColumnOptions = [
    { key: 'code', label: 'رمز الحساب' },
    { key: 'name', label: 'اسم الحساب' },
    { key: 'prev', label: 'السابق (ج.م)' },
    { key: 'curr', label: 'الحالي (ج.م)' },
    { key: 'variance', label: 'الفرق' },
    { key: 'pct', label: 'نسبة التغير' },
  ] as const
  const [visibleNormalColumns, setVisibleNormalColumns] = useState<string[]>(normalColumnOptions.map(c => c.key))
  const [visibleCompareColumns, setVisibleCompareColumns] = useState<string[]>(compareColumnOptions.map(c => c.key))
  const [columnMenuOpen, setColumnMenuOpen] = useState<boolean>(false)

  // Derived visible amount keys (hierarchy mode keeps code/name fixed, amounts are dynamic)
  const visibleNormalAmountKeys = useMemo(() => (
    visibleNormalColumns.filter(k => ['debit','credit'].includes(k))
  ), [visibleNormalColumns])
  const visibleCompareAmountKeys = useMemo(() => (
    visibleCompareColumns.filter(k => ['prev','curr','variance','pct'].includes(k))
  ), [visibleCompareColumns])

  useEffect(() => {
    loadProjects().catch(() => {})
  }, [])

  // Load presets and auto-apply last used
  useEffect(() => {
    loadPresetsAndApplyLast((p) => {
      const f: any = p.filters || {}
      if (f.balanceMode) setBalanceMode(f.balanceMode)
      if (typeof f.hideZero === 'boolean') setHideZero(f.hideZero)
      if (typeof f.showHierarchy === 'boolean') setShowHierarchy(f.showHierarchy)
      if (typeof f.includeSubtotalsInExport === 'boolean') setIncludeSubtotalsInExport(f.includeSubtotalsInExport)
      if (typeof f.useArabicNums === 'boolean') setUseArabicNums(f.useArabicNums)
      if (typeof f.compareMode === 'boolean') setCompareMode(f.compareMode)
      if (typeof f.asOf === 'string') setAsOf(f.asOf)
      if (typeof f.prevAsOf === 'string') setPrevAsOf(f.prevAsOf)
      if (typeof f.selectedProject === 'string') setSelectedProject(f.selectedProject)
      const cols: any = (p as any).columns
      if (cols && typeof cols === 'object') {
        if (Array.isArray(cols.normal)) setVisibleNormalColumns(cols.normal)
        if (Array.isArray(cols.compare)) setVisibleCompareColumns(cols.compare)
      }
    }).catch(() => {})
  }, [loadPresetsAndApplyLast])

  // Restore user preferences
  useEffect(() => {
    try {
      const h = localStorage.getItem('tb_hideZero')
      const sh = localStorage.getItem('tb_showHierarchy')
      const inc = localStorage.getItem('tb_includeSubtotals')
      const an = localStorage.getItem('tb_useArabicNums')
      if (h !== null) setHideZero(h === 'true')
      if (sh !== null) setShowHierarchy(sh === 'true')
      if (inc !== null) setIncludeSubtotalsInExport(inc === 'true')
      if (an !== null) setUseArabicNums(an === 'true')
    } catch {}
  }, [])

  // Persist preferences
  useEffect(() => {
    try { localStorage.setItem('tb_hideZero', String(hideZero)) } catch {}
  }, [hideZero])
  useEffect(() => {
    try { localStorage.setItem('tb_showHierarchy', String(showHierarchy)) } catch {}
  }, [showHierarchy])
  useEffect(() => {
    try { localStorage.setItem('tb_includeSubtotals', String(includeSubtotalsInExport)) } catch {}
  }, [includeSubtotalsInExport])
  useEffect(() => {
    try { localStorage.setItem('tb_useArabicNums', String(useArabicNums)) } catch {}
  }, [useArabicNums])

  useEffect(() => {
    loadTrialBalance().catch(() => {})
  }, [balanceMode, selectedProject, compareMode, asOf, prevAsOf])

  // Date helpers
  function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
  }
  function previousMonthEnd(from: Date): Date {
    const firstOfMonth = new Date(from.getFullYear(), from.getMonth(), 1)
    const prevEnd = new Date(firstOfMonth.getTime() - 24*60*60*1000)
    return endOfMonth(prevEnd)
  }
  function toISODateString(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

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

    const todayISO = toISODateString(new Date())
    if (compareMode) {
      // Determine current and previous as-of dates
      const currAsOf = asOf || todayISO
      const prevDefault = toISODateString(previousMonthEnd(asOf ? new Date(asOf) : new Date()))
      const prevDate = prevAsOf || prevDefault

      if (!showHierarchy) {
        // Flat compare: page-aligned fetches using the same code cursor (initial load)
        const [currRes, prevRes] = await Promise.all([
          supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
            p_org_id: ORG_ID,
            p_as_of: new Date(currAsOf).toISOString(),
            p_mode: balanceMode,
            p_project_id: selectedProject || null,
            p_limit: pageSize,
            p_after_code: null,
          }),
          supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
            p_org_id: ORG_ID,
            p_as_of: new Date(prevDate).toISOString(),
            p_mode: balanceMode,
            p_project_id: selectedProject || null,
            p_limit: pageSize,
            p_after_code: null,
          }),
        ])
        const currData: any[] = Array.isArray(currRes.data) ? currRes.data as any[] : []
        const prevData: any[] = Array.isArray(prevRes.data) ? prevRes.data as any[] : []
        const mappedCurr: TrialBalanceRow[] = currData.map((r: any) => {
          const signed: number = Number(r.balance_signed_amount || 0)
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_amount: signed > 0 ? signed : 0,
            credit_amount: signed < 0 ? Math.abs(signed) : 0,
          }
        })
        setRows(mappedCurr)
        setCompareCursor(mappedCurr.length ? mappedCurr[mappedCurr.length - 1].code : null)
        setHasMoreCompare(mappedCurr.length === pageSize)
        const pm = new Map<string, number>()
        prevData.forEach((r: any) => {
          const signed = Number(r.balance_signed_amount || 0)
          pm.set(String(r.account_id), signed)
        })
        setPrevSignedMap(pm)
        setLoading(false)
        return
      }

      // Hierarchical compare: fallback to non-paged for correctness
      const { data: currData, error: currErr } = await supabase.rpc('get_account_balances_as_of_tx_enhanced', {
        p_org_id: ORG_ID,
        p_as_of: new Date(currAsOf).toISOString(),
        p_mode: balanceMode,
        p_project_id: selectedProject || null,
      })
      const { data: prevData, error: prevErr } = await supabase.rpc('get_account_balances_as_of_tx_enhanced', {
        p_org_id: ORG_ID,
        p_as_of: new Date(prevDate).toISOString(),
        p_mode: balanceMode,
        p_project_id: selectedProject || null,
      })
      if (!currErr) {
        const mappedCurr: TrialBalanceRow[] = (currData as any[] | null)?.map((r: any) => {
          const signed: number = Number(r.balance_signed_amount || 0)
          const debit_amount = signed > 0 ? signed : 0
          const credit_amount = signed < 0 ? Math.abs(signed) : 0
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_amount,
            credit_amount,
          } as TrialBalanceRow
        }) || []
        setRows(mappedCurr)
      } else {
        setRows([])
      }
      const pm = new Map<string, number>()
      if (Array.isArray(prevData)) {
        ;(prevData as any[]).forEach((r: any) => {
          const signed = Number(r.balance_signed_amount || 0)
          pm.set(String(r.account_id), signed)
        })
      }
      setPrevSignedMap(pm)
      setLoading(false)
      return
    }

    if (asOf && !compareMode && !showHierarchy) {
      // As-of flat mode: use paginated RPC
      const { data, error } = await supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
        p_org_id: ORG_ID,
        p_as_of: new Date(asOf).toISOString(),
        p_mode: balanceMode,
        p_project_id: selectedProject || null,
        p_limit: pageSize,
        p_after_code: null,
      })
      if (!error) {
        const mapped: TrialBalanceRow[] = (data as any[] | null)?.map((r: any) => {
          const signed: number = Number(r.balance_signed_amount || 0)
          const debit_amount = signed > 0 ? signed : 0
          const credit_amount = signed < 0 ? Math.abs(signed) : 0
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_amount,
            credit_amount,
          } as TrialBalanceRow
        }) || []
        setRows(mapped)
        setServerCursor(mapped.length ? mapped[mapped.length - 1].code : null)
        setHasMoreServer(mapped.length === pageSize)
        setLoading(false)
        return
      }
      // Fallback to non-paged as-of variant (if paged RPC not present)
      const { data: data2, error: error2 } = await supabase.rpc('get_account_balances_as_of_tx_enhanced', {
        p_org_id: ORG_ID,
        p_as_of: new Date(asOf).toISOString(),
        p_mode: balanceMode,
        p_project_id: selectedProject || null,
      })
      if (!error2) {
        const mapped2: TrialBalanceRow[] = (data2 as any[] | null)?.map((r: any) => {
          const signed: number = Number(r.balance_signed_amount || 0)
          const debit_amount = signed > 0 ? signed : 0
          const credit_amount = signed < 0 ? Math.abs(signed) : 0
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_amount,
            credit_amount,
          } as TrialBalanceRow
        }) || []
        setRows(mapped2)
        setServerCursor(mapped2.length ? mapped2[mapped2.length - 1].code : null)
        setHasMoreServer(false)
        setLoading(false)
        return
      }
      // fall through to current variant if error
    } else if (asOf) {
      // As-of variant using balances-as-of RPC for compare/hierarchy
      const { data, error } = await supabase.rpc('get_account_balances_as_of_tx_enhanced', {
        p_org_id: ORG_ID,
        p_as_of: new Date(asOf).toISOString(),
        p_mode: balanceMode,
        p_project_id: selectedProject || null,
      })
      if (!error) {
        const mapped: TrialBalanceRow[] = (data as any[] | null)?.map((r: any) => {
          const signed: number = Number(r.balance_signed_amount || 0)
          const debit_amount = signed > 0 ? signed : 0
          const credit_amount = signed < 0 ? Math.abs(signed) : 0
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_amount,
            credit_amount,
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
      const mapped: TrialBalanceRow[] = (data as any[] | null)?.map((r: any) => ({
        account_id: r.account_id,
        code: r.code,
        name: r.name,
        debit_amount: Number(r.debit_amount || 0),
        credit_amount: Number(r.credit_amount || 0),
      })) || []
      setRows(mapped)
      // Reset server paging state
      setServerCursor(mapped.length ? mapped[mapped.length - 1].code : null)
      setHasMoreServer(false)
    } else {
      // Fallback to base RPC if enhanced not yet created
      const { data: baseData, error: baseErr } = await supabase.rpc('get_trial_balance_current_tx', {
        p_org_id: ORG_ID,
        p_mode: balanceMode,
      })
      if (!baseErr) {
        const mappedFallback: TrialBalanceRow[] = (baseData as any[] | null)?.map((r: any) => {
          const net = Number(r.total_debit || 0) - Number(r.total_credit || 0)
          return {
            account_id: r.account_id,
            code: r.code,
            name: r.name,
            debit_amount: net > 0 ? net : 0,
            credit_amount: net < 0 ? Math.abs(net) : 0,
          }
        }) || []
        setRows(mappedFallback)
      }
    }
    setPrevSignedMap(new Map())
    setLoading(false)
  }

  // Apply zero-balance filter (applies to current/compare current rows)
  const filtered = useMemo(() => {
    if (!hideZero) return rows
    return rows.filter(r => (r.debit_amount || 0) !== 0 || (r.credit_amount || 0) !== 0)
  }, [rows, hideZero])

  // Client-side keyset-like guardrail: show only first N rows in flat mode (fallback when server paging not used)
  const flatVisible = useMemo(() => {
    if (showHierarchy || compareMode) return filtered
    if (asOf) return rows // in as-of flat mode, prefer server paging and show all loaded rows
    return filtered.slice(0, visibleCount)
  }, [filtered, showHierarchy, compareMode, visibleCount, asOf, rows])

  const totals = useMemo(() => {
    const debit = filtered.reduce((s, r) => s + (r.debit_amount || 0), 0)
    const credit = filtered.reduce((s, r) => s + (r.credit_amount || 0), 0)
    return { debit, credit }
  }, [filtered])

  // Compare-mode rows (flat)
  const compareFlatRows = useMemo(() => {
    if (!compareMode) return [] as any[]
    return filtered.map(r => {
      const currSigned = Number(r.debit_amount || 0) - Number(r.credit_amount || 0)
      const prevSigned = prevSignedMap.get(r.account_id) || 0
      const variance = currSigned - prevSigned
      const pct = prevSigned !== 0 ? (variance / Math.abs(prevSigned)) : null
      return { account_id: r.account_id, code: r.code, name: r.name, prev: prevSigned, curr: currSigned, variance, pct }
    })
  }, [compareMode, filtered, prevSignedMap])

  const totalsCompare = useMemo(() => {
    if (!compareMode) return null as any
    const prev = compareFlatRows.reduce((s, r) => s + (r.prev || 0), 0)
    const curr = compareFlatRows.reduce((s, r) => s + (r.curr || 0), 0)
    const variance = curr - prev
    return { prev, curr, variance }
  }, [compareMode, compareFlatRows])

  // Build hierarchy when requested
  type DisplayRow = (
    | { kind: 'group'; code: string; name: string; level: number; debit: number; credit: number }
    | { kind: 'account'; code: string; name: string; level: number; debit: number; credit: number; account_id: string }
  )

  const normalizedCode = (code: string) => (code || '').replace(/[^A-Za-z0-9]/g, '')

  // Load full ancestor chain metadata when grouping is enabled
  useEffect(() => {
    const loadHierarchyMeta = async () => {
      if (!showHierarchy || filtered.length === 0) {
        setAccountsMap(new Map())
        return
      }
      try {
        // Start with leaf account IDs in filtered rows
        const initialIds = Array.from(new Set(filtered.map(r => r.account_id))).filter(Boolean)
        const metaMap = new Map<string, AccountMeta>()
        let toFetch = initialIds
        const maxIterations = 8
        let iter = 0
        while (toFetch.length > 0 && iter < maxIterations) {
          const { data, error } = await supabase
            .from('accounts')
            .select('id, code, name, name_ar, level, parent_id')
            .in('id', toFetch as string[])
          if (error) break
          const newly: string[] = []
          ;(data || []).forEach((a: any) => {
            if (!metaMap.has(a.id)) {
              metaMap.set(a.id, {
                id: a.id,
                code: a.code,
                name: a.name_ar || a.name || a.code,
                name_ar: a.name_ar,
                level: a.level,
                parent_id: a.parent_id || null,
              })
              if (a.parent_id && !metaMap.has(a.parent_id)) {
                newly.push(a.parent_id)
              }
            }
          })
          toFetch = Array.from(new Set(newly))
          iter++
        }
        setAccountsMap(metaMap)
      } catch {
        setAccountsMap(new Map())
      }
    }
    loadHierarchyMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHierarchy, filtered.map(r => r.account_id).join(',')])

  const hierarchicalRows: DisplayRow[] = useMemo(() => {
    if (!showHierarchy) {
      return filtered.map(r => ({
        kind: 'account' as const,
        code: r.code,
        name: r.name,
        level: 1,
        debit: Number(r.debit_amount || 0),
        credit: Number(r.credit_amount || 0),
        account_id: r.account_id,
      }))
    }

    // If metadata is not available, fallback to flat rows
    if (accountsMap.size === 0) {
      return filtered.map(r => ({
        kind: 'account' as const,
        code: r.code,
        name: r.name,
        level: 1,
        debit: Number(r.debit_amount || 0),
        credit: Number(r.credit_amount || 0),
        account_id: r.account_id,
      }))
    }

    // Build quick maps
    const metaById = accountsMap
    const metaByCode = new Map<string, AccountMeta>()
    metaById.forEach(m => metaByCode.set(m.code, m))

    // Map account_id -> amounts from filtered rows
    const amountsById = new Map<string, { debit: number; credit: number }>()
    filtered.forEach(r => {
      const prev = amountsById.get(r.account_id) || { debit: 0, credit: 0 }
      prev.debit += Number(r.debit_amount || 0)
      prev.credit += Number(r.credit_amount || 0)
      amountsById.set(r.account_id, prev)
    })

    // Build children map for all known nodes
    const childrenOf = new Map<string, string[]>() // parent_id -> child_ids
    metaById.forEach(m => {
      if (m.parent_id) {
        const arr = childrenOf.get(m.parent_id) || []
        arr.push(m.id)
        childrenOf.set(m.parent_id, arr)
      }
    })

    // Find roots among the known set (those without parent or parent not in map)
    const roots: string[] = []
    metaById.forEach(m => {
      if (!m.parent_id || !metaById.has(m.parent_id)) {
        roots.push(m.id)
      }
    })

    // Aggregate up the tree (post-order)
    const agg = new Map<string, { debit: number; credit: number }>()
    const visit = (id: string): { debit: number; credit: number } => {
      if (agg.has(id)) return agg.get(id) as any
      const self = amountsById.get(id) || { debit: 0, credit: 0 }
      let total = { ...self }
      const kids = childrenOf.get(id) || []
      for (const kid of kids) {
        const sub = visit(kid)
        total.debit += sub.debit
        total.credit += sub.credit
      }
      agg.set(id, total)
      return total
    }
    roots.forEach(rid => visit(rid))

    // Build display rows
    const result: DisplayRow[] = []

    const getLevel = (id: string): number => {
      const m = metaById.get(id)
      if (m?.level !== null && m?.level !== undefined) return Math.max(1, Number(m.level))
      // fallback to normalized code length
      const code = m?.code || ''
      const len = normalizedCode(code).length
      if (len <= 2) return 1
      if (len <= 4) return 2
      if (len <= 6) return 3
      return 4
    }

    const pushNode = (id: string) => {
      const m = metaById.get(id)
      if (!m) return
      const totals = agg.get(id) || { debit: 0, credit: 0 }
      const kids = childrenOf.get(id) || []
      const isGroup = kids.length > 0
      if (isGroup) {
        result.push({ kind: 'group', code: m.code, name: m.name || m.code, level: getLevel(id), debit: totals.debit, credit: totals.credit })
        if (expandedGroups[m.code] !== false) {
          // sort kids by code
          kids.sort((a, b) => (metaById.get(a)?.code || '').localeCompare(metaById.get(b)?.code || '', 'ar'))
          for (const kid of kids) pushNode(kid)
        }
      } else {
        // leaf account row only if it has any amount (or not hiding zeros)
        const leafAmount = amountsById.get(id) || { debit: 0, credit: 0 }
        if (!hideZero || leafAmount.debit !== 0 || leafAmount.credit !== 0) {
          result.push({ kind: 'account', code: m.code, name: m.name || m.code, level: getLevel(id), debit: leafAmount.debit, credit: leafAmount.credit, account_id: id })
        }
      }
    }

    // Initialize expanded groups default
    if (Object.keys(expandedGroups).length === 0) {
      const init: Record<string, boolean> = {}
      metaById.forEach(m => {
        const kids = childrenOf.get(m.id) || []
        if (kids.length > 0) init[m.code] = true
      })
      setExpandedGroups(init)
    }

    // Sort roots by code and push
    roots.sort((a, b) => (metaById.get(a)?.code || '').localeCompare(metaById.get(b)?.code || '', 'ar'))
    roots.forEach(rid => pushNode(rid))

    return result
  }, [filtered, showHierarchy, accountsMap, expandedGroups, hideZero])

  // Compare-mode hierarchical rows (signed prev/curr aggregated)
  const hierarchicalCompareRows = useMemo(() => {
    if (!compareMode || !showHierarchy || accountsMap.size === 0) return [] as any[]

    const metaById = accountsMap
    const childrenOf = new Map<string, string[]>()
    metaById.forEach(m => {
      if (m.parent_id) {
        const arr = childrenOf.get(m.parent_id) || []
        arr.push(m.id)
        childrenOf.set(m.parent_id, arr)
      }
    })

    const amountsCurrById = new Map<string, number>()
    const amountsPrevById = new Map<string, number>()

    // Seed current from filtered rows
    filtered.forEach(r => {
      const curr = (Number(r.debit_amount || 0) - Number(r.credit_amount || 0))
      const prev = prevSignedMap.get(r.account_id) || 0
      amountsCurrById.set(r.account_id, (amountsCurrById.get(r.account_id) || 0) + curr)
      amountsPrevById.set(r.account_id, (amountsPrevById.get(r.account_id) || 0) + prev)
    })

    // Roots
    const roots: string[] = []
    metaById.forEach(m => { if (!m.parent_id || !metaById.has(m.parent_id)) roots.push(m.id) })

    // Aggregate
    const aggCurr = new Map<string, number>()
    const aggPrev = new Map<string, number>()
    const visit = (id: string) => {
      if (aggCurr.has(id)) return
      let curr = amountsCurrById.get(id) || 0
      let prev = amountsPrevById.get(id) || 0
      const kids = childrenOf.get(id) || []
      kids.forEach(k => { visit(k); curr += aggCurr.get(k) || 0; prev += aggPrev.get(k) || 0 })
      aggCurr.set(id, curr)
      aggPrev.set(id, prev)
    }
    roots.forEach(visit)

    // Build rows
    const getLevel = (id: string): number => {
      const m = metaById.get(id)
      if (m?.level !== null && m?.level !== undefined) return Math.max(1, Number(m.level))
      const code = m?.code || ''
      const len = normalizedCode(code).length
      if (len <= 2) return 1
      if (len <= 4) return 2
      if (len <= 6) return 3
      return 4
    }

    const result: any[] = []
    const pushNode = (id: string) => {
      const m = metaById.get(id); if (!m) return
      const kids = childrenOf.get(id) || []
      const isGroup = kids.length > 0
      const curr = aggCurr.get(id) || 0
      const prev = aggPrev.get(id) || 0
      const variance = curr - prev
      const pct = prev !== 0 ? (variance / Math.abs(prev)) : null
      if (isGroup) {
        result.push({ kind: 'group', code: m.code, name: m.name || m.code, level: getLevel(id), prev, curr, variance, pct })
        if (expandedGroups[m.code] !== false) {
          kids.sort((a, b) => (metaById.get(a)?.code || '').localeCompare(metaById.get(b)?.code || '', 'ar'))
          kids.forEach(pushNode)
        }
      } else {
        // leaf must be in filtered to display
        const inFiltered = filtered.some(fr => fr.account_id === id)
        if (inFiltered) result.push({ kind: 'account', account_id: id, code: m.code, name: m.name || m.code, level: getLevel(id), prev, curr, variance, pct })
      }
    }

    // Init expanded
    if (Object.keys(expandedGroups).length === 0) {
      const init: Record<string, boolean> = {}
      metaById.forEach(m => { const kids = childrenOf.get(m.id) || []; if (kids.length > 0) init[m.code] = true })
      setExpandedGroups(init)
    }

    roots.sort((a,b) => (metaById.get(a)?.code || '').localeCompare(metaById.get(b)?.code || '', 'ar'))
    roots.forEach(pushNode)

    return result
  }, [compareMode, showHierarchy, accountsMap, filtered, prevSignedMap, expandedGroups])

  const exportData = useMemo(() => {
    if (compareMode) {
      const selectedCols = compareColumnOptions.filter(c => visibleCompareColumns.includes(c.key))
      const columns = createStandardColumns(selectedCols.map(c => ({
        key: c.key,
        header: c.label,
        type: c.key === 'pct' ? 'percentage' : (['prev','curr','variance'].includes(c.key) ? 'currency' : 'text'),
      })))
      const rawRows = (showHierarchy && includeSubtotalsInExport)
        ? hierarchicalCompareRows.map(r => ({
            code: r.code,
            name: r.kind === 'group' ? `[مجموعة] ${r.name}` : r.name,
            prev: Number(r.prev || 0),
            curr: Number(r.curr || 0),
            variance: Number(r.variance || 0),
            pct: r.pct == null ? '' : r.pct,
          }))
        : compareFlatRows.map(r => ({
            code: r.code,
            name: r.name,
            prev: Number(r.prev || 0),
            curr: Number(r.curr || 0),
            variance: Number(r.variance || 0),
            pct: r.pct == null ? '' : r.pct,
          }))
      const rowsForExport = rawRows.map(row => Object.fromEntries(Object.entries(row).filter(([k]) => visibleCompareColumns.includes(k))))
      return prepareTableData(columns, rowsForExport)
    }

    const selectedCols = normalColumnOptions.filter(c => visibleNormalColumns.includes(c.key))
    const columns = createStandardColumns(selectedCols.map(c => ({
      key: c.key,
      header: c.label,
      type: ['debit','credit'].includes(c.key) ? 'currency' : 'text',
    })))

    const baseRows = filtered.map(r => ({
      code: r.code,
      name: r.name,
      debit: Number(r.debit_amount || 0),
      credit: Number(r.credit_amount || 0),
    }))

    let data = baseRows

    if (showHierarchy && includeSubtotalsInExport) {
      // Merge group subtotal rows into export
      const rows: any[] = []
      hierarchicalRows.forEach(r => {
        if (r.kind === 'group') {
          rows.push({
            code: r.code,
            name: `[مجموعة] ${r.name}`,
            debit: Number(r.debit || 0),
            credit: Number(r.credit || 0),
          })
        } else {
          rows.push({
            code: r.code,
            name: r.name,
            debit: Number(r.debit || 0),
            credit: Number(r.credit || 0),
          })
        }
      })
      data = rows
    }

    const rowsForExport = data.map(row => Object.fromEntries(Object.entries(row).filter(([k]) => visibleNormalColumns.includes(k))))
    return prepareTableData(columns, rowsForExport)
  }, [filtered, showHierarchy, includeSubtotalsInExport, hierarchicalRows, compareMode, hierarchicalCompareRows, compareFlatRows, visibleNormalColumns, visibleCompareColumns])

  const exportConfig = useMemo(() => {
    const modeLabel = balanceMode === 'posted' ? 'منشورة فقط' : 'جميع العمليات'
    const dateLabel = asOf ? `حتى ${asOf}` : 'الحالي'
    const projectLabel = selectedProject ? ` | مشروع: ${projects.find(p => p.id === selectedProject)?.code || selectedProject}` : ''
    const title = compareMode ? `ميزان المراجعة (مقارن) - ${dateLabel}` : `ميزان المراجعة (${dateLabel})`
    const subtitle = compareMode ? `النمط: ${modeLabel}${projectLabel} | مقارنة بالفترة السابقة` : `النمط: ${modeLabel}${projectLabel}`
    const filename = `trial_balance_${asOf || 'current'}_${balanceMode}${selectedProject ? '_' + (projects.find(p => p.id === selectedProject)?.code || 'project') : ''}`
    return {
      title,
      subtitle,
      filename,
      rtlLayout: true,
      useArabicNumerals: useArabicNums,
      currency: 'EGP',
      exportFormats: ['csv','xlsx'],
    } as const
  }, [balanceMode, asOf, selectedProject, projects, useArabicNums, compareMode])

  // Full export (flat mode only) with server-side pagination
  const [isExportingFull, setIsExportingFull] = useState(false)
  async function handleFullExport(format: 'excel' | 'csv') {
    if (showHierarchy) {
      try { alert('التصدير الكامل متاح فقط في الوضع المسطح (بدون التجميع الهرمي).') } catch {}
      return
    }

    setIsExportingFull(true)
    try {
      const limit = Math.max(200, pageSize || 200)
      const todayISO = toISODateString(new Date())

      if (compareMode) {
        // Build previous-period full map first
        const currAsOf = asOf || todayISO
        const prevDefault = toISODateString(previousMonthEnd(asOf ? new Date(asOf) : new Date()))
        const prevDate = prevAsOf || prevDefault

        type PrevRec = { account_id: string; code: string; name: string; signed: number }
        const prevAll = new Map<string, PrevRec>()
        let prevCursor: string | null = null
        while (true) {
          const { data } = await supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
            p_org_id: ORG_ID,
            p_as_of: new Date(prevDate).toISOString(),
            p_mode: balanceMode,
            p_project_id: selectedProject || null,
            p_limit: limit,
            p_after_code: prevCursor,
          })
          const page: any[] = Array.isArray(data) ? (data as any[]) : []
          page.forEach((r: any) => {
            const signed = Number(r.balance_signed_amount || 0)
            prevAll.set(String(r.account_id), {
              account_id: String(r.account_id),
              code: String(r.code),
              name: String(r.name),
              signed,
            })
          })
          if (page.length < limit) break
          prevCursor = String(page[page.length - 1].code)
        }

        // Now fetch all current pages and build compare rows
        const rowsOut: { code: string; name: string; prev: number; curr: number; variance: number; pct: number | null }[] = []
        const seen = new Set<string>()
        let currCursor: string | null = null
        while (true) {
          const { data } = await supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
            p_org_id: ORG_ID,
            p_as_of: new Date(currAsOf).toISOString(),
            p_mode: balanceMode,
            p_project_id: selectedProject || null,
            p_limit: limit,
            p_after_code: currCursor,
          })
          const page: any[] = Array.isArray(data) ? (data as any[]) : []
          page.forEach((r: any) => {
            const currSigned = Number(r.balance_signed_amount || 0)
            const prevRec = prevAll.get(String(r.account_id))
            const prevSigned = prevRec ? prevRec.signed : 0
            const variance = currSigned - prevSigned
            const pct = prevSigned !== 0 ? (currSigned / prevSigned) - 1 : null
            rowsOut.push({
              code: String(r.code),
              name: String(r.name),
              prev: prevSigned,
              curr: currSigned,
              variance,
              pct,
            })
            seen.add(String(r.account_id))
          })
          if (page.length < limit) break
          currCursor = String(page[page.length - 1].code)
        }
        // Add any prev-only accounts
        for (const [accId, rec] of prevAll.entries()) {
          if (!seen.has(accId)) {
            const prevSigned = rec.signed
            rowsOut.push({
              code: rec.code,
              name: rec.name,
              prev: prevSigned,
              curr: 0,
              variance: 0 - prevSigned,
              pct: null,
            })
          }
        }

        const columns = createStandardColumns([
          { key: 'code', header: 'رمز الحساب', type: 'text' },
          { key: 'name', header: 'اسم الحساب', type: 'text' },
          { key: 'prev', header: 'السابق (ج.م)', type: 'currency' },
          { key: 'curr', header: 'الحالي (ج.م)', type: 'currency' },
          { key: 'variance', header: 'الفرق', type: 'currency' },
          { key: 'pct', header: 'نسبة التغير', type: 'percentage' },
        ])

        // Respect hideZero by removing rows where both periods are zero
        const filteredRows = hideZero ? rowsOut.filter(r => (Number(r.prev || 0) !== 0 || Number(r.curr || 0) !== 0)) : rowsOut
        const data = prepareTableData(columns, filteredRows)
        const opts = {
          title: exportConfig.title,
          subtitle: exportConfig.subtitle,
          useArabicNumerals: exportConfig.useArabicNumerals,
          rtlLayout: true,
        } as const
        if (format === 'excel') await exportToExcel(data as any, opts as any)
        else await exportToCSV(data as any, opts as any)
        return
      }

      // Non-compare full export
      const columns = createStandardColumns([
        { key: 'code', header: 'رمز الحساب', type: 'text' },
        { key: 'name', header: 'اسم الحساب', type: 'text' },
        { key: 'debit', header: 'مدين (ج.م)', type: 'currency' },
        { key: 'credit', header: 'دائن (ج.م)', type: 'currency' },
      ])

      const rowsOut: { code: string; name: string; debit: number; credit: number }[] = []

      if (asOf) {
        let after: string | null = null
        while (true) {
          const { data } = await supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
            p_org_id: ORG_ID,
            p_as_of: new Date(asOf).toISOString(),
            p_mode: balanceMode,
            p_project_id: selectedProject || null,
            p_limit: limit,
            p_after_code: after,
          })
          const page: any[] = Array.isArray(data) ? (data as any[]) : []
          page.forEach((r: any) => {
            const signed: number = Number(r.balance_signed_amount || 0)
            rowsOut.push({
              code: String(r.code),
              name: String(r.name),
              debit: signed > 0 ? signed : 0,
              credit: signed < 0 ? Math.abs(signed) : 0,
            })
          })
          if (page.length < limit) break
          after = String(page[page.length - 1].code)
        }
      } else {
        let after: string | null = null
        while (true) {
          const { data } = await supabase.rpc('get_trial_balance_current_tx_enhanced_page', {
            p_org_id: ORG_ID,
            p_mode: balanceMode,
            p_project_id: selectedProject || null,
            p_limit: limit,
            p_after_code: after,
          })
          const page: any[] = Array.isArray(data) ? (data as any[]) : []
          page.forEach((r: any) => {
            rowsOut.push({
              code: String(r.code),
              name: String(r.name),
              debit: Number(r.debit_amount || 0),
              credit: Number(r.credit_amount || 0),
            })
          })
          if (page.length < limit) break
          after = String(page[page.length - 1].code)
        }
      }

      const filteredRows = hideZero ? rowsOut.filter(r => (Number(r.debit || 0) !== 0 || Number(r.credit || 0) !== 0)) : rowsOut
      const data = prepareTableData(columns, filteredRows)
      const opts = {
        title: exportConfig.title,
        subtitle: exportConfig.subtitle,
        useArabicNumerals: exportConfig.useArabicNumerals,
        rtlLayout: true,
      } as const
      if (format === 'excel') await exportToExcel(data as any, opts as any)
      else await exportToCSV(data as any, opts as any)
    } catch (e) {
      console.error('Full export failed', e)
    } finally {
      setIsExportingFull(false)
    }
  }

  if (loading) return <div className={`accounts-page ${styles.loading}`} dir="rtl">جاري التحميل...</div>

  return (
    <div className="accounts-page" dir="rtl">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">ميزان المراجعة</h1>
        </div>
        <div className="page-actions">
          <PresetBar
            presets={presets}
            selectedPresetId={selectedPresetId}
            newPresetName={newPresetName}
            onChangePreset={async (id) => {
              await selectPresetAndApply(String(id), (p) => {
                const f: any = p.filters || {}
                if (f.balanceMode) setBalanceMode(f.balanceMode)
                if (typeof f.hideZero === 'boolean') setHideZero(f.hideZero)
                if (typeof f.showHierarchy === 'boolean') setShowHierarchy(f.showHierarchy)
                if (typeof f.includeSubtotalsInExport === 'boolean') setIncludeSubtotalsInExport(f.includeSubtotalsInExport)
                if (typeof f.useArabicNums === 'boolean') setUseArabicNums(f.useArabicNums)
                if (typeof f.compareMode === 'boolean') setCompareMode(f.compareMode)
                if (typeof f.asOf === 'string') setAsOf(f.asOf)
                if (typeof f.prevAsOf === 'string') setPrevAsOf(f.prevAsOf)
                if (typeof f.selectedProject === 'string') setSelectedProject(f.selectedProject)
                const cols: any = (p as any).columns
                if (cols && typeof cols === 'object') {
                  if (Array.isArray(cols.normal)) setVisibleNormalColumns(cols.normal)
                  if (Array.isArray(cols.compare)) setVisibleCompareColumns(cols.compare)
                }
              })
            }}
            onChangeName={(v) => setNewPresetName(v)}
            onSave={async () => {
              if (!newPresetName.trim()) return
              const saved = await saveCurrentPreset({
                name: newPresetName.trim(),
                filters: {
                  balanceMode,
                  selectedProject,
                  hideZero,
                  showHierarchy,
                  includeSubtotalsInExport,
                  useArabicNums,
                  compareMode,
                  asOf,
                  prevAsOf,
                },
                columns: { normal: visibleNormalColumns, compare: visibleCompareColumns },
              })
              if (saved) setNewPresetName('')
            }}
            onDelete={async () => {
              if (!selectedPresetId) return
              await deleteSelectedPreset()
            }}
            selectClassName="filter-select"
            inputClassName="filter-input"
            buttonClassName="ultimate-btn"
            placeholder="اسم التهيئة"
            saveLabel="حفظ"
            deleteLabel="حذف"
          />

          <div className={styles.columnPanel}>
            <button className="ultimate-btn" onClick={() => setColumnMenuOpen(v => !v)}>
              <div className="btn-content"><span className="btn-text">اختيار الأعمدة</span></div>
            </button>
            {columnMenuOpen && (
              <div className={styles.columnDropdown}>
                <div className={styles.columnList}>
                  <div className={styles.columnGroupTitle}>وضع المقارنة</div>
                  <div className={styles.columnActions}>
                    <button
                      className={`${styles.columnActionBtn} ultimate-btn`}
                      onClick={() => setVisibleCompareColumns(compareColumnOptions.map(c => c.key))}
                      type="button"
                    >
                      <div className="btn-content"><span className="btn-text">تحديد الكل</span></div>
                    </button>
                    <button
                      className={`${styles.columnActionBtn} ultimate-btn`}
                      onClick={() => setVisibleCompareColumns([])}
                      type="button"
                    >
                      <div className="btn-content"><span className="btn-text">مسح الكل</span></div>
                    </button>
                  </div>
                  {compareColumnOptions.map(opt => (
                    <label key={`cmp-${opt.key}`} className={styles.columnItem}>
                      <input
                        type="checkbox"
                        checked={visibleCompareColumns.includes(opt.key)}
                        onChange={(e) => setVisibleCompareColumns(prev => e.target.checked ? [...prev, opt.key] : prev.filter(k => k !== opt.key))}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                  <div className={styles.columnGroupTitle}>الوضع العادي</div>
                  <div className={styles.columnActions}>
                    <button
                      className={`${styles.columnActionBtn} ultimate-btn`}
                      onClick={() => setVisibleNormalColumns(normalColumnOptions.map(c => c.key))}
                      type="button"
                    >
                      <div className="btn-content"><span className="btn-text">تحديد الكل</span></div>
                    </button>
                    <button
                      className={`${styles.columnActionBtn} ultimate-btn`}
                      onClick={() => setVisibleNormalColumns([])}
                      type="button"
                    >
                      <div className="btn-content"><span className="btn-text">مسح الكل</span></div>
                    </button>
                  </div>
                  {normalColumnOptions.map(opt => (
                    <label key={`norm-${opt.key}`} className={styles.columnItem}>
                      <input
                        type="checkbox"
                        checked={visibleNormalColumns.includes(opt.key)}
                        onChange={(e) => setVisibleNormalColumns(prev => e.target.checked ? [...prev, opt.key] : prev.filter(k => k !== opt.key))}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <button className="ultimate-btn" onClick={() => { setVisibleNormalColumns(normalColumnOptions.map(c => c.key)); setVisibleCompareColumns(compareColumnOptions.map(c => c.key)); }}>
                  <div className="btn-content"><span className="btn-text">استرجاع الافتراضي</span></div>
                </button>
              </div>
            )}
          </div>

          <div className="export-actions">
            <ExportButtons
              data={exportData}
              config={exportConfig as any}
              size="small"
              layout="horizontal"
            />
            {!showHierarchy && (
              <>
                <button
                  className="ultimate-btn"
                  disabled={isExportingFull}
                  onClick={() => handleFullExport('excel')}
                  title="تصدير كل الصفوف (Excel)"
                >
                  <div className="btn-content"><span className="btn-text">{isExportingFull ? 'جارٍ التصدير...' : 'تصدير Excel (كامل)'}</span></div>
                </button>
                <button
                  className="ultimate-btn"
                  disabled={isExportingFull}
                  onClick={() => handleFullExport('csv')}
                  title="تصدير كل الصفوف (CSV)"
                >
                  <div className="btn-content"><span className="btn-text">{isExportingFull ? 'جارٍ التصدير...' : 'تصدير CSV (كامل)'}</span></div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="controls-container">
        <div className="search-and-filters">
          <select value={balanceMode} onChange={(e) => setBalanceMode(e.target.value as any)} className="filter-select">
            <option value="posted">المنشورة فقط</option>
            <option value="all">جميع العمليات</option>
          </select>

          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="filter-select">
            <option value="">جميع المشاريع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name_ar || p.name}</option>
            ))}
          </select>

          {/* As-of date */}
          <input
            type="date"
            className="filter-input"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            title="تاريخ حتى (As of)"
          />
          <button className="ultimate-btn" onClick={() => setAsOf('')}><div className="btn-content"><span className="btn-text">اليوم</span></div></button>

          {/* Compare mode */}
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={compareMode} onChange={e => setCompareMode(e.target.checked)} />
            <span>وضع المقارنة</span>
          </label>
          {compareMode && (
            <>
              <input
                type="date"
                className="filter-input"
                value={prevAsOf}
                onChange={(e) => setPrevAsOf(e.target.value)}
                title="تاريخ الفترة السابقة حتى"
              />
              <button className="ultimate-btn" onClick={() => setPrevAsOf('')}><div className="btn-content"><span className="btn-text">افتراضي</span></div></button>
            </>
          )}

          {/* Additional toggles */}
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} />
            <span>إخفاء الأرصدة الصفرية</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={showHierarchy} onChange={e => setShowHierarchy(e.target.checked)} />
            <span>عرض التجميع الهرمي</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={includeSubtotalsInExport} onChange={e => setIncludeSubtotalsInExport(e.target.checked)} disabled={!showHierarchy} />
            <span>تضمين المجاميع في التصدير</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={useArabicNums} onChange={e => setUseArabicNums(e.target.checked)} />
            <span>استخدم الأرقام العربية في التصدير</span>
          </label>

          {/* Pagination (flat mode only, supports current, as-of, and compare) */}
          {!showHierarchy && (
            <>
              <input
                type="number"
                className="filter-input"
                min={50}
                step={50}
                value={pageSize}
                onChange={(e) => { const v = Math.max(50, Number(e.target.value) || 200); setPageSize(v); }}
                title="حجم الصفحة"/>
              <button
                className="ultimate-btn"
                onClick={async () => {
                  try {
                    if (compareMode) {
                      // Load next aligned page for compare (flat)
                      const currAsOf = asOf || toISODateString(new Date())
                      const prevDefault = toISODateString(previousMonthEnd(asOf ? new Date(asOf) : new Date()))
                      const prevDate = prevAsOf || prevDefault
                      const [currRes, prevRes] = await Promise.all([
                        supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
                          p_org_id: ORG_ID,
                          p_as_of: new Date(currAsOf).toISOString(),
                          p_mode: balanceMode,
                          p_project_id: selectedProject || null,
                          p_limit: pageSize,
                          p_after_code: compareCursor,
                        }),
                        supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
                          p_org_id: ORG_ID,
                          p_as_of: new Date(prevDate).toISOString(),
                          p_mode: balanceMode,
                          p_project_id: selectedProject || null,
                          p_limit: pageSize,
                          p_after_code: compareCursor,
                        })
                      ])
                      const currData: any[] = Array.isArray(currRes.data) ? currRes.data as any[] : []
                      const prevData: any[] = Array.isArray(prevRes.data) ? prevRes.data as any[] : []
                      const mappedCurr: TrialBalanceRow[] = currData.map((r: any) => {
                        const signed: number = Number(r.balance_signed_amount || 0)
                        return {
                          account_id: r.account_id,
                          code: r.code,
                          name: r.name,
                          debit_amount: signed > 0 ? signed : 0,
                          credit_amount: signed < 0 ? Math.abs(signed) : 0,
                        }
                      })
                      setRows(prev => [...prev, ...mappedCurr])
                      setCompareCursor(mappedCurr.length ? mappedCurr[mappedCurr.length - 1].code : compareCursor)
                      setHasMoreCompare(mappedCurr.length === pageSize)
                      setPrevSignedMap(prevMap => {
                        const next = new Map(prevMap)
                        prevData.forEach((r: any) => {
                          const signed = Number(r.balance_signed_amount || 0)
                          next.set(String(r.account_id), signed)
                        })
                        return next
                      })
                    } else if (asOf) {
                      const { data, error } = await supabase.rpc('get_account_balances_as_of_tx_enhanced_page', {
                        p_org_id: ORG_ID,
                        p_as_of: new Date(asOf).toISOString(),
                        p_mode: balanceMode,
                        p_project_id: selectedProject || null,
                        p_limit: pageSize,
                        p_after_code: serverCursor,
                      })
                      if (!error) {
                        const mapped: TrialBalanceRow[] = (data as any[] | null)?.map((r: any) => {
                          const signed: number = Number(r.balance_signed_amount || 0)
                          return {
                            account_id: r.account_id,
                            code: r.code,
                            name: r.name,
                            debit_amount: signed > 0 ? signed : 0,
                            credit_amount: signed < 0 ? Math.abs(signed) : 0,
                          }
                        }) || []
                        setRows(prev => [...prev, ...mapped])
                        setServerCursor(mapped.length ? mapped[mapped.length - 1].code : serverCursor)
                        setHasMoreServer(mapped.length === pageSize)
                      }
                    } else {
                      const { data, error } = await supabase.rpc('get_trial_balance_current_tx_enhanced_page', {
                        p_org_id: ORG_ID,
                        p_mode: balanceMode,
                        p_project_id: selectedProject || null,
                        p_limit: pageSize,
                        p_after_code: serverCursor,
                      })
                      if (!error) {
                        const mapped: TrialBalanceRow[] = (data as any[] | null)?.map((r: any) => ({
                          account_id: r.account_id,
                          code: r.code,
                          name: r.name,
                          debit_amount: Number(r.debit_amount || 0),
                          credit_amount: Number(r.credit_amount || 0),
                        })) || []
                        setRows(prev => [...prev, ...mapped])
                        setServerCursor(mapped.length ? mapped[mapped.length - 1].code : serverCursor)
                        setHasMoreServer(mapped.length === pageSize)
                      }
                    }
                  } catch {}
                }}
              >
                <div className="btn-content"><span className="btn-text">تحميل المزيد (خادم)</span></div>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="content-area">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="accounts-table">
            <thead>
              {compareMode ? (
                showHierarchy ? (
                  <tr>
                    <th>رمز الحساب</th>
                    <th>اسم الحساب</th>
                    {visibleCompareAmountKeys.map(k => (
                      <th key={k}>{(compareColumnOptions.find(c => c.key === k) || { label: k as any }).label}</th>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    {compareColumnOptions.filter(c => visibleCompareColumns.includes(c.key)).map(c => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                )
              ) : (
                showHierarchy ? (
                  <tr>
                    <th>رمز الحساب</th>
                    <th>اسم الحساب</th>
                    {visibleNormalAmountKeys.map(k => (
                      <th key={k}>{(normalColumnOptions.find(c => c.key === k) || { label: k as any }).label}</th>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    {normalColumnOptions.filter(c => visibleNormalColumns.includes(c.key)).map(c => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                )
              )}
            </thead>
            <tbody>
              {compareMode ? (
                (showHierarchy ? hierarchicalCompareRows : compareFlatRows).map((row: any) => (
                  row.kind === 'group' ? (
                    <tr
                      key={`group-${row.code}`}
                      className={styles.groupRow}
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [row.code]: !prev[row.code] }))}
                      title="تبديل عرض تفاصيل المجموعة"
                    >
                      <td className={`${styles.groupCell} ${styles['level' + row.level]}`} colSpan={2}>
                        <span className={styles.expandIcon}>{expandedGroups[row.code] ? '▾' : '▸'}</span>
                        <span className={styles.groupName}>{row.code} - {row.name}</span>
                      </td>
                      {visibleCompareAmountKeys.map(k => (
                        k === 'pct' ? (
                          <td key={k} className="table-center">{row.pct == null ? '—' : `${(row.pct * 100).toFixed(2)}%`}</td>
                        ) : k === 'prev' ? (
                          <td key={k} className={styles.totalCell}>{formatArabicCurrency(row.prev, 'EGP')}</td>
                        ) : k === 'curr' ? (
                          <td key={k} className={styles.totalCell}>{formatArabicCurrency(row.curr, 'EGP')}</td>
                        ) : (
                          <td key={k} className={styles.totalCell}>{formatArabicCurrency(row.variance, 'EGP')}</td>
                        )
                      ))}
                    </tr>
                  ) : (
                    showHierarchy ? null : (
                      <tr
                        key={row.account_id}
                        className={styles.rowClickable}
                        onClick={() => {
                          try {
                            const params = new URLSearchParams();
                            params.set('accountId', row.account_id);
                            params.set('orgId', ORG_ID);
                            if (selectedProject) params.set('projectId', selectedProject);
                            params.set('postedOnly', (balanceMode === 'posted').toString());
                            params.set('includeOpening', 'true');
                            if (asOf) params.set('dateTo', asOf);
                            const url = `/reports/general-ledger?${params.toString()}`;
                            window.open(url, '_blank');
                          } catch {}
                        }}
                        title="عرض دفتر الأستاذ لهذا الحساب"
                      >
                        {visibleCompareColumns.includes('code') && (<td className="table-code-cell">{row.code}</td>)}
                        {visibleCompareColumns.includes('name') && (<td>{row.name}</td>)}
                        {visibleCompareColumns.includes('prev') && (<td className="table-center">{formatArabicCurrency(row.prev, 'EGP')}</td>)}
                        {visibleCompareColumns.includes('curr') && (<td className="table-center">{formatArabicCurrency(row.curr, 'EGP')}</td>)}
                        {visibleCompareColumns.includes('variance') && (<td className="table-center">{formatArabicCurrency(row.variance, 'EGP')}</td>)}
                        {visibleCompareColumns.includes('pct') && (<td className="table-center">{row.pct == null ? '—' : `${(row.pct * 100).toFixed(2)}%`}</td>)}
                      </tr>
                    )
                  )
                ))
              ) : (
                (showHierarchy ? hierarchicalRows : (asOf ? flatVisible : rows).map(r => ({ kind: 'account' as const, code: r.code, name: r.name, level: 1, debit: Number(r.debit_amount||0), credit: Number(r.credit_amount||0), account_id: r.account_id } as any))).map((row: any) => (
                  row.kind === 'group' ? (
                    <tr
                      key={`group-${row.code}`}
                      className={styles.groupRow}
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [row.code]: !prev[row.code] }))}
                      title="تبديل عرض تفاصيل المجموعة"
                    >
                      <td className={`${styles.groupCell} ${styles['level' + row.level]}`} colSpan={2}>
                        <span className={styles.expandIcon}>{expandedGroups[row.code] ? '▾' : '▸'}</span>
                        <span className={styles.groupName}>{row.code} - {row.name}</span>
                      </td>
                      {visibleNormalAmountKeys.map(k => (
                        k === 'debit' ? (
                          <td key={k} className={styles.totalCell}>{formatArabicCurrency(row.debit, 'EGP')}</td>
                        ) : (
                          <td key={k} className={styles.totalCell}>{formatArabicCurrency(row.credit, 'EGP')}</td>
                        )
                      ))}
                    </tr>
                  ) : (
                    showHierarchy ? null : (
                      <tr
                        key={row.account_id}
                        className={styles.rowClickable}
                        onClick={() => {
                        try {
                          const params = new URLSearchParams();
                          params.set('accountId', row.account_id);
                          params.set('orgId', ORG_ID);
                          if (selectedProject) params.set('projectId', selectedProject);
                          params.set('postedOnly', (balanceMode === 'posted').toString());
                          params.set('includeOpening', 'true');
                          if (asOf) params.set('dateTo', asOf);
                          const url = `/reports/general-ledger?${params.toString()}`;
                          window.open(url, '_blank');
                        } catch {}
                      }}
                        title="عرض دفتر الأستاذ لهذا الحساب"
                      >
                        {visibleNormalColumns.includes('code') && (<td className="table-code-cell">{row.code}</td>)}
                        {visibleNormalColumns.includes('name') && (<td>{row.name}</td>)}
                        {visibleNormalColumns.includes('debit') && (<td className="table-center">{row.debit > 0 ? formatArabicCurrency(row.debit, 'EGP') : '—'}</td>)}
                        {visibleNormalColumns.includes('credit') && (<td className="table-center">{row.credit > 0 ? formatArabicCurrency(row.credit, 'EGP') : '—'}</td>)}
                      </tr>
                    )
                  )
                ))
              )}
            </tbody>
            <tfoot>
              {compareMode ? (
                showHierarchy ? (
                  <tr>
                    <td colSpan={2} className={styles.totalLabel}>الإجمالي</td>
                    {visibleCompareAmountKeys.map(k => (
                      k === 'pct' ? (
                        <td key={k}></td>
                      ) : k === 'prev' ? (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totalsCompare?.prev || 0, 'EGP')}</td>
                      ) : k === 'curr' ? (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totalsCompare?.curr || 0, 'EGP')}</td>
                      ) : (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency((totalsCompare?.variance || 0), 'EGP')}</td>
                      )
                    ))}
                  </tr>
                ) : (
                  <tr>
                    {(() => {
                      const nonCount = visibleCompareColumns.filter(k => k === 'code' || k === 'name').length
                      return nonCount > 0 ? (
                        <td colSpan={nonCount} className={styles.totalLabel}>الإجمالي</td>
                      ) : null
                    })()}
                    {visibleCompareAmountKeys.map(k => (
                      k === 'pct' ? (
                        <td key={k}></td>
                      ) : k === 'prev' ? (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totalsCompare?.prev || 0, 'EGP')}</td>
                      ) : k === 'curr' ? (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totalsCompare?.curr || 0, 'EGP')}</td>
                      ) : (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency((totalsCompare?.variance || 0), 'EGP')}</td>
                      )
                    ))}
                  </tr>
                )
              ) : (
                showHierarchy ? (
                  <tr>
                    <td colSpan={2} className={styles.totalLabel}>الإجمالي</td>
                    {visibleNormalAmountKeys.map(k => (
                      k === 'debit' ? (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totals.debit, 'EGP')}</td>
                      ) : (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totals.credit, 'EGP')}</td>
                      )
                    ))}
                  </tr>
                ) : (
                  <tr>
                    {(() => {
                      const nonCount = visibleNormalColumns.filter(k => k === 'code' || k === 'name').length
                      return nonCount > 0 ? (
                        <td colSpan={nonCount} className={styles.totalLabel}>الإجمالي</td>
                      ) : null
                    })()}
                    {visibleNormalAmountKeys.map(k => (
                      k === 'debit' ? (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totals.debit, 'EGP')}</td>
                      ) : (
                        <td key={k} className={`table-center ${styles.totalCell}`}>{formatArabicCurrency(totals.credit, 'EGP')}</td>
                      )
                    ))}
                  </tr>
                )
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TrialBalancePage
