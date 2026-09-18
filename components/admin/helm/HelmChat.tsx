'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Chat, useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Send, Square } from 'lucide-react'
import { HELM_COLD_START_TRIGGER } from '@/lib/helm/core/constants'
import { confirmPendingAction, rejectPendingAction } from '@/lib/helm/actions/confirm'
import { JARVIS_PERSONA } from '@/lib/helm/personas'
import { HelmMessageBubble } from './HelmMessageBubble'
import { MentionMenu } from './MentionMenu'
import { ModelEffortPicker } from './ModelEffortPicker'
import { PersonaAvatar } from './PersonaAvatar'

const PAGE_TEXT_MAX = 6000
const FIELD_VALUE_MAX = 2000

type TrackableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const UNTRACKED_INPUT_TYPES = new Set(['password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'file'])

function isTrackableField(el: EventTarget | null): el is TrackableField {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement) return !UNTRACKED_INPUT_TYPES.has(el.type)
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

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

export function erzeugeHelmChat(conversationId: string, messages?: UIMessage[]): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: conversationId,
    messages,
    transport: new DefaultChatTransport({ api: '/api/helm/chat', body: { conversationId } }),
  })
}

const STARTERS = [
  'Was steht heute an?',
  'Welche Leads sind zur Wiedervorlage fällig?',
  'Welche Rechnungen sind überfällig?',
  'Gib mir den Status aller laufenden Projekte',
]

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <PersonaAvatar persona={JARVIS_PERSONA} size={56} />
      <div className="space-y-1.5">
        <p className="text-base font-medium text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
          Jarvis
        </p>
        <p className="mx-auto max-w-md text-sm text-white/40">
          Dein KI-Kopilot für Schuck Webdesign — Kunden, Projekte, Akquise, Finanzen. Schreibende Aktionen werden erst nach
          deiner Bestätigung ausgeführt. Mit <span className="text-white/60">@Agent</span> sprichst du einen
          Spezial-Agenten direkt an.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTERS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-violet-400/40 hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HelmChat({
  mode,
  conversationId,
  initialMessages,
  toolLabels,
  onResponseFinished,
}: {
  mode: 'floating' | 'full'
  conversationId: string
  initialMessages: UIMessage[]
  toolLabels: Record<string, string>
  /** Feuert bei jedem Übergang in den 'ready'-Status (Antwort fertig) — nutzt das schwebende
   * Widget, um bei geschlossenem Panel den "ungesehen"-Punkt zu setzen. Die Vollbild-Sidebar
   * braucht das nicht extra: router.refresh() weiter unten holt sie bei jeder fertigen
   * Antwort ohnehin neu. */
  onResponseFinished?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [resolvedActionIds, setResolvedActionIds] = useState<Set<string>>(new Set())
  const hasTriggeredColdStart = useRef(initialMessages.length > 0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFieldRef = useRef<TrackableField | null>(null)
  const [input, setInput] = useState('')

  // @-Mention-Menü: nur solange die GESAMTE Eingabe noch ein unfertiges "@..."-Token ist (kein
  // Leerzeichen getippt) — kein separater State nötig, direkt aus `input` abgeleitet.
  const mentionMatch = input.match(/^@([\w-]*)$/)
  const mentionQuery = mentionMatch ? mentionMatch[1] : null

  function selectMention(slug: string) {
    setInput(`@${slug} `)
    textareaRef.current?.focus()
  }

  // Eigene Chat-Instanz pro Konversation (Athenas erzeugeChat-Pattern) — überlebt
  // Schließen/Öffnen des schwebenden Sheets, solange die Konversations-ID gleich bleibt.
  const [instanz] = useState(() => erzeugeHelmChat(conversationId, initialMessages))
  const { messages, sendMessage, status, error, stop } = useChat({ chat: instanz })
  const isStreaming = status === 'submitted' || status === 'streaming'

  function frage(text: string) {
    sendMessage(
      { text },
      {
        body: {
          currentPath: pathname,
          pageHeading: typeof document !== 'undefined' ? document.querySelector('h1')?.textContent?.trim() || null : null,
          pageText: mode === 'floating' ? extractPageText() : null,
          focusedField: mode === 'floating' ? getFocusedFieldContext() : null,
        },
      }
    )
  }

  function maybeColdStart() {
    if (hasTriggeredColdStart.current) return
    hasTriggeredColdStart.current = true
    void sendMessage({ text: HELM_COLD_START_TRIGGER })
  }

  useEffect(() => {
    if (messages.length === 0) maybeColdStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  }, [messages.length])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [input])

  const wasStreamingRef = useRef(false)
  useEffect(() => {
    if (wasStreamingRef.current && status === 'ready') {
      router.refresh()
      onResponseFinished?.()
    }
    wasStreamingRef.current = isStreaming
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function handleDecide(actionId: string, decision: 'approve' | 'reject') {
    setResolvedActionIds((prev) => new Set(prev).add(actionId))
    const result = decision === 'approve' ? await confirmPendingAction(actionId) : await rejectPendingAction(actionId)
    if (result.status === 'error') {
      console.error('[helm] Bestätigung fehlgeschlagen:', result.message)
    }
    router.refresh()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    frage(text)
  }

  const visibleMessages = useMemo(
    () => messages.filter((m) => !(m.role === 'user' && messageText(m) === HELM_COLD_START_TRIGGER)),
    [messages]
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-3">
        {visibleMessages.length === 0 && !isStreaming && <EmptyState onPick={frage} />}

        {visibleMessages.map((message, index) => (
          <HelmMessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && index === visibleMessages.length - 1}
            toolLabels={toolLabels}
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

      <form onSubmit={handleSubmit} className={`relative shrink-0 ${mode === 'full' ? 'px-6 py-5' : 'px-4 py-4'}`}>
        {/* @-Mention: nur solange die Eingabe insgesamt noch ein unfertiges "@..."-Token ist
            (kein Leerzeichen getippt) — danach schließt das Menü, das Token bleibt als Text
            stehen und wird beim Senden serverseitig ausgewertet (siehe api/helm/chat/route.ts). */}
        {mentionQuery !== null && <MentionMenu query={mentionQuery} onSelect={selectMention} />}
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
            placeholder="Frag Jarvis… ( @ für einen Agenten direkt)"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50 max-h-40 py-1.5"
          />
          <ModelEffortPicker />
          {isStreaming ? (
            <button
              type="button"
              onClick={() => stop()}
              title="Abbrechen"
              aria-label="Abbrechen"
              className="shrink-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <Square className="size-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Senden"
              aria-label="Senden"
              className="shrink-0 w-9 h-9 rounded-xl bg-violet-400/90 hover:bg-violet-400 flex items-center justify-center text-[#0d0d0d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
