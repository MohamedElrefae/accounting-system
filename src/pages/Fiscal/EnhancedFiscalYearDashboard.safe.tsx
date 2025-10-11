import React, { useEffect, useState } from 'react'
import { Box, Container, Paper, Typography, Button, Stack, List, ListItem, ListItemText, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Switch, Alert } from '@mui/material'
import { getActiveOrgId } from '@/utils/org'
import { FiscalYearManagementService } from '@/services/FiscalYearManagementService'
import { useArabicLanguage } from '@/services/ArabicLanguageService'

export default function EnhancedFiscalYearDashboardSafe() {
  const { isRTL } = useArabicLanguage()
  const [orgId] = useState(() => getActiveOrgId() || '')
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState<any[]>([])

  // Create FY dialog state
  const [open, setOpen] = useState(false)
  const [yearNumber, setYearNumber] = useState<number>(new Date().getFullYear())
  const [startDate, setStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`)
  const [endDate, setEndDate] = useState<string>(`${new Date().getFullYear()}-12-31`)
  const [nameEn, setNameEn] = useState<string>('')
  const [nameAr, setNameAr] = useState<string>('')
  const [descEn, setDescEn] = useState<string>('')
  const [descAr, setDescAr] = useState<string>('')
  const [createPeriods, setCreatePeriods] = useState<boolean>(false) // default OFF to isolate
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const data = orgId ? await FiscalYearManagementService.getFiscalYears(orgId) : []
        setYears(data || [])
      } catch {
        setYears([])
      } finally {
        setLoading(false)
      }
    })()
  }, [orgId])

  // Auto-open create dialog when deep-linked with ?openCreate=1
  useEffect(() => {
    try {
      const usp = new URLSearchParams(window.location.search)
      if (usp.get('openCreate') === '1') {
        setOpen(true)
      }
    } catch {}
  }, [])

  const handleCreate = async () => {
    if (!orgId) { setError('Missing organization'); return }
    setError(''); setSuccess(''); setSaving(true)
    try {
      const id = await FiscalYearManagementService.createFiscalYear({
        orgId,
        yearNumber,
        startDate,
        endDate,
        createMonthlyPeriods: createPeriods,
        nameEn: nameEn || null,
        nameAr: nameAr || null,
        descriptionEn: descEn || null,
        descriptionAr: descAr || null,
      })
      setSuccess(`Created fiscal year: ${id}`)
      // refresh list
      const data = await FiscalYearManagementService.getFiscalYears(orgId)
      setYears(data || [])
      setOpen(false)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3 }}>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={700}>{isRTL ? 'لوحة السنوات المالية (وضع آمن)' : 'Fiscal Years (Safe Mode)'}</Typography>
            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
              <Button variant="contained" onClick={()=> setOpen(true)}>{isRTL ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}</Button>
            </Stack>
          </Stack>
          {loading ? (
            <LinearProgress />
          ) : years.length ? (
            <List>
              {years.map((y:any) => (
                <ListItem key={y.id} divider>
                  <ListItemText primary={y.name_ar || y.name_en || `FY ${y.year_number}`} secondary={`${y.start_date} — ${y.end_date} • ${y.status}`} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">{isRTL ? 'لا توجد بيانات سنوات مالية.' : 'No fiscal years found.'}</Typography>
          )}
        </Paper>
      </Container>

      {/* Create FY Dialog */}
      <Dialog open={open} onClose={()=>!saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isRTL ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Stack spacing={2}>
            <TextField label={isRTL ? 'رقم السنة' : 'Year Number'} type="number" value={yearNumber} onChange={e=> setYearNumber(Number(e.target.value))} fullWidth />
            <TextField label={isRTL ? 'تاريخ البداية' : 'Start Date'} type="date" value={startDate} onChange={e=> setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label={isRTL ? 'تاريخ النهاية' : 'End Date'} type="date" value={endDate} onChange={e=> setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label={isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'} value={nameEn} onChange={e=> setNameEn(e.target.value)} fullWidth />
            <TextField label={isRTL ? 'الاسم (عربي)' : 'Name (AR)'} value={nameAr} onChange={e=> setNameAr(e.target.value)} fullWidth />
            <TextField label={isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'} value={descEn} onChange={e=> setDescEn(e.target.value)} fullWidth />
            <TextField label={isRTL ? 'الوصف (عربي)' : 'Description (AR)'} value={descAr} onChange={e=> setDescAr(e.target.value)} fullWidth />
            <FormControlLabel control={<Switch checked={createPeriods} onChange={e=> setCreatePeriods(e.target.checked)} />} label={isRTL ? 'إنشاء فترات شهرية' : 'Create Monthly Periods'} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setOpen(false)} disabled={saving}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleCreate} disabled={saving} variant="contained">{saving ? (isRTL ? 'جارٍ الإنشاء…' : 'Creating…') : (isRTL ? 'إنشاء' : 'Create')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
