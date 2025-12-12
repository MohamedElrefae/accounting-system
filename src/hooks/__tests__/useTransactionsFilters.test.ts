import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useTransactionsFilters } from '../useTransactionsFilters'
import { getActiveProjectId } from '../../utils/org'

vi.mock('../../utils/org', () => ({
  getActiveProjectId: vi.fn(),
}))

const getActiveProjectIdMock = getActiveProjectId as unknown as ReturnType<typeof vi.fn>

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('useTransactionsFilters', () => {
  beforeEach(() => {
    localStorage.clear()
    getActiveProjectIdMock.mockReset()
  })

  it('applies and resets header filters while tracking dirty state', async () => {
    const { result } = renderHook(() => useTransactionsFilters())

    await flushEffects()
    expect(result.current.headerFilters.search).toBe('')
    expect(result.current.headerFiltersDirty).toBe(false)

    act(() => {
      result.current.updateHeaderFilter('search', 'فاتورة')
    })
    expect(result.current.headerFilters.search).toBe('فاتورة')
    expect(result.current.headerFiltersDirty).toBe(true)

    act(() => {
      result.current.applyHeaderFilters()
    })
    await flushEffects()
    expect(result.current.headerAppliedFilters.search).toBe('فاتورة')
    expect(result.current.headerFiltersDirty).toBe(false)

    act(() => {
      result.current.resetHeaderFilters()
    })
    await flushEffects()
    await waitFor(() => {
      expect(result.current.headerFilters.search).toBe('')
    })
    expect(result.current.headerAppliedFilters.search).toBe('')
    expect(result.current.headerFiltersDirty).toBe(false)

    const stored = JSON.parse(localStorage.getItem('transactions_filters') || '{}')
    expect(stored.search ?? '').toBe('')
  })

  it('syncs project filter with active project when global toggle is enabled', async () => {
    localStorage.setItem('transactions:useGlobalProject', '1')
    getActiveProjectIdMock.mockReturnValue('project-global')

    const { result } = renderHook(() => useTransactionsFilters())

    await waitFor(() => {
      expect(result.current.headerFilters.projectId).toBe('project-global')
    })

    act(() => {
      result.current.setUseGlobalProjectTx(false)
    })
    await flushEffects()
    expect(localStorage.getItem('transactions:useGlobalProject')).toBe('0')

    act(() => {
      result.current.setUseGlobalProjectTx(true)
    })
    await flushEffects()
    await waitFor(() => {
      expect(result.current.headerFilters.projectId).toBe('project-global')
    })
    await flushEffects()
    expect(localStorage.getItem('transactions:useGlobalProject')).toBe('1')
  })
})
