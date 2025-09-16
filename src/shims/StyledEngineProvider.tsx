import React from 'react';
import PropTypes from 'prop-types';

// Probe so we can confirm this shim is executing in production (NO-OP version)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).SHIM_SEP = 'active'
 
console.log('[shim] StyledEngineProvider NO-OP active')

export default function StyledEngineProvider(props: { injectFirst?: boolean; children?: React.ReactNode }) {
  const { children } = props;
  // No-op: top-level CacheProvider in main.tsx handles Emotion injection
  return children as any;
}

(StyledEngineProvider as any).propTypes = {
  children: PropTypes.node,
  injectFirst: PropTypes.bool,
};

