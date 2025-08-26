// Utilities for consistent report preset storage keys and last-used preset handling

export function lastPresetStorageKey(reportKey: string): string {
  return `reportPreset:${reportKey}`
}

export function loadLastPresetId(reportKey: string): string {
  try {
    return localStorage.getItem(lastPresetStorageKey(reportKey)) || ''
  } catch {
    return ''
  }
}

export function saveLastPresetId(reportKey: string, presetId: string): void {
  try {
    localStorage.setItem(lastPresetStorageKey(reportKey), presetId)
  } catch {
    // ignore
  }
}

export function clearLastPresetId(reportKey: string): void {
  try {
    localStorage.removeItem(lastPresetStorageKey(reportKey))
  } catch {
    // ignore
  }
}

