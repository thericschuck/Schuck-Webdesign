'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { HELM_COLD_START_TRIGGER } from '@/lib/helm/core/constants'
import { confirmPendingAction, rejectPendingAction } from '@/lib/helm/actions/confirm'

const OPEN_STORAGE_KEY = 'helm-widget-open'
const PAGE_TEXT_MAX = 6000
const FIELD_VALUE_MAX = 2000
// War die letzte Nachricht länger her als das, öffnet HELM beim nächsten Aufruf keinen
// alten Chat mehr weiter, sondern startet automatisch neu (wie der "Neuer Chat"-Button).
const AUTO_NEW_CHAT_AFTER_MS = 24 * 60 * 60 * 1000

type TrackableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const UNTRACKED_INPUT_TYPES = new Set(['password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'file'])

function isTrackableField(el: EventTarget | null): el is TrackableField {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement) return !UNTRACKED_INPUT_TYPES.has(el.type)
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

// Sucht ein sprechendes Label fürs Feld — <label for>, umschließendes <label>, aria-label,
// placeholder, dann name — damit HELM weiß, WAS Eric gerade tippt, nicht nur den rohen Wert.
function labelForField(el: TrackableField): string {
  if (el.id) {
    const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    const text = byFor?.textContent?.trim()
    if (text) return text
  }
  const wrapping = el.closest('label')?.textContent?.trim()
  if (wrapping) return wrapping
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel
  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder
  if (el.name) return el.name
  return 'Eingabefeld'
}

// Extrahiert den sichtbaren Text der aktuellen Seite (main-Element, ohne Nav und ohne das
// HELM-Widget selbst, das außerhalb von <main> gerendert wird).
function extractPageText(): string | null {
  if (typeof document === 'undefined') return null
  const main = document.querySelector('main')
  const text = main?.innerText?.replace(/\n{3,}/g, '\n\n').trim()
  if (!text) return null
  return text.length > PAGE_TEXT_MAX ? `${text.slice(0, PAGE_TEXT_MAX)}…` : text
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

interface PendingConfirmationPart {
  toolCallId: string
  toolName: string
  actionId: string
  summary: string
}

function extractPendingConfirmations(message: UIMessage): PendingConfirmationPart[] {
  const results: PendingConfirmationPart[] = []
  for (const part of message.parts as Array<Record<string, unknown>>) {
    const type = part.type as string | undefined
    if (!type || (type !== 'dynamic-tool' && !type.startsWith('tool-'))) continue
    if (part.state !== 'output-available') continue
    const output = part.output as { status?: string; actionId?: string; summary?: string } | undefined
    if (!output || output.status !== 'pending_confirmation' || !output.actionId) continue
    results.push({
      toolCallId: part.toolCallId as string,
      toolName: (part.toolName as string) ?? type.replace(/^tool-/, ''),
      actionId: output.actionId,
      summary: output.summary ?? '',
    })
  }
  return results
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
    </span>
  )
}

function MarkdownBubble({ text }: { text: string }) {
  return (
    <div className="helm-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 flex flex-col gap-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 flex flex-col gap-1">{children}</ol>,
          li: ({ children }) => <li className="marker:text-white/30">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-300 underline hover:text-violet-200">
              {children}
            </a>
          ),
          code: ({ children }) => <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono text-violet-200">{children}</code>,
          pre: ({ children }) => (
            <pre className="bg-black/30 rounded-lg p-3 overflow-x-auto text-xs font-mono my-2 text-white/80">{children}</pre>
          ),
          h1: ({ children }) => <p className="font-semibold text-white mt-1 mb-1">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-white mt-1 mb-1">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-white mt-1 mb-1">{children}</p>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming,
  resolvedActionIds,
  onDecide,
}: {
  message: UIMessage
  isStreaming: boolean
  resolvedActionIds: Set<string>
  onDecide: (actionId: string, decision: 'approve' | 'reject') => void
}) {
  const isUser = message.role === 'user'
  const text = messageText(message)
  const pending = isUser ? [] : extractPendingConfirmations(message).filter((p) => !resolvedActionIds.has(p.actionId))
  const showTyping = !isUser && isStreaming && !text && pending.length === 0

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div
        className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-semibold ${
          isUser ? 'bg-white/10 text-white/60' : 'bg-violet-400/15 border border-violet-400/25 text-violet-300'
        }`}
      >
        {isUser ? 'E' : 'H'}
      </div>
      <div className="max-w-[calc(100%-2rem)] flex flex-col gap-2">
        {(text || showTyping) && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-violet-400/15 text-white border border-violet-400/20 rounded-br-sm'
                : 'bg-white/5 text-white/85 border border-white/8 rounded-bl-sm'
            }`}
          >
            {showTyping ? <TypingDots /> : <MarkdownBubble text={text} />}
          </div>
        )}

        {pending.map((p) => (
          <div key={p.toolCallId} className="rounded-2xl px-4 py-3 border border-amber-400/25 bg-amber-400/10">
            <p className="text-amber-300 text-sm font-medium mb-2">Bestätigung erforderlich</p>
            <p className="text-xs text-white/70 mb-3">{p.summary || p.toolName}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDecide(p.actionId, 'approve')}
                className="px-3 py-1.5 rounded-lg bg-emerald-400/90 hover:bg-emerald-400 text-[#0d0d0d] text-xs font-medium transition-colors"
              >
                Bestätigen
              </button>
              <button
                type="button"
                onClick={() => onDecide(p.actionId, 'reject')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HelmWidget({ mode }: { mode: 'floating' | 'full' }) {
  const pathname = usePathname()
  const router = useRouter()
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(mode === 'full')
  const [hasUnseen, setHasUnseen] = useState(false)
  const [resolvedActionIds, setResolvedActionIds] = useState<Set<string>>(new Set())
  const hasTriggeredColdStart = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Letztes Formularfeld, das Eric außerhalb des HELM-Chats fokussiert hat — bleibt auch nach
  // dem Blur stehen, damit die nächste Anfrage den zu diesem Zeitpunkt aktuellen Live-Wert liest.
  const lastFieldRef = useRef<TrackableField | null>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/helm/chat',
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            id,
            messages,
            currentPath: pathname,
            pageHeading: typeof document !== 'undefined' ? document.querySelector('h1')?.textContent?.trim() || null : null,
            // Nur im schwebenden Widget sinnvoll — auf der Vollbild-HELM-Seite selbst wäre
            // "Seiteninhalt" nur der Chat-Verlauf, den das Modell schon kennt.
            pageText: mode === 'floating' ? extractPageText() : null,
            focusedField: mode === 'floating' ? getFocusedFieldContext() : null,
          },
        }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode]
  )

  const { messages, setMessages, sendMessage, status, error } = useChat({ transport })
  const isStreaming = status === 'submitted' || status === 'streaming'

  // Offen/Geschlossen-Zustand über Reloads hinweg merken (nur im schwebenden Modus relevant).
  useEffect(() => {
    if (mode !== 'floating') return
    const stored = window.localStorage.getItem(OPEN_STORAGE_KEY)
    if (stored === '1') setIsOpen(true)
  }, [mode])

  useEffect(() => {
    if (mode !== 'floating') return
    window.localStorage.setItem(OPEN_STORAGE_KEY, isOpen ? '1' : '0')
    if (isOpen) setHasUnseen(false)
  }, [isOpen, mode])

  // Historie einmalig aus der DB laden. Ist die letzte Nachricht länger als
  // AUTO_NEW_CHAT_AFTER_MS her, macht HELM automatisch das, was der "Neuer Chat"-Button
  // manuell auslöst: alte Historie in der DB löschen und lokal leer starten.
  useEffect(() => {
    let cancelled = false
    fetch('/api/helm/history')
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data: { messages?: UIMessage[] }) => {
        if (cancelled) return
        const loaded = data.messages ?? []
        const last = loaded[loaded.length - 1]
        const lastCreatedAt = (last?.metadata as { createdAt?: string } | undefined)?.createdAt
        const isStale = lastCreatedAt && Date.now() - new Date(lastCreatedAt).getTime() > AUTO_NEW_CHAT_AFTER_MS

        if (isStale) {
          void fetch('/api/helm/history', { method: 'DELETE' })
          return
        }
        setMessages(loaded)
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function maybeColdStart() {
    if (hasTriggeredColdStart.current) return
    hasTriggeredColdStart.current = true
    void sendMessage({ text: HELM_COLD_START_TRIGGER })
  }

  // Cold-Start läuft nur, wenn die Historie leer ist — im schwebenden Modus nur, wenn Eric
  // das Panel tatsächlich öffnet (kein Cold-Start auf jeder Seite, die er nie aufklappt).
  useEffect(() => {
    if (!historyLoaded || messages.length > 0) return
    if (mode === 'full' || isOpen) maybeColdStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded, messages.length, mode, isOpen])

  // Verfolgt fortlaufend, welches Formularfeld auf der Seite zuletzt fokussiert war. Das
  // eigene Chat-Textarea zählt bewusst nicht mit.
  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      if (event.target === textareaRef.current) return
      if (isTrackableField(event.target)) lastFieldRef.current = event.target
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  function getFocusedFieldContext(): { label: string; value: string } | null {
    const el = lastFieldRef.current
    if (!el || !document.contains(el)) return null
    const value = el.value
    if (!value || !value.trim()) return null
    return {
      label: labelForField(el),
      value: value.length > FIELD_VALUE_MAX ? `${value.slice(0, FIELD_VALUE_MAX)}…` : value,
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [input])

  // HELM kann Tools ausführen, die Daten ändern — die gerade offene Admin-Seite bekommt das
  // sonst nicht mit, da Server Components nur beim Navigieren/Reload neu rendern.
  useEffect(() => {
    if (status !== 'ready') return
    if (mode === 'floating' && !isOpen) setHasUnseen(true)
    router.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function handleDecide(actionId: string, decision: 'approve' | 'reject') {
    setResolvedActionIds((prev) => new Set(prev).add(actionId))
    const result = decision === 'approve' ? await confirmPendingAction(actionId) : await rejectPendingAction(actionId)
    if (result.status === 'error') {
      // Karte bleibt ausgeblendet — Eric sieht den Fehler beim nächsten Chat-Turn ohnehin,
      // ein doppeltes Klicken kann wegen der race-sicheren Bestätigung nichts kaputt machen.
      console.error('[helm] Bestätigung fehlgeschlagen:', result.message)
    }
    router.refresh()
  }

  async function handleNewChat() {
    if (isStreaming) return
    setMessages([])
    setResolvedActionIds(new Set())
    hasTriggeredColdStart.current = false
    try {
      await fetch('/api/helm/history', { method: 'DELETE' })
    } catch {
      // best effort — lokaler State ist bereits geleert
    }
    if (mode === 'full' || isOpen) maybeColdStart()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    void sendMessage({ text })
  }

  const visibleMessages = messages.filter((m) => !(m.role === 'user' && messageText(m) === HELM_COLD_START_TRIGGER))

  const chatBody = (
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-violet-400/12 border border-violet-400/25 flex items-center justify-center text-violet-300 font-semibold text-sm shrink-0">
            H
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-playfair)' }}>
              HELM
            </p>
            <p className="text-white/40 text-xs truncate">Kommandozentrale · Schuck Webdesign</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mode === 'full' && (
            <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8 mr-1">
              <span className="px-3 py-1 rounded-md text-xs font-medium bg-[#7F77DD] text-white" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Chat
              </span>
              <Link
                href="/admin/helm/cockpit"
                className="px-3 py-1 rounded-md text-xs font-medium text-white/50 hover:text-white transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Cockpit
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={handleNewChat}
            title="Neuer Chat"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
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
                onClick={() => setIsOpen(false)}
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

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-3">
        {!historyLoaded && (
          <p className="text-white/30 text-xs text-center py-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Verlauf wird geladen…
          </p>
        )}

        {visibleMessages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && index === visibleMessages.length - 1}
            resolvedActionIds={resolvedActionIds}
            onDecide={handleDecide}
          />
        ))}

        {error && (
          <div className="self-start max-w-[calc(100%-2rem)] rounded-2xl px-4 py-2.5 text-sm bg-red-400/10 border border-red-400/25 text-red-300">
            Fehler: {error.message}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className={`shrink-0 ${mode === 'full' ? 'px-6 py-5' : 'px-4 py-4'}`}>
        <div className="flex items-end gap-2 rounded-2xl bg-white/5 border border-white/10 focus-within:border-violet-400/40 transition-colors px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSubmit(event)
              }
            }}
            disabled={isStreaming}
            placeholder="Frag HELM…"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50 max-h-40 py-1.5"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            title="Senden"
            aria-label="Senden"
            className="shrink-0 w-9 h-9 rounded-xl bg-violet-400/90 hover:bg-violet-400 flex items-center justify-center text-[#0d0d0d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>
        </div>
      </form>
    </>
  )

  if (mode === 'full') {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-hidden bg-[#0d0d0d] flex flex-col">
        {chatBody}
      </div>
    )
  }

  // Schwebender Modus: nicht auf der eigenen Vollbild-Seite anzeigen.
  if (pathname === '/admin/helm') return null

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[70vh] sm:h-[560px] max-h-[calc(100vh-7rem)] flex flex-col bg-[#0d0d0d]/98 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
          {chatBody}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'HELM schließen' : 'HELM öffnen'}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-violet-500 hover:bg-violet-400 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white transition-colors"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="font-semibold text-lg" style={{ fontFamily: 'var(--font-playfair)' }}>
            H
          </span>
        )}
        {hasUnseen && !isOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#111111]" />
        )}
      </button>
    </>
  )
}
