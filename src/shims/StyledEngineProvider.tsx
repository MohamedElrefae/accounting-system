import * as React from 'react';
import PropTypes from 'prop-types';
import { CacheProvider } from '@emotion/react';
import * as emotionCacheNS from '@emotion/cache';
import { jsx as _jsx } from 'react/jsx-runtime';

// Normalize ESM/CJS interop for @emotion/cache default export across bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createCache: typeof import('@emotion/cache').default = (emotionCacheNS as any).default || (emotionCacheNS as any);

// Probe so we can confirm this shim is executing in production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).SHIM_SEP = 'active'
// eslint-disable-next-line no-console
console.log('[shim] StyledEngineProvider active')

let cache: import('@emotion/cache').EmotionCache | undefined;
if (typeof document === 'object') {
  cache = createCache({ key: 'css', prepend: true });
}

export default function StyledEngineProvider(props: { injectFirst?: boolean; children?: React.ReactNode }) {
  const { injectFirst, children } = props;
  return injectFirst && cache ? _jsx(CacheProvider, { value: cache, children }) : (children as any);
}

(StyledEngineProvider as any).propTypes = {
  children: PropTypes.node,
  injectFirst: PropTypes.bool,
};

