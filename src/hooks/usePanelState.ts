import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DockPosition = 'left' | 'right' | 'top' | 'bottom';

type PanelState = {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized: boolean;
  isDocked: boolean;
  dockPosition: DockPosition;
};

export type PanelStateDefaults = {
  position?: { x: number; y: number } | (() => { x: number; y: number });
  size?: { width: number; height: number } | (() => { width: number; height: number });
  isMaximized?: boolean;
  isDocked?: boolean;
  dockPosition?: DockPosition;
};

export type UsePanelStateReturn = {
  state: PanelState;
  setPosition: (position: PanelState['position']) => void;
  setSize: (size: PanelState['size']) => void;
  toggleMaximize: () => void;
  setDocked: (isDocked: boolean) => void;
  setDockPosition: (dockPosition: DockPosition) => void;
  reset: () => void;
};

const resolveValue = <T>(value: T | (() => T) | undefined, fallback: T): T => {
  if (typeof value === 'function') {
    return (value as () => T)();
  }
  return value ?? fallback;
};

/**
 * Shared hook for managing draggable/resizable panel state with persistence.
 */
export const usePanelState = (
  storageKey: string,
  defaults?: PanelStateDefaults,
): UsePanelStateReturn => {
  const defaultStateRef = useRef<PanelState>();

  if (!defaultStateRef.current) {
    const fallbackPosition = { x: 120, y: 120 };
    const fallbackSize = { width: 720, height: 620 };

    defaultStateRef.current = {
      position: resolveValue(defaults?.position, fallbackPosition),
      size: resolveValue(defaults?.size, fallbackSize),
      isMaximized: defaults?.isMaximized ?? false,
      isDocked: defaults?.isDocked ?? false,
      dockPosition: defaults?.dockPosition ?? 'right',
    };
  }

  const defaultState = defaultStateRef.current;

  const [state, setState] = useState<PanelState>(() => {
    if (typeof window === 'undefined') {
      return defaultState;
    }

    try {
      const positionRaw = window.localStorage.getItem(`${storageKey}:position`);
      const sizeRaw = window.localStorage.getItem(`${storageKey}:size`);
      const maximizedRaw = window.localStorage.getItem(`${storageKey}:maximized`);
      const dockedRaw = window.localStorage.getItem(`${storageKey}:docked`);
      const dockPositionRaw = window.localStorage.getItem(`${storageKey}:dockPosition`);

      return {
        position: positionRaw ? JSON.parse(positionRaw) : defaultState.position,
        size: sizeRaw ? JSON.parse(sizeRaw) : defaultState.size,
        isMaximized: maximizedRaw === 'true' ? true : maximizedRaw === 'false' ? false : defaultState.isMaximized,
        isDocked: dockedRaw === 'true' ? true : dockedRaw === 'false' ? false : defaultState.isDocked,
        dockPosition: dockPositionRaw ? (dockPositionRaw as DockPosition) : defaultState.dockPosition,
      };
    } catch {
      return defaultState;
    }
  });

  // Persist state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(`${storageKey}:position`, JSON.stringify(state.position));
      window.localStorage.setItem(`${storageKey}:size`, JSON.stringify(state.size));
      window.localStorage.setItem(`${storageKey}:maximized`, String(state.isMaximized));
      window.localStorage.setItem(`${storageKey}:docked`, String(state.isDocked));
      window.localStorage.setItem(`${storageKey}:dockPosition`, state.dockPosition);
    } catch {
      // ignore persistence errors (e.g., private mode)
    }
  }, [state, storageKey]);

  const setPosition = useCallback((position: PanelState['position']) => {
    setState((prev) => ({ ...prev, position }));
  }, []);

  const setSize = useCallback((size: PanelState['size']) => {
    setState((prev) => ({ ...prev, size }));
  }, []);

  const toggleMaximize = useCallback(() => {
    setState((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isDocked: false }));
  }, []);

  const setDocked = useCallback((isDocked: boolean) => {
    setState((prev) => ({ ...prev, isDocked, isMaximized: isDocked ? false : prev.isMaximized }));
  }, []);

  const setDockPosition = useCallback((dockPosition: DockPosition) => {
    setState((prev) => ({ ...prev, dockPosition }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, [defaultState]);

  return useMemo(
    () => ({ state, setPosition, setSize, toggleMaximize, setDocked, setDockPosition, reset }),
    [state, setPosition, setSize, toggleMaximize, setDocked, setDockPosition, reset],
  );
};

export default usePanelState;
