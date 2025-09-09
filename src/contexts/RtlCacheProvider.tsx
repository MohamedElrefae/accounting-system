import React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import useAppStore from '../store/useAppStore';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// Separate caches to avoid style collisions and allow fast switching
const rtlCache = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin], prepend: true });
const ltrCache = createCache({ key: 'css', prepend: true });

interface Props {
  children: React.ReactNode;
}

export const RtlCacheProvider: React.FC<Props> = ({ children }) => {
  const { language } = useAppStore();
  const isRtl = language === 'ar';

  // Keep document direction/lang in sync (defensive; also handled elsewhere)
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language || (isRtl ? 'ar' : 'en');
  }

  return (
    <CacheProvider value={isRtl ? rtlCache : ltrCache}>
      {children}
    </CacheProvider>
  );
};

export default RtlCacheProvider;

