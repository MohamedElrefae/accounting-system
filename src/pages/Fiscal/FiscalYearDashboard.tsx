import React, { useState } from 'react'
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Tooltip,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as ActivateIcon,
  Stop as CloseIcon,
  Inventory as ArchiveIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Assessment as ReportsIcon,
  AccountBalance as BalanceIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import {
  useFiscalYears,
  useCreateFiscalYear,
  useUpdateFiscalYear,
  useDeleteFiscalYear,
  useSetCurrentFiscalYear,
  useActivateFiscalYear,
  useCloseFiscalYear,
  useArchiveFiscalYear,
  useCanManageFiscal
} from '@/services/fiscal/hooks/useFiscalYear'
import { useToast } from '@/contexts/ToastContext'
import { useScopeOptional } from '@/contexts/ScopeContext'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from '@/services/fiscal/types'
import './FiscalPages.css'

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return '#2076FF'
    case 'active': return '#21C197'
    case 'closed': return '#DE3F3F'
    case 'archived': return '#8D94A2'
    default: return '#8D94A2'
  }
}

// Status text mapping
const getStatusText = (status: string, isRTL: boolean) => {
  const statusMap = {
    draft: isRTL ? 'مسودة' : 'Draft',
    active: isRTL ? 'نشط' : 'Active',
    closed: isRTL ? 'مغلق' : 'Closed',
    archived: isRTL ? 'مؤرشف' : 'Archived'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

// Create/Edit Modal Component
interface FiscalYearModalProps {
  open: boolean
  onClose: () => void
  fiscalYear?: FiscalYear | null
  orgId: string
}

function FiscalYearModal({ open, onClose, fiscalYear, orgId }: FiscalYearModalProps) {
  const { isRTL } = useArabicLanguage()
  const { showToast } = useToast()
  const createMutation = useCreateFiscalYear()
  const updateMutation = useUpdateFiscalYear(orgId)

  const isEdit = !!fiscalYear
  const currentYear = new Date().getFullYear()

  const [formData, setFormData] = useState({
    yearNumber: fiscalYear?.yearNumber || currentYear,
    nameEn: fiscalYear?.nameEn || '',
    nameAr: fiscalYear?.nameAr || '',
    descriptionEn: fiscalYear?.descriptionEn || '',
    descriptionAr: fiscalYear?.descriptionAr || '',
    startDate: fiscalYear?.startDate || `${currentYear}-01-01`,
    endDate: fiscalYear?.endDate || `${currentYear}-12-31`,
    createMonthlyPeriods: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.yearNumber) {
      newErrors.yearNumber = isRTL ? 'رقم السنة مطلوب' : 'Year number is required'
    }

    if (!formData.nameEn.trim()) {
      newErrors.nameEn = isRTL ? 'الاسم بالإنجليزية مطلوب' : 'English name is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = isRTL ? 'تاريخ البداية مطلوب' : 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = isRTL ? 'تاريخ النهاية مطلوب' : 'End date is required'
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = isRTL ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' : 'End date must be after start date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      if (isEdit && fiscalYear) {
        const input: UpdateFiscalYearInput = {
          nameEn: formData.nameEn.trim(),
          nameAr: formData.nameAr.trim() || undefined,
          descriptionEn: formData.descriptionEn.trim() || undefined,
          descriptionAr: formData.descriptionAr.trim() || undefined
        }
        await updateMutation.mutateAsync({ id: fiscalYear.id, input })
        showToast(isRTL ? 'تم تحديث السنة المالية بنجاح' : 'Fiscal year updated successfully', { severity: 'success' })
      } else {
        const input: CreateFiscalYearInput = {
          orgId,
          yearNumber: formData.yearNumber,
          nameEn: formData.nameEn.trim(),
          nameAr: formData.nameAr.trim() || undefined,
          descriptionEn: formData.descriptionEn.trim() || undefined,
          descriptionAr: formData.descriptionAr.trim() || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          createMonthlyPeriods: formData.createMonthlyPeriods
        }
        await createMutation.mutateAsync(input)
        showToast(isRTL ? 'تم إنشاء السنة المالية بنجاح' : 'Fiscal year created successfully', { severity: 'success' })
      }
      onClose()
    } catch (error: any) {
      showToast(
        error.message || (isRTL ? 'فشل في حفظ السنة المالية' : 'Failed to save fiscal year'),
        { severity: 'error' }
      )
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>
        {isEdit 
          ? (isRTL ? 'تعديل السنة المالية' : 'Edit Fiscal Year')
          : (isRTL ? 'إنشاء سنة مالية جديدة' : 'Create New Fiscal Year')
        }
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {!isEdit && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isRTL ? 'رقم السنة' : 'Year Number'}
                type="number"
                value={formData.yearNumber}
                onChange={(e) => handleChange('yearNumber', parseInt(e.target.value) || '')}
                error={!!errors.yearNumber}
                helperText={errors.yearNumber}
                disabled={isLoading}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={isEdit ? 12 : 6}>
            <TextField
              fullWidth
              label={isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}
              value={formData.nameEn}
              onChange={(e) => handleChange('nameEn', e.target.value)}
              error={!!errors.nameEn}
              helperText={errors.nameEn}
              disabled={isLoading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
              value={formData.nameAr}
              onChange={(e) => handleChange('nameAr', e.target.value)}
              disabled={isLoading}
            />
          </Grid>

          {!isEdit && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={isRTL ? 'تاريخ البداية' : 'Start Date'}
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                  disabled={isLoading}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={isRTL ? 'تاريخ النهاية' : 'End Date'}
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  error={!!errors.endDate}
                  helperText={errors.endDate}
                  disabled={isLoading}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}
              multiline
              rows={2}
              value={formData.descriptionEn}
              onChange={(e) => handleChange('descriptionEn', e.target.value)}
              disabled={isLoading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}
              multiline
              rows={2}
              value={formData.descriptionAr}
              onChange={(e) => handleChange('descriptionAr', e.target.value)}
              disabled={isLoading}
            />
          </Grid>

          {!isEdit && (
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.createMonthlyPeriods}
                    onChange={(e) => handleChange('createMonthlyPeriods', e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label={isRTL ? 'إنشاء فترات شهرية تلقائياً' : 'Create monthly periods automatically'}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading
            ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
            : (isEdit ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إنشاء' : 'Create'))
          }
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Fiscal Year Card Component
interface FiscalYearCardProps {
  fiscalYear: FiscalYear
  onEdit: () => void
  onDelete: () => void
  onSetCurrent: () => void
  onActivate: () => void
  onClose: () => void
  onArchive: () => void
  canManage: boolean
}

function FiscalYearCard({
  fiscalYear,
  onEdit,
  onDelete,
  onSetCurrent,
  onActivate,
  onClose,
  onArchive,
  canManage
}: FiscalYearCardProps) {
  const { isRTL } = useArabicLanguage()
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const statusColor = getStatusColor(fiscalYear.status)
  const statusText = getStatusText(fiscalYear.status, isRTL)

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: statusColor
        }
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" fontWeight="bold">
                  {isRTL ? (fiscalYear.nameAr || fiscalYear.nameEn) : fiscalYear.nameEn}
                </Typography>
                {fiscalYear.isCurrent && (
                  <Tooltip title={isRTL ? 'السنة الحالية' : 'Current Year'}>
                    <StarIcon color="warning" />
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'السنة المالية' : 'Fiscal Year'} {fiscalYear.yearNumber}
              </Typography>
            </Box>
            
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label={statusText}
                size="small"
                sx={{
                  bgcolor: alpha(statusColor, 0.1),
                  color: statusColor,
                  fontWeight: 'bold'
                }}
              />
              {canManage && (
                <IconButton size="small" onClick={handleMenuClick}>
                  <MoreVertIcon />
                </IconButton>
              )}
            </Stack>
          </Stack>

          {/* Period */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {isRTL ? 'الفترة' : 'Period'}
            </Typography>
            <Typography variant="body2">
              {new Date(fiscalYear.startDate).toLocaleDateString()} - {new Date(fiscalYear.endDate).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Description */}
          {(fiscalYear.descriptionEn || fiscalYear.descriptionAr) && (
            <Typography variant="body2" color="text.secondary">
              {isRTL ? (fiscalYear.descriptionAr || fiscalYear.descriptionEn) : (fiscalYear.descriptionEn || fiscalYear.descriptionAr)}
            </Typography>
          )}
        </Stack>
      </CardContent>

      {canManage && (
        <CardActions>
          <Button
            size="small"
            startIcon={<CalendarIcon />}
            onClick={() => {/* Navigate to periods */}}
          >
            {isRTL ? 'الفترات' : 'Periods'}
          </Button>
          <Button
            size="small"
            startIcon={<ReportsIcon />}
            onClick={() => {/* Navigate to reports */}}
          >
            {isRTL ? 'التقارير' : 'Reports'}
          </Button>
        </CardActions>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { onEdit(); handleMenuClose() }}>
          <EditIcon sx={{ mr: 1 }} />
          {isRTL ? 'تعديل' : 'Edit'}
        </MenuItem>
        
        {!fiscalYear.isCurrent && (
          <MenuItem onClick={() => { onSetCurrent(); handleMenuClose() }}>
            <StarIcon sx={{ mr: 1 }} />
            {isRTL ? 'تعيين كحالية' : 'Set as Current'}
          </MenuItem>
        )}
        
        {fiscalYear.status === 'draft' && (
          <MenuItem onClick={() => { onActivate(); handleMenuClose() }}>
            <ActivateIcon sx={{ mr: 1 }} />
            {isRTL ? 'تفعيل' : 'Activate'}
          </MenuItem>
        )}
        
        {fiscalYear.status === 'active' && (
          <MenuItem onClick={() => { onClose(); handleMenuClose() }}>
            <CloseIcon sx={{ mr: 1 }} />
            {isRTL ? 'إغلاق' : 'Close'}
          </MenuItem>
        )}
        
        {fiscalYear.status === 'closed' && (
          <MenuItem onClick={() => { onArchive(); handleMenuClose() }}>
            <ArchiveIcon sx={{ mr: 1 }} />
            {isRTL ? 'أرشفة' : 'Archive'}
          </MenuItem>
        )}
        
        {fiscalYear.status === 'draft' && (
          <MenuItem onClick={() => { onDelete(); handleMenuClose() }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            {isRTL ? 'حذف' : 'Delete'}
          </MenuItem>
        )}
      </Menu>
    </Card>
  )
}

// Main Dashboard Component
export default function FiscalYearDashboard() {
  const { isRTL } = useArabicLanguage()
  const { showToast } = useToast()

  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const [showModal, setShowModal] = useState(false)
  const [editingFiscalYear, setEditingFiscalYear] = useState<FiscalYear | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Queries and mutations
  const { data: fiscalYears = [], isLoading, error, refetch } = useFiscalYears(orgId)
  const { data: canManage = false } = useCanManageFiscal(orgId)

  // Debug logging
  React.useEffect(() => {
    console.log('FiscalYearDashboard: Component mounted/updated', {
      orgId,
      fiscalYearsCount: fiscalYears.length,
      fiscalYears,
      isLoading,
      error,
      canManage
    })
  }, [orgId, fiscalYears, isLoading, error, canManage])
  const deleteMutation = useDeleteFiscalYear(orgId)
  const setCurrentMutation = useSetCurrentFiscalYear(orgId)
  const activateMutation = useActivateFiscalYear(orgId)
  const closeMutation = useCloseFiscalYear(orgId)
  const archiveMutation = useArchiveFiscalYear(orgId)

  // Handlers
  const handleCreate = () => {
    setEditingFiscalYear(null)
    setShowModal(true)
  }

  const handleEdit = (fiscalYear: FiscalYear) => {
    setEditingFiscalYear(fiscalYear)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      showToast(isRTL ? 'تم حذف السنة المالية بنجاح' : 'Fiscal year deleted successfully', { severity: 'success' })
      setDeleteConfirmId(null)
    } catch (error: any) {
      showToast(error.message || (isRTL ? 'فشل في حذف السنة المالية' : 'Failed to delete fiscal year'), { severity: 'error' })
    }
  }

  const handleSetCurrent = async (id: string) => {
    try {
      await setCurrentMutation.mutateAsync(id)
      showToast(isRTL ? 'تم تعيين السنة كحالية بنجاح' : 'Fiscal year set as current successfully', { severity: 'success' })
    } catch (error: any) {
      showToast(error.message || (isRTL ? 'فشل في تعيين السنة كحالية' : 'Failed to set as current'), { severity: 'error' })
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await activateMutation.mutateAsync(id)
      showToast(isRTL ? 'تم تفعيل السنة المالية بنجاح' : 'Fiscal year activated successfully', { severity: 'success' })
    } catch (error: any) {
      showToast(error.message || (isRTL ? 'فشل في تفعيل السنة المالية' : 'Failed to activate fiscal year'), { severity: 'error' })
    }
  }

  const handleClose = async (id: string) => {
    try {
      await closeMutation.mutateAsync(id)
      showToast(isRTL ? 'تم إغلاق السنة المالية بنجاح' : 'Fiscal year closed successfully', { severity: 'success' })
    } catch (error: any) {
      showToast(error.message || (isRTL ? 'فشل في إغلاق السنة المالية' : 'Failed to close fiscal year'), { severity: 'error' })
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await archiveMutation.mutateAsync(id)
      showToast(isRTL ? 'تم أرشفة السنة المالية بنجاح' : 'Fiscal year archived successfully', { severity: 'success' })
    } catch (error: any) {
      showToast(error.message || (isRTL ? 'فشل في أرشفة السنة المالية' : 'Failed to archive fiscal year'), { severity: 'error' })
    }
  }

  // Statistics
  const stats = {
    total: fiscalYears.length,
    draft: fiscalYears.filter(fy => fy.status === 'draft').length,
    active: fiscalYears.filter(fy => fy.status === 'active').length,
    closed: fiscalYears.filter(fy => fy.status === 'closed').length,
    archived: fiscalYears.filter(fy => fy.status === 'archived').length
  }

  if (!orgId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          {isRTL ? 'يرجى تحديد منظمة أولاً' : 'Please select an organization first'}
        </Alert>
      </Container>
    )
  }

  // Handle database errors with enterprise-grade error reporting
  if (error) {
    const errorObj = error as any
    const errorCode = errorObj?.code || 'UNKNOWN'
    const errorMessage = errorObj?.message || 'Unknown error occurred'
    const isStackDepthError = errorCode === '54001' || errorMessage?.includes('stack depth')
    
    return (
      <div className="fiscal-page" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="fiscal-page-header">
          <div className="fiscal-page-header-left">
            <h1 className="fiscal-page-title">
              {isRTL ? 'إدارة السنوات المالية' : 'Fiscal Year Management'}
            </h1>
          </div>
          <div className="fiscal-page-actions">
            <button className="ultimate-btn ultimate-btn-primary" onClick={() => refetch()}>
              <div className="btn-content">
                <RefreshIcon />
                <span>{isRTL ? 'إعادة المحاولة' : 'Retry'}</span>
              </div>
            </button>
          </div>
        </div>
        <div className="fiscal-page-content">
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'خطأ في النظام' : 'System Error'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {isStackDepthError ? (
                isRTL 
                  ? 'خطأ في تكوين قاعدة البيانات (Stack Depth). يرجى الاتصال بمدير النظام لحل هذه المشكلة.'
                  : 'Database configuration error (Stack Depth Limit). Please contact your system administrator to resolve this issue.'
              ) : (
                isRTL 
                  ? 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.'
                  : 'An error occurred while loading data. Please try again or contact technical support.'
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Error Code: {errorCode} | {errorMessage}
            </Typography>
          </Alert>
          
          {isStackDepthError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                {isRTL ? 'للمطورين:' : 'For Developers:'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {isRTL 
                  ? 'يرجى مراجعة سياسات RLS في جدول fiscal_years أو زيادة max_stack_depth في إعدادات قاعدة البيانات.'
                  : 'Please review RLS policies on fiscal_years table or increase max_stack_depth in database configuration.'
                }
              </Typography>
            </Alert>
          )}
          
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'الإجراءات المتاحة' : 'Available Actions'}
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => refetch()}>
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </Button>
              {canManage && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                  {isRTL ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}
                </Button>
              )}
            </Stack>
          </Paper>
        </div>
      </div>
    )
  }

  return (
    <div className="fiscal-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="fiscal-page-header">
        <div className="fiscal-page-header-left">
          <h1 className="fiscal-page-title">
            {isRTL ? 'إدارة السنوات المالية' : 'Fiscal Year Management'}
          </h1>
          <p className="fiscal-page-subtitle">
            {isRTL ? 'عرض وإدارة السنوات المالية للمنظمة' : 'View and manage organizational fiscal years'}
          </p>
        </div>
        <div className="fiscal-page-actions">
          <Tooltip title={isRTL ? 'تحديث البيانات' : 'Refresh Data'}>
            <span>
              <IconButton
                onClick={() => refetch()}
                disabled={isLoading}
                sx={{ color: 'white' }}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          {canManage && (
            <button className="ultimate-btn ultimate-btn-add" onClick={handleCreate}>
              <div className="btn-content">
                <AddIcon />
                <span>{isRTL ? 'سنة مالية جديدة' : 'New Fiscal Year'}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="fiscal-page-content">


        {/* Statistics */}
        <div className="fiscal-grid">
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'إجمالي السنوات' : 'Total Years'}</div>
            <div className="fiscal-grid-item-value">{stats.total}</div>
          </div>
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'مسودات' : 'Draft'}</div>
            <div className="fiscal-grid-item-value">{stats.draft}</div>
          </div>
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'نشطة' : 'Active'}</div>
            <div className="fiscal-grid-item-value positive">{stats.active}</div>
          </div>
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'مغلقة' : 'Closed'}</div>
            <div className="fiscal-grid-item-value">{stats.closed}</div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Fiscal Years Grid */}
        {fiscalYears.length > 0 ? (
          <Grid container spacing={3}>
            {fiscalYears.map((fiscalYear) => (
              <Grid item xs={12} sm={6} md={4} key={fiscalYear.id}>
                <FiscalYearCard
                  fiscalYear={fiscalYear}
                  onEdit={() => handleEdit(fiscalYear)}
                  onDelete={() => setDeleteConfirmId(fiscalYear.id)}
                  onSetCurrent={() => handleSetCurrent(fiscalYear.id)}
                  onActivate={() => handleActivate(fiscalYear.id)}
                  onClose={() => handleClose(fiscalYear.id)}
                  onArchive={() => handleArchive(fiscalYear.id)}
                  canManage={canManage}
                />
              </Grid>
            ))}
          </Grid>
        ) : !isLoading ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <BalanceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {isRTL ? 'لا توجد سنوات مالية' : 'No fiscal years found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isRTL ? 'ابدأ بإنشاء أول سنة مالية للمنظمة' : 'Start by creating your first fiscal year'}
            </Typography>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                {isRTL ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}
              </Button>
            )}
          </Paper>
        ) : null}
      </div>

      {/* Create/Edit Modal */}
      <FiscalYearModal
        open={showModal}
        onClose={() => setShowModal(false)}
        fiscalYear={editingFiscalYear}
        orgId={orgId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogTitle>
          {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {isRTL 
              ? 'هل أنت متأكد من حذف هذه السنة المالية؟ لا يمكن التراجع عن هذا الإجراء.'
              : 'Are you sure you want to delete this fiscal year? This action cannot be undone.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteMutation.isPending ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'حذف' : 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}