import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Switch,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { tokens } from '@/theme/tokens'
import { OpeningBalanceImportService, type ValidationReport } from '@/services/OpeningBalanceImportService'
import { ImportProgressTracker } from '@/components/Fiscal/ImportProgressTracker'
import { ValidationResults } from '@/components/Fiscal/ValidationResults'
import { FiscalYearSelector } from '@/components/Fiscal/FiscalYearSelector'
import { BalanceReconciliationPanel } from '@/components/Fiscal/BalanceReconciliationPanel'
import { PeriodClosingService } from '@/services/PeriodClosingService'
import { getActiveOrgId, getActiveProjectId } from '@/utils/org'
import { supabase } from '@/utils/supabase'
import { countMapped } from '@/utils/csv'

// Full-page enterprise layout using tokens
export default function OpeningBalanceImportPage() {
  const [orgId, setOrgId] = useState<string>(() => getActiveOrgId() || '')
  const [projectId, setProjectId] = useState<string | null>(() => getActiveProjectId())
  const [fiscalYearId, setFiscalYearId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ status?: string; totalRows?: number; successRows?: number; failedRows?: number; importId?: string, errorReport?: any[] }>()
  const [dryRunResults, setDryRunResults] = useState<any[]>([])
  const [outcomeFilter, setOutcomeFilter] = useState<'all'|'success'|'warning'|'error'>('all')
  const [previewFilter, setPreviewFilter] = useState('')
  const [debouncedPreviewFilter, setDebouncedPreviewFilter] = useState('')
  const [roundAmounts, setRoundAmounts] = useState<boolean>(true)
  const [forceCurrency, setForceCurrency] = useState<string>('')
  const [preferredCurrencies, setPreferredCurrencies] = useState<string[]>([])
  const [reconPeriodId, setReconPeriodId] = useState<string>('')
  const [reconValues, setReconValues] = useState<{ glTotal: number; openingTotal: number; difference: number } | null>(null)
  const [reconBusy, setReconBusy] = useState(false)
  const [showAudit, setShowAudit] = useState<boolean>(true)
  const [negativeAsCredit, setNegativeAsCredit] = useState<boolean>(false)
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [clientIssues, setClientIssues] = useState<{errors:any[]; warnings:any[]}|null>(null)
  const [mapping, setMapping] = useState<{ account_code?: string; amount?: string; cost_center_code?: string; project_code?: string; opening_balance_debit?: string; opening_balance_credit?: string; currency_code?: string }>({})
  const [includeCurrencyInTemplate, setIncludeCurrencyInTemplate] = useState<boolean>(false)
  const [mappingSource, setMappingSource] = useState<'guessed'|'saved'|'default'>('guessed')
  const [dryRunDetailsOpen, setDryRunDetailsOpen] = useState(false)
  const [dryRunSelected, setDryRunSelected] = useState<any | null>(null)
  const [dryRunLimit, setDryRunLimit] = useState<number>(50)
  const [onlyWithMessages, setOnlyWithMessages] = useState<boolean>(false)
  const [showOnlyMapped, setShowOnlyMapped] = useState<boolean>(false)
  const [showWizard, setShowWizard] = useState<boolean>(false)
  const [wizardStep, setWizardStep] = useState<number>(0)

  const disabled = useMemo(() => busy || !orgId || !fiscalYearId || !file, [busy, orgId, fiscalYearId, file])

  // Sync with top bar filters via localStorage
  React.useEffect(() => {
    const sync = () => {
      setOrgId(getActiveOrgId() || '')
      setProjectId(getActiveProjectId())
    }
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'org_id' || e.key === 'project_id') sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const onTemplate = async () => {
    const blob = await OpeningBalanceImportService.generateImportTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'opening_balance_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const subscribeToImport = (importId: string) => {
    // Clean previous channel
    channel?.unsubscribe()
    const ch = supabase
      .channel(`obi:${importId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'opening_balance_imports',
        filter: `id=eq.${importId}`,
      }, (payload: any) => {
        const row = payload.new || payload.old
        if (row && row.id === importId) {
          setStatus((prev) => ({
            importId,
            status: row.status,
            totalRows: row.total_rows,
            successRows: row.success_rows,
            failedRows: row.failed_rows,
            errorReport: row.error_report || prev?.errorReport,
          }))
        }
      })
      .subscribe()
    setChannel(ch)
  }

  // Polling fallback for job status in case realtime misses updates
  React.useEffect(() => {
    let timer: any
    const terminate = (s?: string) => s === 'completed' || s === 'failed' || s === 'partially_completed'
    if (status?.importId && !terminate(status.status)) {
      timer = setInterval(async () => {
        try {
          const next = await OpeningBalanceImportService.getImportStatus(status.importId!)
          setStatus(prev => ({
            importId: next.importId,
            status: next.status,
            totalRows: next.totalRows,
            successRows: next.successRows,
            failedRows: next.failedRows,
            errorReport: Array.isArray(next.errorReport) && next.errorReport.length ? next.errorReport : (prev?.errorReport || []),
          }))
        } catch {}
      }, 2000)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [status?.importId, status?.status])

  const onImport = async () => {
    if (!file || !orgId || !fiscalYearId) return
    setBusy(true)
    setReport(null)
    try {
      const res = await OpeningBalanceImportService.importFromExcel(orgId, fiscalYearId, file)
      // Optional toast feedback if available
      try { (window as any)?.toast?.success?.('Import started') } catch {}
      setStatus({
        importId: res.importId,
        status: res.status,
        totalRows: res.totalRows,
        successRows: res.successRows,
        failedRows: res.failedRows,
      })
      // Realtime subscribe for this import
      if (res.importId) subscribeToImport(res.importId)

      // Run server-side validation summary
      const r = await OpeningBalanceImportService.validateOpeningBalances(orgId, fiscalYearId)
      setReport(r)
    } catch (e: any) {
      setStatus({ status: 'failed', totalRows: 0, successRows: 0, failedRows: 0 })
      alert(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  const onReset = () => {
    setFile(null)
    setReport(null)
    setStatus(undefined)
    setDryRunResults([])
    channel?.unsubscribe()
    setChannel(null)
  }

  // Helpers to reuse validate and dry-run logic (also used for keyboard shortcuts)
  const [validateBusy, setValidateBusy] = useState(false)
  const [dryRunBusy, setDryRunBusy] = useState(false)
  const [serverValidateBusy, setServerValidateBusy] = useState(false)
  const [importHistory, setImportHistory] = useState<any[] | null>(null)

  const doValidate = React.useCallback(() => {
    if (!mapping.account_code || !mapping.amount || previewRows.length===0) return
    try {
      setValidateBusy(true)
      const { normalizeOpeningBalanceRows, validateOpeningBalanceRows } = require('@/utils/csv')
      let normalized = normalizeOpeningBalanceRows(previewRows, mapping)
      if (forceCurrency && !mapping.currency_code) normalized = normalized.map((r:any)=>({ ...r, currency_code: r.currency_code || forceCurrency }))
      if (roundAmounts) normalized = normalized.map((r:any)=>({ ...r, amount: Math.round((Number(r.amount)||0)*100)/100 }))
      const result = validateOpeningBalanceRows(normalized)
      // Augment warnings for negatives if user does not treat negatives as credits
      let warnings = result.warnings
      if (!negativeAsCredit) {
        const negs = normalized
          .map((r:any, idx:number) => ({ idx, amt: Number(r.amount)||0, account_code: r.account_code }))
          .filter(x => x.amt < 0)
        if (negs.length) {
          warnings = warnings.concat(negs.map(n => ({ code: 'W_NEGATIVE', message: 'Negative amount', rowIndex: n.idx, account_code: n.account_code, amount: n.amt })))
        }
      }
      setClientIssues({ errors: result.errors, warnings })
    } catch {}
    finally { setValidateBusy(false) }
  }, [mapping, previewRows, forceCurrency, roundAmounts, negativeAsCredit])

  const doDryRun = React.useCallback(() => {
    if (!mapping.account_code || !mapping.amount || previewRows.length===0) return
    try {
      setDryRunBusy(true)
      const { normalizeOpeningBalanceRows } = require('@/utils/csv')
      const { simulateOpeningBalanceImport } = require('@/services/OpeningBalanceDryRun')
      let normalized = normalizeOpeningBalanceRows(previewRows, mapping)
      if (forceCurrency && !mapping.currency_code) normalized = normalized.map((r:any)=>({ ...r, currency_code: r.currency_code || forceCurrency }))
      if (roundAmounts) normalized = normalized.map((r:any)=>({ ...r, amount: Math.round((Number(r.amount)||0)*100)/100 }))
      const sim = simulateOpeningBalanceImport(normalized)
      setDryRunResults(sim.results)
      setStatus({ status: 'dry-run', totalRows: sim.summary.total, successRows: sim.summary.success, failedRows: sim.summary.errors })
      setClientIssues({ errors: sim.results.filter((r:any)=>r.outcome==='error'), warnings: sim.results.filter((r:any)=>r.outcome==='warning') })
    } catch {}
    finally { setDryRunBusy(false) }
  }, [mapping, previewRows, forceCurrency, roundAmounts])

  // Trigger server-side validation on demand
  const doServerValidate = React.useCallback(async () => {
    if (!orgId || !fiscalYearId) return
    try {
      setServerValidateBusy(true)
      const r = await OpeningBalanceImportService.validateOpeningBalances(orgId, fiscalYearId)
      setReport(r)
      try { (window as any)?.toast?.success?.('Server validation completed') } catch {}
    } catch (e: any) {
      try { (window as any)?.toast?.error?.(e?.message ?? 'Server validation failed') } catch {}
    } finally {
      setServerValidateBusy(false)
    }
  }, [orgId, fiscalYearId])

  // Load import history for selected fiscal year
  const refreshImportHistory = React.useCallback(async () => {
    if (!orgId || !fiscalYearId) { setImportHistory(null); return }
    try {
      const list = await OpeningBalanceImportService.getImportHistory(orgId, fiscalYearId)
      setImportHistory(Array.isArray(list) ? list : [])
    } catch {
      setImportHistory([])
    }
  }, [orgId, fiscalYearId])

  React.useEffect(() => { refreshImportHistory() }, [refreshImportHistory])

  // Number formatters
  const fmtCount = React.useMemo(() => new Intl.NumberFormat(), [])
  const clientTotals = React.useMemo(() => {
    try {
      if (previewRows.length===0 || !mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit)) {
        return { debit: 0, credit: 0, difference: 0, balanced: true }
      }
      const { normalizeOpeningBalanceRows } = require('@/utils/csv')
      let normalized = normalizeOpeningBalanceRows(previewRows, mapping)
      if (forceCurrency && !mapping.currency_code) normalized = normalized.map((r:any)=>({ ...r, currency_code: r.currency_code || forceCurrency }))
      if (roundAmounts) normalized = normalized.map((r:any)=>({ ...r, amount: Math.round((Number(r.amount)||0)*100)/100 }))
      let debit = 0, credit = 0
      for (const r of normalized) {
        const amt = Number(r.amount)||0
        if (amt > 0) debit += amt
        else if (amt < 0) credit += -amt
      }
      const difference = debit - credit
      const balanced = Math.round(difference*100) === 0
      return { debit, credit, difference, balanced }
    } catch { return { debit: 0, credit: 0, difference: 0, balanced: true } }
  }, [previewRows, mapping, roundAmounts, forceCurrency])

  // Persist reconciliation period id
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('obi_recon_period_id')
      if (stored) setReconPeriodId(stored)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('obi_recon_period_id', reconPeriodId) } catch {}
  }, [reconPeriodId])

  // Keyboard shortcuts: Ctrl+Enter => Validate, Shift+Enter => Dry Run
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); doValidate();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault(); doDryRun();
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doValidate, doDryRun])

  // Row issue highlighting sets (from client-side validation and dry-run)
  const errorIndexSet = useMemo(() => {
    const s = new Set<number>()
    try {
      if (clientIssues?.errors) {
        for (const e of clientIssues.errors) {
          if (typeof (e as any).rowIndex === 'number') s.add((e as any).rowIndex)
        }
      }
      if (dryRunResults?.length) {
        dryRunResults.forEach((r: any, i: number) => { if (r.outcome === 'error') s.add(i) })
      }
    } catch {}
    return s
  }, [clientIssues, dryRunResults])
  const warningIndexSet = useMemo(() => {
    const s = new Set<number>()
    try {
      if (clientIssues?.warnings) {
        for (const w of clientIssues.warnings) {
          if (typeof (w as any).rowIndex === 'number') s.add((w as any).rowIndex)
        }
      }
      if (dryRunResults?.length) {
        dryRunResults.forEach((r: any, i: number) => { if (r.outcome === 'warning') s.add(i) })
      }
    } catch {}
    return s
  }, [clientIssues, dryRunResults])

  // First issue message per row (errors preferred, then warnings)
  const rowIssueMessage = useMemo(() => {
    const m = new Map<number, string>()
    try {
      clientIssues?.errors?.forEach((e: any) => {
        if (typeof e.rowIndex === 'number' && e.message && !m.has(e.rowIndex)) m.set(e.rowIndex, e.message)
      })
      clientIssues?.warnings?.forEach((w: any) => {
        if (typeof w.rowIndex === 'number' && w.message && !m.has(w.rowIndex)) m.set(w.rowIndex, w.message)
      })
      if (dryRunResults?.length) {
        dryRunResults.forEach((r: any, i: number) => {
          if (!m.has(i) && r.message) m.set(i, r.message)
        })
      }
    } catch {}
    return m
  }, [clientIssues, dryRunResults])

  const previewAmountSum = useMemo(() => {
    try {
      if (!mapping.amount || previewRows.length === 0) return 0
      const key = (mapping.amount || '').trim()
      return previewRows.reduce((s, r) => s + (Number(r?.[key]) || 0), 0)
    } catch { return 0 }
  }, [mapping, previewRows])

  const filteredPreviewRows = useMemo(() => {
    const q = debouncedPreviewFilter.trim().toLowerCase()
    if (!q) return previewRows
    try {
      return previewRows.filter((row) =>
        Object.values(row || {}).some((v) => String(v ?? '').toLowerCase().includes(q))
      )
    } catch { return previewRows }
  }, [previewRows, debouncedPreviewFilter])

  // Currency distribution derived from preview according to mapping
  const currencyStats = useMemo(() => {
    try {
      const key = (mapping.currency_code || '').trim()
      const counts = new Map<string, number>()
      if (!key) return { total: 0, unique: 0, counts: [] as Array<{ code: string; count: number }> }
      for (const r of filteredPreviewRows) {
        const code = String((r?.[key] ?? '') || '').trim() || '(blank)'
        counts.set(code, (counts.get(code) || 0) + 1)
      }
      const arr = Array.from(counts.entries()).map(([code, count]) => ({ code, count }))
      arr.sort((a,b)=>b.count-a.count)
      return { total: filteredPreviewRows.length, unique: counts.size, counts: arr }
    } catch { return { total: 0, unique: 0, counts: [] as Array<{ code: string; count: number }> } }
  }, [filteredPreviewRows, mapping])

  const mixedCurrencyWarning = useMemo(() => !mapping.currency_code && currencyStats.unique > 1, [mapping, currencyStats])

  // Preview display rows (optionally only mapped columns in canonical order)
  const displayedPreviewRows = useMemo(() => {
    if (!showOnlyMapped) return filteredPreviewRows
    const order: Array<{ key: keyof typeof mapping; label: string }> = [
      { key: 'account_code', label: 'account_code' },
      { key: 'amount', label: 'amount' },
      { key: 'cost_center_code', label: 'cost_center_code' },
      { key: 'project_code', label: 'project_code' },
      { key: 'currency_code', label: 'currency_code' },
    ]
    const headerMap = order
      .map(o => ({ out: o.label, src: (mapping as any)[o.key] as string | undefined }))
      .filter(h => !!h.src)
    if (headerMap.length === 0) return filteredPreviewRows
    try {
      return filteredPreviewRows.map((r) => {
        const o: any = {}
        headerMap.forEach(({ out, src }) => { o[out] = (r as any)[(src as string)] })
        return o
      })
    } catch { return filteredPreviewRows }
  }, [filteredPreviewRows, mapping, showOnlyMapped])

  // First unmapped required field (for pulsing highlight)
  const firstUnmappedRequired = useMemo(() => {
    if (!mapping.account_code) return 'account_code'
    if (!mapping.amount) return 'amount'
    return null
  }, [mapping])

  // Ref and auto-scroll to preview on filter changes
  const previewRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    try { previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlyMapped, debouncedPreviewFilter])

  // Persist preview filter in sessionStorage
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem('obi_preview_filter')
      if (saved !== null) setPreviewFilter(saved)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    try { sessionStorage.setItem('obi_preview_filter', previewFilter) } catch {}
  }, [previewFilter])
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedPreviewFilter(previewFilter), 200)
    return () => clearTimeout(id)
  }, [previewFilter])

  // Wizard persistence: resume and step
  React.useEffect(() => {
    try {
      const resume = localStorage.getItem('obi_wizard_resume') === '1'
      const stepRaw = localStorage.getItem('obi_wizard_step')
      const suppress = localStorage.getItem('obi_wizard_suppress') === '1'
      if (!suppress && (resume || !stepRaw)) {
        if (stepRaw && !Number.isNaN(Number(stepRaw))) setWizardStep(Number(stepRaw))
        setShowWizard(true)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    if (showWizard) {
      try {
        localStorage.setItem('obi_wizard_step', String(wizardStep))
        localStorage.setItem('obi_wizard_resume', '1')
      } catch {}
    } else {
      try { localStorage.setItem('obi_wizard_resume', '0') } catch {}
    }
  }, [showWizard, wizardStep])

  // Wizard: autofocus first required mapping when on Map step
  React.useEffect(() => {
    if (showWizard && wizardStep === 1) {
      // Focus account_code select button if present
      setTimeout(() => {
        try {
          const el = document.querySelector('[data-map-key="account_code"] button, [data-map-key="account_code"] input') as HTMLElement | null
          el?.focus()
        } catch {}
      }, 50)
    }
  }, [showWizard, wizardStep])

  // Load/save defaults for rounding and negative handling
  React.useEffect(() => {
    try {
      const r = localStorage.getItem('obi_round_amounts')
      if (r !== null) setRoundAmounts(r === '1')
      const n = localStorage.getItem('obi_negative_as_credit')
      if (n !== null) setNegativeAsCredit(n === '1')
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('obi_round_amounts', roundAmounts ? '1' : '0') } catch {}
  }, [roundAmounts])
  React.useEffect(() => {
    try { localStorage.setItem('obi_negative_as_credit', negativeAsCredit ? '1' : '0') } catch {}
  }, [negativeAsCredit])

  // Persist table view toggles
  React.useEffect(() => {
    try {
      const m = localStorage.getItem('obi_only_with_messages')
      if (m !== null) setOnlyWithMessages(m === '1')
      const s = localStorage.getItem('obi_show_only_mapped')
      if (s !== null) setShowOnlyMapped(s === '1')
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => { try { localStorage.setItem('obi_only_with_messages', onlyWithMessages ? '1' : '0') } catch {} }, [onlyWithMessages])
  React.useEffect(() => {
    try { localStorage.setItem('obi_show_only_mapped', showOnlyMapped ? '1' : '0') } catch {} }, [showOnlyMapped])

  // Persist dry-run view prefs
  React.useEffect(() => {
    try {
      const f = localStorage.getItem('obi_dry_outcome') as any
      if (f === 'all' || f === 'success' || f === 'warning' || f === 'error') setOutcomeFilter(f)
      const lim = localStorage.getItem('obi_dry_limit')
      if (lim && !Number.isNaN(Number(lim))) setDryRunLimit(Number(lim))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => { try { localStorage.setItem('obi_dry_outcome', outcomeFilter) } catch {} }, [outcomeFilter])
  React.useEffect(() => { try { localStorage.setItem('obi_dry_limit', String(dryRunLimit)) } catch {} }, [dryRunLimit])
  // Preferred currencies persistence
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('obi_pref_currencies')
      if (raw) setPreferredCurrencies(JSON.parse(raw))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const savePreferredCurrency = (code: string) => {
    try {
      const c = code.trim()
      if (!c) return
      const next = Array.from(new Set([...(preferredCurrencies||[]), c]))
      setPreferredCurrencies(next)
      localStorage.setItem('obi_pref_currencies', JSON.stringify(next))
      try { (window as any)?.toast?.success?.(`Added ${c} to preferred currencies`) } catch {}
    } catch {}
  }

  // Save mapping for this file name when mapping changes and preview is available
  React.useEffect(() => {
    if (!file || previewRows.length === 0) return
    try {
      const key = `obi_mapping_${file.name}`
      const payload = JSON.stringify(mapping)
      localStorage.setItem(key, payload)
    } catch {}
  }, [mapping, file, previewRows])

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: tokens.palette.background.default,
      py: tokens.spacing(4) as any,
    }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3, borderRadius: tokens.radius.lg, boxShadow: tokens.shadows.panel }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2} mb={3}>
            <Box>
              <Typography variant="h5" fontWeight={700}>Opening Balance Import</Typography>
              <Typography variant="body2" color="text.secondary">Upload Excel, track import, and validate results</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onTemplate}>Template</Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                title="Prefilled with current active postable accounts (debit/credit)."
                onClick={async () => {
                  if (!orgId) { try { (window as any)?.toast?.error?.('Select organization first') } catch {}; return }
                  try {
                    const blob = await OpeningBalanceImportService.generateAccountsPrefilledTemplate(orgId, { includeCurrency: includeCurrencyInTemplate })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = includeCurrencyInTemplate ? 'opening_balance_current_accounts_with_currency.xlsx' : 'opening_balance_current_accounts.xlsx'
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (e:any) { alert(e?.message ?? String(e)) }
                }}
              >Template (Current Accounts)</Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                title="Prefilled CSV with current active postable accounts (debit/credit)."
                onClick={async () => {
                  if (!orgId) { try { (window as any)?.toast?.error?.('Select organization first') } catch {}; return }
                  try {
                    const blob = await OpeningBalanceImportService.generateAccountsPrefilledCsv(orgId, { includeCurrency: includeCurrencyInTemplate })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = includeCurrencyInTemplate ? 'opening_balance_current_accounts_with_currency.csv' : 'opening_balance_current_accounts.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (e:any) { alert(e?.message ?? String(e)) }
                }}
              >Template (Current Accounts) CSV</Button>
              <FormControlLabel
                control={<Checkbox checked={includeCurrencyInTemplate} onChange={(e)=> setIncludeCurrencyInTemplate(e.target.checked)} />}
                label="Include currency column"
              />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  try {
                    const { downloadCsv } = require('@/utils/csvExport')
                    const csv = [
                      'account_code,project_code,cost_center_code,amount,currency_code',
                      'كود الحساب,كود المشروع,كود مركز التكلفة,المبلغ,العملة',
                    ].join('\n')
                    downloadCsv(csv, 'opening_balance_template.csv')
                  } catch {}
                }}
              >Template CSV</Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                title="Generates a header row based on current mapping (falls back to canonical names if unmapped)"
                onClick={() => {
                  try {
                    const { downloadCsv } = require('@/utils/csvExport')
                    const canonical = ['account_code','project_code','cost_center_code','amount','currency_code']
                    const headers = canonical.map((k) => (mapping as any)[k] || k)
                    const csv = headers.join(',') + '\n'
                    downloadCsv(csv, 'opening_balance_headers_from_mapping.csv')
                  } catch {}
                }}
              >Header CSV (from Mapping)</Button>
              <Button variant="text" startIcon={<RestartAltIcon />} onClick={onReset}>Reset</Button>
              <Button variant="text" onClick={() => { setShowWizard(true); setWizardStep(0) }}>Start Wizard</Button>
              <Button variant="text" onClick={() => {
                try {
                  // Clear stored preferences and mappings
                  const toRemove: string[] = []
                  for (let i=0;i<localStorage.length;i++) {
                    const k = localStorage.key(i) || ''
                    if (k.startsWith('obi_mapping_') || k === 'obi_mapping_default' || k === 'obi_pref_currencies' || k === 'obi_round_amounts' || k === 'obi_negative_as_credit') {
                      toRemove.push(k)
                    }
                  }
                  toRemove.forEach(k => localStorage.removeItem(k))
                  try { sessionStorage.removeItem('obi_preview_filter') } catch {}
                  // Reset component state
                  setPreferredCurrencies([])
                  setForceCurrency('')
                  setRoundAmounts(true)
                  setNegativeAsCredit(true)
                  setMappingSource('guessed')
                  try { (window as any)?.toast?.success?.('Preferences reset') } catch {}
                } catch {}
              }}>Reset Preferences</Button>
            </Stack>
          </Stack>

          <Grid container spacing={3}>
            {showWizard && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p:2, mb: 1 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Opening Balance Import Wizard</Typography>
                    <Stepper activeStep={wizardStep} alternativeLabel>
                      {['Upload','Map','Validate','Dry Run','Export'].map((label) => (
                        <Step key={label}><StepLabel>{label}</StepLabel></Step>
                      ))}
                    </Stepper>
                    <Typography variant="body2" color="text.secondary">
                      {wizardStep===0 && 'Step 1: Choose or drop your file. The first 100 rows will preview.'}
                      {wizardStep===1 && 'Step 2: Auto-map or select required columns (account_code and amount).'}
                      {wizardStep===2 && 'Step 3: Run client-side Validate (Ctrl+Enter) to see errors/warnings.'}
                      {wizardStep===3 && 'Step 4: Run Dry Run (Shift+Enter) to simulate outcomes without saving.'}
                      {wizardStep===4 && 'Step 5: Export Normalized CSV to share what will be interpreted.'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" disabled={wizardStep===0} onClick={()=> setWizardStep(s => Math.max(0, s-1))}>Back</Button>
                      {wizardStep===0 && (
                        <Button size="small" variant="outlined" disabled={!file} onClick={()=> setWizardStep(1)}>Next</Button>
                      )}
                      {wizardStep===1 && (
                        <Button size="small" variant="outlined" disabled={previewRows.length===0} onClick={() => {
                          try {
                            const head = previewRows[0] ? Object.keys(previewRows[0]) : []
                            const { guessOpeningBalanceMapping } = require('@/utils/csv')
                            const guessed = guessOpeningBalanceMapping(head)
                            setMapping(m => ({
                              account_code: m.account_code || guessed.account_code,
                              amount: m.amount || guessed.amount,
                              cost_center_code: m.cost_center_code || guessed.cost_center_code,
                              project_code: m.project_code || guessed.project_code,
                              currency_code: (m as any).currency_code || (guessed as any).currency_code,
                            }))
                            setWizardStep(2)
                          } catch { setWizardStep(2) }
                        }}>Auto-map & Next</Button>
                      )}
                      {wizardStep===2 && (
                        <Button size="small" variant="outlined" disabled={!mapping.account_code || !mapping.amount || previewRows.length===0} onClick={() => { doValidate(); setWizardStep(3) }}>Validate & Next</Button>
                      )}
                      {wizardStep===3 && (
                        <Button size="small" variant="outlined" disabled={!mapping.account_code || !mapping.amount || previewRows.length===0} onClick={() => { doDryRun(); setWizardStep(4) }}>Dry Run & Next</Button>
                      )}
                      {wizardStep===4 && (
                        <Button size="small" variant="contained" onClick={() => setShowWizard(false)}>Finish</Button>
                      )}
                      <Button size="small" onClick={()=> { try { localStorage.setItem('obi_wizard_resume','1'); localStorage.setItem('obi_wizard_step', String(wizardStep)) } catch {}; setShowWizard(false) }}>Resume later</Button>
                      <Button size="small" color="warning" onClick={()=> { try { localStorage.setItem('obi_wizard_suppress','1'); localStorage.setItem('obi_wizard_resume','0') } catch {}; setShowWizard(false) }}>Don't show again</Button>
                      <Button size="small" onClick={()=> setShowWizard(false)}>Close</Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <TextField
                  label="Organization ID"
                  value={orgId}
                  size="small"
                  InputProps={{ readOnly: true }}
                  helperText={orgId ? 'From top bar scope' : 'Select organization from top bar'}
                />
                <TextField
                  label="Project ID (scope)"
                  value={projectId || ''}
                  size="small"
                  InputProps={{ readOnly: true }}
                  helperText={projectId ? 'From top bar scope' : 'All projects'}
                />
                <FiscalYearSelector
                  value={fiscalYearId}
                  onChange={(id) => setFiscalYearId(id)}
                  helperText={!fiscalYearId ? 'Select fiscal year' : undefined}
                />
                <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <CloudUploadIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">Drag & drop Excel here or choose file</Typography>
                    <input
                      type="file"
accept=".xlsx,.xls,.csv"
                      onChange={async (e) => {
                        const f = e.target.files?.[0] ?? null
                        setFile(f)
                        setPreviewRows([])
                        setClientIssues(null)
                        if (f) {
                          // Client-side preview using xlsx
                          try {
                            const isCsv = /\.csv$/i.test(f.name)
                            if (isCsv) {
                              const text = await f.text()
                              const { parseCsv } = await import('@/utils/csv')
                              const rows = parseCsv(text)
                              const head = rows[0] ? Object.keys(rows[0]) : []
                      const { guessOpeningBalanceMapping } = await import('@/utils/csv')
                              const guessed = guessOpeningBalanceMapping(head)
                              setMapping((m) => ({
                                account_code: m.account_code || guessed.account_code,
                                amount: m.amount || guessed.amount,
                                cost_center_code: m.cost_center_code || guessed.cost_center_code,
                                project_code: m.project_code || guessed.project_code,
                              }))
                              setMappingSource('guessed')
                              const first100 = rows.slice(0, 100)
                              setPreviewRows(first100)
                              // Try restore saved mapping for this filename if headers match
                              try {
                                const savedRaw = localStorage.getItem(`obi_mapping_${f.name}`)
                                if (savedRaw) {
                                  const saved = JSON.parse(savedRaw)
                                  const headers = new Set(Object.keys(first100[0]||{}))
                                  const restored = {
                                    account_code: headers.has(saved.account_code) ? saved.account_code : guessed.account_code,
                                    amount: headers.has(saved.amount) ? saved.amount : guessed.amount,
                                    cost_center_code: headers.has(saved.cost_center_code) ? saved.cost_center_code : guessed.cost_center_code,
                                    project_code: headers.has(saved.project_code) ? saved.project_code : guessed.project_code,
                                  }
                                  setMapping(restored)
                                  setMappingSource('saved')
                                  try { (window as any)?.toast?.info?.(`Restored saved mapping for ${f.name}`) } catch {}
                                } else {
                                  // Try default mapping
                                  const defRaw = localStorage.getItem('obi_mapping_default')
                                  if (defRaw) {
                                    const def = JSON.parse(defRaw)
                                    const headers = new Set(Object.keys(first100[0]||{}))
                                    const restoredDef = {
                                      account_code: headers.has(def.account_code) ? def.account_code : guessed.account_code,
                                      amount: headers.has(def.amount) ? def.amount : guessed.amount,
                                      cost_center_code: headers.has(def.cost_center_code) ? def.cost_center_code : guessed.cost_center_code,
                                      project_code: headers.has(def.project_code) ? def.project_code : guessed.project_code,
                                    }
                                    setMapping(restoredDef)
                                    setMappingSource('default')
                                    try { (window as any)?.toast?.info?.('Applied default mapping') } catch {}
                                  }
                                }
                              } catch {}
                              
                            } else {
                              const buf = await f.arrayBuffer()
                            const XLSX = await import('xlsx')
                            const wb = XLSX.read(buf, { type: 'array' })
                            const sh = wb.Sheets[wb.SheetNames[0]]
                            const rows = XLSX.utils.sheet_to_json(sh, { defval: null }) as any[]
                            const head = rows[0] ? Object.keys(rows[0]) : []
                            const { guessOpeningBalanceMapping } = await import('@/utils/csv')
                            const guessed = guessOpeningBalanceMapping(head)
                            setMapping((m) => ({
                              account_code: m.account_code || guessed.account_code,
                              amount: m.amount || guessed.amount,
                              cost_center_code: m.cost_center_code || guessed.cost_center_code,
                              project_code: m.project_code || guessed.project_code,
                            }))
                            setMappingSource('guessed')
                            const first100 = rows.slice(0, 100)
                            setPreviewRows(first100)
                            // Try restore saved mapping for this filename if headers match
                            try {
                              const savedRaw = localStorage.getItem(`obi_mapping_${f.name}`)
                              if (savedRaw) {
                                const saved = JSON.parse(savedRaw)
                                const headers = new Set(Object.keys(first100[0]||{}))
                                const restored = {
                                  account_code: headers.has(saved.account_code) ? saved.account_code : guessed.account_code,
                                  amount: headers.has(saved.amount) ? saved.amount : guessed.amount,
                                  cost_center_code: headers.has(saved.cost_center_code) ? saved.cost_center_code : guessed.cost_center_code,
                                  project_code: headers.has(saved.project_code) ? saved.project_code : guessed.project_code,
                                }
                                setMapping(restored)
                                setMappingSource('saved')
                                try { (window as any)?.toast?.info?.(`Restored saved mapping for ${f.name}`) } catch {}
                              } else {
                                // Try default mapping
                                const defRaw = localStorage.getItem('obi_mapping_default')
                                if (defRaw) {
                                  const def = JSON.parse(defRaw)
                                  const headers = new Set(Object.keys(first100[0]||{}))
                                  const restoredDef = {
                                    account_code: headers.has(def.account_code) ? def.account_code : guessed.account_code,
                                    amount: headers.has(def.amount) ? def.amount : guessed.amount,
                                    cost_center_code: headers.has(def.cost_center_code) ? def.cost_center_code : guessed.cost_center_code,
                                    project_code: headers.has(def.project_code) ? def.project_code : guessed.project_code,
                                  }
                                  setMapping(restoredDef)
                                  setMappingSource('default')
                                  try { (window as any)?.toast?.info?.('Applied default mapping') } catch {}
                                }
                              }
                            } catch {}
                            
                          }
                          } catch {}
                        }
                      }}
                    />
                    {file && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">{file.name}</Typography>
                        <Button size="small" onClick={() => setFile(null)}>Clear File</Button>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
                {/* Column Mapping */}
                {previewRows.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Column Mapping</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
Preview rows: {previewRows.length} • Mapped: {countMapped(mapping)}/5
                        </Typography>
                        <Tooltip title="Required: account_code, amount. Optional: cost_center_code, project_code, currency_code. Mapping drives client-side Normalize, Validate, and Dry Run.">
                          <IconButton size="small" aria-label="Mapping help">
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Chip size="small" color={mappingSource==='saved'?'success':mappingSource==='default'?'info':undefined} label={`Mapping: ${mappingSource}`} />
                        <Button size="small" variant="outlined" onClick={async () => {
                          try { await navigator.clipboard.writeText(JSON.stringify(mapping, null, 2)); (window as any)?.toast?.success?.('Copied mapping JSON') } catch {}
                        }}>Copy Mapping JSON</Button>
                        <Button size="small" variant="outlined" onClick={async () => {
                          try {
                            const head = previewRows[0] ? Object.keys(previewRows[0]) : []
                            const { guessOpeningBalanceMapping } = require('@/utils/csv')
                            const guessed = guessOpeningBalanceMapping(head)
                            setMapping({
                              account_code: guessed.account_code,
                              amount: guessed.amount,
                              opening_balance_debit: (guessed as any).opening_balance_debit,
                              opening_balance_credit: (guessed as any).opening_balance_credit,
                              cost_center_code: guessed.cost_center_code,
                              project_code: guessed.project_code,
                              currency_code: guessed.currency_code,
                            })
                            setMappingSource('guessed')
                            try { (window as any)?.toast?.info?.('Applied auto-mapping from headers') } catch {}
                          } catch {}
                        }}>Auto-map</Button>
                        <Button size="small" variant="outlined" onClick={() => {
                          try {
                            const defRaw = localStorage.getItem('obi_mapping_default')
                            if (!defRaw) return
                            const def = JSON.parse(defRaw)
                            const headers = new Set(Object.keys(previewRows[0]||{}))
                            const restored = {
                              account_code: headers.has(def.account_code) ? def.account_code : undefined,
                              amount: headers.has(def.amount) ? def.amount : undefined,
                              opening_balance_debit: headers.has(def.opening_balance_debit) ? def.opening_balance_debit : undefined,
                              opening_balance_credit: headers.has(def.opening_balance_credit) ? def.opening_balance_credit : undefined,
                              cost_center_code: headers.has(def.cost_center_code) ? def.cost_center_code : undefined,
                              project_code: headers.has(def.project_code) ? def.project_code : undefined,
                              currency_code: headers.has(def.currency_code) ? def.currency_code : undefined,
                            }
                            setMapping(restored)
                            setMappingSource('default')
                            try { (window as any)?.toast?.info?.('Applied default mapping') } catch {}
                          } catch {}
                        }}>Apply Default</Button>
                        <Button size="small" variant="outlined" disabled={!file} onClick={async () => {
                          try {
                            if (!file) return
                            localStorage.removeItem(`obi_mapping_${file.name}`)
                            // Re-guess from current headers
                            const head = previewRows[0] ? Object.keys(previewRows[0]) : []
                            const { guessOpeningBalanceMapping } = require('@/utils/csv')
                            const guessed = guessOpeningBalanceMapping(head)
                            setMapping({
                              account_code: guessed.account_code,
                              amount: guessed.amount,
                              cost_center_code: guessed.cost_center_code,
                              project_code: guessed.project_code,
                            })
                            try { (window as any)?.toast?.info?.('Reset saved mapping to heuristic defaults') } catch {}
                          } catch {}
                        }}>Reset Saved Mapping</Button>
                        <Button size="small" variant="outlined" onClick={() => {
                          try {
                            localStorage.setItem('obi_mapping_default', JSON.stringify(mapping))
                            setMappingSource('default')
                            try { (window as any)?.toast?.success?.('Saved as default mapping') } catch {}
                          } catch {}
                        }}>Save as Default</Button>
                      </Stack>
                    </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Required: account_code and (amount OR debit/credit) • Optional: cost_center_code, project_code, currency_code
                    </Typography>
                    <Grid container spacing={2}>
                      {['account_code','amount','opening_balance_debit','opening_balance_credit','cost_center_code','project_code','currency_code'].map((key) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <FormControl fullWidth size="small" data-map-key={key} error={previewRows.length>0 && (key==='account_code' || key==='amount') && !(mapping as any)[key]}
                            sx={firstUnmappedRequired===key ? {
                              '@keyframes pulse': {
                                '0%': { boxShadow: '0 0 0 0 rgba(25,118,210,0.6)' },
                                '70%': { boxShadow: '0 0 0 8px rgba(25,118,210,0)' },
                                '100%': { boxShadow: '0 0 0 0 rgba(25,118,210,0)' },
                              },
                              animation: 'pulse 1.8s ease-out 0s 3',
                              borderRadius: 1,
                            } : undefined}
                          >
                            <InputLabel>{key}{(key==='account_code' || key==='amount' || key==='opening_balance_debit' || key==='opening_balance_credit') ? '' : ''}</InputLabel>
                            <Select
                              label={`${key}`}
                              value={(mapping as any)[key] || ''}
                              onChange={(e) => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                            >
                              {(previewRows[0] ? Object.keys(previewRows[0]) : []).map((h) => (
                                <MenuItem key={h} value={h}>{h}</MenuItem>
                              ))}
                            </Select>
                            {key==='account_code' && !(mapping as any)[key] && previewRows.length>0 && (
                              <FormHelperText>This field is required for validation</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}

                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControlLabel control={<Switch size="small" checked={roundAmounts} onChange={(_,v)=>setRoundAmounts(v)} />} label={<Typography variant="caption" title="Applies to preview Validate and Dry Run. Rounds values client-side; does not affect original file.">Round amounts to 2 decimals</Typography>} />
                  {!mapping.currency_code && (
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
                      <TextField size="small" placeholder="Force currency (e.g., USD)" value={forceCurrency} onChange={(e)=>setForceCurrency(e.target.value)} />
                      <Button size="small" variant="outlined" onClick={() => savePreferredCurrency(forceCurrency)} disabled={!forceCurrency.trim()}>Save as preferred</Button>
                      {!!preferredCurrencies.length && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          {preferredCurrencies.map((c)=> (
                            <Chip key={c} size="small" label={c} onClick={()=>setForceCurrency(c)} />
                          ))}
                        </Stack>
                      )}
                      {!!currencyStats.counts.length && (
                        <Button size="small" onClick={() => setForceCurrency(currencyStats.counts[0].code === '(blank)' ? '' : currencyStats.counts[0].code)} title="Use most frequent detected currency">
                          Use Top Currency{currencyStats.counts[0] ? ` (${currencyStats.counts[0].code})` : ''}
                        </Button>
                      )}
                    </Stack>
                  )}
                  <FormControlLabel control={<Switch size="small" checked={negativeAsCredit} onChange={(_,v)=>setNegativeAsCredit(v)} />} label={<Typography variant="caption" title="If off, negatives are flagged as warnings in client-side Validate">Treat negatives as credits (no warning)</Typography>} />
                  <Button
                    title={!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) ? 'Select required columns first' : 'Validates first 100 rows client-side (Ctrl+Enter)'}
                    variant="outlined"
                    disabled={validateBusy || !mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) || previewRows.length===0}
                    sx={showWizard && wizardStep===2 ? { boxShadow: '0 0 0 3px rgba(33,150,243,0.4)', borderColor: 'primary.main' } : undefined}
                    onClick={doValidate}
>Validate{validateBusy ? '…' : ''}</Button>
                  <Button
                    title={!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) ? 'Select required columns first' : 'Simulate import without saving (Shift+Enter)'}
                    variant="outlined"
                    disabled={dryRunBusy || !mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) || previewRows.length===0}
                    sx={showWizard && wizardStep===3 ? { boxShadow: '0 0 0 3px rgba(255,152,0,0.35)', borderColor: 'warning.main' } : undefined}
                    onClick={doDryRun}
>Dry Run{dryRunBusy ? '…' : ''}</Button>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="contained" disabled={!!disabled} title={!file ? 'Choose a file first' : (mapping.opening_balance_debit || mapping.opening_balance_credit) && !clientTotals.balanced ? 'Debit and Credit totals must balance' : undefined} onClick={onImport}>Import</Button>
                    {(mapping.opening_balance_debit || mapping.opening_balance_credit) && (
                      <Chip size="small" label={clientTotals.balanced ? 'Balanced' : 'Unbalanced'} color={clientTotals.balanced ? 'success' : 'warning'} />
                    )}
                  </Stack>
                  <Button
                    variant="outlined"
                    title={!orgId || !fiscalYearId ? 'Select org and fiscal year' : 'Run server-side validations and breakdowns'}
                    disabled={serverValidateBusy || !orgId || !fiscalYearId}
                    onClick={doServerValidate}
                  >Validate on Server{serverValidateBusy ? '…' : ''}</Button>
                  {previewRows.length>0 && mapping.account_code && (mapping.amount || mapping.opening_balance_debit || mapping.opening_balance_credit) && (
                    <Typography variant="caption" color="success.main">Mapping Complete</Typography>
                  )}
                  {previewRows.length>0 && (!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit)) && (
                    <Typography variant="caption" color="text.secondary">
                      Select account_code and either amount OR debit/credit to enable validation.
                    </Typography>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Shortcuts: Ctrl+Enter = Validate, Shift+Enter = Dry Run
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                {status?.errorReport && status.errorReport.length > 0 && (
                  <Alert severity="error">
                    Some rows failed during import. You can download the error report below.
                  </Alert>
                )}
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    disabled={previewRows.length===0}
                    title={previewRows.length===0 ? 'Load a file to enable' : 'Download the first 100 preview rows as CSV'}
                    onClick={() => {
                      try {
                        const { toCsv, downloadCsv } = require('@/utils/csvExport')
                        const csv = toCsv(previewRows)
                        downloadCsv(csv, 'opening_balance_preview.csv')
                      } catch {}
                    }}
                  >Download Preview (CSV)</Button>
                  <Button
                    variant="outlined"
                    disabled={displayedPreviewRows.length===0}
                    title={displayedPreviewRows.length===0 ? 'Nothing to export' : 'Download the visible preview table as CSV'}
                    onClick={() => {
                      try {
                        const { toCsv, downloadCsv } = require('@/utils/csvExport')
                        const csv = toCsv(displayedPreviewRows as any)
                        downloadCsv(csv, 'opening_balance_preview_visible.csv')
                      } catch {}
                    }}
                  >Download Visible (CSV)</Button>
                  <Button
                    variant="outlined"
                    disabled={displayedPreviewRows.length===0}
                    title={displayedPreviewRows.length===0 ? 'Nothing to copy' : 'Copy the visible preview table as CSV'}
                    onClick={async () => {
                      try {
                        const { toCsv } = require('@/utils/csvExport')
                        const csv = toCsv(displayedPreviewRows as any)
                        await navigator.clipboard.writeText(csv)
                      } catch {}
                    }}
                  >Copy Visible CSV</Button>
                  <Button
                    variant="outlined"
                    disabled={previewRows.length===0}
                    title={previewRows.length===0 ? 'Load a file to enable' : 'Copy the first 100 preview rows as CSV to clipboard'}
                    onClick={async () => {
                      try {
                        const { toCsv } = require('@/utils/csvExport')
                        const csv = toCsv(previewRows)
                        await navigator.clipboard.writeText(csv)
                      } catch {}
                    }}
                  >Copy Preview CSV</Button>
                  <Button
                    variant="outlined"
                    disabled={!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) || previewRows.length===0}
                    title={!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) ? 'Select required columns first' : 'Download normalized rows based on mapping (includes rounding/force currency options)'}
                    onClick={() => {
                      try {
                        const { normalizeOpeningBalanceRows } = require('@/utils/csv')
                        const { toCsv, downloadCsv } = require('@/utils/csvExport')
                        let normalized = normalizeOpeningBalanceRows(previewRows, mapping)
                        if (forceCurrency && !mapping.currency_code) normalized = normalized.map((r:any)=>({ ...r, currency_code: r.currency_code || forceCurrency }))
                        if (roundAmounts) normalized = normalized.map((r:any)=>({ ...r, amount: Math.round((Number(r.amount)||0)*100)/100 }))
                        const csv = toCsv(normalized as any)
                        downloadCsv(csv, 'opening_balance_normalized.csv')
                      } catch {}
                    }}
                  >Download Normalized (CSV)</Button>
                  <Button
                    variant="outlined"
                    disabled={!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) || previewRows.length===0}
                    title={!mapping.account_code || (!mapping.amount && !mapping.opening_balance_debit && !mapping.opening_balance_credit) ? 'Select required columns first' : 'Copy normalized rows as CSV to clipboard'}
                    onClick={async () => {
                      try {
                        const { normalizeOpeningBalanceRows } = require('@/utils/csv')
                        const { toCsv } = require('@/utils/csvExport')
                        let normalized = normalizeOpeningBalanceRows(previewRows, mapping)
                        if (forceCurrency && !mapping.currency_code) normalized = normalized.map((r:any)=>({ ...r, currency_code: r.currency_code || forceCurrency }))
                        if (roundAmounts) normalized = normalized.map((r:any)=>({ ...r, amount: Math.round((Number(r.amount)||0)*100)/100 }))
                        const csv = toCsv(normalized as any)
                        await navigator.clipboard.writeText(csv)
                      } catch {}
                    }}
                  >Copy Normalized CSV</Button>
                  <Button
                    variant="outlined"
                    disabled={!clientIssues || ((clientIssues.errors?.length||0)+(clientIssues.warnings?.length||0))===0}
                    title={!clientIssues || ((clientIssues.errors?.length||0)+(clientIssues.warnings?.length||0))===0 ? 'Run Validate or Dry Run to produce issues' : 'Download combined errors and warnings as CSV'}
                    onClick={() => {
                      try {
                        const { toCsv, downloadCsv } = require('@/utils/csvExport')
                        const errRows = (clientIssues?.errors||[]).map((e:any)=>({ type:'error', code:e.code||'', message:e.message||'', rowIndex:e.rowIndex??'', account_code:e.account_code??'', amount:e.amount??'' }))
                        const warnRows = (clientIssues?.warnings||[]).map((w:any)=>({ type:'warning', code:w.code||'', message:w.message||'', rowIndex:w.rowIndex??'', account_code:w.account_code??'', amount:w.amount??'' }))
                        const csv = toCsv([...errRows, ...warnRows])
                        downloadCsv(csv, 'opening_balance_issues.csv')
                      } catch {}
                    }}
                  >Download Issues (CSV)</Button>
                  <Button
                    variant="outlined"
                    disabled={dryRunResults.length===0}
                    title={dryRunResults.length===0 ? 'Run Dry Run first' : 'Download per-row dry-run outcomes as CSV'}
                    onClick={() => {
                      try {
                        const { toCsv, downloadCsv } = require('@/utils/csvExport')
                        const rows = dryRunResults.map((r:any)=>({ outcome:r.outcome, message:r.message||'', account_code:r.account_code, amount:r.amount, cost_center_code:r.cost_center_code||'', project_code:r.project_code||'', currency_code: r.currency_code || '' }))
                        const csv = toCsv(rows)
                        downloadCsv(csv, 'opening_balance_dry_run.csv')
                      } catch {}
                    }}
                  >Download Dry-run (CSV)</Button>
                </Stack>

                {/* Client-side totals (based on current mapping and preview) */}
                {previewRows.length>0 && mapping.account_code && (mapping.amount || mapping.opening_balance_debit || mapping.opening_balance_credit) && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                      <Typography variant="subtitle2">Client totals (preview)</Typography>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Typography variant="body2">Debit: <b>{clientTotals.debit.toLocaleString()}</b></Typography>
                        <Typography variant="body2">Credit: <b>{clientTotals.credit.toLocaleString()}</b></Typography>
                        <Typography variant="body2">Difference: <b style={{ color: clientTotals.balanced ? '#2e7d32' : '#d32f2f' }}>{clientTotals.difference.toLocaleString()}</b></Typography>
                        <Chip size="small" color={clientTotals.balanced ? 'success' : 'warning'} label={clientTotals.balanced ? 'Balanced' : 'Unbalanced'} />
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">These values are computed from the first 100 preview rows using your current mapping and options. Import requires balanced totals when debit/credit columns are used.</Typography>
                  </Paper>
                )}

                <ImportProgressTracker
                  status={status?.status}
                  totalRows={status?.totalRows}
                  successRows={status?.successRows}
                  failedRows={status?.failedRows}
                />

                {/* Reconciliation and Audit Trail hooks */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
                    <Typography variant="subtitle2">Reconciliation</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField size="small" label="Fiscal Period ID" value={reconPeriodId} onChange={(e)=>setReconPeriodId(e.target.value)} placeholder="Optional period for GL compare" />
                      <Button size="small" variant="outlined" disabled={!orgId || !fiscalYearId || !reconPeriodId || reconBusy} onClick={async ()=>{
                        if (!orgId || !fiscalYearId || !reconPeriodId) return
                        try {
                          setReconBusy(true)
                          const data = await PeriodClosingService.getReconciliation(orgId, fiscalYearId, reconPeriodId)
                          setReconValues(data)
                        } catch (e) {
                          setReconValues(null)
                        } finally { setReconBusy(false) }
                      }}>Fetch{reconBusy?'…':''}</Button>
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Compares opening balance total vs GL total within selected period.</Typography>
                  <Box sx={{ mt: 1 }}>
                    <BalanceReconciliationPanel
                      glTotal={reconValues?.glTotal ?? 0}
                      openingTotal={report?.totals?.sum ?? reconValues?.openingTotal ?? 0}
                      difference={(reconValues?.glTotal ?? 0) - (report?.totals?.sum ?? reconValues?.openingTotal ?? 0)}
                    />
                  </Box>
                </Paper>

                {/* Compact Audit Trail */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
                    <Typography variant="subtitle2">Audit Trail</Typography>
                    <Stack direction="row" spacing={1}>
                      <FormControlLabel control={<Switch size="small" checked={showAudit} onChange={(_,v)=>setShowAudit(v)} />} label={<Typography variant="caption">Show</Typography>} />
                      <Button size="small" variant="outlined" onClick={refreshImportHistory}>Refresh</Button>
                      <Button size="small" onClick={() => {
                        try {
                          const { toCsv, downloadCsv } = require('@/utils/csvExport')
                          const data = (importHistory||[]).slice(0, 20).map((r:any) => ({ id:r.id, created_at:r.created_at, status:r.status, total_rows:r.total_rows, success_rows:r.success_rows, failed_rows:r.failed_rows }))
                          const csv = toCsv(data)
                          downloadCsv(csv, 'opening_balance_audit_trail.csv')
                        } catch {}
                      }}>Export CSV</Button>
                      <Button size="small" onClick={() => {
                        try {
                          const data = (importHistory||[]).slice(0, 20).map((r:any) => ({ id:r.id, created_at:r.created_at, status:r.status, total_rows:r.total_rows, success_rows:r.success_rows, failed_rows:r.failed_rows }))
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'opening_balance_audit_trail.json'
                          a.click()
                          URL.revokeObjectURL(url)
                        } catch {}
                      }}>Export JSON</Button>
                    </Stack>
                  </Stack>
                  {showAudit && (
                    <Box sx={{ maxHeight: 180, overflow: 'auto', mt: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['when','id','status','counts'].map(h => <th key={h} style={{ textAlign: h==='counts' ? 'right' : 'left', padding: 4, borderBottom: '1px solid #eee' }}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {(importHistory||[]).slice(0, 10).map((r:any) => (
                            <tr key={r.id}>
                              <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.created_at || ''}</td>
                              <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>
                                <span style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} title="Copy ID" onClick={async ()=>{ try { await navigator.clipboard.writeText(String(r.id)); (window as any)?.toast?.success?.('Copied ID'); } catch {} }}>{r.id}</span>
                              </td>
                              <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.status || ''}</td>
                              <td style={{ textAlign:'right', padding: 4, borderBottom: '1px solid #f5f5f5' }}>T:{fmtCount.format(Number(r.total_rows ?? 0))} • S:{fmtCount.format(Number(r.success_rows ?? 0))} • F:{fmtCount.format(Number(r.failed_rows ?? 0))}</td>
                            </tr>
                          ))}
                          {(!importHistory || importHistory.length === 0) && (
                            <tr><td colSpan={3} style={{ padding: 8, color: '#777' }}>No recent audit entries.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </Box>
                  )}
                </Paper>

                {/* Import History Panel */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
                    <Typography variant="subtitle2">Recent Imports</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={refreshImportHistory} disabled={!orgId || !fiscalYearId}>Refresh</Button>
                      {status?.importId && (
                        <Button size="small" variant="text" onClick={() => subscribeToImport(status.importId!)}>Resubscribe</Button>
                      )}
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Scope: Org {orgId || '(none)'} • Fiscal Year {fiscalYearId || '(none)'} </Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['created_at','id','status','total_rows','success_rows','failed_rows','actions'].map((h) => (
                            <th key={h} style={{ textAlign: h.endsWith('_rows') ? 'right' : 'left', padding: 4, borderBottom: '1px solid #eee' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(importHistory||[]).map((row:any) => (
                          <tr key={row.id}>
                            <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{row.created_at ?? ''}</td>
                            <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>
                              <span style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} title="Copy ID" onClick={async ()=>{ try { await navigator.clipboard.writeText(String(row.id)); (window as any)?.toast?.success?.('Copied ID'); } catch {} }}>{row.id}</span>
                            </td>
                            <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{row.status ?? ''}</td>
                            <td style={{ textAlign:'right', padding: 4, borderBottom: '1px solid #f5f5f5' }}>{fmtCount.format(Number(row.total_rows ?? 0))}</td>
                            <td style={{ textAlign:'right', padding: 4, borderBottom: '1px solid #f5f5f5' }}>{fmtCount.format(Number(row.success_rows ?? 0))}</td>
                            <td style={{ textAlign:'right', padding: 4, borderBottom: '1px solid #f5f5f5' }}>{fmtCount.format(Number(row.failed_rows ?? 0))}</td>
                            <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>
                              <Stack direction="row" spacing={1}>
                                <Button size="small" onClick={async () => { try { const next = await OpeningBalanceImportService.getImportStatus(row.id); setStatus(next) } catch {} }}>Load Status</Button>
                                {Array.isArray(row.error_report) && row.error_report.length > 0 && (
                                  <Button size="small" onClick={() => {
                                    try {
                                      const { toCsv, downloadCsv } = require('@/utils/csvExport')
                                      const csv = toCsv(row.error_report)
                                      downloadCsv(csv, `import_errors_${row.id}.csv`)
                                    } catch {}
                                  }}>Errors CSV</Button>
                                )}
                              </Stack>
                            </td>
                          </tr>
                        ))}
                        {(!importHistory || importHistory.length === 0) && (
                          <tr><td colSpan={6} style={{ padding: 8, color: '#777' }}>No import history for the selected scope.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
                {status?.status === 'dry-run' && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1}>
                      <Box>
                        <Typography variant="subtitle2">Dry-run Summary</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total: {status.totalRows ?? 0} • Success: {status.successRows ?? 0} • Warnings: {clientIssues?.warnings?.length ?? 0} • Errors: {status.failedRows ?? 0}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant={outcomeFilter==='all'?'contained':'outlined'} onClick={() => setOutcomeFilter('all')}>All ({dryRunResults.length})</Button>
                        <Button size="small" color="success" variant={outcomeFilter==='success'?'contained':'outlined'} onClick={() => setOutcomeFilter('success')}>Success ({dryRunResults.filter((r:any)=>r.outcome==='success').length})</Button>
                        <Button size="small" color="warning" variant={outcomeFilter==='warning'?'contained':'outlined'} onClick={() => setOutcomeFilter('warning')}>Warnings ({dryRunResults.filter((r:any)=>r.outcome==='warning').length})</Button>
                        <Button size="small" color="error" variant={outcomeFilter==='error'?'contained':'outlined'} onClick={() => setOutcomeFilter('error')}>Errors ({dryRunResults.filter((r:any)=>r.outcome==='error').length})</Button>
                        <Chip size="small" label={`Err: ${Math.round((dryRunResults.filter((r:any)=>r.outcome==='error').length/(dryRunResults.length||1))*100)}%`} />
                        <Chip size="small" label={`Warn: ${Math.round((dryRunResults.filter((r:any)=>r.outcome==='warning').length/(dryRunResults.length||1))*100)}%`} />
                        <FormControlLabel control={<Switch size="small" checked={onlyWithMessages} onChange={(_,v)=>setOnlyWithMessages(v)} />} label={<Typography variant="caption">Only with messages</Typography>} />
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                          <InputLabel id="dry-limit">Rows</InputLabel>
                          <Select labelId="dry-limit" value={String(dryRunLimit)} label="Rows" onChange={(e)=>setDryRunLimit(Number(e.target.value))}>
                            {[25,50,100].map(n => <MenuItem key={n} value={String(n)}>{n}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Button size="small" variant="outlined" onClick={() => {
                          try {
                            const { toCsv, downloadCsv } = require('@/utils/csvExport')
                            const filtered = dryRunResults.filter((r:any)=> (outcomeFilter==='all' ? true : r.outcome===outcomeFilter) && (!onlyWithMessages || !!(r.message&&String(r.message).trim()))).slice(0,dryRunLimit)
                            const rows = filtered.map((r:any)=>({ outcome:r.outcome, message:r.message||'', account_code:r.account_code, amount:r.amount, cost_center_code:r.cost_center_code||'', project_code:r.project_code||'', currency_code: r.currency_code || '' }))
                            const csv = toCsv(rows)
                            downloadCsv(csv, 'opening_balance_dry_run_filtered.csv')
                          } catch {}
                        }}>Download Filtered CSV</Button>
                        <Button size="small" onClick={async () => {
                          try {
                            const { toCsv } = require('@/utils/csvExport')
                            const filtered = dryRunResults.filter((r:any)=> (outcomeFilter==='all' ? true : r.outcome===outcomeFilter) && (!onlyWithMessages || !!(r.message&&String(r.message).trim()))).slice(0,dryRunLimit)
                            const rows = filtered.map((r:any)=>({ outcome:r.outcome, message:r.message||'', account_code:r.account_code, amount:r.amount, cost_center_code:r.cost_center_code||'', project_code:r.project_code||'', currency_code: r.currency_code || '' }))
                            const csv = toCsv(rows)
                            await navigator.clipboard.writeText(csv)
                          } catch {}
                        }}>Copy Filtered CSV</Button>
                      </Stack>
                    </Stack>
                    {dryRunResults.length>0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">Showing first 50 rows</Typography>
                        <Box sx={{ maxHeight: 280, overflow: 'auto', mt: 1 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['outcome','message','account_code','amount','cost_center_code','project_code','currency_code'].map((k) => (
                                  <th key={k} style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid #eee' }}>{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dryRunResults.filter((r:any)=> (outcomeFilter==='all' ? true : r.outcome===outcomeFilter) && (!onlyWithMessages || !!(r.message&&String(r.message).trim()))).slice(0,dryRunLimit).map((r:any, i:number) => (
                                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { setDryRunSelected(r); setDryRunDetailsOpen(true) }} title="Click for details">
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.outcome}</td>
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.message ?? ''}</td>
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.account_code}</td>
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{String(r.amount ?? '')}</td>
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.cost_center_code ?? ''}</td>
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.project_code ?? ''}</td>
                                  <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{r.currency_code ?? ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      </Box>
                    )}
                  </Paper>
                )}

                <Dialog open={dryRunDetailsOpen} onClose={() => setDryRunDetailsOpen(false)} fullWidth maxWidth="sm">
                  <DialogTitle>Dry-run Row Details</DialogTitle>
                  <DialogContent dividers>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Click a row in the Dry-run table to view details. You can copy as JSON.
                    </Typography>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, margin: 0 }}>
{dryRunSelected ? JSON.stringify(dryRunSelected, null, 2) : 'No row selected.'}
                    </pre>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(dryRunSelected ?? {}, null, 2)); (window as any)?.toast?.success?.('Copied row JSON') } catch {} }}>Copy JSON</Button>
                    <Button onClick={() => setDryRunDetailsOpen(false)}>Close</Button>
                  </DialogActions>
                </Dialog>

                {clientIssues && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="subtitle2">Client validation</Typography>
                        <Typography variant="caption" color="text.secondary">Errors: {clientIssues.errors.length} • Warnings: {clientIssues.warnings.length}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => {
                          try {
                            const { toCsv, downloadCsv } = require('@/utils/csvExport')
                            const errRows = (clientIssues?.errors||[]).map((e:any)=>({ type:'error', code:e.code||'', message:e.message||'', rowIndex:e.rowIndex??'', account_code:e.account_code??'', amount:e.amount??'' }))
                            const warnRows = (clientIssues?.warnings||[]).map((w:any)=>({ type:'warning', code:w.code||'', message:w.message||'', rowIndex:w.rowIndex??'', account_code:w.account_code??'', amount:w.amount??'' }))
                            const csv = toCsv([...errRows, ...warnRows])
                            downloadCsv(csv, 'opening_balance_issues.csv')
                          } catch {}
                        }}>Download Issues CSV</Button>
                        <Button size="small" onClick={async () => {
                          try {
                            const { toCsv } = require('@/utils/csvExport')
                            const errRows = (clientIssues?.errors||[]).map((e:any)=>({ type:'error', code:e.code||'', message:e.message||'', rowIndex:e.rowIndex??'', account_code:e.account_code??'', amount:e.amount??'' }))
                            const warnRows = (clientIssues?.warnings||[]).map((w:any)=>({ type:'warning', code:w.code||'', message:w.message||'', rowIndex:w.rowIndex??'', account_code:w.account_code??'', amount:w.amount??'' }))
                            const csv = toCsv([...errRows, ...warnRows])
                            await navigator.clipboard.writeText(csv)
                          } catch {}
                        }}>Copy Issues CSV</Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )}
                <ValidationResults report={report} />
                {previewRows.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Preview (first 100 rows)</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 1 }}>
                      <Chip size="small" label={`Rows: ${filteredPreviewRows.length}`} />
<Chip size="small" label={`Mapped: ${countMapped(mapping)}/5`} />
                      <Chip size="small" label={`Sum(amount): ${previewAmountSum.toFixed(2)}`} />
                      <Chip size="small" title="Checks if Sum(amount) is ~0 within tolerance" color={Math.abs(previewAmountSum) < 0.005 ? 'success' : 'error'} label={`Balanced: ${Math.abs(previewAmountSum) < 0.005 ? 'Yes' : 'No'}`} />
                      <Chip size="small" title="Rows where the mapped Amount is not a valid number" label={`Non-numeric: ${(()=>{try{const key=(mapping.amount||'').trim();return filteredPreviewRows.filter(r=>isNaN(Number(r?.[key]))).length;}catch{return 0}})()}`} />
                      {mapping.currency_code && (
                        <Chip size="small" title={currencyStats.counts.map(c=>`${c.code}:${c.count}`).join(' | ')} label={`Currencies: ${currencyStats.unique}`} />
                      )}
                      <FormControlLabel control={<Switch size="small" checked={showOnlyMapped} onChange={(_,v)=>setShowOnlyMapped(v)} />} label={<Typography variant="caption" title="Show only columns mapped above, in canonical order">Only mapped columns</Typography>} />
                      <TextField
                        size="small"
                        placeholder="Filter preview..."
                        value={previewFilter}
                        onChange={(e)=>setPreviewFilter(e.target.value)}
                        onKeyDown={(e)=>{ if (e.key === 'Escape') { e.preventDefault(); setPreviewFilter('') } }}
                        sx={{ minWidth: { xs: '100%', md: 260 } }}
                        InputProps={{
                          endAdornment: previewFilter ? (
                            <InputAdornment position="end">
                              <IconButton size="small" aria-label="Clear filter" onClick={() => setPreviewFilter('')}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ) : undefined,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">Row highlights: red = error, amber = warning (from Validate/Dry Run)</Typography>
                    </Stack>
                    {mixedCurrencyWarning && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        Multiple currencies detected in preview but no currency mapping is set. Either map a currency column or set a Force currency value to proceed consistently.
                      </Alert>
                    )}
                    <Box ref={previewRef} sx={{ maxHeight: 280, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid #eee', width: 90 }}>Status</th>
                            {Object.keys(displayedPreviewRows[0] || {}).map((k) => (
                              <th key={k} style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid #eee' }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayedPreviewRows.map((row, i) => {
                            const hasError = errorIndexSet.has(i)
                            const hasWarning = !hasError && warningIndexSet.has(i)
                            const bg = hasError ? 'rgba(244, 67, 54, 0.08)' : hasWarning ? 'rgba(255, 193, 7, 0.10)' : 'transparent'
                            return (
                              <tr key={i} style={{ backgroundColor: bg }}>
                                <td style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }} title={rowIssueMessage.get(i) || ''}>
                                  {hasError ? (
                                    <span style={{ color: '#d32f2f', fontSize: 12, fontWeight: 600 }}>Error</span>
                                  ) : hasWarning ? (
                                    <span style={{ color: '#ed6c02', fontSize: 12, fontWeight: 600 }}>Warning</span>
                                  ) : (
                                    <span style={{ color: '#2e7d32', fontSize: 12 }}>OK</span>
                                  )}
                                </td>
                                {Object.keys(row).map((key, j) => (
                                  <td key={j} style={{ padding: 4, borderBottom: '1px solid #f5f5f5' }}>{String((row as any)[key] ?? '')}</td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </Box>
                  </Paper>
                )}
                {status?.errorReport && status.errorReport.length > 0 && (
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(status.errorReport, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `import_errors_${status.importId}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      Download Error Report (JSON)
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        try {
                          const { toCsv, downloadCsv } = require('@/utils/csvExport')
                          const data = Array.isArray(status.errorReport) ? status.errorReport : []
                          const csv = toCsv(data as any)
                          downloadCsv(csv, `import_errors_${status.importId}.csv`)
                        } catch {}
                      }}
                    >
                      Download Error Report (CSV)
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  )
}