import { useCallback, useState } from 'react'
import type { ReportPreset } from '../services/user-presets'
import { listReportPresets, saveReportPreset as savePresetRpc, deleteReportPreset as deletePresetRpc } from '../services/user-presets'
import { loadLastPresetId, saveLastPresetId } from '../utils/reportPresets'

export interface SavePresetParams {
  name: string
  filters: any
  columns?: any
  id?: string | null
}

export interface UseReportPresets {
  presets: ReportPreset[]
  selectedPresetId: string
  setSelectedPresetId: (id: string) => void
  newPresetName: string
  setNewPresetName: (v: string) => void
  loadingPresets: boolean
  reloadPresets: () => Promise<ReportPreset[]>
  loadPresetsAndApplyLast: (apply: (p: ReportPreset) => void) => Promise<void>
  selectPresetAndApply: (id: string, apply: (p: ReportPreset) => void) => Promise<void>
  saveCurrentPreset: (params: Omit<SavePresetParams, 'name'> & { name?: string }) => Promise<ReportPreset | null>
  deleteSelectedPreset: () => Promise<void>
}

export function useReportPresets(reportKey: string): UseReportPresets {
  const [presets, setPresets] = useState<ReportPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [newPresetName, setNewPresetName] = useState<string>('')
  const [loadingPresets, setLoadingPresets] = useState<boolean>(false)

  const reloadPresets = useCallback(async () => {
    setLoadingPresets(true)
    try {
      const items = await listReportPresets(reportKey)
      setPresets(items)
      return items
    } finally {
      setLoadingPresets(false)
    }
  }, [reportKey])

  const loadPresetsAndApplyLast = useCallback(async (apply: (p: ReportPreset) => void) => {
    const items = await reloadPresets()
    const lastId = loadLastPresetId(reportKey)
    if (!lastId) return
    const p = items.find(x => x.id === lastId)
    if (!p) return
    setSelectedPresetId(p.id)
    apply(p)
  }, [reloadPresets, reportKey])

  const selectPresetAndApply = useCallback(async (id: string, apply: (p: ReportPreset) => void) => {
    setSelectedPresetId(id)
    const p = presets.find(x => x.id === id)
    if (!p) return
    saveLastPresetId(reportKey, id)
    apply(p)
  }, [presets, reportKey])

  const saveCurrentPreset = useCallback(async (params: Omit<SavePresetParams, 'name'> & { name?: string }) => {
    const name = params.name ?? newPresetName.trim()
    if (!name) return null
    const saved = await savePresetRpc({
      reportKey,
      name,
      filters: params.filters,
      columns: params.columns ?? [],
      id: params.id ?? null,
    })
    const items = await reloadPresets()
    setSelectedPresetId(saved.id)
    saveLastPresetId(reportKey, saved.id)
    return saved
  }, [newPresetName, reloadPresets, reportKey])

  const deleteSelectedPreset = useCallback(async () => {
    if (!selectedPresetId) return
    await deletePresetRpc(selectedPresetId)
    setSelectedPresetId('')
    await reloadPresets()
  }, [selectedPresetId, reloadPresets])

  return {
    presets,
    selectedPresetId,
    setSelectedPresetId,
    newPresetName,
    setNewPresetName,
    loadingPresets,
    reloadPresets,
    loadPresetsAndApplyLast,
    selectPresetAndApply,
    saveCurrentPreset,
    deleteSelectedPreset,
  }
}

