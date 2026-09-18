'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { updateHelmModelEffort } from '@/lib/helm/actions/settings'
import type { HelmEffort } from '@/lib/helm/settings'

interface HelmSettingsContextValue {
  model: string
  effort: HelmEffort
  setModel: (model: string) => void
  setEffort: (effort: HelmEffort) => void
}

const HelmSettingsContext = createContext<HelmSettingsContextValue | null>(null)

/**
 * Teilt Modell/Denktiefe zwischen Vollbild-Chat und schwebendem Widget — beide mounten
 * HelmChat als eigenen Komponentenbaum, Context ist der einzige gemeinsame Kanal. Autorität
 * ist die helm_settings-Zeile in der DB (bei jedem Chat-Request neu gelesen, siehe
 * app/api/helm/chat/route.ts) — hier nur optimistisches UI-Echo, analog
 * athena-settings-context.tsx.
 */
export function HelmSettingsProvider({
  initial,
  children,
}: {
  initial: { model: string; effort: HelmEffort }
  children: React.ReactNode
}) {
  const [model, setModelState] = useState(initial.model)
  const [effort, setEffortState] = useState(initial.effort)

  const setModel = useCallback((next: string) => {
    setModelState(next)
    void updateHelmModelEffort({ model: next })
  }, [])

  const setEffort = useCallback((next: HelmEffort) => {
    setEffortState(next)
    void updateHelmModelEffort({ effort: next })
  }, [])

  const value = useMemo(() => ({ model, effort, setModel, setEffort }), [model, effort, setModel, setEffort])

  return <HelmSettingsContext.Provider value={value}>{children}</HelmSettingsContext.Provider>
}

export function useHelmChatSettings(): HelmSettingsContextValue {
  const ctx = useContext(HelmSettingsContext)
  if (!ctx) throw new Error('useHelmChatSettings muss innerhalb von HelmSettingsProvider verwendet werden.')
  return ctx
}
