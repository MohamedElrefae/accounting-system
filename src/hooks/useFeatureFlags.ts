import { useMemo } from 'react';
import { featureFlags } from '../config/featureFlags';

export function useFeatureFlags() {
  // If you later add runtime/remote toggles, wire them here
  return useMemo(() => featureFlags, []);
}