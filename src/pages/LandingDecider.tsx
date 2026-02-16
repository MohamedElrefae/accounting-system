import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLandingPreference } from '../services/user-preferences'
import useAppStore from '../store/useAppStore'
import { useScopeOptional } from '../contexts/ScopeContext'
import DashboardShellSkeleton from '../components/layout/DashboardShellSkeleton'

const Dashboard = React.lazy(() => import('./Dashboard'))
const Welcome = React.lazy(() => import('./Welcome'))

const LandingDecider: React.FC = () => {
  const qc = useQueryClient()
  const { demoMode } = useAppStore()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id

  // Fetch server-backed landing preference (scoped by active org via service)
  const { data: pref, isLoading, error } = useQuery({
    queryKey: ['landingPreference', orgId ?? null],
    queryFn: () => getLandingPreference(orgId ?? undefined),
    enabled: !demoMode,
    staleTime: 5 * 60 * 1000,
    retry: 1, // Only retry once
    retryDelay: 500,
  })

  // Prefetch the dashboard bundle and data on idle to keep the first transition fast
  React.useEffect(() => {
    const prefetch = () => {
      void import('./Dashboard')
      import('../services/dashboard-queries').then(m => { void m.prefetchDashboardQueries(qc, {}) }).catch(() => { })
      // Prefetch popular report bundles to speed first navigation
      void import('./Reports/TrialBalanceOriginal')
      void import('./Reports/GeneralLedger')
    }
    if (demoMode) return
    if ('requestIdleCallback' in window) {
      ; (window as any).requestIdleCallback(prefetch, { timeout: 1500 })
    } else {
      const t = setTimeout(prefetch, 300)
      return () => clearTimeout(t)
    }
  }, [demoMode, qc])

  // Show loading state briefly
  if (!demoMode && isLoading) return <DashboardShellSkeleton />

  // If there's an error or no preference, default to welcome (not dashboard)
  // Dashboard requires specific permissions, so welcome is safer default
  const effectivePref = demoMode ? 'dashboard' : (error ? 'welcome' : (pref || 'welcome'))

  return (
    <React.Suspense fallback={<DashboardShellSkeleton />}>
      {effectivePref === 'dashboard' ? <Dashboard /> : <Welcome />}
    </React.Suspense>
  )
}

export default LandingDecider