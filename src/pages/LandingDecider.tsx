import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLandingPreference } from '../services/user-preferences'

const Dashboard = React.lazy(() => import('./Dashboard'))
const Welcome = React.lazy(() => import('./Welcome'))

const LandingDecider: React.FC = () => {
  const qc = useQueryClient()
  // Fetch server-backed landing preference (scoped by active org via service)
  const { data: pref, isLoading } = useQuery({
    queryKey: ['landingPreference'],
    queryFn: () => getLandingPreference(),
    staleTime: 5 * 60 * 1000,
  })

  // Prefetch the dashboard bundle and data on idle to keep the first transition fast
  React.useEffect(() => {
    const prefetch = () => { 
      void import('./Dashboard')
      import('../services/dashboard-queries').then(m => { void m.prefetchDashboardQueries(qc, {}) }).catch(() => {})
      // Prefetch popular report bundles to speed first navigation
      void import('./Reports/TrialBalanceOriginal')
      void import('./Reports/GeneralLedger')
    }
    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(prefetch, { timeout: 1500 })
    } else {
      const t = setTimeout(prefetch, 300)
      return () => clearTimeout(t)
    }
  }, [])

  if (isLoading) return <div />

  return (
    <React.Suspense fallback={<div />}> 
      {pref === 'dashboard' ? <Dashboard /> : <Welcome />}
    </React.Suspense>
  )
}

export default LandingDecider