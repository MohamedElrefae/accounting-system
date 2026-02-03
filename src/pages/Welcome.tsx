import React, { useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Skeleton,
  Chip,
  Grid,
  Avatar,
  useTheme,
  alpha,
  Paper,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { setLandingPreference } from '../services/user-preferences'
import useAppStore from '../store/useAppStore'
import { useScopeOptional } from '../contexts/ScopeContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useHasPermission } from '../hooks/useHasPermission'
import { useQuery } from '@tanstack/react-query'
import {
  fetchRecentActivity,
  dashboardQueryKeys,
} from '../services/dashboard-queries'
import { useCurrentFiscalYear } from '../services/fiscal/hooks/useFiscalYear'
import { useI18n } from '../utils/i18n'
import {
  PlusCircle,
  FileText,
  PieChart,
  LayoutDashboard,
  ArrowRight,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react'
import { motion } from 'framer-motion'


const QuickAction: React.FC<{
  title: string
  icon: React.ReactNode
  color: string
  onClick: () => void
  description: string
}> = ({ title, icon, color, onClick, description }) => {
  const theme = useTheme()
  return (
    <Paper
      component={motion.div}
      whileHover={{ y: -4, borderColor: color, backgroundColor: alpha(color, 0.05) }}
      onClick={onClick}
      variant="outlined"
      sx={{
        p: 2.5,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
        backgroundColor: 'transparent',
        borderColor: alpha(theme.palette.divider, 0.5),
        borderWidth: 1.5,
        borderRadius: 3
      }}
    >
      <Box sx={{
        width: 48,
        height: 48,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(color, 0.1),
        color: color
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </Paper>
  )
}

const Welcome: React.FC = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const hasPerm = useHasPermission()
  const { demoMode, language } = useAppStore()
  const { profile } = useUserProfile()
  const t = useI18n()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id ?? undefined
  const projectId = scope?.currentProject?.id ?? undefined

  // Helper function to get proper display name (matching TopBar)
  const getDisplayName = () => {
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name || ''}`.trim()
    }
    if (profile?.full_name_ar) {
      return profile.full_name_ar
    }
    return profile?.email?.split('@')[0] || 'User'
  }

  const userName = getDisplayName()
  const currentHour = new Date().getHours()
  const greeting = useMemo(() => {
    if (currentHour < 12) return t.goodMorning
    if (currentHour < 18) return t.goodAfternoon
    return t.goodEvening
  }, [currentHour, t])

  // Fetch Current Fiscal Year to sync dates
  const { data: fiscalYear } = useCurrentFiscalYear(orgId)


  // Fetch Recent Activity - synced with project scope
  const { data: recent, isLoading: activityLoading } = useQuery({
    queryKey: dashboardQueryKeys.recentActivity({ orgId, projectId }),
    queryFn: () => fetchRecentActivity({ orgId, projectId }),
    enabled: !!orgId || demoMode
  })

  const setDefault = async (pref: 'welcome' | 'dashboard') => {
    if (demoMode) return
    await setLandingPreference(pref, orgId)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
        maxWidth: 'none',
        p: { xs: 2, md: 3 }
      }}
    >
      {/* Hero Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: -1 }}>
            {greeting}, {userName} 👋
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            {t.businessStatusSub}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasPerm('dashboard.view') && (
            <Button
              variant="outlined"
              startIcon={<LayoutDashboard size={18} />}
              onClick={() => navigate('/dashboard')}
            >
              {t.goToDashboard}
            </Button>
          )}
          {hasPerm('transactions.create') && (
            <Button
              variant="contained"
              startIcon={<PlusCircle size={18} />}
              onClick={() => navigate('/transactions/my')}
            >
              {t.createTransaction}
            </Button>
          )}
        </Box>
      </Box>


      <Grid container spacing={4}>
        {/* Main Content: Activity & Chart */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Quick Actions Grid - Permission Aware */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>{t.quickActions}</Typography>
              <Grid container spacing={2}>
                {hasPerm('transactions.create') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <QuickAction
                      title={t.createTransaction}
                      icon={<PlusCircle />}
                      color={theme.palette.primary.main}
                      onClick={() => navigate('/transactions/my')}
                      description={t.newTransactionDesc}
                    />
                  </Grid>
                )}
                {hasPerm('accounts.view') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <QuickAction
                      title={t.accountsTree}
                      icon={<PieChart />}
                      color={theme.palette.info.main}
                      onClick={() => navigate('/main-data/accounts-tree')}
                      description={t.accountsTreeDesc}
                    />
                  </Grid>
                )}
                {hasPerm('reports.view') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <QuickAction
                      title={t.reportsCenter}
                      icon={<FileText />}
                      color={theme.palette.success.main}
                      onClick={() => navigate('/reports/general-ledger')}
                      description={t.reportsCenterDesc}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Recent Activity - Permission Aware */}
            {hasPerm('transactions.view') && (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t.recentActivity}</Typography>
                  <Button size="small" endIcon={<ArrowRight size={14} />} onClick={() => navigate('/transactions/all')}>
                    {t.viewAll}
                  </Button>
                </Box>
                <CardContent sx={{ p: 0 }}>
                  {activityLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Box key={i} sx={{ p: 2, borderBottom: i === 4 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                        <Skeleton height={24} />
                      </Box>
                    ))
                  ) : (recent ?? []).length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">No recent transactions found</Typography>
                    </Box>
                  ) : (
                    recent?.map((r, i) => (
                      <Box
                        key={r.id}
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          borderBottom: i === (recent.length - 1) ? 0 : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                          transition: 'background-color 0.2s',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/transactions/${r.id}`)}
                      >
                        <Avatar sx={{
                          bgcolor: alpha(r.type === 'income' ? theme.palette.success.main : theme.palette.error.main, 0.1),
                          color: r.type === 'income' ? theme.palette.success.main : theme.palette.error.main,
                          width: 40,
                          height: 40
                        }}>
                          {r.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {language === 'ar' ? (r.category_ar || t.uncategorized) : (r.category || t.uncategorized)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.2 }}>
                            <Clock size={12} style={{ color: theme.palette.text.secondary }} />
                            <Typography variant="caption" color="text.secondary">{r.entry_date}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: r.type === 'income' ? 'success.main' : 'error.main' }}>
                            {r.type === 'income' ? '+' : '-'}{Math.abs(r.amount).toLocaleString()}
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              r.status === 'posted' ? t.posted :
                                r.status === 'submitted' ? t.submitted :
                                  r.status === 'approved' ? t.approved :
                                    (r.status === 'draft' || !r.status) ? t.draft :
                                      r.status
                            }
                            icon={r.status === 'posted' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              mt: 0.5,
                              bgcolor: alpha(
                                r.status === 'posted' ? theme.palette.success.main :
                                  r.status === 'approved' ? theme.palette.info.main :
                                    r.status === 'submitted' ? theme.palette.primary.main :
                                      theme.palette.warning.main,
                                0.1
                              ),
                              color:
                                r.status === 'posted' ? theme.palette.success.main :
                                  r.status === 'approved' ? theme.palette.info.main :
                                    r.status === 'submitted' ? theme.palette.primary.main :
                                      theme.palette.warning.main,
                              border: 'none',
                              textTransform: 'capitalize'
                            }}
                          />
                        </Box>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>

        {/* Sidebar: Preferences Only */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.03), borderColor: alpha(theme.palette.primary.main, 0.1) }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>{language === 'ar' ? 'تفضيلات الصفحة' : 'Page Preferences'}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="text"
                    size="small"
                    onClick={() => setDefault('welcome')}
                    sx={{ justifyContent: 'flex-start', color: 'text.secondary', fontWeight: 500 }}
                  >
                    {t.setThisDefault}
                  </Button>
                  <Button
                    fullWidth
                    variant="text"
                    size="small"
                    onClick={() => setDefault('dashboard')}
                    sx={{ justifyContent: 'flex-start', color: 'text.secondary', fontWeight: 500 }}
                  >
                    {t.setDashboardDefault}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Welcome
