// Unified mode configuration — GL2 and legacy flags removed
// Always operate in unified, multi-line model.

export type ReadMode = 'unified' | 'legacy';
export type WriteMode = 'unified' | 'legacy';

export interface FeatureFlags {
  READ_MODE: ReadMode;
  WRITE_MODE: WriteMode;
}

export const featureFlags: FeatureFlags = {
  READ_MODE: 'unified',
  WRITE_MODE: 'unified',
};

export const getReadMode = (): ReadMode => 'unified';
export const getWriteMode = (): WriteMode => 'unified';

export const isGl2Read = () => false;
export const isGl2Write = () => false;
