'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { UIMessage } from 'ai'
import { HelmChat } from '@/components/admin/helm/HelmChat'
import { HelmSessionPicker } from '@/components/admin/helm/HelmSessionPicker'
import { HelmTabs } from '@/components/admin/helm/HelmTabs'
import { createConversation, loadConversationMessages, resolveActiveConversation } from '@/lib/helm/actions/conversations'

const OPEN_STORAGE_KEY = 'helm-widget-open'

function Header({
  mode,
  conversationId,
  onSelectConversation,
  onNewChat,
  onClose,
}: {
  mode: 'floating' | 'full'
  conversationId?: string
  onSelectConversation?: (id: string) => void
  onNewChat: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-violet-400/12 border border-violet-400/25 flex items-center justify-center text-violet-300 font-semibold text-sm shrink-0">
          J
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-playfair)' }}>
            Jarvis
          </p>
          <p className="text-white/40 text-xs truncate">Kommandozentrale · Schuck Webdesign</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {mode === 'full' && <HelmTabs className="mr-1" />}
        {mode === 'floating' && onSelectConversation && (
          <HelmSessionPicker activeId={conversationId} onSelect={onSelectConversation} onCreate={onNewChat} />
        )}
        {mode === 'full' && (
          <button
            type="button"
            onClick={onNewChat}
            title="Neuer Chat"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
        {mode === 'floating' && (
          <>
            <Link
              href="/admin/helm"
              title="Große Ansicht"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={onClose}
              title="Schließen"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function HelmWidget({
  mode,
  toolLabels,
  conversationId: initialConversationId,
  initialMessages,
  sessionList,
}: {
  mode: 'floating' | 'full'
  /** Slug → Label, serverseitig aus dem Katalog vorberechnet (siehe
   * lib/helm/catalog/registry.ts#toolLabelMap) — Client-Komponenten dürfen den Katalog selbst
   * nicht importieren. */
  toolLabels: Record<string, string>
  /** Nur im 'full'-Modus von der Server-Component-Seite übergeben (app/(admin)/admin/helm/page.tsx).
   * Im 'floating'-Modus löst das Widget seine Konversation selbst per Server Action auf. */
  conversationId?: string
  initialMessages?: UIMessage[]
  /** Vorgerenderte Sidebar (Server Component) — nur im 'full'-Modus gesetzt. */
  sessionList?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(mode === 'full')
  const isOpenRef = useRef(isOpen)
  const [hasUnseen, setHasUnseen] = useState(false)

  // Floating-Modus: Konversation + Verlauf erst beim ersten Öffnen laden, nicht bei jedem
  // Admin-Seitenaufruf — das Widget ist global im Layout gemountet (siehe
  // app/(admin)/layout.tsx), ein Eager-Load würde auf jeder Navigation unnötig die DB treffen.
  // Einmal geladen bleibt HelmChat gemountet (nur per CSS ausgeblendet, siehe unten) — sonst
  // würde eine noch laufende Antwort beim Schließen des Panels abreißen.
  const [floatingState, setFloatingState] = useState<{ id: string; messages: UIMessage[] } | null>(null)
  const [loadingFloating, setLoadingFloating] = useState(false)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (mode !== 'floating') return
    // Muss ein Effect bleiben (nicht als Lazy-Initializer lösbar): localStorage existiert
    // beim SSR-Render nicht, das offene Panel darf also erst nach der Hydration erscheinen.
    if (window.localStorage.getItem(OPEN_STORAGE_KEY) === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true)
      setHasUnseen(false)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'floating') return
    window.localStorage.setItem(OPEN_STORAGE_KEY, isOpen ? '1' : '0')
  }, [isOpen, mode])

  useEffect(() => {
    if (mode !== 'floating' || !isOpen || floatingState || loadingFloating) return
    // Daten-Fetch beim ersten Öffnen — setLoadingFloating hier ist der Auslöser, nicht ein
    // aus Props abgeleiteter Zustand.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingFloating(true)
    resolveActiveConversation()
      .then(({ id }) => loadConversationMessages(id).then((messages) => setFloatingState({ id, messages })))
      .finally(() => setLoadingFloating(false))
  }, [mode, isOpen, floatingState, loadingFloating])

  function handleSelectConversation(id: string) {
    setLoadingFloating(true)
    loadConversationMessages(id)
      .then((messages) => setFloatingState({ id, messages }))
      .finally(() => setLoadingFloating(false))
  }

  function handleNewChat() {
    if (mode === 'full') {
      createConversation().then(({ id }) => router.push(`/admin/helm?c=${id}`))
      return
    }
    setLoadingFloating(true)
    createConversation()
      .then(({ id }) => loadConversationMessages(id).then((messages) => setFloatingState({ id, messages })))
      .finally(() => setLoadingFloating(false))
  }

  function handleResponseFinished() {
    if (mode === 'floating' && !isOpenRef.current) setHasUnseen(true)
  }

  const header = (
    <Header
      mode={mode}
      conversationId={mode === 'floating' ? floatingState?.id : initialConversationId}
      onSelectConversation={mode === 'floating' ? handleSelectConversation : undefined}
      onNewChat={handleNewChat}
      onClose={() => setIsOpen(false)}
    />
  )

  const chatArea =
    mode === 'full' ? (
      <HelmChat
        key={initialConversationId}
        mode="full"
        conversationId={initialConversationId!}
        initialMessages={initialMessages ?? []}
        toolLabels={toolLabels}
      />
    ) : floatingState ? (
      <HelmChat
        key={floatingState.id}
        mode="floating"
        conversationId={floatingState.id}
        initialMessages={floatingState.messages}
        toolLabels={toolLabels}
        onResponseFinished={handleResponseFinished}
      />
    ) : (
      <p className="text-white/30 text-xs text-center py-8">{loadingFloating ? 'Verlauf wird geladen…' : ''}</p>
    )

  if (mode === 'full') {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-hidden bg-[#0d0d0d] flex flex-col">
        {header}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[16rem_1fr]">
          <aside className="hidden lg:block border-r border-white/8 min-h-0 overflow-hidden">{sessionList}</aside>
          {chatArea}
        </div>
      </div>
    )
  }

  // Schwebender Modus: nicht auf der eigenen Vollbild-Seite anzeigen.
  if (pathname === '/admin/helm') return null

  return (
    <>
      {/* CSS-Sichtbarkeit statt bedingtem Unmount: einmal geladen bleibt HelmChat (und sein
          useChat-Stream) beim Schließen bestehen, sonst würde eine laufende Antwort abreißen
          und der "ungesehen"-Punkt könnte nie feuern. */}
      <div
        className={`fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[70vh] sm:h-[560px] max-h-[calc(100vh-7rem)] flex-col bg-[#0d0d0d]/98 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden ${
          isOpen ? 'flex' : 'hidden'
        }`}
      >
        {header}
        {chatArea}
      </div>

      <button
        type="button"
        onClick={() =>
          setIsOpen((v) => {
            const next = !v
            if (next) setHasUnseen(false)
            return next
          })
        }
        aria-label={isOpen ? 'Jarvis schließen' : 'Jarvis öffnen'}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-violet-500 hover:bg-violet-400 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white transition-colors"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="font-semibold text-lg" style={{ fontFamily: 'var(--font-playfair)' }}>
            J
          </span>
        )}
        {hasUnseen && !isOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#111111]" />
        )}
      </button>
    </>
  )
}
