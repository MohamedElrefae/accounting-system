import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Card, CardContent, Typography, Dialog, DialogContent, Box } from '@mui/material'
import UnifiedCRUDForm, { type FormConfig, type UnifiedCRUDFormHandle } from '@/components/Common/UnifiedCRUDForm'
import { listMaterials, type MaterialRow, createMaterial, updateMaterial, deleteMaterial } from '@/services/inventory/materials'
import { listUOMs, type UomRow } from '@/services/inventory/uoms'
import { useToast } from '@/contexts/ToastContext'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { INVENTORY_TEXTS } from '@/i18n/inventory'
import { getDisplayName } from '@/utils/inventoryDisplay'
import ResizableTable from '@/components/Common/ResizableTable'
import ColumnConfiguration from '@/components/Common/ColumnConfiguration'
import type { ColumnConfig } from '@/components/Common/ColumnConfiguration'
import useColumnPreferences from '@/hooks/useColumnPreferences'
import '../MainData/AccountsTree.css'
import { useScopeOptional } from '@/contexts/ScopeContext'

const MaterialsPage: React.FC = () => {
  const { showToast } = useToast()
  const { t, isRTL } = useArabicLanguage()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uoms, setUoms] = useState<UomRow[]>([])
  const formRef = useRef<UnifiedCRUDFormHandle>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<MaterialRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')

  const uomOptions = useMemo(() => {
    return uoms.map(u => ({
      value: u.id,
      label: `${u.code} - ${getDisplayName(u)}`,
    }))
  }, [uoms])

  const formConfig: FormConfig = useMemo(() => ({
    title: isRTL ? 'مادة' : 'Material',
    fields: [
      {
        id: 'material_code',
        type: 'text',
        label: isRTL ? 'كود المادة' : 'Material Code',
        required: true,
      },
      {
        id: 'material_name',
        type: 'text',
        label: isRTL ? 'اسم المادة' : 'Material Name',
        required: true,
      },
      {
        id: 'material_name_ar',
        type: 'text',
        label: isRTL ? 'اسم المادة (عربي)' : 'Material Name (Arabic)',
        required: false,
      },
      {
        id: 'base_uom_id',
        type: 'searchable-select',
        label: isRTL ? 'وحدة القياس' : 'UOM',
        placeholder: isRTL ? 'اختر وحدة القياس' : 'Select UOM',
        required: true,
        options: uomOptions,
      },
      {
        id: 'is_active',
        type: 'checkbox',
        label: isRTL ? 'فعال' : 'Active',
        defaultValue: true,
      },
      {
        id: 'is_trackable',
        type: 'checkbox',
        label: isRTL ? 'قابل للتتبع' : 'Trackable',
        defaultValue: true,
      },
    ],
    submitLabel: isRTL ? 'حفظ' : 'Save',
    cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
  }), [isRTL, uomOptions])

  const fetchData = useCallback(async () => {
    if (!orgId) {
      showToast(isRTL ? 'الرجاء اختيار مؤسسة أولاً' : 'Please select an organization first', { severity: 'warning' })
      return
    }

    setLoading(true)
    try {
      const [materials, uomsList] = await Promise.all([listMaterials(orgId), listUOMs(orgId)])
      setRows(materials)
      setUoms(uomsList)
    } catch (error) {
      console.error('Error loading materials:', error)
      showToast(isRTL ? 'خطأ في تحميل المواد' : 'Error loading materials', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast, isRTL, orgId])

  useEffect(() => {
    fetchData().catch(() => {})
  }, [fetchData])

  const openCreate = () => {
    setEditingRow(null)
    setPanelOpen(true)
  }

  const openEdit = (row: MaterialRow) => {
    setEditingRow(row)
    setPanelOpen(true)
  }

  const getSelectedMaterial = () => {
    if (!selectedMaterialId) return null
    return rows.find(r => r.id === selectedMaterialId) || null
  }

  const openEditSelected = () => {
    const selected = getSelectedMaterial()
    if (!selected) {
      showToast(isRTL ? 'يرجى اختيار مادة أولاً' : 'Please select a material first', { severity: 'warning' })
      return
    }
    openEdit(selected)
  }

  const handleDelete = async (row: MaterialRow) => {
    const name = getDisplayName(row)
    const ok = window.confirm(isRTL ? `هل أنت متأكد من حذف المادة "${name}"؟` : `Delete material "${name}"?`)
    if (!ok) return

    try {
      await deleteMaterial(row.id)
      showToast(isRTL ? 'تم حذف المادة' : 'Material deleted', { severity: 'success' })
      if (selectedMaterialId === row.id) setSelectedMaterialId('')
      await fetchData()
    } catch (e: any) {
      showToast(e?.message || (isRTL ? 'فشل الحذف' : 'Delete failed'), { severity: 'error' })
    }
  }

  const handleDeleteSelected = async () => {
    const selected = getSelectedMaterial()
    if (!selected) {
      showToast(isRTL ? 'يرجى اختيار مادة أولاً' : 'Please select a material first', { severity: 'warning' })
      return
    }
    await handleDelete(selected)
  }

  const defaultColumns: ColumnConfig[] = useMemo(() => {
    return [
      { key: 'material_code', label: isRTL ? 'كود المادة' : 'Material Code', visible: true, width: 140, type: 'text', resizable: true, sortable: true, frozen: true, pinPriority: 3 },
      { key: 'material_name', label: isRTL ? 'اسم المادة' : 'Material Name', visible: true, width: 280, type: 'text', resizable: true, sortable: true },
      { key: 'uom_label', label: isRTL ? 'وحدة القياس' : 'UOM', visible: true, width: 180, type: 'text', resizable: true, sortable: true },
      { key: 'is_active', label: isRTL ? 'فعال' : 'Active', visible: true, width: 140, type: 'badge', resizable: true },
      { key: 'is_trackable', label: isRTL ? 'قابل للتتبع' : 'Trackable', visible: true, width: 140, type: 'badge', resizable: true },
      { key: 'actions', label: isRTL ? 'الإجراءات' : 'Actions', visible: true, width: 220, type: 'actions', resizable: true, frozen: true, pinPriority: 2 },
    ]
  }, [isRTL])

  const {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults,
  } = useColumnPreferences({
    storageKey: 'materials_table',
    defaultColumns,
  })

  const tableData = useMemo(() => {
    return rows.map(r => {
      const uom = uoms.find(u => u.id === r.base_uom_id)
      return {
        material_code: r.material_code,
        material_name: getDisplayName(r),
        uom_label: uom ? `${uom.code} - ${getDisplayName(uom)}` : '-',
        is_active: !!r.is_active,
        is_trackable: !!r.is_trackable,
        actions: null,
        original: r,
      }
    })
  }, [rows, uoms])

  const formInitialData = useMemo(() => {
    return editingRow ? {
      material_code: editingRow.material_code,
      material_name: editingRow.material_name,
      material_name_ar: editingRow.material_name_ar || '',
      base_uom_id: editingRow.base_uom_id,
      is_active: !!editingRow.is_active,
      is_trackable: !!editingRow.is_trackable,
    } : {
      material_code: '',
      material_name: '',
      material_name_ar: '',
      base_uom_id: '',
      is_active: true,
      is_trackable: true,
    }
  }, [editingRow])

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const orgId = scope?.currentOrg?.id
    if (!orgId) {
      showToast(t({ en: 'Please select an organization first', ar: 'الرجاء اختيار مؤسسة أولاً' }), { severity: 'warning' })
      return
    }

    const material_code = String(data.material_code || '').trim()
    const material_name = String(data.material_name || '').trim()
    const base_uom_id = String(data.base_uom_id || '').trim()
    const material_name_ar = String(data.material_name_ar || '').trim()
    const is_active = Boolean(data.is_active)
    const is_trackable = Boolean(data.is_trackable)

    if (!material_code || !material_name || !base_uom_id) {
      showToast(t({ en: 'Code, Name, and UOM are required', ar: 'الكود والاسم ووحدة القياس مطلوبة' }), { severity: 'warning' })
      return
    }

    setFormSubmitting(true)
    try {
      if (editingRow) {
        await updateMaterial(editingRow.id, {
          material_code,
          material_name,
          material_name_ar: material_name_ar || null,
          base_uom_id,
          is_active,
          is_trackable,
        })
        showToast(t({ en: 'Material updated successfully', ar: 'تم تحديث المادة بنجاح' }), { severity: 'success' })
      } else {
        await createMaterial({
          org_id: orgId,
          material_code,
          material_name,
          material_name_ar: material_name_ar || null,
          base_uom_id,
          is_active,
          is_trackable,
          material_type: 'material',
          is_material_for_analysis: false,
          valuation_method: 'moving_average',
        })
        showToast(t({ en: 'Material created successfully', ar: 'تم إنشاء المادة بنجاح' }), { severity: 'success' })
      }

      setPanelOpen(false)
      await fetchData()
    } catch (e: any) {
      showToast(e?.message || t({ en: 'Save failed', ar: 'فشل الحفظ' }), { severity: 'error' })
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="accounts-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t(INVENTORY_TEXTS.materials)}</h1>
        </div>
        <div className="page-actions">
          <button className="ultimate-btn ultimate-btn-primary" title={t({ en: 'Columns', ar: 'الأعمدة' })} onClick={() => setColumnsConfigOpen(true)}>
            <div className="btn-content"><span className="btn-text">⚙️ {t({ en: 'Columns', ar: 'الأعمدة' })}</span></div>
          </button>
          <button className="ultimate-btn ultimate-btn-add" title={t({ en: 'Add Material', ar: 'إضافة مادة' })} onClick={openCreate}>
            <div className="btn-content"><span className="btn-text">{t({ en: 'Add Material', ar: 'إضافة مادة' })}</span></div>
          </button>
          <button className="ultimate-btn ultimate-btn-edit" title={t({ en: 'Edit Selected', ar: 'تعديل المحدد' })} onClick={openEditSelected} disabled={!selectedMaterialId}>
            <div className="btn-content"><span className="btn-text">{t({ en: 'Edit Selected', ar: 'تعديل المحدد' })}</span></div>
          </button>
          <button className="ultimate-btn ultimate-btn-delete" title={t({ en: 'Delete Selected', ar: 'حذف المحدد' })} onClick={handleDeleteSelected} disabled={!selectedMaterialId}>
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
                  {t({ en: 'No materials found', ar: 'لا توجد مواد' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t({ en: 'Click "Add Material" to add your first material', ar: 'انقر على "إضافة مادة" لإضافة أول مادة' })}
                </Typography>
                <button className="ultimate-btn ultimate-btn-add" title={t({ en: 'Add Material', ar: 'إضافة مادة' })} onClick={openCreate}>
                  <div className="btn-content"><span className="btn-text">{t({ en: 'Add First Material', ar: 'إضافة أول مادة' })}</span></div>
                </button>
              </Box>
            ) : (
              <ResizableTable
                columns={columns}
                data={tableData as any}
                onColumnResize={handleColumnResize}
                className="transactions-resizable-table"
                isLoading={loading}
                emptyMessage={t({ en: 'No materials', ar: 'لا توجد مواد' })}
                highlightRowId={selectedMaterialId}
                getRowId={(row) => (row as any)?.original?.id ?? (row as any)?.id ?? ''}
                onRowClick={(row) => {
                  const id = String((row as any)?.original?.id || '')
                  setSelectedMaterialId(id)
                }}
                renderCell={(_value, column, row) => {
                  const original = (row as any)?.original

                  if (!original) {
                    return _value as any
                  }

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

                  if (column.key === 'is_trackable') {
                    const track = !!original.is_trackable
                    return (
                      <span
                        className={`ultimate-btn ${track ? 'ultimate-btn-primary' : 'ultimate-btn-neutral'}`}
                        style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }}
                        title={track ? t({ en: 'Yes', ar: 'نعم' }) : t({ en: 'No', ar: 'لا' })}
                      >
                        <span className="btn-text">{track ? t({ en: 'Yes', ar: 'نعم' }) : t({ en: 'No', ar: 'لا' })}</span>
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

      {/* Edit Dialog */}
      <Dialog open={panelOpen} onClose={() => setPanelOpen(false)} fullWidth maxWidth="sm">
        <DialogContent sx={{ pt: 3 }}>
          <UnifiedCRUDForm
            key={editingRow?.id ?? 'materials-new'}
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

export default MaterialsPage