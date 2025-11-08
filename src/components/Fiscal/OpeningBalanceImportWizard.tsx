import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Box, Button, Stack, Typography, Chip, Checkbox, FormControlLabel, Alert, CircularProgress } from '@mui/material'
import DraggableResizableDialog from '@/components/Common/DraggableResizableDialog'
import { FiscalYearSelector } from '@/components/Fiscal/FiscalYearSelector'
import { getActiveOrgId } from '@/utils/org'
import { getOrganizations } from '@/services/organization'
import { OpeningBalanceImportService } from '@/services/OpeningBalanceImportService'
import EnhancedOBImportResultsModal from '@/components/Fiscal/EnhancedOBImportResultsModal'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import OpeningBalanceManualCrud from '@/components/Fiscal/OpeningBalanceManualCrud'
import type { ManualOBRow } from '@/components/Fiscal/OpeningBalanceManualCrud'
import SearchableSelect, { type SearchableSelectOption } from '@/components/Common/SearchableSelect'
import { useToast } from '@/contexts/ToastContext'

interface OpeningBalanceImportWizardProps {
  open: boolean
  onClose: () => void
}

// A lightweight wizard that reuses existing preview/manual/review logic from the page
const OpeningBalanceImportWizard: React.FC<OpeningBalanceImportWizardProps> = ({ open, onClose }) => {
  const { isRTL, t, texts } = useArabicLanguage()
  const { showToast } = (useToast?.() as any) || { showToast: (msg:string,_opts?:any)=>{ try{ (window as any)?.toast?.info?.(msg) } catch {} } }

  // Step: 0 org, 1 fiscal year, 2 choose mode, 3 import process, 4 complete
  const [step, setStep] = useState<number>(0)

  // Basic state
  const [orgId, setOrgId] = useState<string>(() => getActiveOrgId() || '')
  const [fiscalYearId, setFiscalYearId] = useState<string>('')
  const [orgOptions, setOrgOptions] = useState<any[]>([])
  const [orgSelectOptions, setOrgSelectOptions] = useState<SearchableSelectOption[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [mode, setMode] = useState<'file' | 'manual' | ''>('')
  const [manualOpen, setManualOpen] = useState<boolean>(false)
  const [submitForApproval, setSubmitForApproval] = useState<boolean>(false)

  // File preview state
  const [file, setFile] = useState<File | null>(null)
  const [uploadHeaders, setUploadHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])

  // Import status
  const [currentImportId, setCurrentImportId] = useState<string>('')
  const [importStatus, setImportStatus] = useState<any>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)

  // Load org options on open
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const orgs = await getOrganizations()
        setOrgOptions(orgs)
        setOrgSelectOptions((orgs||[]).map((o:any)=> ({ value: o.id, label: o.code ? `${o.code} - ${o.name}` : (o.name || o.id) })))
      } catch { setOrgOptions([]); setOrgSelectOptions([]) }
    })()
  }, [open])

  const close = () => { onClose() }

  // File selection
  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f)
    try {
      const isCsv = /\.csv$/i.test(f.name)
      if (isCsv) {
        const text = await f.text()
        const lines = text.split(/\r?\n/).filter(Boolean)
        const heads = (lines[0] || '').split(',').map(h => h.replace(/^\"|\"$/g,'').trim())
        if (heads.length) setUploadHeaders(heads)
        const body = lines.slice(1).map(l => {
          const vals = l.split(',').map(v => v.replace(/^\"|\"$/g,'').trim())
          const obj: any = {}
          heads.forEach((h,i)=> obj[h]=vals[i] ?? '')
          return obj
        })
        setPreviewRows(body)
      } else {
        const buf = await f.arrayBuffer()
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'array' })
        const sh = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sh, { defval: '' }) as any[]
        if (rows[0]) setUploadHeaders(Object.keys(rows[0]))
        setPreviewRows(rows)
      }
      setStep(3) // go to processing via review/submit button
    } catch {}
  }, [])

  // Import from file
  const startImportFromFile = useCallback(async () => {
    if (!file || !orgId || !fiscalYearId) return
    setLoading(true)
    try {
      const result = await OpeningBalanceImportService.importFromExcel(orgId, fiscalYearId, file)
      setImportStatus(result)
      setCurrentImportId(result.importId)
      if (!['completed','failed','partially_completed'].includes(result.status)) {
        // Poll
        let done = false
        const poll = async () => {
          if (done) return
          try {
            const s = await OpeningBalanceImportService.getImportStatus(result.importId)
            setImportStatus(s)
            if (['completed','failed','partially_completed'].includes(s.status)) {
              done = true
              setShowResultsModal(true)
              setStep(4)
              setLoading(false)
              try {
                if (submitForApproval) {
                  const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId()
                  await OpeningBalanceImportService.requestApproval({ orgId, importId: result.importId, submittedBy })
                  showToast(isRTL ? 'تم إرسال طلب الموافقة' : 'Approval request submitted', { severity:'success' })
                }
              } catch {}
              return
            }
          } catch {}
          setTimeout(poll, 2000)
        }
        poll()
      } else {
        setShowResultsModal(true)
        setStep(4)
        try {
          if (submitForApproval) {
            const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId()
            await OpeningBalanceImportService.requestApproval({ orgId, importId: result.importId, submittedBy })
            showToast(isRTL ? 'تم إرسال طلب الموافقة' : 'Approval request submitted', { severity:'success' })
          }
        } catch {}
      }
    } catch (e) {
      setImportStatus({ status:'failed', error: String((e as any)?.message || e) })
    } finally { setLoading(false) }
  }, [file, orgId, fiscalYearId, submitForApproval, isRTL, showToast])

  // Content per step
  const renderStep = () => {
    if (step === 0) {
      return (
        <Stack spacing={2}>
          <Typography variant="h6">{isRTL ? 'اختيار المؤسسة' : 'Select Organization'}</Typography>
          <Box sx={{ maxWidth: 480 }}>
            <SearchableSelect
              id="wizard-org-select"
              value={orgId}
              options={orgSelectOptions}
              onChange={(v)=> setOrgId(String(v||''))}
              placeholder={isRTL ? 'اختر المؤسسة' : 'Choose organization'}
              clearable
              compact
            />
          </Box>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
            <Button variant="contained" disabled={!orgId} onClick={()=> setStep(1)}>{isRTL ? 'التالي' : 'Next'}</Button>
            <Button onClick={close}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          </Stack>
        </Stack>
      )
    }
    if (step === 1) {
      return (
        <Stack spacing={2}>
          <Typography variant="h6">{isRTL ? 'اختيار السنة المالية' : 'Select Fiscal Year'}</Typography>
          <Box sx={{ maxWidth: 420 }}>
            <FiscalYearSelector value={fiscalYearId} onChange={setFiscalYearId} />
          </Box>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
            <Button variant="contained" disabled={!fiscalYearId} onClick={()=> setStep(2)}>{isRTL ? 'التالي' : 'Next'}</Button>
            <Button onClick={()=> setStep(0)}>{isRTL ? 'رجوع' : 'Back'}</Button>
          </Stack>
        </Stack>
      )
    }
    if (step === 2) {
      return (
        <Stack spacing={2}>
          <Typography variant="h6">{isRTL ? 'اختر طريقة الإدخال' : 'Choose Entry Method'}</Typography>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2}>
            <Button variant="contained" onClick={()=> setMode('file')} sx={{
              borderRadius:'12px',
              background: (theme)=> `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover':{ transform:'scale(1.03)'},
              transition:'all 0.2s ease'
            }}>{isRTL ? 'استيراد ملف' : 'Import from File'}</Button>
            <Button variant="outlined" onClick={()=> setMode('manual')} sx={{
              borderRadius:'12px',
              '&:hover':{ bgcolor:'action.hover', transform:'translateY(-2px)'},
              transition:'all 0.2s ease'
            }}>{isRTL ? 'إدخال يدوي' : 'Manual Entry'}</Button>
          </Stack>
          {mode==='file' && (
            <>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) handleFileSelect(f) }} />
              {file && (
                <Alert severity="info">{isRTL ? 'تم تحديد الملف' : 'File selected'}: {file.name}</Alert>
              )}
              <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems='center'>
                <FormControlLabel control={<Checkbox checked={submitForApproval} onChange={(e)=> setSubmitForApproval(e.target.checked)} />} label={isRTL ? 'إرسال للموافقة فوراً' : 'Send for approval immediately'} />
                <Button variant="contained" disabled={!file} onClick={startImportFromFile} sx={{
                  borderRadius:'12px',
                  background: (theme)=> `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  '&:hover':{ transform:'scale(1.03)'},
                  transition:'all 0.2s ease'
                }}>{isRTL ? 'بدء الاستيراد' : 'Start Import'}</Button>
                <Button onClick={()=> setMode('')} sx={{ borderRadius:'12px','&:hover':{ bgcolor:'action.hover' }}}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </Stack>
            </>
          )}
          {mode==='manual' && (
            <Stack spacing={1}>
              <Alert severity="info">{isRTL ? 'افتح نافذة الإدخال اليدوي (CRUD موحد)' : 'Open the unified CRUD manual entry panel'}</Alert>
              <FormControlLabel control={<Checkbox checked={submitForApproval} onChange={(e)=> setSubmitForApproval(e.target.checked)} />} label={isRTL ? 'إرسال للموافقة فوراً' : 'Send for approval immediately'} />
              <Button variant="contained" onClick={()=> setManualOpen(true)} sx={{
                borderRadius:'12px',
                background: (theme)=> `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover':{ transform:'scale(1.03)'},
                transition:'all 0.2s ease'
              }}>{isRTL ? 'فتح نموذج الإدخال' : 'Open Manual Entry'}</Button>
            </Stack>
          )}
          <Button onClick={()=> setStep(1)}>{isRTL ? 'رجوع' : 'Back'}</Button>
        </Stack>
      )
    }
    if (step === 3) {
      return (
        <Stack spacing={2}>
          <Typography variant="h6">{isRTL ? 'جاري المعالجة' : 'Processing'}</Typography>
          {loading ? <CircularProgress/> : <Alert severity="info">{isRTL ? 'جاهز للبدء' : 'Ready to start'}</Alert>}
          <Button variant="contained" disabled={!file || loading} onClick={startImportFromFile}>{isRTL ? 'ابدأ' : 'Start'}</Button>
          <Button onClick={()=> setStep(2)}>{isRTL ? 'رجوع' : 'Back'}</Button>
        </Stack>
      )
    }
    return (
      <Stack spacing={2}>
        <Typography variant="h6">{isRTL ? 'انتهى الاستيراد' : 'Import Finished'}</Typography>
        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems='center' flexWrap='wrap'>
          {!!currentImportId && <Chip color="info" label={(isRTL?'معرّف العملية: ':'Job ID: ')+currentImportId} />}
          {importStatus?.status && (
            <Chip color={importStatus.status==='completed' ? 'success' : importStatus.status==='failed' ? 'error' : 'warning'} label={(isRTL?'الحالة: ':'Status: ')+String(importStatus.status)} />
          )}
          {typeof importStatus?.totalRows === 'number' && (
            <Chip label={(isRTL?'الإجمالي: ':'Total: ')+String(importStatus.totalRows)} />
          )}
          {typeof importStatus?.successRows === 'number' && (
            <Chip color="success" label={(isRTL?'ناجحة: ':'Success: ')+String(importStatus.successRows)} />
          )}
          {typeof importStatus?.failedRows === 'number' && (
            <Chip color="error" label={(isRTL?'فاشلة: ':'Failed: ')+String(importStatus.failedRows)} />
          )}
        </Stack>

        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
          <Button variant="outlined" onClick={()=> setShowResultsModal(true)} sx={{ borderRadius:'12px','&:hover':{ bgcolor:'action.hover' }}}>
            {isRTL ? 'عرض النتائج' : 'View Results'}
          </Button>
          {Number(importStatus?.failedRows||0) > 0 && (
            <Button variant="outlined" color="error" onClick={()=> setShowResultsModal(true)} sx={{ borderRadius:'12px','&:hover':{ bgcolor:'action.hover' }}}>
              {isRTL ? 'عرض الأخطاء' : 'View errors'}
            </Button>
          )}
          <Button variant="contained" sx={{
            borderRadius:'12px',
            background: (theme)=> `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            '&:hover':{ transform:'scale(1.03)'},
            transition:'all 0.2s ease'
          }} onClick={async ()=>{
            try {
              const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId()
              await OpeningBalanceImportService.requestApproval({ orgId, importId: currentImportId, submittedBy })
              showToast(isRTL ? 'تم إرسال طلب الموافقة' : 'Approval request submitted', { severity:'success' })
            } catch (e:any) {
              showToast((isRTL ? 'فشل إرسال الموافقة: ' : 'Failed to submit approval: ') + (e?.message || String(e)), { severity:'error' })
            }
          }}>
            {isRTL ? 'إرسال للموافقة' : 'Send for approval'}
          </Button>
          <Button onClick={()=>{ try { window.location.href = `/approvals/inbox?target_table=opening_balances&target_id=${encodeURIComponent(currentImportId)}` } catch {} }} sx={{ borderRadius:'12px','&:hover':{ bgcolor:'action.hover' }}}>{isRTL ? 'فتح مركز الموافقات' : 'Open Approvals Center'}</Button>
          <Button onClick={close} sx={{ borderRadius:'12px','&:hover':{ bgcolor:'action.hover' }}}>{isRTL ? 'إغلاق' : 'Close'}</Button>
        </Stack>
      </Stack>
    )
  }

  return (
    <>
      <DraggableResizableDialog
        open={open}
        onClose={onClose}
        storageKey="obi.unified.wizard"
        title={isRTL ? 'معالج استيراد الأرصدة الافتتاحية' : 'Opening Balance Import Wizard'}
        initialWidth={900}
        initialHeight={620}
        showLayoutButtons
        enableDockTopBottom
        rememberLayoutKey="obi.unified.wizard.pref"
      >
        <Box sx={{ p: 1 }}>
          {renderStep()}
        </Box>
      </DraggableResizableDialog>

      <OpeningBalanceManualCrud
        open={manualOpen}
        onClose={()=> setManualOpen(false)}
        onSubmit={async (rows: ManualOBRow[]) => {
          setManualOpen(false)
          if (!orgId || !fiscalYearId) { alert(isRTL ? 'اختر المؤسسة والسنة أولاً' : 'Select organization and fiscal year first'); return }
          try {
            setLoading(true)
            const normalized = rows.map(r=> ({
              account_code: r.account_code,
              opening_balance_debit: r.amount!=null ? null : (r.opening_balance_debit ?? null),
              opening_balance_credit: r.amount!=null ? null : (r.opening_balance_credit ?? null),
              amount: r.amount ?? null,
              project_code: r.project_code ?? null,
              cost_center_code: r.cost_center_code ?? null,
              currency_code: r.currency_code ?? null,
            }))
            const result = await OpeningBalanceImportService.importFromManualRows(orgId, fiscalYearId, normalized as any)
            setImportStatus(result)
            setCurrentImportId(result.importId)
            if (!['completed','failed','partially_completed'].includes(result.status)) {
              let done=false
              const poll = async()=>{
                if (done) return
                try { const s = await OpeningBalanceImportService.getImportStatus(result.importId); setImportStatus(s); if (['completed','failed','partially_completed'].includes(s.status)) { done=true; setShowResultsModal(true); setStep(4); setLoading(false);
                  try { if (submitForApproval) { const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId(); await OpeningBalanceImportService.requestApproval({ orgId, importId: result.importId, submittedBy }); showToast(isRTL?'تم إرسال طلب الموافقة':'Approval request submitted',{severity:'success'}) } } catch {}
                  return } } catch {}
                setTimeout(poll, 2000)
              }
              poll()
            } else {
              setShowResults(true); setStep(4)
              try { if (submitForApproval) { const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId(); await OpeningBalanceImportService.requestApproval({ orgId, importId: result.importId, submittedBy }); showToast(isRTL?'تم إرسال طلب الموافقة':'Approval request submitted',{severity:'success'}) } } catch {}
            }
          } catch (e) {
            setImportStatus({ status:'failed', error: String((e as any)?.message || e) })
          } finally { setLoading(false) }
        }}
      />

      <EnhancedOBImportResultsModal
        open={showResultsModal}
        onClose={()=> setShowResultsModal(false)}
        importId={currentImportId}
        orgId={orgId}
        fiscalYearId={fiscalYearId}
        uploadHeaders={uploadHeaders}
      />
    </>
  )
}

export default OpeningBalanceImportWizard
