import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePersistedPanelState } from '../usePersistedPanelState'

describe('usePersistedPanelState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses defaults when storage is empty', () => {
    const { result } = renderHook(() =>
      usePersistedPanelState({ storagePrefix: 'test-panel' })
    )

    expect(result.current.position).toEqual({ x: 0, y: 0 })
    expect(result.current.size).toEqual({ width: 600, height: 400 })
    expect(result.current.maximized).toBe(false)
    expect(result.current.docked).toBe(false)
  })

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() =>
      usePersistedPanelState({ storagePrefix: 'test-panel' })
    )

    act(() => {
      result.current.setPosition({ x: 100, y: 200 })
    })
    expect(result.current.position).toEqual({ x: 100, y: 200 })
    expect(JSON.parse(localStorage.getItem('test-panel:position')!)).toEqual({ x: 100, y: 200 })

    act(() => {
      result.current.setSize({ width: 800, height: 600 })
    })
    expect(result.current.size).toEqual({ width: 800, height: 600 })
    expect(JSON.parse(localStorage.getItem('test-panel:size')!)).toEqual({ width: 800, height: 600 })

    act(() => {
        result.current.setMaximized(true)
    })
    expect(result.current.maximized).toBe(true)
    expect(localStorage.getItem('test-panel:maximized')).toBe('true')
  })

  it('resets layout to defaults', () => {
    const { result } = renderHook(() =>
      usePersistedPanelState({
        storagePrefix: 'test-panel',
        defaultPosition: { x: 10, y: 10 },
        defaultSize: { width: 100, height: 100 },
        defaultMaximized: true,
      })
    )

    // Change state
    act(() => {
      result.current.setPosition({ x: 99, y: 99 })
      result.current.setMaximized(false)
    })

    expect(result.current.position).toEqual({ x: 99, y: 99 })
    expect(result.current.maximized).toBe(false)

    // Reset
    act(() => {
      result.current.resetLayout()
    })

    expect(result.current.position).toEqual({ x: 10, y: 10 })
    expect(result.current.maximized).toBe(true)
    
    // The hook syncs state to storage, so resetting state will save the default value to storage
    expect(JSON.parse(localStorage.getItem('test-panel:position')!)).toEqual({ x: 10, y: 10 })
  })
})
