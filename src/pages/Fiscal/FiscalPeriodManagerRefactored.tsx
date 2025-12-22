// Force refresh
// Force update - v3 - Self-sufficient version
import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  LinearProgress,
  Chip,
  Grid
} from '@mui/material'
import {
  EditIcon,
  LockIcon,
  LockOpenIcon as UnlockIcon,
  CloseIcon,
  RefreshIcon,
  DateRangeIcon,
  CheckCircleIcon as CurrentIcon,
  AddIcon,
  DeleteIcon
} from '@/components/icons/SimpleIcons'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import {
  useFiscalPeriods,
  useUpdateFiscalPeriod,
  useLockPeriod,
  useUnlockPeriod,
  useClosePeriod,
  useSetCurrentPeriod
} from '@/services/fiscal/hooks/useFiscalPeriods'
import { useCurrentFiscalYear, useFiscalYears } from '@/services/fiscal/hooks/useFiscalYear'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/utils/supabase'
import type { FiscalPeriod, UpdateFiscalPeriodInput } from '@/services/fiscal/types'
import { useScopeOptional } from '@/contexts/ScopeContext'

// Props are now optional - component can work standalone
interface FiscalPeriodManagerProps {
  fiscalYearId?: string
  fiscalYearStart?: string
  fiscalYearEnd?: string
}

