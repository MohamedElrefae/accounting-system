import React, { useState, useEffect, useCallback } from 'react'
import { Box, Container, Paper, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress, Alert, Tooltip, IconButton, useTheme, Avatar, Chip, Grid, Card, CardContent, Grow, Divider, Fade, alpha } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import SettingsIcon from '@mui/icons-material/Settings'
import RefreshIcon from '@mui/icons-material/Refresh'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AddIcon from '@mui/icons-material/Add'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { useArabicLanguage, ArabicLanguageService } from '@/services/ArabicLanguageService'
import { FiscalYearService } from '@/services/fiscal'
import { tokens } from '@/theme/tokens'
import { constructionThemeUtils } from '@/themes/rtlTheme'
import { useScopeOptional } from '@/contexts/ScopeContext'
import './FiscalPages.css'

// Minimal enhanced dashboard (stabilized)
const DashboardContainer = ({ children, title, subtitle, actions }: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) => {
  const { isRTL, getDirectionalStyle } = useArabicLanguage()

  return (
    <Box sx={{
      minHeight: '100vh',
      background: tokens.palette.background.default,
      py: tokens.spacing(2)
    }}>
      <Container maxWidth="xl">
        <Paper 
          elevation={0} 
          sx={{ 
            minHeight: 'calc(100vh - 32px)',
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: tokens.palette.background.paper,
            border: `1px solid ${tokens.palette.divider}`,
            boxShadow: tokens.shadows.panel
          }}
        >
          {/* Header */}
          <Box sx={{
            background: tokens.palette.primary.main,
            color: 'white',
            p: tokens.spacing(3),
            position: 'relative',
            overflow: 'hidden',
            ...getDirectionalStyle()
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Ccircle cx="7" cy="7" r="7"/%3E%3Ccircle cx="53" cy="7" r="7"/%3E%3Ccircle cx="30" cy="30" r="7"/%3E%3Ccircle cx="7" cy="53" r="7"/%3E%3Ccircle cx="53" cy="53" r="7"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }} />
            
            <Stack 
              direction={isRTL ? 'row-reverse' : 'row'} 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ position: 'relative', zIndex: 1 }}
              spacing={tokens.spacing(2)}
            >
              <Box>
                <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" spacing={tokens.spacing(2)}>
                  <Avatar sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    width: 56,
                    height: 56
                  }}>
                    <DashboardIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold" sx={{ mb: tokens.spacing(0.5) }}>
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
              
              <Box sx={{ display: 'flex', gap: tokens.spacing(1), flexWrap: 'wrap' }}>
                {actions}
              </Box>
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: tokens.spacing(3)
          }}>
            {children}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

// Enhanced Metric Card with Animation
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  trend,
  subtitle,
  action,
  loading = false
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  trend?: { value: number; label: string; period: string }
  subtitle?: string
  action?: React.ReactNode
  loading?: boolean
}) => {
  const { isRTL, getDirectionalStyle, formatNumber } = useArabicLanguage()
  const theme = useTheme()

  return (
    <Grow in timeout={600}>
      <Card elevation={0} sx={{
        background: tokens.palette.background.paper,
        border: `1px solid ${tokens.palette.divider}`,
        borderRadius: 0,
        height: '100%',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[12],
          borderColor: theme.palette[color].main
        }
      }}>
        {loading && (
          <LinearProgress 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              borderRadius: '12px 12px 0 0'
            }} 
          />
        )}
        
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
            <Box sx={{
              p: 2,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows[4]
            }}>
              <Icon sx={{ fontSize: 32 }} />
            </Box>
            
            <Box sx={{ flex: 1, ...getDirectionalStyle() }}>
              <Typography variant="body1" color="text.secondary" fontWeight="medium" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
                {typeof value === 'number' ? formatNumber(value) : value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            {action && (
              <Box>
                {action}
              </Box>
            )}
          </Stack>
          
          {trend && (
            <Box sx={{ mt: 'auto' }}>
              <Divider sx={{ mb: 2 }} />
              <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" justifyContent="space-between">
                <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" spacing={1}>
                  {trend.value >= 0 ? (
                    <TrendingUpIcon color="success" sx={{ fontSize: 20 }} />
                  ) : (
                    <TrendingDownIcon color="error" sx={{ fontSize: 20 }} />
                  )}
                  <Typography 
                    variant="body2" 
                    color={trend.value >= 0 ? 'success.main' : 'error.main'}
                    fontWeight="bold"
                  >
                    {trend.value >= 0 ? '+' : ''}{formatNumber(trend.value)}%
                  </Typography>
                </Stack>
                
                <Typography variant="caption" color="text.secondary">
                  {trend.period}
                </Typography>
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ ...getDirectionalStyle() }}>
                {trend.label}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  )
}

