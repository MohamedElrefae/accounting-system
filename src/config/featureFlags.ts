// Feature flag configuration for switching between legacy and gl2 paths
// You can control these via environment variables:
// - VITE_READ_MODE:  'legacy' | 'gl2_single_line' | 'gl2_collapsed'
// - VITE_WRITE_MODE: 'legacy' | 'gl2'

export type ReadMode = 'legacy' | 'gl2_single_line' | 'gl2_collapsed';
export type WriteMode = 'legacy' | 'gl2';

export interface FeatureFlags {
  READ_MODE: ReadMode;
  WRITE_MODE: WriteMode;
}

// Safe defaults: keep legacy on until explicitly switched
export const featureFlags: FeatureFlags = {
  READ_MODE: ((import.meta as any)?.env?.VITE_READ_MODE as ReadMode) ?? 'legacy',
  WRITE_MODE: ((import.meta as any)?.env?.VITE_WRITE_MODE as WriteMode) ?? 'legacy',
};

// Runtime overrides to enable page-level switching without env changes
export const getReadMode = (): ReadMode => {
  try {
    const o = (window as any).__READ_MODE_OVERRIDE as ReadMode | undefined;
    if (o) return o;
  } catch {}
  return featureFlags.READ_MODE;
};

export const getWriteMode = (): WriteMode => {
  try {
    const o = (window as any).__WRITE_MODE_OVERRIDE as WriteMode | undefined;
    if (o) return o;
  } catch {}
  return featureFlags.WRITE_MODE;
};

export const isGl2Read = () => getReadMode() !== 'legacy';
export const isGl2Write = () => getWriteMode() === 'gl2';
