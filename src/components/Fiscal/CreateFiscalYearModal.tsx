import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { useCreateFiscalYear } from '@/services/fiscal/hooks/useFiscalYear'
import { useToast } from '@/contexts/ToastContext'
import type { CreateFiscalYearInput } from '@/services/fiscal/types'

interface CreateFiscalYearModalProps {
  open: boolean
  onClose: () => void
  orgId: string
}

export default function CreateFiscalYearModal({ open, onClose, orgId }: CreateFiscalYearModalProps) {
  const { isRTL } = useArabicLanguage()
  const { showToast } = useToast()
  const createMutation = useCreateFiscalYear()

  const [formData, setFormData] = useState({
    yearNumber: new Date().getFullYear(),
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
    createMonthlyPeriods: true,
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
      const input: CreateFiscalYearInput = {
        orgId,
        yearNumber: formData.yearNumber,
        nameEn: formData.nameEn.trim(),
        nameAr: formData.nameAr.trim() || null,
        descriptionEn: formData.descriptionEn.trim() || null,
        descriptionAr: formData.descriptionAr.trim() || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        createMonthlyPeriods: formData.createMonthlyPeriods,
      }

      await createMutation.mutateAsync(input)
      
      showToast(
        isRTL ? 'تم إنشاء السنة المالية بنجاح' : 'Fiscal year created successfully',
        'success'
      )
      
      onClose()
      
      // Reset form
      setFormData({
        yearNumber: new Date().getFullYear() + 1,
        nameEn: '',
        nameAr: '',
        descriptionEn: '',
        descriptionAr: '',
        startDate: `${new Date().getFullYear() + 1}-01-01`,
        endDate: `${new Date().getFullYear() + 1}-12-31`,
        createMonthlyPeriods: true,
      })
    } catch (error: any) {
      showToast(
        error.message || (isRTL ? 'فشل في إنشاء السنة المالية' : 'Failed to create fiscal year'),
        'error'
      )
    }
  }

  const handleClose = () => {
    if (!createMutation.isPending) {
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <DialogTitle>
        {isRTL ? 'إنشاء سنة مالية جديدة' : 'Create New Fiscal Year'}
      </DialogTitle>
      
      <DialogContent>
        {createMutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {createMutation.error.message}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={isRTL ? 'رقم السنة' : 'Year Number'}
              type="number"
              value={formData.yearNumber}
              onChange={(e) => handleChange('yearNumber', parseInt(e.target.value) || '')}
              error={!!errors.yearNumber}
              helperText={errors.yearNumber}
              disabled={createMutation.isPending}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}
              value={formData.nameEn}
              onChange={(e) => handleChange('nameEn', e.target.value)}
              error={!!errors.nameEn}
              helperText={errors.nameEn}
              disabled={createMutation.isPending}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
              value={formData.nameAr}
              onChange={(e) => handleChange('nameAr', e.target.value)}
              disabled={createMutation.isPending}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={isRTL ? 'تاريخ البداية' : 'Start Date'}
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              error={!!errors.startDate}
              helperText={errors.startDate}
              disabled={createMutation.isPending}
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
              disabled={createMutation.isPending}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}
              multiline
              rows={2}
              value={formData.descriptionEn}
              onChange={(e) => handleChange('descriptionEn', e.target.value)}
              disabled={createMutation.isPending}
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
              disabled={createMutation.isPending}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.createMonthlyPeriods}
                  onChange={(e) => handleChange('createMonthlyPeriods', e.target.checked)}
                  disabled={createMutation.isPending}
                />
              }
              label={isRTL ? 'إنشاء فترات شهرية تلقائياً' : 'Create monthly periods automatically'}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={createMutation.isPending}
        >
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createMutation.isPending}
          startIcon={createMutation.isPending ? <CircularProgress size={20} /> : null}
        >
          {createMutation.isPending
            ? (isRTL ? 'جاري الإنشاء...' : 'Creating...')
            : (isRTL ? 'إنشاء' : 'Create')
          }
        </Button>
      </DialogActions>
    </Dialog>
  )
}