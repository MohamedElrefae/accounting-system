// Global shim to normalize @emotion/cache default export across ESM/CJS in all consumers
// Ensures createCache is always a callable function
// IMPORTANT: import from the concrete ESM build to avoid self-alias recursion
import createCacheEsm from '@emotion/cache'

// Optional probe to confirm shim executes in production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).EMOTION_CACHE_SHIM = 'active'
 
console.log('[shim] emotion-cache default normalized (esm)')

// Normalize in case interop changes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyCache: any = createCacheEsm as any
const normalized = typeof anyCache === 'function' ? anyCache : (anyCache?.default ?? anyCache?.createCache)

if (typeof normalized !== 'function') {
  throw new Error('[shim] @emotion/cache default export is not a function after normalization')
}

export default normalized
export const createCache = normalized

