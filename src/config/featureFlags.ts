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

export const isGl2Read = () => featureFlags.READ_MODE !== 'legacy';
export const isGl2Write = () => featureFlags.WRITE_MODE === 'gl2';