import { useCallback, useState, useEffect } from 'react'

export type DockPosition = 'left' | 'right' | 'top' | 'bottom'

export interface PanelCoordinates {
  x: number
  y: number
}

export interface PanelSize {
  width: number
  height: number
}

interface UsePersistedPanelStateOptions {
  storagePrefix: string
  defaultPosition?: PanelCoordinates
  defaultSize?: PanelSize
  defaultMaximized?: boolean
  defaultDocked?: boolean
  defaultDockPosition?: DockPosition
}

export interface PersistedPanelState {
  position: PanelCoordinates
  setPosition: React.Dispatch<React.SetStateAction<PanelCoordinates>>
  size: PanelSize
  setSize: React.Dispatch<React.SetStateAction<PanelSize>>
  maximized: boolean
  setMaximized: React.Dispatch<React.SetStateAction<boolean>>
  docked: boolean
  setDocked: React.Dispatch<React.SetStateAction<boolean>>
  dockPosition: DockPosition
  setDockPosition: React.Dispatch<React.SetStateAction<DockPosition>>
  resetLayout: () => void
}

const readJSON = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

const readBool = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

const readDockPosition = (key: string, fallback: DockPosition): DockPosition => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key) as DockPosition | null
    return raw ?? fallback
  } catch {
    return fallback
  }
}

export const usePersistedPanelState = (
  options: UsePersistedPanelStateOptions,
): PersistedPanelState => {
  const {
    storagePrefix,
    defaultPosition = { x: 0, y: 0 },
    defaultSize = { width: 600, height: 400 },
    defaultMaximized = false,
    defaultDocked = false,
    defaultDockPosition = 'right',
  } = options

  const positionKey = `${storagePrefix}:position`
  const sizeKey = `${storagePrefix}:size`
  const maxKey = `${storagePrefix}:maximized`
  const dockedKey = `${storagePrefix}:docked`
  const dockPositionKey = `${storagePrefix}:dockPosition`

  const [position, setPosition] = useState<PanelCoordinates>(() => readJSON(positionKey, defaultPosition))
  const [size, setSize] = useState<PanelSize>(() => readJSON(sizeKey, defaultSize))
  const [maximized, setMaximized] = useState<boolean>(() => readBool(maxKey, defaultMaximized))
  const [docked, setDocked] = useState<boolean>(() => readBool(dockedKey, defaultDocked))
  const [dockPosition, setDockPosition] = useState<DockPosition>(() => readDockPosition(dockPositionKey, defaultDockPosition))

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(positionKey, JSON.stringify(position)) } catch { }
  }, [positionKey, position])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(sizeKey, JSON.stringify(size)) } catch { }
  }, [sizeKey, size])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(maxKey, String(maximized)) } catch { }
  }, [maxKey, maximized])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(dockedKey, String(docked)) } catch { }
  }, [dockedKey, docked])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(dockPositionKey, dockPosition) } catch { }
  }, [dockPositionKey, dockPosition])

  const resetLayout = useCallback(() => {
    setPosition(defaultPosition)
    setSize(defaultSize)
    setMaximized(defaultMaximized)
    setDocked(defaultDocked)
    setDockPosition(defaultDockPosition)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(positionKey)
      window.localStorage.removeItem(sizeKey)
      window.localStorage.removeItem(maxKey)
      window.localStorage.removeItem(dockedKey)
      window.localStorage.removeItem(dockPositionKey)
    } catch {
      // ignore
    }
  }, [
    defaultDockPosition,
    defaultDocked,
    defaultMaximized,
    defaultPosition,
    defaultSize,
    positionKey,
    sizeKey,
    maxKey,
    dockedKey,
    dockPositionKey,
  ])

  return {
    position,
    setPosition,
    size,
    setSize,
    maximized,
    setMaximized,
    docked,
    setDocked,
    dockPosition,
    setDockPosition,
    resetLayout,
  }
}

export default usePersistedPanelState
