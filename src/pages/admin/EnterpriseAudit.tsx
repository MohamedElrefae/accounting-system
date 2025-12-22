import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
 import ExportButtons from '@/components/Common/ExportButtons'
 import ColumnConfiguration from '@/components/Common/ColumnConfiguration'
 import type { ColumnConfig } from '@/components/Common/ColumnConfiguration'
 import { createStandardColumns, prepareTableData } from '@/hooks/useUniversalExport'
 import useColumnPreferences from '@/hooks/useColumnPreferences'
 import SearchableSelect from '@/components/Common/SearchableSelect'
 import type { SearchableSelectOption } from '@/components/Common/SearchableSelect'
import { supabase } from '@/utils/supabase'
import { useAuditContext } from '@/hooks/useAuditContext'
 import { useAuth } from '@/hooks/useAuth'
import useAppStore from '@/store/useAppStore'

type AuditLogEnrichedRow = {
  id: string
  created_at: string
  actor_email: string | null
  actor_name: string | null
  actor_id?: string | null
  table_name: string
  table_display_name?: string | null
  operation: string
  action_display?: string | null
  record_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: Record<string, unknown> | null
  page_name: string | null
  module_name: string | null
  action_description: string | null
  request_id: string | null
  session_id: string | null
  org_id: string | null
  ip_address: string | null
  user_agent: string | null
}

type Filters = {
  fromDate: string
  toDate: string
  actorId: string
  actorQuery: string
  tableName: string
  actionDisplay: string
  pageQuery: string
  moduleQuery: string
  recordIdQuery: string
  orgIdQuery: string
}

