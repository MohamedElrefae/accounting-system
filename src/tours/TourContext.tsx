import React from 'react'
import type { TourDefinition } from './types'
import { getTourById } from './definitions'

type TourState = {
  activeTourId: string | null
  stepIndex: number
}

type TourContextValue = {
  activeTour: TourDefinition | null
  stepIndex: number
  startTour: (tourId: string) => void
  stopTour: () => void
  nextStep: () => void
  prevStep: () => void
}

const TourContext = React.createContext<TourContextValue | null>(null)

const STORAGE_KEY = 'tours:last_state_v1'

function readState(): TourState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { activeTourId: null, stepIndex: 0 }
    const parsed = JSON.parse(raw) as TourState
    return {
      activeTourId: parsed.activeTourId ?? null,
      stepIndex: typeof parsed.stepIndex === 'number' ? parsed.stepIndex : 0,
    }
  } catch {
    return { activeTourId: null, stepIndex: 0 }
  }
}

function writeState(state: TourState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<TourState>(() => {
    const s = readState()
    if (!s.activeTourId) return { activeTourId: null, stepIndex: 0 }
    const t = getTourById(s.activeTourId)
    if (!t) return { activeTourId: null, stepIndex: 0 }
    const max = t.steps.length
    const idx = Math.max(0, Math.min(s.stepIndex, Math.max(0, max - 1)))
    return { activeTourId: s.activeTourId, stepIndex: idx }
  })

  const activeTour = React.useMemo(() => {
    if (!state.activeTourId) return null
    return getTourById(state.activeTourId) ?? null
  }, [state.activeTourId])

  const stopTour = React.useCallback(() => {
    setState({ activeTourId: null, stepIndex: 0 })
    writeState({ activeTourId: null, stepIndex: 0 })
  }, [])

  const startTour = React.useCallback((tourId: string) => {
    const tour = getTourById(tourId)
    if (!tour) return
    const next = { activeTourId: tourId, stepIndex: 0 }
    setState(next)
    writeState(next)
  }, [])

  const nextStep = React.useCallback(() => {
    setState((prev) => {
      if (!prev.activeTourId) return prev
      const tour = getTourById(prev.activeTourId)
      const max = tour?.steps?.length ?? 0
      const nextIndex = Math.min(prev.stepIndex + 1, Math.max(0, max - 1))
      const next = { ...prev, stepIndex: nextIndex }
      writeState(next)
      return next
    })
  }, [])

  const prevStep = React.useCallback(() => {
    setState((prev) => {
      if (!prev.activeTourId) return prev
      const nextIndex = Math.max(prev.stepIndex - 1, 0)
      const next = { ...prev, stepIndex: nextIndex }
      writeState(next)
      return next
    })
  }, [])

  const value: TourContextValue = {
    activeTour,
    stepIndex: state.stepIndex,
    startTour,
    stopTour,
    nextStep,
    prevStep,
  }

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour() {
  const ctx = React.useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}
