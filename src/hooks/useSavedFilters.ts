import { useEffect, useState } from 'react'

export function useSavedFilters<T extends object>(key: string, initial: T) {
  const storageKey = `filters:${key}`
  const [filters, setFilters] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters))
    } catch {}
  }, [storageKey, filters])

  return [filters, setFilters] as const
}