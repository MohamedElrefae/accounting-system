import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { Card, CardContent, Typography, Dialog, DialogContent, Box } from '@mui/material'
import UnifiedCRUDForm, { type FormConfig, type UnifiedCRUDFormHandle } from '@/components/Common/UnifiedCRUDForm'
import ResizableTable from '@/components/Common/ResizableTable'
import ColumnConfiguration from '@/components/Common/ColumnConfiguration'
import type { ColumnConfig } from '@/components/Common/ColumnConfiguration'
import useColumnPreferences from '@/hooks/useColumnPreferences'
import { listInventoryLocations, type InventoryLocationRow, createInventoryLocation, updateInventoryLocation, deleteInventoryLocation } from '@/services/inventory/locations'
import { getActiveProjectsByOrg, type Project } from '@/services/projects'
import { getCostCentersList, type CostCenterRow } from '@/services/cost-centers'
import { useToast } from '@/contexts/ToastContext'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { INVENTORY_TEXTS } from '@/i18n/inventory'
import { getDisplayName } from '@/utils/inventoryDisplay'
import '../MainData/AccountsTree.css'

function getActiveOrgIdSafe(): string | null {
  try { return localStorage.getItem('org_id') } catch { return null }
}

const LocationsPage: React.FC = () => {
  const { showToast } = useToast()
  const { t, isRTL } = useArabicLanguage()
  const [rows, setRows] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [costCenters, setCostCenters] = useState<CostCenterRow[]>([])
  const formRef = useRef<UnifiedCRUDFormHandle>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<InventoryLocationRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')

  const projectOptions = useMemo(() => {
    return [
      { value: '', label: '—' },
      ...projects.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))
    ]
  }, [projects])

  const costCenterOptions = useMemo(() => {
    return [
      { value: '', label: '—' },
      ...costCenters.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))
    ]
  }, [costCenters])

  const locationTypeOptions = useMemo(() => {
    return [
      { value: 'warehouse', label: isRTL ? 'مستودع - Warehouse' : 'Warehouse - مستودع' },
      { value: 'site', label: isRTL ? 'موقع - Site' : 'Site - موقع' },
      { value: 'vehicle', label: isRTL ? 'مركبة - Vehicle' : 'Vehicle - مركبة' },
      { value: 'yard', label: isRTL ? 'ساحة - Yard' : 'Yard - ساحة' },
    ]
  }, [isRTL])

  const getLocationTypeLabel = useCallback((type: string) => {
    const found = locationTypeOptions.find(o => o.value === type)
    return found?.label || type || '-'
  }, [locationTypeOptions])

  const formConfig: FormConfig = useMemo(() => ({
    title: isRTL ? 'موقع' : 'Location',
    fields: [
      { id: 'location_code', type: 'text', label: t(INVENTORY_TEXTS.locationCode), required: true },
      { id: 'location_name', type: 'text', label: t(INVENTORY_TEXTS.locationName), required: true },
      { id: 'location_name_ar', type: 'text', label: t({ en: 'Name (Arabic)', ar: 'الاسم (عربي)' }), required: false },
      {
        id: 'location_type',
        type: 'searchable-select',
        label: t(INVENTORY_TEXTS.locationType),
        placeholder: t({ en: 'Select Location Type', ar: 'اختر نوع الموقع' }),
        required: true,
        options: locationTypeOptions,
      },
      {
        id: 'project_id',
        type: 'searchable-select',
        label: t({ en: 'Project (optional)', ar: 'المشروع (اختياري)' }),
        required: false,
        options: projectOptions,
      },
      {
        id: 'cost_center_id',
        type: 'searchable-select',
        label: t({ en: 'Cost Center (optional)', ar: 'مركز التكلفة (اختياري)' }),
        required: false,
        options: costCenterOptions,
      },
      { id: 'is_main_location', type: 'checkbox', label: t(INVENTORY_TEXTS.mainLocation), defaultValue: false },
      { id: 'is_active', type: 'checkbox', label: t(INVENTORY_TEXTS.active), defaultValue: true },
    ],
    submitLabel: t({ en: 'Save', ar: 'حفظ' }),
    cancelLabel: t({ en: 'Cancel', ar: 'إلغاء' }),
  }), [isRTL, t, projectOptions, costCenterOptions, locationTypeOptions])

  const fetchData = useCallback(async () => {
    const orgId = getActiveOrgIdSafe()
    if (!orgId) {
      showToast(isRTL ? 'الرجاء اختيار مؤسسة أولاً' : 'Please select an organization first', { severity: 'warning' })
      return
    }

    setLoading(true)
    try {
      const [locs, projs, ccs] = await Promise.all([
        listInventoryLocations(orgId),
        getActiveProjectsByOrg(orgId).catch(() => [] as any),
        getCostCentersList(orgId).catch(() => [] as any),
      ])
      setRows(locs)
      setProjects(projs as any)
      setCostCenters(ccs as any)
    } catch (error) {
      console.error('Error loading locations:', error)
      showToast(isRTL ? 'خطأ في تحميل المواقع' : 'Error loading locations', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast, isRTL])

  useEffect(() => {
    fetchData().catch(() => {})
  }, [fetchData])

  const openCreate = () => {
    setEditingRow(null)
    setPanelOpen(true)
  }

  const openEdit = (row: InventoryLocationRow) => {
    setEditingRow(row)
    setPanelOpen(true)
  }

  const getSelectedLocation = () => {
    if (!selectedLocationId) return null
    return rows.find(r => r.id === selectedLocationId) || null
  }

  const openEditSelected = () => {
    const selected = getSelectedLocation()
    if (!selected) {
      showToast(isRTL ? 'يرجى اختيار موقع أولاً' : 'Please select a location first', { severity: 'warning' })
      return
    }
    openEdit(selected)
  }

  const handleDelete = async (row: InventoryLocationRow) => {
    const name = getDisplayName({ location_name: row.location_name, location_name_ar: (row as any).location_name_ar })
    const ok = window.confirm(isRTL ? `هل أنت متأكد من حذف الموقع "${name}"؟` : `Delete location "${name}"?`)
    if (!ok) return

    try {
      await deleteInventoryLocation(row.id)
      showToast(isRTL ? 'تم حذف الموقع' : 'Location deleted', { severity: 'success' })
      if (selectedLocationId === row.id) setSelectedLocationId('')
      await fetchData()
    } catch (e: any) {
      showToast(e?.message || (isRTL ? 'فشل الحذف' : 'Delete failed'), { severity: 'error' })
    }
  }

  const handleDeleteSelected = async () => {
    const selected = getSelectedLocation()
    if (!selected) {
      showToast(isRTL ? 'يرجى اختيار موقع أولاً' : 'Please select a location first', { severity: 'warning' })
      return
    }
    await handleDelete(selected)
  }

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const orgId = getActiveOrgIdSafe()
    if (!orgId) {
      showToast(isRTL ? 'الرجاء اختيار مؤسسة أولاً' : 'Please select an organization first', { severity: 'warning' })
      return
    }

    const location_code = String(data.location_code || '').trim()
    const location_name = String(data.location_name || '').trim()
    const location_name_ar = String(data.location_name_ar || '').trim()
    const location_type = String(data.location_type || 'warehouse').trim()
    const project_id = String(data.project_id || '').trim()
    const cost_center_id = String(data.cost_center_id || '').trim()
    const is_main_location = Boolean(data.is_main_location)
    const is_active = Boolean(data.is_active)

    if (!location_code || !location_name) {
      showToast(isRTL ? 'الكود والاسم مطلوبان' : 'Code and Name are required', { severity: 'warning' })
      return
    }

    setFormSubmitting(true)
    try {
      if (editingRow) {
        await updateInventoryLocation(editingRow.id, {
          location_code,
          location_name,
          location_name_ar: location_name_ar || null,
          location_type,
          project_id: project_id || null,
          cost_center_id: cost_center_id || null,
          is_main_location,
          is_active,
        })
      } else {
        await createInventoryLocation({
          org_id: orgId,
          location_code,
          location_name,
          location_name_ar: location_name_ar || null,
          location_type,
          project_id: project_id || null,
          cost_center_id: cost_center_id || null,
          is_main_location,
          is_active,
        })
      }
      setPanelOpen(false)
      await fetchData()
      showToast(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully', { severity: 'success' })
    } catch (e: any) {
      showToast(e?.message || (isRTL ? 'فشل الحفظ' : 'Save failed'), { severity: 'error' })
    } finally {
      setFormSubmitting(false)
    }
  }

  const defaultColumns: ColumnConfig[] = useMemo(() => {
    return [
      { key: 'location_code', label: t(INVENTORY_TEXTS.locationCode), visible: true, width: 140, type: 'text', resizable: true, sortable: true, frozen: true, pinPriority: 3 },
      { key: 'location_name', label: t(INVENTORY_TEXTS.locationName), visible: true, width: 260, type: 'text', resizable: true, sortable: true },
      { key: 'location_type', label: t(INVENTORY_TEXTS.locationType), visible: true, width: 180, type: 'text', resizable: true, sortable: true },
      { key: 'project', label: t({ en: 'Project', ar: 'المشروع' }), visible: true, width: 220, type: 'text', resizable: true },
      { key: 'cost_center', label: t({ en: 'Cost Center', ar: 'مركز التكلفة' }), visible: false, width: 220, type: 'text', resizable: true },
      { key: 'is_main_location', label: t(INVENTORY_TEXTS.mainLocation), visible: true, width: 140, type: 'badge', resizable: true },
      { key: 'is_active', label: t(INVENTORY_TEXTS.active), visible: true, width: 140, type: 'badge', resizable: true },
      { key: 'actions', label: t({ en: 'Actions', ar: 'الإجراءات' }), visible: true, width: 220, type: 'actions', resizable: true, frozen: true, pinPriority: 2 },
    ]
  }, [t])

  const {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults,
  } = useColumnPreferences({
    storageKey: 'locations_table',
    defaultColumns,
  })

  const tableData = useMemo(() => {
    return rows.map(r => {
      const projectLabel = r.project_id ? (projects.find(p => p.id === r.project_id)?.name || r.project_id) : '-'
      const costCenterLabel = r.cost_center_id ? (costCenters.find(c => c.id === r.cost_center_id)?.name || r.cost_center_id) : '-'
      const locationTypeLabel = getLocationTypeLabel(r.location_type)

      return {
        location_code: r.location_code,
        location_name: getDisplayName({ location_name: r.location_name, location_name_ar: (r as any).location_name_ar }),
        location_type: locationTypeLabel,
        project: projectLabel,
        cost_center: costCenterLabel,
        is_main_location: !!r.is_main_location,
        is_active: !!r.is_active,
        actions: null,
        original: r,
      }
    })
  }, [rows, projects, costCenters, getLocationTypeLabel])

  const formInitialData = useMemo(() => {
    return editingRow ? {
      location_code: editingRow.location_code,
      location_name: editingRow.location_name,
      location_name_ar: (editingRow as any).location_name_ar || '',
      location_type: editingRow.location_type,
      project_id: editingRow.project_id || '',
      cost_center_id: editingRow.cost_center_id || '',
      is_main_location: !!(editingRow as any).is_main_location,
      is_active: !!editingRow.is_active,
    } : {
      location_code: '',
      location_name: '',
      location_name_ar: '',
      location_type: 'warehouse',
      project_id: '',
      cost_center_id: '',
      is_main_location: false,
      is_active: true,
    }
  }, [editingRow])

  return (
    <div className="accounts-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t(INVENTORY_TEXTS.locations)}</h1>
        </div>
        <div className="page-actions">
          <button className="ultimate-btn ultimate-btn-primary" title={t({ en: 'Columns', ar: 'الأعمدة' })} onClick={() => setColumnsConfigOpen(true)}>
            <div className="btn-content"><span className="btn-text">⚙️ {t({ en: 'Columns', ar: 'الأعمدة' })}</span></div>
          </button>
          <button className="ultimate-btn ultimate-btn-add" title={t({ en: 'Add Location', ar: 'إضافة موقع' })} onClick={openCreate}>
            <div className="btn-content"><span className="btn-text">{t({ en: 'Add Location', ar: 'إضافة موقع' })}</span></div>
          </button>
          <button className="ultimate-btn ultimate-btn-edit" title={t({ en: 'Edit Selected', ar: 'تعديل المحدد' })} onClick={openEditSelected} disabled={!selectedLocationId}>
            <div className="btn-content"><span className="btn-text">{t({ en: 'Edit Selected', ar: 'تعديل المحدد' })}</span></div>
          </button>
          <button className="ultimate-btn ultimate-btn-delete" title={t({ en: 'Delete Selected', ar: 'حذف المحدد' })} onClick={handleDeleteSelected} disabled={!selectedLocationId}>
            <div className="btn-content"><span className="btn-text">{t({ en: 'Delete Selected', ar: 'حذف المحدد' })}</span></div>
          </button>
        </div>
      </div>

      <div className="content-area" style={{ padding: 16 }}>
        <Card>
          <CardContent>
            {loading ? (
              <Typography>{t({ en: 'Loading...', ar: 'جاري التحميل...' })}</Typography>
            ) : rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', padding: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t({ en: 'No locations found', ar: 'لا توجد مواقع' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t({ en: 'Click "Add Location" to create your first location', ar: 'انقر على "إضافة موقع" لإنشاء أول موقع' })}
                </Typography>
                <button className="ultimate-btn ultimate-btn-add" title={t({ en: 'Add Location', ar: 'إضافة موقع' })} onClick={openCreate}>
                  <div className="btn-content"><span className="btn-text">{t({ en: 'Create First Location', ar: 'إنشاء أول موقع' })}</span></div>
                </button>
              </Box>
            ) : (
              <ResizableTable
                columns={columns}
                data={tableData as any}
                onColumnResize={handleColumnResize}
                className="transactions-resizable-table"
                isLoading={loading}
                emptyMessage={t({ en: 'No locations', ar: 'لا توجد مواقع' })}
                highlightRowId={selectedLocationId}
                getRowId={(row) => (row as any)?.original?.id ?? (row as any)?.id ?? ''}
                onRowClick={(row) => {
                  const id = String((row as any)?.original?.id || '')
                  setSelectedLocationId(id)
                }}
                renderCell={(_value, column, row) => {
                  const original = (row as any)?.original as InventoryLocationRow | undefined
                  if (!original) return _value as any

                  if (column.key === 'is_active') {
                    const active = !!original.is_active
                    return (
                      <span
                        className={`ultimate-btn ${active ? 'ultimate-btn-success' : 'ultimate-btn-neutral'}`}
                        style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }}
                        title={active ? t(INVENTORY_TEXTS.active) : t(INVENTORY_TEXTS.inactive)}
                      >
                        <span className="btn-text">{active ? t(INVENTORY_TEXTS.active) : t(INVENTORY_TEXTS.inactive)}</span>
                      </span>
                    )
                  }

                  if (column.key === 'is_main_location') {
                    const main = !!(original as any).is_main_location
                    return (
                      <span
                        className={`ultimate-btn ${main ? 'ultimate-btn-primary' : 'ultimate-btn-neutral'}`}
                        style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }}
                        title={main ? t({ en: 'Main', ar: 'رئيسي' }) : t({ en: 'No', ar: 'لا' })}
                      >
                        <span className="btn-text">{main ? t({ en: 'Main', ar: 'رئيسي' }) : t({ en: 'No', ar: 'لا' })}</span>
                      </span>
                    )
                  }

                  if (column.key === 'actions') {
                    return (
                      <div className="tree-node-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button
                          className="ultimate-btn ultimate-btn-edit"
                          title={t({ en: 'Edit', ar: 'تعديل' })}
                          onClick={() => openEdit(original)}
                          style={{ minHeight: 32, padding: '6px 10px' }}
                        >
                          <div className="btn-content"><span className="btn-text">{t({ en: 'Edit', ar: 'تعديل' })}</span></div>
                        </button>
                        <button
                          className="ultimate-btn ultimate-btn-delete"
                          title={t({ en: 'Delete', ar: 'حذف' })}
                          onClick={() => void handleDelete(original)}
                          style={{ minHeight: 32, padding: '6px 10px' }}
                        >
                          <div className="btn-content"><span className="btn-text">{t({ en: 'Delete', ar: 'حذف' })}</span></div>
                        </button>
                      </div>
                    )
                  }

                  return _value as any
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ColumnConfiguration
        columns={columns}
        onConfigChange={handleColumnConfigChange}
        isOpen={columnsConfigOpen}
        onClose={() => setColumnsConfigOpen(false)}
        onReset={resetToDefaults}
        sampleData={tableData as any}
      />

      <Dialog open={panelOpen} onClose={() => setPanelOpen(false)} fullWidth maxWidth="sm">
        <DialogContent sx={{ pt: 3 }}>
          <UnifiedCRUDForm
            key={editingRow?.id ?? 'locations-new'}
            ref={formRef}
            config={formConfig}
            initialData={formInitialData}
            resetOnInitialDataChange={false}
            isLoading={formSubmitting}
            onSubmit={handleFormSubmit}
            onCancel={() => setPanelOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LocationsPage