// Fiscal Period Status Card
const FiscalPeriodCard = ({ period, isActive = false }: {
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: 'draft' | 'active' | 'closed' | 'locked'
    transactions: number
    balance: number
  }
  isActive?: boolean
}) => {
  const { isRTL, getDirectionalStyle, formatCurrency, formatDate, formatNumber } = useArabicLanguage()
  const theme = useTheme()

  const getStatusColor = (status: string) => {
    const colors = constructionThemeUtils.periodStatus
    return colors[status as keyof typeof colors] || colors.draft
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

  return (
    <Fade in timeout={400}>
      <Card elevation={0} sx={{
        border: `2px solid ${isActive ? theme.palette.primary.main : alpha(getStatusColor(period.status), 0.3)}`,
        borderRadius: 3,
        background: isActive 
          ? `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.main}04 100%)`
          : 'rgba(255, 255, 255, 0.8)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        }
      }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction={isRTL ? 'row-reverse' : 'row'} justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ ...getDirectionalStyle() }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {period.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(period.startDate)} - {formatDate(period.endDate)}
                </Typography>
              </Box>
              
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
            </Stack>
            
            {/* Metrics */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="caption" color="text.secondary">
                    {isRTL ? 'المعاملات' : 'Transactions'}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatNumber(period.transactions)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography variant="caption" color="text.secondary">
                    {isRTL ? 'الرصيد' : 'Balance'}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color={period.balance >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(period.balance)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  )
}

// Quick Action Button
const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  color = 'primary',
  disabled = false 
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  disabled?: boolean
}) => {
  const theme = useTheme()

  return (
    <Button
      variant="contained"
      color={color}
      size="large"
      startIcon={<Icon />}
      onClick={onClick}
      disabled={disabled}
      sx={{
        borderRadius: 3,
        py: 1.5,
        px: 3,
        textTransform: 'none',
        fontWeight: 600,
        boxShadow: theme.shadows[4],
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        },
        '&:disabled': {
          opacity: 0.6
        }
      }}
    >
      {label}
    </Button>
  )
}

