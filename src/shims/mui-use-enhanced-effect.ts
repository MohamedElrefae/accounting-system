import { useEffect, useLayoutEffect } from 'react'

// Safe useEnhancedEffect: uses useLayoutEffect in the browser and useEffect on the server
const useEnhancedEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default useEnhancedEffect
export { useEnhancedEffect as unstable_useEnhancedEffect }

