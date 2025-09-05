// Global shim to normalize @emotion/cache default export across ESM/CJS in all consumers
// Ensures createCache is always a callable function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// @ts-ignore - We intentionally import the ESM browser build which has no types here
import * as CacheModule from '@emotion/cache/dist/emotion-cache.browser.esm.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createCache: any = (CacheModule as any).default || (CacheModule as any)

// Optional probe to confirm shim executes in production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).EMOTION_CACHE_SHIM = 'active'
// eslint-disable-next-line no-console
console.log('[shim] emotion-cache default normalized')

export default createCache

