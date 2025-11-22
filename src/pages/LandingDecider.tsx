import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLandingPreference } from '../services/user-preferences'

const Dashboard = React.lazy(() => import('./Dashboard'))
const Welcome = React.lazy(() => import('./Welcome'))

const LandingDecider: React.FC = () => {
  const qc = useQueryClient()
  
  // Fetch server-backed landing preference (scoped by active org via service)
  const { data: pref, isLoading, error } = useQuery({
    queryKey: ['landingPreference'],
    queryFn: () => getLandingPreference(),
    staleTime: 5 * 60 * 1000,
    retry: 1, // Only retry once
    retryDelay: 500,
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

  // Show loading state briefly
  if (isLoading) return <div style={{ padding: '20px' }}>Loading...</div>

  // If there's an error or no preference, default to dashboard
  const effectivePref = error ? 'dashboard' : (pref || 'dashboard')

  return (
    <React.Suspense fallback={<div style={{ padding: '20px' }}>Loading dashboard...</div>}> 
      {effectivePref === 'dashboard' ? <Dashboard /> : <Welcome />}
    </React.Suspense>
  )
}

export default LandingDecider