// Main Enhanced Dashboard Component
export default function EnhancedFiscalYearDashboard() {
  const { isRTL, getDirectionalStyle, t, texts } = useArabicLanguage()

  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const [fiscalYears, setFiscalYears] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newYearNumber, setNewYearNumber] = useState<number>(new Date().getFullYear())
  const [newStartDate, setNewStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`)
  const [newEndDate, setNewEndDate] = useState<string>(`${new Date().getFullYear()}-12-31`)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Language Toggle
  const toggleLanguage = useCallback(() => {
    const newLang = ArabicLanguageService.getCurrentLanguage() === 'en' ? 'ar' : 'en'
    ArabicLanguageService.setLanguage(newLang)
    // Use state update instead of page reload for better UX
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLang } }))
  }, [])

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    console.log('Dashboard: loadDashboardData called with orgId:', orgId)
    
    if (!orgId) {
      console.warn('Dashboard: No orgId available')
      setError(isRTL ? 'لم يتم العثور على معرف المؤسسة' : 'No organization ID found')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('Dashboard: Fetching fiscal years for orgId:', orgId)
      const years = await FiscalYearService.getAll(orgId)
      console.log('Dashboard: Loaded fiscal years', { count: years.length, years })
      
      const list = years.map((y:any)=>({ 
        id: y.id, 
        name: y.nameAr || y.nameEn || `FY ${y.yearNumber}`, 
        range: `${y.startDate} — ${y.endDate}`, 
        status: (y.status as any) || 'draft',
        yearNumber: y.yearNumber,
        isCurrent: y.isCurrent,
        startDate: y.startDate,
        endDate: y.endDate,
        transactions: 0,
        balance: 0,
      }))
      console.log('Dashboard: Mapped fiscal years', { list })
      setFiscalYears(list)
    } catch (e: any) {
      console.error('Dashboard: Failed to load fiscal years', e)
      setError(e?.message || (isRTL ? 'فشل تحميل السنوات المالية' : 'Failed to load fiscal years'))
      setFiscalYears([])
    } finally {
      setLoading(false)
    }
  }, [orgId, isRTL])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Header Actions
  const headerActions = (
    <>
      <Button variant="contained" onClick={() => setShowCreateDialog(true)}>
        {isRTL ? 'سنة مالية جديدة' : 'New Fiscal Year'}
      </Button>

      <Tooltip title={isRTL ? 'تحديث البيانات' : 'Refresh Data'}>
        <IconButton
          onClick={loadDashboardData}
          disabled={loading}
          sx={{ color: 'white' }}
        >
          <RefreshIcon
            sx={{
              animation: loading ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }}
          />
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
    </>
  )

  // Quick Actions
  const quickActions: any[] = [
    {
      icon: AddIcon,
      label: isRTL ? 'سنة مالية جديدة' : 'New Fiscal Year',
      onClick: () => setShowCreateDialog(true),
      color: 'primary' as const
    },
    {
      icon: AccountBalanceIcon,
      label: isRTL ? 'إدارة الفترات' : 'Manage Periods',
      onClick: () => console.log('Manage Periods'),
      color: 'secondary' as const
    },
    {
      icon: AssignmentIcon,
      label: isRTL ? 'التقارير المالية' : 'Financial Reports',
      onClick: () => console.log('Reports'),
      color: 'info' as const
    }
  ]

  return (
    <DashboardContainer
      title={t(texts.fiscalYearManagement)}
      subtitle={isRTL ? 'لوحة تحكم السنوات المالية' : 'Fiscal Year Management Dashboard'}
      actions={headerActions}
    >
      <Box sx={{ p: 3, ...getDirectionalStyle() }}>
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <MetricCard
                title={isRTL ? 'عدد السنوات المالية' : 'Fiscal Years'}
                value={fiscalYears.length}
                icon={DashboardIcon}
                color="primary"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <MetricCard
                title={isRTL ? 'السنة الحالية' : 'Current Year'}
                value={fiscalYears.find(f => f.isCurrent)?.yearNumber || (isRTL ? 'غير محدد' : 'N/A')}
                icon={AccountBalanceIcon}
                color="success"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <MetricCard
                title={isRTL ? 'المؤسسة' : 'Organization'}
                value={orgId ? (isRTL ? 'محددة' : 'Selected') : (isRTL ? 'غير محددة' : 'Not selected')}
                icon={SettingsIcon}
                color={orgId ? 'info' : 'warning'}
                loading={loading}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {quickActions.map((a) => (
              <Grid item xs={12} sm={6} md={4} key={a.label}>
                <QuickActionButton icon={a.icon} label={a.label} onClick={a.onClick} color={a.color} disabled={loading} />
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs:'column', sm:'row' }} justifyContent="space-between" alignItems={{ xs:'stretch', sm:'center' }}>
            <Typography variant="h5" fontWeight="bold">{isRTL ? 'السنوات المالية' : 'Fiscal Years'}</Typography>
            <Button variant="contained" onClick={()=> setShowCreateDialog(true)}>{isRTL ? 'سنة مالية جديدة' : 'New Fiscal Year'}</Button>
          </Stack>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {!orgId && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {isRTL ? 'يرجى تحديد مؤسسة أولاً' : 'Please select an organization first'}
            </Alert>
          )}
          
          {loading ? (
            <LinearProgress />
          ) : fiscalYears.length ? (
            <Grid container spacing={2}>
              {fiscalYears.map((fy:any)=> (
                <Grid item xs={12} sm={6} md={4} key={fy.id}>
                  <FiscalPeriodCard period={fy} isActive={!!fy.isCurrent} />
                </Grid>
              ))}
            </Grid>
          ) : !loading && orgId ? (
            <Alert severity="info">
              {isRTL ? 'لا توجد سنوات مالية. انقر على "سنة مالية جديدة" لإنشاء واحدة.' : 'No fiscal years found. Click "New Fiscal Year" to create one.'}
            </Alert>
          ) : null}
        </Stack>
      </Box>

      <Dialog open={showCreateDialog} onClose={()=> setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isRTL ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={isRTL ? 'رقم السنة' : 'Year Number'} type="number" value={newYearNumber} onChange={e=> setNewYearNumber(parseInt(e.target.value||'0',10)||new Date().getFullYear())} fullWidth />
            <TextField label={isRTL ? 'تاريخ البداية' : 'Start Date'} type="date" value={newStartDate} onChange={e=> setNewStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label={isRTL ? 'تاريخ النهاية' : 'End Date'} type="date" value={newEndDate} onChange={e=> setNewEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setShowCreateDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button variant="contained" disabled={!orgId || creating} onClick={async ()=>{
            if (!orgId) return
            setCreating(true)
            try {
              await FiscalYearService.create({ orgId, yearNumber: newYearNumber, startDate: newStartDate, endDate: newEndDate, createMonthlyPeriods: true, nameEn: `FY ${newYearNumber}` })
              setShowCreateDialog(false)
              await loadDashboardData()
            } catch {}
            finally { setCreating(false) }
          }}>{creating ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : (isRTL ? 'إنشاء' : 'Create')}</Button>
        </DialogActions>
      </Dialog>
    </DashboardContainer>
  )
}
