# Vite App Optimization Plan - Quick Wins

## If Migration is Too Complex, Fix Current App

### Immediate Performance Fixes (1 Week)

#### 1. Bundle Splitting & Lazy Loading
```typescript
// Split routes with React.lazy
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Reports = lazy(() => import('./pages/Reports'))

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

#### 2. React Query Optimization
```typescript
// Reduce stale time, add proper caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})
```

#### 3. MUI Optimization
```typescript
// Use MUI tree shaking
import Button from '@mui/material/Button'
// NOT: import { Button } from '@mui/material'

// Reduce Emotion runtime
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'

const cache = createCache({
  key: 'css',
  prepend: true
})
```

#### 4. Auth Optimization
```typescript
// Cache auth state, reduce checks
const useAuth = () => {
  const [user, setUser] = useState(() => {
    // Get from localStorage first (faster)
    const cached = localStorage.getItem('user')
    return cached ? JSON.parse(cached) : null
  })
  
  // Only check Supabase if no cache
  useEffect(() => {
    if (!user) {
      supabase.auth.getUser().then(setUser)
    }
  }, [user])
}
```

#### 5. Vite Build Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@emotion/react'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

### Expected Results
- 40-60% faster load times
- Better caching
- Reduced bundle size
- More responsive UI

### Time Investment
- 1 week vs 6 weeks for full migration
- Lower risk
- Immediate improvements