export default function FiscalPeriodManagerRefactored({
  fiscalYearId: propFiscalYearId
}: FiscalPeriodManagerProps) {
  const { isRTL } = useArabicLanguage()
  const { showToast } = useToast()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''

  // State for selected fiscal year (when not provided via props)
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('')

  // Fetch current fiscal year (is_current=true)
  const { data: currentFiscalYear, isLoading: loadingCurrentYear } = useCurrentFiscalYear(orgId)
  
  // Fetch all fiscal years as fallback
  const { data: allFiscalYears = [], isLoading: loadingAllYears } = useFiscalYears(orgId)
  
  // Find the best fiscal year to use:
  // 1. Prop value (if provided)
  // 2. Selected value (if user selected)
  // 3. Current fiscal year (is_current=true)
  // 4. First active fiscal year from the list
  // 5. First fiscal year from the list (any status)
  const fallbackFiscalYear = React.useMemo(() => {
    if (currentFiscalYear) return currentFiscalYear
    const activeYear = allFiscalYears.find(y => y.status === 'active')
    if (activeYear) return activeYear
    return allFiscalYears[0] || null
  }, [currentFiscalYear, allFiscalYears])

  // Determine which fiscal year to use
  const effectiveFiscalYearId = propFiscalYearId || selectedFiscalYearId || fallbackFiscalYear?.id || ''

  // Auto-select fiscal year when data loads
  React.useEffect(() => {
    if (!propFiscalYearId && !selectedFiscalYearId && fallbackFiscalYear?.id) {
      setSelectedFiscalYearId(fallbackFiscalYear.id)
    }
  }, [propFiscalYearId, selectedFiscalYearId, fallbackFiscalYear?.id])

  // State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<FiscalPeriod | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Queries & Mutations - use effective fiscal year ID
  // Note: fiscal_periods RLS is disabled due to stack depth issues
  // Authorization is handled at the application level
  const { data: periods = [], isLoading: loadingPeriods, error, refetch } = useFiscalPeriods(orgId, effectiveFiscalYearId)
  const updateMutation = useUpdateFiscalPeriod(orgId, effectiveFiscalYearId)
  const lockMutation = useLockPeriod(orgId, effectiveFiscalYearId)
  const unlockMutation = useUnlockPeriod(orgId, effectiveFiscalYearId)
  const closeMutation = useClosePeriod(orgId, effectiveFiscalYearId)
  const setCurrentMutation = useSetCurrentPeriod(orgId, effectiveFiscalYearId)

  // Combined loading state - wait for both current year and all years queries
  const isLoading = loadingCurrentYear || loadingAllYears || (effectiveFiscalYearId && loadingPeriods)

  // Status Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'success'
      case 'locked': return 'warning'
      case 'closed': return 'error'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: isRTL ? 'مفتوحة' : 'Open',
      locked: isRTL ? 'مؤمنة' : 'Locked',
      closed: isRTL ? 'مغلقة' : 'Closed'
    }
    return map[status] || status
  }

  // Handlers
  const handleEdit = (period: FiscalPeriod) => {
    setEditingPeriod(period)
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: UpdateFiscalPeriodInput) => {
    if (!editingPeriod) return
    try {
      await updateMutation.mutateAsync({ id: editingPeriod.id, input: values })
      showToast(isRTL ? 'تم تحديث الفترة بنجاح' : 'Period updated successfully', { severity: 'success' })
      setEditModalOpen(false)
      setEditingPeriod(null)
    } catch (err: any) {
      showToast(err.message, { severity: 'error' })
    }
  }

  const handleLock = async (id: string) => {
    try {
      await lockMutation.mutateAsync(id)
      showToast(isRTL ? 'تم تأمين الفترة' : 'Period locked', { severity: 'success' })
    } catch (err: any) {
      showToast(err.message, { severity: 'error' })
    }
  }

  const handleUnlock = async (id: string) => {
    try {
      await unlockMutation.mutateAsync(id)
      showToast(isRTL ? 'تم إلغاء تأمين الفترة' : 'Period unlocked', { severity: 'success' })
    } catch (err: any) {
      showToast(err.message, { severity: 'error' })
    }
  }

  const handleClosePeriod = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من إغلاق هذه الفترة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to close this period? This cannot be undone.')) return
    try {
      await closeMutation.mutateAsync({ periodId: id })
      showToast(isRTL ? 'تم إغلاق الفترة بنجاح' : 'Period closed successfully', { severity: 'success' })
    } catch (err: any) {
      showToast(err?.message || 'Error closing period', { severity: 'error' })
    }
  }

  const handleSetCurrent = async (id: string) => {
    try {
      await setCurrentMutation.mutateAsync(id)
      showToast(isRTL ? 'تم تعيين الفترة كحالية' : 'Set as current period', { severity: 'success' })
    } catch (err: any) {
      showToast(err.message, { severity: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الفترة؟' : 'Are you sure you want to delete this period?')) return
    try {
      const { error } = await supabase
        .from('fiscal_periods')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      showToast(isRTL ? 'تم حذف الفترة بنجاح' : 'Period deleted successfully', { severity: 'success' })
      refetch()
    } catch (err: any) {
      showToast(err?.message || 'Error deleting period', { severity: 'error' })
    }
  }

  if (isLoading) return <LinearProgress />
  if (error) return <Alert severity="error">{(error as Error)?.message || 'Error loading periods'}</Alert>
  
  // No fiscal year available
  if (!effectiveFiscalYearId) {
    return (
      <Box dir={isRTL ? 'rtl' : 'ltr'}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {isRTL 
            ? 'لا توجد سنة مالية حالية. يرجى إنشاء سنة مالية أولاً من لوحة التحكم المالية.'
            : 'No current fiscal year found. Please create a fiscal year first from the Fiscal Dashboard.'}
        </Alert>
        <Button 
          variant="contained" 
          href="/fiscal/dashboard"
        >
          {isRTL ? 'الذهاب إلى لوحة التحكم المالية' : 'Go to Fiscal Dashboard'}
        </Button>
      </Box>
    )
  }

  return (
    <Box dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Actions */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
        >
          {isRTL ? 'إنشاء فترة جديدة' : 'Create Period'}
        </Button>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          size="small"
        >
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </Box>

      {/* Periods List */}
      <Stack spacing={2}>
        {periods.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {isRTL ? 'لا توجد فترات مالية' : 'No fiscal periods found'}
            </Typography>
          </Paper>
        ) : (
          periods.map((period) => (
            <Paper key={period.id} sx={{ p: 2, borderLeft: period.isCurrent ? '4px solid #2196f3' : 'none' }}>
              <Grid container alignItems="center" spacing={2}>
                {/* Info */}
                <Grid item xs={12} md={4}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {isRTL ? (period.nameAr || period.nameEn) : period.nameEn}
                    </Typography>
                    {period.isCurrent && (
                      <Tooltip title={isRTL ? 'الفترة الحالية' : 'Current Period'}>
                        <Box display="flex">
                          <CurrentIcon color="primary" fontSize="small" />
                        </Box>
                      </Tooltip>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DateRangeIcon fontSize="inherit" />
                    {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                  </Typography>
                </Grid>

                {/* Status */}
                <Grid item xs={6} md={3}>
                  <Chip
                    label={getStatusLabel(period.status)}
                    color={getStatusColor(period.status) as any}
                    size="small"
                    variant="outlined"
                  />
                  {period.periodCode && (
                    <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                      {period.periodCode}
                    </Typography>
                  )}
                </Grid>

                {/* Actions */}
                <Grid item xs={6} md={5} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Tooltip title={isRTL ? 'تعديل' : 'Edit'}>
                    <IconButton size="small" onClick={() => handleEdit(period)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {period.status === 'open' && (
                    <>
                      <Tooltip title={isRTL ? 'تعيين كحالية' : 'Set Current'}>
                        <IconButton size="small" color="primary" onClick={() => handleSetCurrent(period.id)} disabled={period.isCurrent}>
                          <CurrentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isRTL ? 'تأمين' : 'Lock'}>
                        <IconButton size="small" color="warning" onClick={() => handleLock(period.id)}>
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}

                  {period.status === 'locked' && (
                    <>
                      <Tooltip title={isRTL ? 'إلغاء التأمين' : 'Unlock'}>
                        <IconButton size="small" onClick={() => handleUnlock(period.id)}>
                          <UnlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isRTL ? 'إغلاق نهائي' : 'Close'}>
                        <IconButton size="small" color="error" onClick={() => handleClosePeriod(period.id)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}

                  {period.status !== 'closed' && !period.isCurrent && (
                    <Tooltip title={isRTL ? 'حذف الفترة' : 'Delete Period'}>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(period.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Grid>
              </Grid>
            </Paper>
          ))
        )}
      </Stack>

      {/* Edit Modal */}
      <PeriodEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        period={editingPeriod}
        onSave={handleUpdate}
        isRTL={isRTL}
      />

      {/* Create Modal */}
      <CreatePeriodModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        fiscalYearId={effectiveFiscalYearId}
        orgId={orgId}
        isRTL={isRTL}
        onSuccess={() => {
          setCreateModalOpen(false)
          refetch()
          showToast(isRTL ? 'تم إنشاء الفترة بنجاح' : 'Period created successfully', { severity: 'success' })
        }}
      />
    </Box>
  )
}

// Sub-component for Edit Modal
function PeriodEditModal({ open, onClose, period, onSave, isRTL }: any) {
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: ''
  })

  // Load data when opening
  React.useEffect(() => {
    if (period) {
      setFormData({
        nameEn: period.nameEn || '',
        nameAr: period.nameAr || '',
        descriptionEn: period.descriptionEn || '',
        descriptionAr: period.descriptionAr || ''
      })
    }
  }, [period])

  const handleSubmit = () => {
    onSave(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>
        {isRTL ? 'تعديل الفترة' : 'Edit Period'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}
            value={formData.nameEn}
            onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
            fullWidth
          />
          <TextField
            label={isRTL ? 'الاسم (عربي)' : 'Name (AR)'}
            value={formData.nameAr}
            onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
            fullWidth
          />
          <TextField
            label={isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}
            value={formData.descriptionEn}
            onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label={isRTL ? 'الوصف (عربي)' : 'Description (AR)'}
            value={formData.descriptionAr}
            onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isRTL ? 'حفظ' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Sub-component for Create Modal
function CreatePeriodModal({ open, onClose, fiscalYearId, orgId, isRTL, onSuccess }: any) {
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    periodNumber: '',
    periodCode: '',
    nameEn: '',
    nameAr: '',
    startDate: '',
    endDate: '',
    descriptionEn: '',
    descriptionAr: ''
  })

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.periodNumber || !formData.periodCode || !formData.nameEn || !formData.startDate || !formData.endDate) {
      showToast(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', { severity: 'warning' })
      return
    }

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    if (startDate >= endDate) {
      showToast(isRTL ? 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' : 'Start date must be before end date', { severity: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      // Get authenticated user for created_by
      const { data: userData } = await supabase.auth.getUser()
      
      // Insert directly into fiscal_periods table
      const { error } = await supabase
        .from('fiscal_periods')
        .insert({
          org_id: orgId,
          fiscal_year_id: fiscalYearId,
          period_number: parseInt(formData.periodNumber),
          period_code: formData.periodCode,
          name_en: formData.nameEn,
          name_ar: formData.nameAr || null,
          start_date: formData.startDate,
          end_date: formData.endDate,
          description_en: formData.descriptionEn || null,
          description_ar: formData.descriptionAr || null,
          status: 'open',
          is_current: false,
          created_by: userData?.user?.id || null
        })

      if (error) throw error
      onSuccess()
      setFormData({ periodNumber: '', periodCode: '', nameEn: '', nameAr: '', startDate: '', endDate: '', descriptionEn: '', descriptionAr: '' })
    } catch (err: any) {
      showToast(err?.message || 'Error creating period', { severity: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>
        {isRTL ? 'إنشاء فترة جديدة' : 'Create New Period'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={isRTL ? 'رقم الفترة *' : 'Period Number *'}
            type="number"
            value={formData.periodNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, periodNumber: e.target.value }))}
            fullWidth
            required
            inputProps={{ min: 1, max: 12 }}
          />
          <TextField
            label={isRTL ? 'كود الفترة *' : 'Period Code *'}
            value={formData.periodCode}
            onChange={(e) => setFormData(prev => ({ ...prev, periodCode: e.target.value }))}
            fullWidth
            required
            placeholder={isRTL ? 'مثال: P01, Q1, JAN' : 'e.g., P01, Q1, JAN'}
          />
          <TextField
            label={isRTL ? 'الاسم (إنجليزي) *' : 'Name (EN) *'}
            value={formData.nameEn}
            onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label={isRTL ? 'الاسم (عربي)' : 'Name (AR)'}
            value={formData.nameAr}
            onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
            fullWidth
          />
          <TextField
            label={isRTL ? 'تاريخ البداية *' : 'Start Date *'}
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={isRTL ? 'تاريخ النهاية *' : 'End Date *'}
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}
            value={formData.descriptionEn}
            onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label={isRTL ? 'الوصف (عربي)' : 'Description (AR)'}
            value={formData.descriptionAr}
            onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isSubmitting}>
          {isSubmitting ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : (isRTL ? 'إنشاء' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
