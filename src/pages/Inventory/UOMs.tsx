import { useEffect, useState, useRef } from 'react'
import { Box, Paper, Stack, Typography, Button, IconButton, Tooltip, Dialog, DialogContent, Menu, MenuItem, useTheme } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Download as DownloadIcon } from '@mui/icons-material'
import { supabase } from '@/utils/supabase'
import { getActiveOrgId } from '@/utils/org'
import { useToast } from '@/contexts/ToastContext'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import UnifiedCRUDForm, { type FormConfig, type UnifiedCRUDFormHandle } from '@/components/Common/UnifiedCRUDForm'
import { UniversalExportManager, type UniversalTableData, type UniversalTableColumn } from '@/utils/UniversalExportManager'

interface UomRow {
  id: string
  org_id: string
  code: string
  name: string
  name_ar?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function UOMsPage() {
  const theme = useTheme()
  const orgId = getActiveOrgId?.() || null
  const { showToast } = useToast()
  const { isRTL } = useArabicLanguage()
  const formRef = useRef<UnifiedCRUDFormHandle>(null)
  
  const [rows, setRows] = useState<UomRow[]>([])
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<UomRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null)
  const [exporting, setExporting] = useState(false)

  const fetchData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('uoms').select('*').eq('org_id', orgId).order('code', { ascending: true })
      if (error) throw error
      setRows(data || [])
    } catch (e: any) {
      showToast(e.message || 'Failed to load UOMs', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [orgId])

  const formConfig: FormConfig = {
    title: isRTL ? 'وحدة القياس' : 'Unit of Measure',
    fields: [
      {
        id: 'code',
        type: 'text',
        label: isRTL ? 'الرمز' : 'Code',
        placeholder: isRTL ? 'مثال: KG, M, PCS' : 'e.g. KG, M, PCS',
        required: true,
      },
      {
        id: 'name',
        type: 'text',
        label: isRTL ? 'الاسم (EN)' : 'Name (English)',
        required: true,
      },
      {
        id: 'name_ar',
        type: 'text',
        label: isRTL ? 'الاسم (AR)' : 'Name (Arabic)',
        required: false,
      },
      {
        id: 'is_active',
        type: 'checkbox',
        label: isRTL ? 'نشط' : 'Active',
        defaultValue: true,
      },
    ],
    submitLabel: isRTL ? 'حفظ' : 'Save',
    cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
  }

  const openCreate = () => {
    setEditingRow(null)
    setPanelOpen(true)
  }

  const openEdit = (row: UomRow) => {
    setEditingRow(row)
    setPanelOpen(true)
  }

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    if (!orgId) {
      showToast(isRTL ? 'اختر المنظمة' : 'Select organization', { severity: 'warning' })
      return
    }

    setFormSubmitting(true)
    try {
      if (editingRow) {
        const { error } = await supabase
          .from('uoms')
          .update({
            code: data.code,
            name: data.name,
            name_ar: data.name_ar || null,
            is_active: data.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRow.id)
        if (error) throw error
        showToast(isRTL ? 'تم تحديث الوحدة' : 'UOM updated', { severity: 'success' })
      } else {
        const { error } = await supabase.from('uoms').insert({
          org_id: orgId,
          code: data.code,
          name: data.name,
          name_ar: data.name_ar || null,
          is_active: data.is_active,
        })
        if (error) throw error
        showToast(isRTL ? 'تم إنشاء الوحدة' : 'UOM created', { severity: 'success' })
      }
      setPanelOpen(false)
      await fetchData()
    } catch (e: any) {
      showToast(e.message || 'Failed to save UOM', { severity: 'error' })
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الوحدة؟' : 'Are you sure you want to delete this UOM?')) return
    try {
      const { error } = await supabase.from('uoms').delete().eq('id', id)
      if (error) throw error
      showToast(isRTL ? 'تم حذف الوحدة' : 'UOM deleted', { severity: 'success' })
      await fetchData()
    } catch (e: any) {
      showToast(e.message || 'Failed to delete UOM', { severity: 'error' })
    }
  }

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportAnchor(event.currentTarget)
  }

  const handleExportClose = () => {
    setExportAnchor(null)
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf' | 'json') => {
    setExporting(true)
    try {
      const exportManager = UniversalExportManager.getInstance()
      
      const columns: UniversalTableColumn[] = [
        { key: 'code', header: isRTL ? 'الرمز' : 'Code', type: 'text', width: 100 },
        { key: 'name', header: isRTL ? 'الاسم (EN)' : 'Name (English)', type: 'text', width: 150 },
        { key: 'name_ar', header: isRTL ? 'الاسم (AR)' : 'Name (Arabic)', type: 'text', width: 150 },
        { key: 'is_active', header: isRTL ? 'نشط' : 'Active', type: 'boolean', width: 80 },
      ]

      const tableData: UniversalTableData = {
        columns,
        rows: rows.map(row => ({
          code: row.code,
          name: row.name,
          name_ar: row.name_ar || '',
          is_active: row.is_active,
        })),
        metadata: {
          source: isRTL ? 'وحدات القياس' : 'Units of Measure',
          generatedAt: new Date(),
        }
      }

      await exportManager.exportData(tableData, {
        title: isRTL ? 'وحدات القياس' : 'Units of Measure',
        format,
        rtlLayout: isRTL,
        orientation: 'portrait',
        includeHeader: true,
        includeFooter: true,
      })

      showToast(isRTL ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully', { severity: 'success' })
    } catch (error: any) {
      showToast(error.message || (isRTL ? 'فشل التصدير' : 'Export failed'), { severity: 'error' })
    } finally {
      setExporting(false)
      handleExportClose()
    }
  }

  const columns: GridColDef[] = [
    { field: 'code', headerName: isRTL ? 'الرمز' : 'Code', width: 120 },
    { field: 'name', headerName: isRTL ? 'الاسم (EN)' : 'Name (English)', flex: 1, minWidth: 150 },
    { field: 'name_ar', headerName: isRTL ? 'الاسم (AR)' : 'Name (Arabic)', flex: 1, minWidth: 150 },
    { field: 'is_active', headerName: isRTL ? 'نشط' : 'Active', width: 100, type: 'boolean' },
    {
      field: 'actions', headerName: isRTL ? 'إجراءات' : 'Actions', width: 120, sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={isRTL ? 'تعديل' : 'Edit'}><IconButton size="small" onClick={() => openEdit(params.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title={isRTL ? 'حذف' : 'Delete'}><IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      )
    }
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" fontWeight={700}>{isRTL ? 'وحدات القياس' : 'Units of Measure (UOM)'}</Typography>
          <Stack direction="row" spacing={1}>
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon />} 
              onClick={handleExportClick}
              disabled={rows.length === 0 || exporting}
              sx={{
                color: theme.palette.primary.main,
                borderColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.background.paper,
                  borderColor: theme.palette.primary.main,
                },
                '&:disabled': {
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                },
              }}
            >
              {isRTL ? 'تصدير' : 'Export'}
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={openCreate}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                },
                '&:active': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              {isRTL ? 'إضافة وحدة' : 'Add UOM'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Menu
        anchorEl={exportAnchor}
        open={Boolean(exportAnchor)}
        onClose={handleExportClose}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
          }
        }}
      >
        <MenuItem 
          onClick={() => handleExport('csv')} 
          disabled={exporting}
          sx={{
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            }
          }}
        >
          {isRTL ? 'تصدير إلى CSV' : 'Export to CSV'}
        </MenuItem>
        <MenuItem 
          onClick={() => handleExport('excel')} 
          disabled={exporting}
          sx={{
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            }
          }}
        >
          {isRTL ? 'تصدير إلى Excel' : 'Export to Excel'}
        </MenuItem>
        <MenuItem 
          onClick={() => handleExport('pdf')} 
          disabled={exporting}
          sx={{
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            }
          }}
        >
          {isRTL ? 'تصدير إلى PDF' : 'Export to PDF'}
        </MenuItem>
        <MenuItem 
          onClick={() => handleExport('json')} 
          disabled={exporting}
          sx={{
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            }
          }}
        >
          {isRTL ? 'تصدير إلى JSON' : 'Export to JSON'}
        </MenuItem>
      </Menu>

      <Box sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
        <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <DataGrid rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick sx={{ border: 0, flex: 1 }} />
        </Paper>
      </Box>

      <Dialog open={panelOpen} onClose={() => setPanelOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <UnifiedCRUDForm
            ref={formRef}
            config={formConfig}
            initialData={editingRow ? {
              code: editingRow.code,
              name: editingRow.name,
              name_ar: editingRow.name_ar || '',
              is_active: editingRow.is_active,
            } : {
              code: '',
              name: '',
              name_ar: '',
              is_active: true,
            }}
            isLoading={formSubmitting}
            onSubmit={handleFormSubmit}
            onCancel={() => setPanelOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
