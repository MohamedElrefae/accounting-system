import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  IconButton,
  Stack,
  Chip,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Fab,
  Badge,
  useTheme,
  alpha,
  Fade,
  Grow,
  Slide,
  Collapse,
  Tab,
  Tabs,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  CircularProgress
} from '@mui/material'

// Icons
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import SettingsIcon from '@mui/icons-material/Settings'
import RefreshIcon from '@mui/icons-material/Refresh'
import LanguageIcon from '@mui/icons-material/Language'
import TimelineIcon from '@mui/icons-material/Timeline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ConstructionIcon from '@mui/icons-material/Construction'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import BusinessIcon from '@mui/icons-material/Business'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import PrintIcon from '@mui/icons-material/Print'

// Services and Utils
import { useArabicLanguage, ArabicLanguageService } from '@/services/ArabicLanguageService'
import { FiscalPeriodService } from '@/services/FiscalPeriodService'
import { constructionThemeUtils } from '@/themes/rtlTheme'
import { getActiveOrgId } from '@/utils/org'
import useAppStore from '@/store/useAppStore'
import { tokens } from '@/theme/tokens'

// Professional Manager Container
const ManagerContainer = ({ children, title, subtitle, actions }: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) => {
  const { isRTL, getDirectionalStyle } = useArabicLanguage()
  const theme = useTheme()

  return (
    <Box sx={{
      minHeight: '100vh',
      background: tokens.palette.background.default,
      py: 2
    }}>
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        <Paper 
          elevation={0} 
          sx={{ 
            minHeight: 'calc(100vh - 32px)',
            borderRadius: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: tokens.palette.background.paper,
            border: `1px solid ${tokens.palette.divider}`
          }}
        >
          {/* Header */}
          <Box sx={{
            background: tokens.palette.primary.main,
            color: 'white',
            p: 3,
            position: 'relative',
            overflow: 'hidden',
            ...getDirectionalStyle()
          }}>
            {/* Geometric Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.08,
              backgroundImage: `
                linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
                linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)
              `,
              backgroundSize: '20px 20px'
            }} />
            
            <Stack 
              direction={isRTL ? 'row-reverse' : 'row'} 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Box>
                <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" spacing={2}>
                  <Avatar sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    width: 60,
                    height: 60,
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <TimelineIcon sx={{ fontSize: 36 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {title}
                    </Typography>
                    {subtitle && (
                      <Typography variant="h6" sx={{ opacity: 0.9 }}>
                        {subtitle}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Box>
              
              {actions && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {actions}
                </Box>
              )}
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {children}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

// Enhanced Period Status Card
const PeriodStatusCard = ({ 
  period, 
  onEdit, 
  onDelete, 
  onActivate, 
  onClose, 
  onLock 
}: {
  period: any
  onEdit: (period: any) => void
  onDelete: (period: any) => void
  onActivate: (period: any) => void
  onClose: (period: any) => void
  onLock: (period: any) => void
}) => {
  const { isRTL, getDirectionalStyle, formatCurrency, formatDate } = useArabicLanguage()
  const theme = useTheme()

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: tokens.palette.info.main,
      active: tokens.palette.success.main,
      closed: tokens.palette.error.main,
      locked: tokens.palette.warning.main
    }
    return map[status] || tokens.palette.info.main
  }

  const getStatusText = (status: string) => {
    const statusTexts = {
      draft: isRTL ? 'مسودة' : 'Draft',
      active: isRTL ? 'نشط' : 'Active',
      closed: isRTL ? 'مغلق' : 'Closed',
      locked: isRTL ? 'مؤمن' : 'Locked'
    }
    return statusTexts[status as keyof typeof statusTexts] || status
  }

  const canActivate = period.status === 'draft'
  const canClose = period.status === 'active'
  const canLock = period.status === 'closed'
  const canEdit = period.status !== 'locked'
  const canDelete = period.status === 'draft'

  return (
    <Grow in timeout={600}>
      <Card elevation={0} sx={{
        border: `1px solid ${tokens.palette.divider}`,
        borderRadius: 0,
        background: tokens.palette.background.paper,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Status Strip */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: getStatusColor(period.status)
        }} />
        
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction={isRTL ? 'row-reverse' : 'row'} justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ ...getDirectionalStyle() }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {period.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {formatDate(period.startDate)} - {formatDate(period.endDate)}
                </Typography>
                <Chip
                  label={getStatusText(period.status)}
                  size="small"
                  sx={{
                    bgcolor: getStatusColor(period.status),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
              
              <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
                <Tooltip title={isRTL ? 'عرض التفاصيل' : 'View Details'}>
                  <IconButton size="small" sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                    <VisibilityIcon color="info" />
                  </IconButton>
                </Tooltip>
                {canEdit && (
                  <Tooltip title={isRTL ? 'تحرير' : 'Edit'}>
                    <IconButton size="small" onClick={() => onEdit(period)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                      <EditIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>

            {/* Metrics */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    {isRTL ? 'إجمالي المعاملات' : 'Total Transactions'}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {period.totalTransactions || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    {isRTL ? 'الرصيد الحالي' : 'Current Balance'}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold"
                    color={(period.currentBalance || 0) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(period.currentBalance || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    {isRTL ? 'الإيرادات' : 'Revenue'}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    {formatCurrency(period.revenue || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    {isRTL ? 'المصروفات' : 'Expenses'}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="error.main">
                    {formatCurrency(period.expenses || 0)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Divider />
            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} flexWrap="wrap">
              {canActivate && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => onActivate(period)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  {isRTL ? 'تفعيل' : 'Activate'}
                </Button>
              )}
              {canClose && (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<StopIcon />}
                  onClick={() => onClose(period)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  {isRTL ? 'إغلاق' : 'Close'}
                </Button>
              )}
              {canLock && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  startIcon={<LockIcon />}
                  onClick={() => onLock(period)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  {isRTL ? 'تأمين' : 'Lock'}
                </Button>
              )}
              {canDelete && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDelete(period)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  {isRTL ? 'حذف' : 'Delete'}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  )
}

// Period Creation Dialog
const PeriodCreationDialog = ({ 
  open, 
  onClose, 
  onSave, 
  editingPeriod = null 
}: {
  open: boolean
  onClose: () => void
  onSave: (period: any) => void
  editingPeriod?: any
}) => {
  const { t, isRTL, texts, getDirectionalStyle } = useArabicLanguage()
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: '',
    budgetLimit: '',
    fiscalYearId: ''
  })

  useEffect(() => {
    if (editingPeriod) {
      setFormData({
        name: editingPeriod.name || '',
        startDate: editingPeriod.startDate || '',
        endDate: editingPeriod.endDate || '',
        description: editingPeriod.description || '',
        budgetLimit: editingPeriod.budgetLimit?.toString() || '',
        fiscalYearId: editingPeriod.fiscalYearId || ''
      })
    } else {
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        description: '',
        budgetLimit: '',
        fiscalYearId: ''
      })
    }
  }, [editingPeriod, open])

  const handleSave = () => {
    onSave({
      ...editingPeriod,
      ...formData,
      budgetLimit: parseFloat(formData.budgetLimit) || 0
    })
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', ...getDirectionalStyle() }}>
        {editingPeriod 
          ? (isRTL ? 'تحرير الفترة المالية' : 'Edit Fiscal Period')
          : (isRTL ? 'إنشاء فترة مالية جديدة' : 'Create New Fiscal Period')
        }
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={isRTL ? 'اسم الفترة' : 'Period Name'}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              sx={{ '& .MuiInputBase-root': { ...getDirectionalStyle() } }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'السنة المالية' : 'Fiscal Year'}</InputLabel>
              <Select
                value={formData.fiscalYearId}
                onChange={(e) => setFormData(prev => ({ ...prev, fiscalYearId: e.target.value }))}
                sx={{ '& .MuiInputBase-root': { ...getDirectionalStyle() } }}
              >
                <MenuItem value="1">{isRTL ? 'السنة المالية 2024' : 'Fiscal Year 2024'}</MenuItem>
                <MenuItem value="2">{isRTL ? 'السنة المالية 2025' : 'Fiscal Year 2025'}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label={isRTL ? 'تاريخ البداية' : 'Start Date'}
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiInputBase-root': { ...getDirectionalStyle() } }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label={isRTL ? 'تاريخ النهاية' : 'End Date'}
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiInputBase-root': { ...getDirectionalStyle() } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              type="number"
              label={isRTL ? 'حد الميزانية' : 'Budget Limit'}
              value={formData.budgetLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, budgetLimit: e.target.value }))}
              InputProps={{
                startAdornment: <AttachMoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ '& .MuiInputBase-root': { ...getDirectionalStyle() } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={isRTL ? 'الوصف' : 'Description'}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              sx={{ '& .MuiInputBase-root': { ...getDirectionalStyle() } }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          startIcon={<CancelIcon />}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          {t(texts.common.cancel)}
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          {t(texts.common.save)}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Main Enhanced Component
export default function EnhancedFiscalPeriodManager() {
  const { t, isRTL, texts, getDirectionalStyle, formatCurrency, formatDate } = useArabicLanguage()
  const theme = useTheme()

  // State
  const [orgId] = useState(() => getActiveOrgId() || '')
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(null)

  // Language Toggle
  const toggleLanguage = useCallback(() => {
    const newLang = ArabicLanguageService.getCurrentLanguage() === 'en' ? 'ar' : 'en'
    ArabicLanguageService.setLanguage(newLang)
    window.location.reload()
  }, [])

  // Load periods data
  const loadPeriods = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data for demonstration
      const mockPeriods = [
        {
          id: '1',
          name: isRTL ? 'الربع الأول 2024' : 'Q1 2024',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          status: 'closed',
          totalTransactions: 245,
          currentBalance: 125000,
          revenue: 280000,
          expenses: 155000,
          budgetLimit: 300000,
          fiscalYearId: '1'
        },
        {
          id: '2',
          name: isRTL ? 'الربع الثاني 2024' : 'Q2 2024',
          startDate: '2024-04-01',
          endDate: '2024-06-30',
          status: 'active',
          totalTransactions: 189,
          currentBalance: 78500,
          revenue: 220000,
          expenses: 141500,
          budgetLimit: 250000,
          fiscalYearId: '1'
        },
        {
          id: '3',
          name: isRTL ? 'الربع الثالث 2024' : 'Q3 2024',
          startDate: '2024-07-01',
          endDate: '2024-09-30',
          status: 'draft',
          totalTransactions: 0,
          currentBalance: 0,
          revenue: 0,
          expenses: 0,
          budgetLimit: 275000,
          fiscalYearId: '1'
        },
        {
          id: '4',
          name: isRTL ? 'الربع الرابع 2024' : 'Q4 2024',
          startDate: '2024-10-01',
          endDate: '2024-12-31',
          status: 'draft',
          totalTransactions: 0,
          currentBalance: 0,
          revenue: 0,
          expenses: 0,
          budgetLimit: 250000,
          fiscalYearId: '1'
        }
      ]
      
      setPeriods(mockPeriods)
    } catch (error) {
      console.error('Error loading periods:', error)
    } finally {
      setLoading(false)
    }
  }, [isRTL])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  // Period Actions
  const handleEditPeriod = (period: any) => {
    setEditingPeriod(period)
    setDialogOpen(true)
  }

  const handleDeletePeriod = (period: any) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه الفترة؟' : 'Are you sure you want to delete this period?')) {
      setPeriods(prev => prev.filter(p => p.id !== period.id))
    }
  }

  const handleActivatePeriod = (period: any) => {
    setPeriods(prev => prev.map(p => 
      p.id === period.id ? { ...p, status: 'active' } : p
    ))
  }

  const handleClosePeriod = (period: any) => {
    setPeriods(prev => prev.map(p => 
      p.id === period.id ? { ...p, status: 'closed' } : p
    ))
  }

  const handleLockPeriod = (period: any) => {
    setPeriods(prev => prev.map(p => 
      p.id === period.id ? { ...p, status: 'locked' } : p
    ))
  }

  const handleSavePeriod = (periodData: any) => {
    if (editingPeriod) {
      setPeriods(prev => prev.map(p => 
        p.id === editingPeriod.id ? { ...p, ...periodData } : p
      ))
    } else {
      const newPeriod = {
        ...periodData,
        id: Date.now().toString(),
        status: 'draft',
        totalTransactions: 0,
        currentBalance: 0,
        revenue: 0,
        expenses: 0
      }
      setPeriods(prev => [...prev, newPeriod])
    }
    setEditingPeriod(null)
  }

  // Filter periods
  const filteredPeriods = useMemo(() => {
    let filtered = periods
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(period => period.status === filterStatus)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(period =>
        period.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }, [periods, filterStatus, searchTerm])

  // Header Actions
  const headerActions = (
    <>
      <Tooltip title={isRTL ? 'تحديث البيانات' : 'Refresh Data'}>
        <IconButton 
          onClick={loadPeriods} 
          disabled={loading}
          sx={{ color: 'white' }}
        >
          <RefreshIcon sx={{ 
            animation: loading ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title={isRTL ? 'تصدير التقارير' : 'Export Reports'}>
        <IconButton sx={{ color: 'white' }}>
          <ImportExportIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title={isRTL ? 'الإعدادات' : 'Settings'}>
        <IconButton sx={{ color: 'white' }}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title={isRTL ? 'تبديل اللغة' : 'Switch Language'}>
        <IconButton onClick={toggleLanguage} sx={{ color: 'white' }}>
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      
      <Button
        variant="contained"
        color="secondary"
        startIcon={<AddIcon />}
        onClick={() => {
          setEditingPeriod(null)
          setDialogOpen(true)
        }}
        sx={{ 
          bgcolor: 'rgba(255,255,255,0.2)', 
          '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
          borderRadius: 2,
          textTransform: 'none'
        }}
      >
        {isRTL ? 'فترة جديدة' : 'New Period'}
      </Button>
    </>
  )

  return (
    <ManagerContainer
      title={isRTL ? 'إدارة الفترات المالية' : 'Fiscal Period Manager'}
      subtitle={isRTL ? 'إدارة شاملة للفترات المالية في مشاريع الإنشاء' : 'Comprehensive fiscal period management for construction projects'}
      actions={headerActions}
    >
      <Box sx={{ p: 3, ...getDirectionalStyle() }}>
        <Stack spacing={4}>
          {/* Filters and Search */}
          <Card elevation={0} sx={{ 
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 3 
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={isRTL ? 'البحث في الفترات...' : 'Search periods...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ '& .MuiInputBase-root': { borderRadius: 2, ...getDirectionalStyle() } }}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isRTL ? 'فلترة بالحالة' : 'Filter by Status'}</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      sx={{ borderRadius: 2, ...getDirectionalStyle() }}
                    >
                      <MenuItem value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</MenuItem>
                      <MenuItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</MenuItem>
                      <MenuItem value="active">{isRTL ? 'نشط' : 'Active'}</MenuItem>
                      <MenuItem value="closed">{isRTL ? 'مغلق' : 'Closed'}</MenuItem>
                      <MenuItem value="locked">{isRTL ? 'مؤمن' : 'Locked'}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={5}>
                  <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      startIcon={<FilterListIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      {isRTL ? 'فلاتر إضافية' : 'More Filters'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      {isRTL ? 'طباعة التقرير' : 'Print Report'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Period Cards Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <Stack alignItems="center" spacing={2}>
                <CircularProgress size={60} thickness={4} />
                <Typography variant="h6" color="text.secondary">
                  {t(texts.common.loading)}
                </Typography>
              </Stack>
            </Box>
          ) : filteredPeriods.length > 0 ? (
            <Grid container spacing={3}>
              {filteredPeriods.map((period, index) => (
                <Grid item xs={12} md={6} lg={4} key={period.id}>
                  <PeriodStatusCard
                    period={period}
                    onEdit={handleEditPeriod}
                    onDelete={handleDeletePeriod}
                    onActivate={handleActivatePeriod}
                    onClose={handleClosePeriod}
                    onLock={handleLockPeriod}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card elevation={0} sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              py: 8,
              textAlign: 'center'
            }}>
              <CardContent>
                <Avatar sx={{
                  width: 80,
                  height: 80,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  mx: 'auto',
                  mb: 3
                }}>
                  <CalendarTodayIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {isRTL ? 'لا توجد فترات مالية' : 'No Fiscal Periods'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {isRTL 
                    ? 'ابدأ بإنشاء أول فترة مالية لمشروع الإنشاء الخاص بك'
                    : 'Start by creating your first fiscal period for your construction project'
                  }
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingPeriod(null)
                    setDialogOpen(true)
                  }}
                  sx={{ borderRadius: 3, textTransform: 'none' }}
                >
                  {isRTL ? 'إنشاء فترة مالية' : 'Create Fiscal Period'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Statistics Summary */}
          {filteredPeriods.length > 0 && (
            <Card elevation={0} sx={{ 
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3 
            }}>
              <CardHeader
                title={
                  <Typography variant="h6" fontWeight="bold" sx={getDirectionalStyle()}>
                    {isRTL ? 'ملخص إحصائي' : 'Statistical Summary'}
                  </Typography>
                }
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {filteredPeriods.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'إجمالي الفترات' : 'Total Periods'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {filteredPeriods.filter(p => p.status === 'active').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'الفترات النشطة' : 'Active Periods'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {filteredPeriods.reduce((sum, p) => sum + (p.totalTransactions || 0), 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'إجمالي المعاملات' : 'Total Transactions'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="secondary.main">
                        {formatCurrency(filteredPeriods.reduce((sum, p) => sum + (p.currentBalance || 0), 0))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'إجمالي الأرصدة' : 'Total Balance'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>

      {/* Period Creation/Edit Dialog */}
      <PeriodCreationDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingPeriod(null)
        }}
        onSave={handleSavePeriod}
        editingPeriod={editingPeriod}
      />
    </ManagerContainer>
  )
}