const DEFAULT_PAGE_SIZE = 25

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function EnterpriseAudit() {
  useAuditContext({ pageName: 'Settings/EnterpriseAudit', moduleName: 'Audit' })

  const { language } = useAppStore()
  const isArabic = language === 'ar'
  const { user } = useAuth()

  const [filters, setFilters] = useState<Filters>({
    fromDate: dayjs().subtract(7, 'day').startOf('day').toISOString(),
    toDate: dayjs().endOf('day').toISOString(),
    actorId: '',
    actorQuery: '',
    tableName: '',
    actionDisplay: '',
    pageQuery: '',
    moduleQuery: '',
    recordIdQuery: '',
    orgIdQuery: '',
  })

  const [userSelectOptions, setUserSelectOptions] = useState<SearchableSelectOption[]>([])
  const [orgSelectOptions, setOrgSelectOptions] = useState<SearchableSelectOption[]>([])
  const [pageSelectOptions, setPageSelectOptions] = useState<SearchableSelectOption[]>([])
  const [moduleSelectOptions, setModuleSelectOptions] = useState<SearchableSelectOption[]>([])
  const [recordIdSelectOptions, setRecordIdSelectOptions] = useState<SearchableSelectOption[]>([])
  const [tableDynamicOptions, setTableDynamicOptions] = useState<SearchableSelectOption[]>([])

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'created_at', sort: 'desc' },
  ])

  const [rows, setRows] = useState<AuditLogEnrichedRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsRow, setDetailsRow] = useState<AuditLogEnrichedRow | null>(null)

  const formatDateTime = useCallback(
    (iso: string) => {
      try {
        return dayjs(iso)
          .locale(isArabic ? 'ar' : 'en')
          .format(isArabic ? 'YYYY/MM/DD hh:mm A' : 'MMM D, YYYY h:mm A')
      } catch {
        return iso
      }
    },
    [isArabic]
  )

  const safeJson = (v: unknown) => {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }

  const actionSelectOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: '', label: isArabic ? 'الكل' : 'All', searchText: isArabic ? 'الكل' : 'All' },
      { value: 'Created', label: isArabic ? 'إنشاء' : 'Created', searchText: isArabic ? 'إنشاء Created' : 'Created' },
      { value: 'Modified', label: isArabic ? 'تعديل' : 'Modified', searchText: isArabic ? 'تعديل Modified' : 'Modified' },
      { value: 'Deleted', label: isArabic ? 'حذف' : 'Deleted', searchText: isArabic ? 'حذف Deleted' : 'Deleted' },
    ],
    [isArabic]
  )

  const tableSelectOptions = useMemo<SearchableSelectOption[]>(
    () => {
      const base: SearchableSelectOption[] = [
        { value: '', label: isArabic ? 'الكل' : 'All' },
        { value: 'transactions', label: isArabic ? 'القيود' : 'Transactions' },
        { value: 'transaction_lines', label: isArabic ? 'بنود القيد' : 'Transaction Lines' },
        { value: 'accounts', label: isArabic ? 'الحسابات' : 'Accounts' },
        { value: 'system', label: isArabic ? 'النظام' : 'System' },
      ]

      const seen = new Set<string>()
      const merged = [...base, ...tableDynamicOptions]
        .filter((o) => {
          if (!o.value) return true
          if (seen.has(o.value)) return false
          seen.add(o.value)
          return true
        })
        .map((o) => ({ ...o, searchText: `${o.label} ${o.value}` }))

      return merged
    },
    [isArabic, tableDynamicOptions]
  )

  useEffect(() => {
    let cancelled = false

    const loadFilterOptions = async () => {
      try {
        const { data } = await supabase
          .from('audit_log_enriched')
          .select('actor_id,actor_name,actor_email,org_id,page_name,module_name,table_name,record_id')
          .order('created_at', { ascending: false })
          .limit(500)

        if (cancelled) return

        const rows = (data as any[]) || []

        const userMap = new Map<string, { label: string; searchText: string }>()
        const orgSet = new Set<string>()
        const pageSet = new Set<string>()
        const moduleSet = new Set<string>()
        const tableSet = new Set<string>()
        const recordIdSet = new Set<string>()

        rows.forEach((r) => {
          const actorId = r?.actor_id
          const actorName = r?.actor_name
          const actorEmail = r?.actor_email
          const orgId = r?.org_id
          const pageName = r?.page_name
          const moduleName = r?.module_name
          const tableName = r?.table_name
          const recordId = r?.record_id

          if (actorId && UUID_REGEX.test(String(actorId))) {
            const label = String(actorName || actorEmail || actorId)
            const searchText = `${label} ${String(actorEmail || '')} ${String(actorId)}`
            if (!userMap.has(String(actorId))) userMap.set(String(actorId), { label, searchText })
          }

          if (orgId && UUID_REGEX.test(String(orgId))) orgSet.add(String(orgId))
          if (pageName) pageSet.add(String(pageName))
          if (moduleName) moduleSet.add(String(moduleName))
          if (tableName) tableSet.add(String(tableName))
          if (recordId) recordIdSet.add(String(recordId))
        })

        setUserSelectOptions([
          { value: '', label: isArabic ? 'الكل' : 'All' },
          ...Array.from(userMap.entries()).map(([value, meta]) => ({
            value,
            label: meta.label,
            searchText: meta.searchText,
          })),
        ])

        setOrgSelectOptions([
          { value: '', label: isArabic ? 'الكل' : 'All' },
          ...Array.from(orgSet.values()).map((value) => ({ value, label: value, searchText: value })),
        ])

        setPageSelectOptions([
          { value: '', label: isArabic ? 'الكل' : 'All' },
          ...Array.from(pageSet.values()).sort().map((value) => ({ value, label: value, searchText: value })),
        ])

        setModuleSelectOptions([
          { value: '', label: isArabic ? 'الكل' : 'All' },
          ...Array.from(moduleSet.values()).sort().map((value) => ({ value, label: value, searchText: value })),
        ])

        setRecordIdSelectOptions([
          { value: '', label: isArabic ? 'الكل' : 'All' },
          ...Array.from(recordIdSet.values()).sort().slice(0, 500).map((value) => ({ value, label: value, searchText: value })),
        ])

        setTableDynamicOptions(
          Array.from(tableSet.values()).map((value) => ({ value, label: value, searchText: value }))
        )
      } catch {
        if (cancelled) return
        setUserSelectOptions([{ value: '', label: isArabic ? 'الكل' : 'All' }])
        setOrgSelectOptions([{ value: '', label: isArabic ? 'الكل' : 'All' }])
        setPageSelectOptions([{ value: '', label: isArabic ? 'الكل' : 'All' }])
        setModuleSelectOptions([{ value: '', label: isArabic ? 'الكل' : 'All' }])
        setRecordIdSelectOptions([{ value: '', label: isArabic ? 'الكل' : 'All' }])
        setTableDynamicOptions([])
      }
    }

    void loadFilterOptions()

    return () => {
      cancelled = true
    }
  }, [isArabic])

  const defaultColumnConfig = useMemo<ColumnConfig[]>(
    () => [
      {
        key: 'created_at',
        label: isArabic ? 'التاريخ' : 'Date',
        visible: true,
        width: 180,
        sortable: true,
        resizable: true,
        type: 'date',
      },
      {
        key: 'actor_name',
        label: isArabic ? 'المستخدم' : 'User',
        visible: true,
        width: 170,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'actor_email',
        label: isArabic ? 'البريد' : 'Email',
        visible: false,
        width: 210,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'actor_id',
        label: isArabic ? 'معرّف المستخدم' : 'User ID',
        visible: false,
        width: 260,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'action_display',
        label: isArabic ? 'الإجراء' : 'Action',
        visible: true,
        width: 140,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'table_display_name',
        label: isArabic ? 'الكيان' : 'Entity',
        visible: true,
        width: 180,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'table_name',
        label: isArabic ? 'اسم الجدول' : 'Table Name',
        visible: false,
        width: 180,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'operation',
        label: isArabic ? 'العملية (خام)' : 'Operation',
        visible: false,
        width: 160,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'page_name',
        label: isArabic ? 'الصفحة' : 'Page',
        visible: true,
        width: 200,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'module_name',
        label: isArabic ? 'الوحدة' : 'Module',
        visible: true,
        width: 160,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'record_id',
        label: isArabic ? 'المعرف' : 'Record ID',
        visible: true,
        width: 260,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'org_id',
        label: isArabic ? 'المؤسسة' : 'Org',
        visible: false,
        width: 260,
        sortable: true,
        resizable: true,
        type: 'text',
      },
      {
        key: 'request_id',
        label: isArabic ? 'Request' : 'Request',
        visible: false,
        width: 220,
        sortable: true,
        resizable: true,
        type: 'text',
      },
    ],
    [isArabic]
  )

  const {
    columns: configuredColumns,
    handleColumnConfigChange,
    resetToDefaults,
  } = useColumnPreferences({
    storageKey: 'enterprise_audit.columns.v2',
    defaultColumns: defaultColumnConfig,
    userId: user?.id,
  })

  const [columnConfigOpen, setColumnConfigOpen] = useState(false)

  const effectiveColumnsConfig = useMemo<ColumnConfig[]>(() => {
    const cols = configuredColumns || []
    const hasAnyVisible = cols.some((c) => c.visible)
    if (!cols.length || !hasAnyVisible) {
      return defaultColumnConfig
    }
    return cols
  }, [configuredColumns, defaultColumnConfig])

  const columns = useMemo<GridColDef<AuditLogEnrichedRow>[]>(
    () => {
      const visible = (effectiveColumnsConfig || []).filter((c) => c.visible)
      return visible.map((c) => {
        const isDateCol = c.key === 'created_at'

        const base: GridColDef<AuditLogEnrichedRow> = {
          field: c.key,
          headerName: c.label,
          // Use flex columns to avoid large empty space, especially in RTL.
          // Keep the configured width as minWidth so columns remain usable.
          minWidth: c.width || 160,
          flex: isDateCol ? undefined : 1,
          sortable: c.sortable ?? true,
        }

        if (c.key === 'created_at') {
          return {
            ...base,
            renderCell: (params) => <span>{formatDateTime(String(params.value))}</span>,
          }
        }

        if (c.key === 'actor_name') {
          return {
            ...base,
            valueGetter: (_v, row) => row.actor_name || row.actor_email || '',
          }
        }

        if (c.key === 'table_display_name') {
          return {
            ...base,
            valueGetter: (_v, row) => row.table_display_name || row.table_name,
          }
        }

        if (c.key === 'action_display') {
          return {
            ...base,
            valueGetter: (_v, row) => row.action_display || row.operation,
          }
        }

        return base
      })
    },
    [effectiveColumnsConfig, formatDateTime]
  )

  const exportData = useMemo(() => {
    const visibleCols = (effectiveColumnsConfig || []).filter((c) => c.visible)
    const definitions = visibleCols.map((c) => ({
      key: c.key,
      header: c.label,
      type: c.type === 'date' ? 'date' : 'text',
      visible: true,
    }))

    const exportColumns = createStandardColumns(definitions)

    const exportRows = (rows || []).map((r) => ({
      ...r,
      created_at: r.created_at ? formatDateTime(r.created_at) : '',
      actor_name: r.actor_name || r.actor_email || '',
      table_display_name: r.table_display_name || r.table_name,
      action_display: r.action_display || r.operation,
    }))

    return prepareTableData(exportColumns, exportRows)
  }, [effectiveColumnsConfig, formatDateTime, rows])

  const resetFilters = () => {
    setFilters({
      fromDate: dayjs().subtract(7, 'day').startOf('day').toISOString(),
      toDate: dayjs().endOf('day').toISOString(),
      actorId: '',
      actorQuery: '',
      tableName: '',
      actionDisplay: '',
      pageQuery: '',
      moduleQuery: '',
      recordIdQuery: '',
      orgIdQuery: '',
    })
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const sort = sortModel?.[0]
        const sortField = sort?.field || 'created_at'
        const sortDir = sort?.sort || 'desc'

        const fromIso = filters.fromDate
        const toIso = filters.toDate

        const from = paginationModel.page * paginationModel.pageSize
        const to = from + paginationModel.pageSize - 1

        let q = supabase
          .from('audit_log_enriched')
          .select('*', { count: 'exact' })

        if (fromIso) q = q.gte('created_at', fromIso)
        if (toIso) q = q.lte('created_at', toIso)

        if (filters.tableName) q = q.eq('table_name', filters.tableName)
        if (filters.actionDisplay) q = q.eq('action_display', filters.actionDisplay)

        if (filters.actorQuery.trim()) {
          const v = `%${filters.actorQuery.trim()}%`
          q = q.or(`actor_email.ilike.${v},actor_name.ilike.${v}`)
        }

        if (filters.actorId.trim()) {
          const actorId = filters.actorId.trim()
          if (UUID_REGEX.test(actorId)) {
            q = q.eq('actor_id', actorId)
          }
        }

        if (filters.pageQuery.trim()) {
          q = q.eq('page_name', filters.pageQuery.trim())
        }

        if (filters.moduleQuery.trim()) {
          q = q.eq('module_name', filters.moduleQuery.trim())
        }

        if (filters.recordIdQuery.trim()) {
          q = q.eq('record_id', filters.recordIdQuery.trim())
        }

        if (filters.orgIdQuery.trim()) {
          const org = filters.orgIdQuery.trim()
          if (UUID_REGEX.test(org)) {
            q = q.eq('org_id', org)
          }
        }

        const { data, error: qErr, count } = await q
          .order(sortField as any, { ascending: sortDir === 'asc' })
          .range(from, to)

        if (qErr) throw qErr

        if (!cancelled) {
          setRows(((data as any[]) ?? []) as AuditLogEnrichedRow[])
          setRowCount(count ?? 0)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || (isArabic ? 'تعذر تحميل سجل التدقيق' : 'Failed to load audit logs'))
          setRows([])
          setRowCount(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [filters, isArabic, paginationModel.page, paginationModel.pageSize, sortModel])

  const handleOpenDetails = (row: AuditLogEnrichedRow) => {
    setDetailsRow(row)
    setDetailsOpen(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {isArabic ? 'سجل المراجعة (جميع المستخدمين)' : 'Enterprise Audit Logs'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isArabic
            ? 'عرض الأحداث مع إمكانيات التصفية حسب المستخدم والتاريخ والعملية والكيان.'
            : 'View audit events with filters by user, date, operation, and entity.'}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" onClick={() => setColumnConfigOpen(true)}>
              {isArabic ? 'تخصيص الأعمدة' : 'Columns'}
            </Button>
            <Button variant="outlined" color="inherit" onClick={resetToDefaults}>
              {isArabic ? 'إعادة ضبط الأعمدة' : 'Reset Columns'}
            </Button>
            <ExportButtons
              data={exportData}
              config={{
                title: isArabic ? 'سجل المراجعة' : 'Audit Log',
                rtlLayout: isArabic,
                orientation: 'landscape',
              }}
              layout="dropdown"
              size="medium"
              showAllFormats
              showBatchExport
              showCustomizedPDF
              disabled={loading || rows.length === 0}
            />
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label={isArabic ? 'من تاريخ' : 'From'}
                type="datetime-local"
                value={filters.fromDate ? dayjs(filters.fromDate).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    fromDate: e.target.value ? dayjs(e.target.value).toISOString() : '',
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label={isArabic ? 'إلى تاريخ' : 'To'}
                type="datetime-local"
                value={filters.toDate ? dayjs(filters.toDate).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    toDate: e.target.value ? dayjs(e.target.value).toISOString() : '',
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'المستخدم' : 'User'}
                </Typography>
                <SearchableSelect
                  value={filters.actorId}
                  onChange={(v) => setFilters((p) => ({ ...p, actorId: v }))}
                  options={userSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'العملية' : 'Action'}
                </Typography>
                <SearchableSelect
                  value={filters.actionDisplay}
                  onChange={(v) => setFilters((p) => ({ ...p, actionDisplay: v }))}
                  options={actionSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label={isArabic ? 'بحث (نص)' : 'Text search'}
                value={filters.actorQuery}
                onChange={(e) => setFilters((p) => ({ ...p, actorQuery: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'الكيان' : 'Table'}
                </Typography>
                <SearchableSelect
                  value={filters.tableName}
                  onChange={(v) => setFilters((p) => ({ ...p, tableName: v }))}
                  options={tableSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'الصفحة' : 'Page'}
                </Typography>
                <SearchableSelect
                  value={filters.pageQuery}
                  onChange={(v) => setFilters((p) => ({ ...p, pageQuery: v }))}
                  options={pageSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'الوحدة' : 'Module'}
                </Typography>
                <SearchableSelect
                  value={filters.moduleQuery}
                  onChange={(v) => setFilters((p) => ({ ...p, moduleQuery: v }))}
                  options={moduleSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'المعرف' : 'Record ID'}
                </Typography>
                <SearchableSelect
                  value={filters.recordIdQuery}
                  onChange={(v) => setFilters((p) => ({ ...p, recordIdQuery: v }))}
                  options={recordIdSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isArabic ? 'المؤسسة' : 'Org'}
                </Typography>
                <SearchableSelect
                  value={filters.orgIdQuery}
                  onChange={(v) => setFilters((p) => ({ ...p, orgIdQuery: v }))}
                  options={orgSelectOptions}
                  placeholder={isArabic ? 'اختر...' : 'Select...'}
                  clearable
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={9}>
              <Stack direction="row" spacing={1} sx={{ height: '100%' }} alignItems="center">
                <Button variant="outlined" onClick={resetFilters}>
                  {isArabic ? 'إعادة تعيين' : 'Reset'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Card sx={{ flex: 1, minHeight: 540 }}>
        <CardContent sx={{ height: 540 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            rowCount={rowCount}
            loading={loading}
            disableVirtualization
            pagination
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]}
            sortingMode="server"
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            disableRowSelectionOnClick
            onRowDoubleClick={(params) => handleOpenDetails(params.row)}
            sx={{
              border: 'none',
              fontFamily: (theme) => theme.typography.fontFamily,
              direction: isArabic ? 'rtl' : 'ltr',
              '& .MuiDataGrid-virtualScroller': {
                overflowX: 'auto',
              },
              '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-virtualScrollerContent': {
                direction: isArabic ? 'rtl' : 'ltr',
              },
              '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader': {
                justifyContent: isArabic ? 'flex-end' : 'flex-start',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '15px !important',
              },
              '& .MuiDataGrid-cellContent': {
                fontSize: '15px !important',
                fontWeight: '500 !important',
              },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'action.hover',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: '15px !important',
                fontWeight: '600 !important',
              },
              '& .MuiDataGrid-columnHeaderTitleContainerContent': {
                fontSize: '15px !important',
                fontWeight: '600 !important',
              },
              '& .MuiDataGrid-footerContainer': {
                fontSize: '15px !important',
              },
              '& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '15px !important',
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {isArabic
              ? 'معلومة: انقر مرتين على أي صف لعرض التفاصيل.'
              : 'Tip: double-click any row to view details.'}
          </Typography>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{isArabic ? 'تفاصيل الحدث' : 'Audit event details'}</DialogTitle>
        <DialogContent>
          {detailsRow ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {formatDateTime(detailsRow.created_at)}
              </Typography>

              <Typography variant="body2">
                <strong>{isArabic ? 'المستخدم: ' : 'User: '}</strong>
                {detailsRow.actor_name || detailsRow.actor_email || '—'}
              </Typography>

              <Typography variant="body2">
                <strong>{isArabic ? 'الإجراء: ' : 'Action: '}</strong>
                {detailsRow.action_display || detailsRow.operation}
              </Typography>

              <Typography variant="body2">
                <strong>{isArabic ? 'الكيان: ' : 'Entity: '}</strong>
                {detailsRow.table_display_name || detailsRow.table_name}
              </Typography>

              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                <strong>{isArabic ? 'المعرف: ' : 'Record ID: '}</strong>
                {detailsRow.record_id}
              </Typography>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  {isArabic ? 'التغييرات' : 'Changes'}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  {safeJson(detailsRow.changed_fields || detailsRow.new_values || detailsRow.old_values)}
                </Box>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <ColumnConfiguration
        columns={effectiveColumnsConfig}
        onConfigChange={handleColumnConfigChange}
        isOpen={columnConfigOpen}
        onClose={() => setColumnConfigOpen(false)}
        onReset={resetToDefaults}
        sampleData={rows as any}
      />
    </Box>
  )
}
