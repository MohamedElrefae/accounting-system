import React, { useMemo, useState, useEffect } from 'react'
import DraggablePanelContainer from '@/components/Common/DraggablePanelContainer'
import UnifiedCRUDForm, { type FormConfig } from '@/components/Common/UnifiedCRUDForm'
import { Box, Button, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Menu, MenuItem } from '@mui/material'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { useToast } from '@/contexts/ToastContext'
import type { SearchableSelectOption } from '@/components/Common/SearchableSelect'
import { OpeningBalanceImportService } from '@/services/OpeningBalanceImportService'
import { getProject } from '@/services/projects'
import { useScopeOptional } from '@/contexts/ScopeContext'

export interface ManualOBRow {
  account_code: string
  opening_balance_debit?: number | null
  opening_balance_credit?: number | null
  amount?: number | null
  project_code?: string | null
  cost_center_code?: string | null
  currency_code?: string | null
}

interface OpeningBalanceManualCrudProps {
  open: boolean
  onClose: () => void
  onSubmit: (rows: ManualOBRow[]) => void
}

const OpeningBalanceManualCrud: React.FC<OpeningBalanceManualCrudProps> = ({ open, onClose, onSubmit }) => {
  const { isRTL } = useArabicLanguage()
  const { showToast } = useToast?.() || { showToast: (msg:string,_opts?:any)=>{ try{ (window as any)?.toast?.info?.(msg) }catch{} } }
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const projectId = scope?.currentProject?.id || ''
  const [rows, setRows] = useState<ManualOBRow[]>([])
  const [presetAnchor, setPresetAnchor] = useState<null | HTMLElement>(null)

  const [defaultProjectCode, setDefaultProjectCode] = useState<string>('')

  // Options for searchable selects (flat + tree for drilldown)
  const [accountFlat, setAccountFlat] = useState<SearchableSelectOption[]>([])
  const [accountTree, setAccountTree] = useState<SearchableSelectOption[]>([])
  const [projectFlat, setProjectFlat] = useState<SearchableSelectOption[]>([])
  const [projectTree, setProjectTree] = useState<SearchableSelectOption[]>([])
  const [ccFlat, setCcFlat] = useState<SearchableSelectOption[]>([])
  const [ccTree, setCcTree] = useState<SearchableSelectOption[]>([])
  const openPresets = (e: React.MouseEvent)=> setPresetAnchor(e.currentTarget as HTMLElement)
  const closePresets = ()=> setPresetAnchor(null)

  // Load defaults and options when opened
  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        if (projectId) {
          try { const p = await getProject(projectId); if (p?.code) setDefaultProjectCode(p.code) } catch {}
        }
        if (orgId) {
          const [acc, prj, cc] = await Promise.all([
            OpeningBalanceImportService.listAccountsTreeForSelect(orgId, 3000),
            OpeningBalanceImportService.listProjectsForSelect(orgId, 2000),
            OpeningBalanceImportService.listCostCentersTreeForSelect(orgId, 3000),
          ])
          const toTree = (rows: any[]) => {
            const by = new Map<string, any>()
            rows.forEach(r => by.set(r.value, { ...r, children: [] as any[] }))
            const roots: any[] = []
            rows.forEach(r => { const n = by.get(r.value); if (r.parent && by.has(r.parent)) by.get(r.parent).children.push(n); else roots.push(n) })
            return roots
          }
          const toFlat = (rows: any[]) => rows.map(r => ({ value: r.value, label: r.label, searchText: r.searchText }))
          setAccountTree(toTree(acc)); setAccountFlat(toFlat(acc))
          setProjectTree(toTree(prj)); setProjectFlat(toFlat(prj))
          setCcTree(toTree(cc)); setCcFlat(toFlat(cc))
        }
      } catch {}
    }
    load()
  }, [open, orgId, projectId])

  const formConfig: FormConfig = useMemo(() => ({
    title: isRTL ? 'إضافة سطر رصيد افتتاحي' : 'Add Opening Balance Row',
    fields: [
      { id: 'account_code', type: 'searchable-select', label: isRTL ? 'الحساب' : 'Account', required: true, options: accountFlat, placeholder: isRTL?'اختر الحساب':'Select account', searchable: true, clearable: true, showDrilldownModal: true, treeOptions: accountTree },
      { id: 'opening_balance_debit', type: 'number', label: isRTL ? 'مدين' : 'Debit' },
      { id: 'opening_balance_credit', type: 'number', label: isRTL ? 'دائن' : 'Credit' },
      { id: 'amount', type: 'number', label: isRTL ? 'المبلغ (بديل)' : 'Amount (alt.)', helpText: isRTL ? 'استخدم إما مدين/دائن أو مبلغ واحد' : 'Use either debit/credit or single amount' },
      { id: 'project_code', type: 'searchable-select', label: isRTL ? 'المشروع' : 'Project', required: false, options: projectFlat, placeholder: isRTL?'اختر المشروع':'Select project', searchable: true, clearable: true, showDrilldownModal: true, treeOptions: projectTree, defaultValue: defaultProjectCode },
      { id: 'cost_center_code', type: 'searchable-select', label: isRTL ? 'مركز التكلفة' : 'Cost Center', required: false, options: ccFlat, placeholder: isRTL?'اختر مركز التكلفة':'Select cost center', searchable: true, clearable: true, showDrilldownModal: true, treeOptions: ccTree },
      { id: 'currency_code', type: 'text', label: isRTL ? 'العملة' : 'Currency' },
    ],
    submitLabel: isRTL ? 'إضافة للسجل' : 'Add to list',
    cancelLabel: isRTL ? 'إغلاق' : 'Close',
  }), [isRTL, accountFlat, accountTree, projectFlat, projectTree, ccFlat, ccTree, defaultProjectCode])

  const handleSubmit = async (data: any) => {
    const row: ManualOBRow = {
      account_code: String(data.account_code || '').trim(),
      opening_balance_debit: data.opening_balance_debit!=null && String(data.opening_balance_debit)!=='' ? Number(data.opening_balance_debit) : null,
      opening_balance_credit: data.opening_balance_credit!=null && String(data.opening_balance_credit)!=='' ? Number(data.opening_balance_credit) : null,
      amount: data.amount!=null && String(data.amount)!=='' ? Number(data.amount) : null,
      project_code: data.project_code ? String(data.project_code) : null,
      cost_center_code: data.cost_center_code ? String(data.cost_center_code) : null,
      currency_code: data.currency_code ? String(data.currency_code) : null,
    }
    if (!row.account_code) return
    setRows(prev => [row, ...prev])
  }

  return (
    <DraggablePanelContainer
      storageKey="obi.manual.crud"
      isOpen={open}
      onClose={onClose}
      title={isRTL ? 'إدخال الأرصدة الافتتاحية (CRUD موحد)' : 'Manual Opening Balances (Unified CRUD)'}
      defaults={{
        position: () => ({ x: 120, y: 90 }),
        size: () => ({ width: 980, height: 760 }),
        dockPosition: 'right',
      }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        {/* Header-like action row to match unified CRUD look */}
        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{isRTL ? 'المعاملات اليدوية' : 'Manual Entries'}</Typography>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
            <Button size="small" variant="outlined" title={isRTL?'الإعدادات':'Settings'} sx={{
              color:'text.primary',
              borderColor:'divider',
              borderRadius:'12px',
              '&:hover':{ bgcolor:'action.hover', borderColor:'primary.main', transform:'translateY(-2px)', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'},
              transition:'all 0.2s ease'
            }} onClick={()=>{/* future: open settings panel */}}>⚙️</Button>
            <Button size="small" variant="contained" title={isRTL?'حفظ التخطيط':'Save Layout'} sx={{
              borderRadius:'12px',
              background: (theme)=> `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover':{ transform:'scale(1.05)'},
              transition:'all 0.2s ease'
            }} onClick={()=>{ 
              try { localStorage.setItem('obi.manual.crud.pref', JSON.stringify({ savedAt: Date.now() })) } catch {}
              try { showToast(isRTL?'تم حفظ التخطيط':'Layout saved', { severity:'success' }) } catch {}
            }}>💾</Button>
            <Button size="small" onClick={openPresets} title={isRTL?'تخطيطات سريعة':'Layout presets'} sx={{
              borderRadius:'12px',
              '&:hover':{ transform:'scale(1.05)'},
              transition:'all 0.2s ease'
            }}>▾</Button>
            <Menu anchorEl={presetAnchor} open={!!presetAnchor} onClose={closePresets} anchorOrigin={{ horizontal:'right', vertical:'bottom' }} transformOrigin={{ horizontal:'right', vertical:'top' }}>
              <MenuItem onClick={()=>{ try { localStorage.setItem('obi.manual.crud.pref', JSON.stringify({ preset: 'left_narrow', savedAt: Date.now() })) } catch {} closePresets() }}>{isRTL?'تثبيت يسار (ضيق)':'Dock left (narrow)'}</MenuItem>
              <MenuItem onClick={()=>{ try { localStorage.setItem('obi.manual.crud.pref', JSON.stringify({ preset: 'right_wide', savedAt: Date.now() })) } catch {} closePresets() }}>{isRTL?'تثبيت يمين (عريض)':'Dock right (wide)'}</MenuItem>
              <MenuItem onClick={()=>{ try { localStorage.setItem('obi.manual.crud.pref', JSON.stringify({ preset: 'maximize', savedAt: Date.now() })) } catch {} closePresets() }}>{isRTL?'تكبير':'Maximize'}</MenuItem>
              <MenuItem onClick={()=>{ try { localStorage.setItem('obi.manual.crud.pref', JSON.stringify({ preset: 'default', savedAt: Date.now() })) } catch {} closePresets() }}>{isRTL?'استعادة الافتراضي':'Restore default'}</MenuItem>
            </Menu>
            <Button size="small" title={isRTL?'إعادة تعيين':'Reset'} sx={{
              borderRadius:'12px',
              '&:hover':{ transform:'scale(1.05)'},
              transition:'all 0.2s ease'
            }} onClick={()=>{ try { localStorage.removeItem('obi.manual.crud.pref'); showToast(isRTL?'تمت إعادة التعيين':'Reset done', { severity:'info' }) } catch {} }}>↺</Button>
          </Stack>
        </Stack>

        <UnifiedCRUDForm
          config={formConfig}
          initialData={{ project_code: defaultProjectCode }}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />

        <Typography variant="subtitle2">{isRTL ? 'السجلات المؤقتة' : 'Pending rows'}</Typography>
        <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{isRTL ? 'كود الحساب' : 'Account'}</TableCell>
                <TableCell>{isRTL ? 'مدين' : 'Debit'}</TableCell>
                <TableCell>{isRTL ? 'دائن' : 'Credit'}</TableCell>
                <TableCell>{isRTL ? 'مبلغ' : 'Amount'}</TableCell>
                <TableCell>{isRTL ? 'مشروع' : 'Project'}</TableCell>
                <TableCell>{isRTL ? 'مركز تكلفة' : 'Cost Center'}</TableCell>
                <TableCell>{isRTL ? 'عملة' : 'Currency'}</TableCell>
                <TableCell>{isRTL ? 'إجراءات' : 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.account_code}</TableCell>
                  <TableCell>{r.opening_balance_debit ?? ''}</TableCell>
                  <TableCell>{r.opening_balance_credit ?? ''}</TableCell>
                  <TableCell>{r.amount ?? ''}</TableCell>
                  <TableCell>{r.project_code ?? ''}</TableCell>
                  <TableCell>{r.cost_center_code ?? ''}</TableCell>
                  <TableCell>{r.currency_code ?? ''}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={()=> setRows(prev=> prev.filter((_,idx)=> idx!==i))}>{isRTL ? 'حذف' : 'Remove'}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
          <Button variant="contained" disabled={rows.length===0} onClick={()=> onSubmit(rows)}>{isRTL ? 'حفظ وإرسال' : 'Save & Submit'}</Button>
          <Button onClick={onClose}>{isRTL ? 'إغلاق' : 'Close'}</Button>
        </Stack>
      </Stack>
    </DraggablePanelContainer>
  )
}

export default OpeningBalanceManualCrud
