import * as React from 'react';
import PropTypes from 'prop-types';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { jsx as _jsx } from 'react/jsx-runtime';

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

