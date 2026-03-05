import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createStandardColumns
} from '../../hooks/useUniversalExport'
import { 
  getAdjustmentTypes, 
  getAdjustmentTypesWithUsage, 
  createAdjustmentType, 
  updateAdjustmentType, 
  deleteAdjustmentType, 
  getAdjustmentTypeByCode,
  type AdjustmentTypeWithUsage
} from '../../services/adjustment-types'
import { useToast } from '../../contexts/ToastContext'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useScope } from '../../contexts/ScopeContext'
import { ExportButtons } from '../../components/Common/ExportButtons'
import UnifiedCRUDForm from '../../components/Common/UnifiedCRUDForm'
import { 
  Box, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography, 
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material'
import { Close } from '@mui/icons-material'

const AdditionDeductionAnalysisPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  const { currentOrg } = useScope()
  const orgId = currentOrg?.id || ''
  const navigate = useNavigate()
  const canCreate = hasPermission('adjustment_types.create')
  const canUpdate = hasPermission('adjustment_types.update')
  const canDelete = hasPermission('adjustment_types.delete')
  const canRead = hasPermission('adjustment_types.read')
  
  // Theme hooks
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // State
  const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentTypeWithUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'code' | 'name'>('code')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedType, setSelectedType] = useState<AdjustmentTypeWithUsage | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [stats, setStats] = useState({
    totalItems: 0,
    additionTypes: 0,
    deductionTypes: 0,
    usageCount: 0
  })

  // Memoized initial data for form
  const initialData = useMemo(() => 
    formMode === 'edit' && selectedType 
      ? {
          ...selectedType,
          type: selectedType.default_percentage >= 0 ? 'addition' : 'deduction',
          default_percentage: Math.abs(selectedType.default_percentage)
        }
      : {}
  , [formMode, selectedType])

  // Load adjustment types
  const loadAdjustmentTypes = useCallback(async () => {
    if (!orgId || !canRead) return

    try {
      setLoading(true)
      const types = await getAdjustmentTypesWithUsage(orgId)
      setAdjustmentTypes(types)
      
      // Calculate stats
      const totalItems = types.length
      const additionTypes = types.filter(t => t.default_percentage > 0).length
      const deductionTypes = types.filter(t => t.default_percentage < 0).length
      const usageCount = types.reduce((sum, t) => sum + (t.usage_count || 0), 0)
      
      setStats({
        totalItems,
        additionTypes,
        deductionTypes,
        usageCount
      })
    } catch (error) {
      console.error('Failed to load adjustment types:', error)
      showToast('Failed to load adjustment types', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orgId, canRead])

  useEffect(() => {
    if (orgId) {
      loadAdjustmentTypes()
    } else {
      setLoading(false)
    }
  }, [orgId, loadAdjustmentTypes])

  // Filter adjustment types
  const filteredTypes = useMemo(() => {
    if (!search) return adjustmentTypes
    const q = search.toLowerCase()
    return adjustmentTypes.filter(type =>
      type.code.toLowerCase().includes(q) ||
      type.name.toLowerCase().includes(q) ||
      (type.name_ar && type.name_ar.toLowerCase().includes(q)) ||
      (type.description && type.description.toLowerCase().includes(q))
    )
  }, [search, adjustmentTypes])

  // Sort and filter adjustment types
  const filteredAndSorted = useMemo(() => {
    const data = [...filteredTypes]
    
    data.sort((a, b) => {
      switch (sortBy) {
        case 'code':
          return a.code.localeCompare(b.code)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return a.code.localeCompare(b.code)
      }
    })

    return data
  }, [filteredTypes, sortBy])

  useEffect(() => { setPage(0) }, [search, sortBy])

  // Pagination
  const paginatedTypes = useMemo(() => {
    const start = page * rowsPerPage
    const end = start + rowsPerPage
    return filteredAndSorted.slice(start, end)
  }, [filteredAndSorted, page, rowsPerPage])

  // Export data
  const exportData = useMemo(() => {
    if (!filteredTypes || filteredTypes.length === 0) {
      return { 
        columns: createStandardColumns([
          { key: 'code', header: 'Code / الكود', type: 'text' },
          { key: 'name', header: 'Name / الاسم', type: 'text' },
          { key: 'name_ar', header: 'Arabic Name / الاسم بالعربية', type: 'text' },
          { key: 'default_percentage', header: 'Default Percentage / النسبة الافتراضية', type: 'percentage' },
          { key: 'usage_count', header: 'Usage Count / عدد الاستخدام', type: 'number' },
          { key: 'description', header: 'Description / الوصف', type: 'text' },
        ]), 
        rows: [] 
      }
    }
    
    const columns = createStandardColumns([
      { key: 'code', header: 'Code / الكود', type: 'text' },
      { key: 'name', header: 'Name / الاسم', type: 'text' },
      { key: 'name_ar', header: 'Arabic Name / الاسم بالعربية', type: 'text' },
      { key: 'default_percentage', header: 'Default Percentage / النسبة الافتراضية', type: 'percentage' },
      { key: 'usage_count', header: 'Usage Count / عدد الاستخدام', type: 'number' },
      { key: 'description', header: 'Description / الوصف', type: 'text' },
    ])
    
    return {
      columns,
      rows: filteredTypes.map(type => ({
        code: type.code,
        name: type.name,
        name_ar: type.name_ar || '',
        default_percentage: type.default_percentage,
        usage_count: type.usage_count || 0,
        description: type.description || '',
        created_at: type.created_at ? new Date(type.created_at).toLocaleDateString('ar-SA') : ''
      }))
    }
  }, [filteredTypes])

  // Form handlers
  const openCreateForm = () => {
    setSelectedType(null)
    setFormMode('create')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedType(null)
    setFormMode('create')
  }

  const handleFormSubmit = async (data: any) => {
    try {
      // Remove usage_count from data as it's not a database column
      const { usage_count, type, ...cleanData } = data
      
      // Convert type to default_percentage
      let defaultPercentage = cleanData.default_percentage
      if (type === 'addition') {
        defaultPercentage = Math.abs(defaultPercentage) // Ensure positive for additions
      } else if (type === 'deduction') {
        defaultPercentage = -Math.abs(defaultPercentage) // Ensure negative for deductions
      }
      
      const finalData = { ...cleanData, default_percentage: defaultPercentage }
      
      if (formMode === 'create') {
        // Check for duplicate code before creating
        const existingType = await getAdjustmentTypeByCode(orgId, finalData.code)
        if (existingType) {
          showToast('الكود مستخدم بالفعل في هذا التنظيم', { severity: 'error' })
          return
        }
        
        await createAdjustmentType({ ...finalData, org_id: orgId })
        showToast('Adjustment type created successfully', { severity: 'success' })
      } else {
        // For edit, check if code is being changed to an existing one (excluding current record)
        if (selectedType && selectedType.code !== finalData.code) {
          const existingType = await getAdjustmentTypeByCode(orgId, finalData.code)
          if (existingType && existingType.id !== selectedType.id) {
            showToast('الكود مستخدم بالفعل في هذا التنظيم', { severity: 'error' })
            return
          }
        }
        
        await updateAdjustmentType(selectedType!.id!, finalData)
        showToast('Adjustment type updated successfully', { severity: 'success' })
      }
      await loadAdjustmentTypes()
      closeForm()
    } catch (error) {
      console.error('Failed to save adjustment type:', error)
      
      // Handle specific database errors
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any
        if (dbError.code === '23505') { // Unique constraint violation
          showToast('هذا الكود أو الاسم مستخدم بالفعل', { severity: 'error' })
        } else if (dbError.code === 'PGRST116') { // Not found
          showToast('لم يتم العثور على السجل', { severity: 'error' })
        } else {
          showToast('فشل حفظ نوع التعديل', { severity: 'error' })
        }
      } else {
        showToast('فشل حفظ نوع التعديل', { severity: 'error' })
      }
    }
  }

  // Delete handler
  const handleDelete = async (type: AdjustmentTypeWithUsage) => {
    if (!confirm(`هل أنت متأكد من حذف نوع التعديل "${type.name}"؟`)) return

    try {
      await deleteAdjustmentType(type.id!)
      showToast('Adjustment type deleted successfully', { severity: 'success' })
      await loadAdjustmentTypes()
    } catch (error) {
      console.error('Failed to delete adjustment type:', error)
      showToast('Failed to delete adjustment type', { severity: 'error' })
    }
  }

  // Edit handler
  const handleEdit = (type: AdjustmentTypeWithUsage) => {
    setSelectedType(type)
    setFormMode('edit')
    setIsFormOpen(true)
  }

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, type: AdjustmentTypeWithUsage) => {
    setAnchorEl(event.currentTarget)
    setSelectedType(type)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedType(null)
  }

  // Show message if no organization is selected
  if (!currentOrg) {
    return (
      <div className="accounts-page" dir="rtl" style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div className="page-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="page-header-left">
            <h1 className="page-title" style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#333' }}>Manage Addition/Deduction</h1>
          </div>
        </div>
        
        <div className="content-area" style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div className="card" style={{ padding: '3rem' }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem', color: '#999' }}>📊</div>
              <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>Please select an organization first</h3>
              <p style={{ color: '#999' }}>Select an organization from the top toolbar to view adjustment types</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no permission
  if (!canRead) {
    return (
      <div className="accounts-page" dir="rtl" style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div className="page-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="page-header-left">
            <h1 className="page-title" style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#333' }}>Manage Addition/Deduction</h1>
          </div>
        </div>
        
        <div className="content-area" style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div className="card" style={{ padding: '3rem' }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem', color: '#999' }}>🔒</div>
              <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>Access Denied</h3>
              <p style={{ color: '#999' }}>You don't have permission to view adjustment types</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-page" dir="rtl" style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div className="page-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div className="page-header-left">
          <h1 className="page-title" style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#333' }}>Manage Addition/Deduction</h1>
          <h2 className="page-subtitle" style={{ margin: '0', fontSize: '14px', color: '#666', marginTop: '4px' }}>إدارة الإضافات والخصومات</h2>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="ultimate-btn ultimate-btn-add" title="إضافة نوع تعديل جديد" onClick={openCreateForm} disabled={!canCreate} style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            <div className="btn-content"><span className="btn-text">+ إضافة</span></div>
          </button>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير أنواع التعديلات', orientation: 'landscape', useArabicNumerals: true, rtlLayout: true }}
            size="small"
            layout="dropdown"
          />
        </div>
      </div>

      <div className="controls-container" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: theme.palette.background.paper,
        borderRadius: '8px',
        boxShadow: theme.shadows[2]
      }}>
        <div className="search-and-filters" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="البحث في أنواع التعديلات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              style={{
                padding: '10px 40px 10px 15px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '6px',
                fontSize: '14px',
                width: '300px',
                outline: 'none',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary
              }}
            />
            <span className="icon" style={{ position: 'absolute', left: '15px', color: theme.palette.text.secondary }}>🔍</span>
          </div>

          <select value={sortBy || 'code'} onChange={(e) => setSortBy(e.target.value as 'code' | 'name')} className="filter-select" style={{
            padding: '10px 15px',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            outline: 'none'
          }}>
            <option value="code">ترتيب حسب الكود</option>
            <option value="name">ترتيب حسب الاسم</option>
          </select>
        </div>

        <div className="view-mode-toggle" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Current organization display */}
          <div className="current-org-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: theme.palette.action.hover, 
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '200px',
            textAlign: 'center',
            color: theme.palette.text.primary
          }}>
            {currentOrg ? `${currentOrg.code} - ${currentOrg.name}` : 'لم يتم تحديد مؤسسة'}
          </div>
          <button className={`view-mode-btn active`} style={{
            padding: '8px 16px',
            border: `1px solid ${theme.palette.primary.main}`,
            borderRadius: '6px',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            cursor: 'pointer',
            fontSize: '12px'
          }}>عرض جدول</button>
        </div>
      </div>

      <div className="content-area" style={{ backgroundColor: theme.palette.background.paper, borderRadius: '8px', boxShadow: theme.shadows[2], overflow: 'hidden' }}>
        <div className="accounts-table-view">
          <table className="accounts-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '120px' }} />
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '200px' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: `${theme.palette.primary.main} !important`, borderBottom: `2px solid ${theme.palette.divider}` }}>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>الكود</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>اسم التعديل</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>النسبة الافتراضية</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>الاستخدام</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>النوع</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>الوصف</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: `${theme.palette.primary.contrastText} !important` }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: theme.palette.text.secondary }}>
                    <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</div>
                    <div style={{ fontSize: '18px', marginBottom: '0.5rem', color: theme.palette.text.primary }}>لا توجد أنواع تعديلات</div>
                    <div style={{ fontSize: '14px', color: theme.palette.text.secondary }}>قم بإضافة نوع تعديل جديد للبدء</div>
                  </td>
                </tr>
              ) : (
                paginatedTypes.map((type) => (
                  <tr key={type.id} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: theme.palette.text.primary }}>
                      {type.code}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: theme.palette.text.primary }}>{type.name}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: type.default_percentage > 0 ? theme.palette.success.light : theme.palette.error.light,
                        color: type.default_percentage > 0 ? theme.palette.success.dark : theme.palette.error.dark
                      }}>
                        {type.default_percentage > 0 ? '+' : ''}{type.default_percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: (type.usage_count || 0) > 0 ? '#d4edda' : '#f8d7da',
                        color: (type.usage_count || 0) > 0 ? '#155724' : '#721c24'
                      }}>
                        {type.usage_count || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: type.default_percentage > 0 ? '#d4edda' : '#fff3cd',
                        color: type.default_percentage > 0 ? '#155724' : '#856404'
                      }}>
                        {type.default_percentage > 0 ? 'إضافة' : 'خصم'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: theme.palette.text.secondary }}>
                      {type.description || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(type)}
                        style={{
                          padding: '6px 12px',
                          marginRight: '5px',
                          backgroundColor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(type)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: theme.palette.error.main,
                          color: theme.palette.error.contrastText,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '15px',
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper
        }}>
          <div style={{ fontSize: '14px', color: theme.palette.text.secondary }}>
            إجمالي {paginatedTypes.length} من {filteredTypes.length} نوع تعديل
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 12px',
                backgroundColor: page === 0 ? theme.palette.action.disabledBackground : theme.palette.primary.main,
                color: page === 0 ? theme.palette.action.disabled : theme.palette.primary.contrastText,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                cursor: page === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              السابق
            </button>
            <span style={{ fontSize: '14px', color: theme.palette.text.secondary }}>
              {page + 1} من {Math.ceil(filteredTypes.length / rowsPerPage)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(filteredTypes.length / rowsPerPage) - 1, page + 1))}
              disabled={page >= Math.ceil(filteredTypes.length / rowsPerPage) - 1}
              style={{
                padding: '6px 12px',
                backgroundColor: page >= Math.ceil(filteredTypes.length / rowsPerPage) - 1 ? theme.palette.action.disabledBackground : theme.palette.primary.main,
                color: page >= Math.ceil(filteredTypes.length / rowsPerPage) - 1 ? theme.palette.action.disabled : theme.palette.primary.contrastText,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                cursor: page >= Math.ceil(filteredTypes.length / rowsPerPage) - 1 ? 'not-allowed' : 'pointer'
              }}
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={closeForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24
          }
        }}
      >
        <DialogTitle id="form-modal-title">
          {formMode === 'create' ? 'إضافة نوع تعديل جديد' : 'تعديل نوع التعديل'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <UnifiedCRUDForm
            config={{
              title: '', // Title is handled by the modal header
              submitLabel: formMode === 'create' ? 'إضافة' : 'تحديث',
              cancelLabel: 'إلغاء',
                fields: [
                  {
                    id: 'type',
                    label: 'نوع التعديل',
                    type: 'select',
                    required: true,
                    placeholder: 'اختر نوع التعديل',
                    options: [
                      { value: 'addition', label: 'إضافة' },
                      { value: 'deduction', label: 'خصم' }
                    ],
                    validation: (value: unknown) => {
                      if (!value || typeof value !== 'string') return { field: 'type', message: 'نوع التعديل مطلوب' }
                      if (!['addition', 'deduction'].includes(value)) return { field: 'type', message: 'اختر نوع تعديل صحيح' }
                      return null
                    }
                  },
                  {
                    id: 'code',
                    label: 'الكود',
                    type: 'text',
                    required: true,
                    placeholder: 'أدخل الكود',
                    validation: (value: unknown) => {
                      if (!value || typeof value !== 'string') return { field: 'code', message: 'الكود مطلوب' }
                      if (value.length < 2) return { field: 'code', message: 'الكود يجب أن يكون 2 أحرف على الأقل' }
                      if (!/^[A-Za-z0-9]+$/.test(value)) return { field: 'code', message: 'الكود يجب أن يحتوي على أحرف و أرقام فقط' }
                      return null
                    }
                  },
                  {
                    id: 'name',
                    label: 'الاسم',
                    type: 'text',
                    required: true,
                    placeholder: 'أدخل الاسم',
                    validation: (value: unknown) => {
                      if (!value || typeof value !== 'string') return { field: 'name', message: 'الاسم مطلوب' }
                      if (value.length < 3) return { field: 'name', message: 'الاسم يجب أن يكون 3 أحرف على الأقل' }
                      return null
                    }
                  },
                  {
                    id: 'default_percentage',
                    label: 'النسبة الافتراضية (%)',
                    type: 'number',
                    required: true,
                    placeholder: 'أدخل النسبة المئوية',
                    validation: (value: unknown) => {
                      if (value === null || value === undefined) return { field: 'default_percentage', message: 'النسبة مطلوبة' }
                      if (typeof value !== 'number') return { field: 'default_percentage', message: 'النسبة يجب أن تكون رقمًا' }
                      if (value < -100 || value > 100) return { field: 'default_percentage', message: 'النسبة يجب أن تكون بين -100 و 100' }
                      return null
                    }
                  },
                  {
                    id: 'description',
                    label: 'الوصف',
                    type: 'textarea',
                    placeholder: 'أدخل الوصف',
                    validation: (value: unknown) => {
                      if (value && typeof value === 'string' && value.length > 500) return { field: 'description', message: 'الوصف يجب أن لا يتجاوز 500 حرف' }
                      return null
                    }
                  }
                ]
              }}
              initialData={initialData}
              resetOnInitialDataChange={true}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm}>إلغاء</Button>
            <Button onClick={() => { handleFormSubmit({} as any); }} variant="contained" color="primary">
              حفظ
            </Button>
          </DialogActions>
        </Dialog>
    </div>
  )
}

export default AdditionDeductionAnalysisPage
