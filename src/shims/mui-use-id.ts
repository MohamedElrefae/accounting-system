import { useId as reactUseId, useRef } from 'react'

let __muiIdCounter = 0

function fallbackId() {
  __muiIdCounter += 1
  return `mui-${__muiIdCounter}`
}

export default function useId(): string {
  // Prefer React 18's useId if available
  try {
    if (typeof reactUseId === 'function') {
      const id = (reactUseId as unknown as () => string)()
      if (id) return id
    }
  } catch {}
  // Fallback: stable ref-based id per component instance
  const ref = useRef<string | null>(null)
  if (ref.current == null) ref.current = fallbackId()
  return ref.current
}

// Some MUI internals import unstable_useId
export { useId as unstable_useId }
