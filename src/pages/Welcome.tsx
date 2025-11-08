import React from 'react'
import { Box, Card, CardContent, Button, Typography, Skeleton, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { setLandingPreference } from '../services/user-preferences'
import { supabase } from '../utils/supabase'
import { getActiveOrgId } from '../utils/org'
import useAppStore from '../store/useAppStore'
import { useHasPermission } from '../hooks/useHasPermission'
import { getReadMode } from '../config/featureFlags'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchDashboardQueries } from '../services/dashboard-queries'
import { useI18n } from '../utils/i18n'

interface RecentItem {
  id: string
  date: string
  amount?: number | null
  status?: string | null
}

const Welcome: React.FC = () => {
  const navigate = useNavigate()
  const hasPerm = useHasPermission()
  const { language } = useAppStore()
  const isAr = language === 'ar'
  const t = useI18n()
  const qc = useQueryClient()

  const [recent, setRecent] = React.useState<RecentItem[] | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  // Prefetch dashboard code + data on idle
  React.useEffect(() => {
    const prefetch = () => { void import('./Dashboard'); void prefetchDashboardQueries(qc, {}) }
    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(prefetch, { timeout: 1500 })
    } else {
      const t = setTimeout(prefetch, 300)
      return () => clearTimeout(t)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const orgId = getActiveOrgId()
        const applyScope = (q: any) => (orgId ? q.eq('org_id', orgId) : q)
        const readMode = getReadMode()
        if (readMode !== 'legacy') {
          let q = supabase
            .from('v_gl2_journals_enriched')
            .select('journal_id, posting_date, status, amount')
            .order('posting_date', { ascending: false })
            .limit(5)
          q = applyScope(q)
          const { data, error } = await (q as any)
          if (error) throw error
          if (!cancelled) setRecent((data || []).map((r: any) => ({ id: r.journal_id, date: r.posting_date, status: r.status, amount: r.amount })))
        } else {
          let q = supabase
            .from('transactions')
            .select('id, entry_date, is_posted, amount')
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(5)
          q = applyScope(q)
          const { data, error } = await q
          if (error) throw error
          if (!cancelled) setRecent((data || []).map((r: any) => ({ id: r.id, date: r.entry_date, status: r.is_posted ? 'posted' : 'draft', amount: r.amount })))
        }
      } catch {
        if (!cancelled) setRecent([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const setDefault = async (pref: 'welcome' | 'dashboard') => {
    await setLandingPreference(pref)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t.welcomeTitle}
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {t.quickActions}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {hasPerm('transactions.create') && (
              <Button variant="contained" onClick={() => navigate('/transactions/my')}>
                {t.createTransaction}
              </Button>
            )}
            {hasPerm('accounts.view') && (
              <Button variant="outlined" onClick={() => navigate('/main-data/accounts-tree')}>
                {t.accountsTree}
              </Button>
            )}
            {hasPerm('reports.view') && (
              <Button variant="outlined" onClick={() => navigate('/reports/general-ledger')}>
                {t.generalLedger}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {t.recentActivity}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={20} />
              ))
            )}
            {!loading && (recent ?? []).length === 0 && (
              <Typography variant="body2" color="text.secondary">{t.noRecentActivity}</Typography>
            )}
            {!loading && (recent ?? []).map(r => (
              <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">{r.date}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {typeof r.amount === 'number' && (
                    <Typography variant="body2" color={r.amount >= 0 ? 'success.main' : 'error.main'}>
                      {r.amount}
                    </Typography>
                  )}
                  {r.status && (
                    <Chip size="small" label={r.status === 'posted' ? t.posted : t.draft} color={r.status === 'posted' ? 'success' : 'warning'} variant={r.status === 'posted' ? 'filled' : 'outlined'} />
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="text" onClick={() => setDefault('welcome')}>{t.makeWelcomeDefault}</Button>
        <Button variant="text" onClick={() => setDefault('dashboard')}>{t.makeDashboardDefault}</Button>
        <Button variant="outlined" onClick={() => navigate('/') }>{t.goToDashboard}</Button>
      </Box>
    </Box>
  )
}

export default Welcome