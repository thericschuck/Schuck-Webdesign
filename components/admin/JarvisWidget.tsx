'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { JARVIS_COLD_START_TRIGGER } from '@/lib/jarvis/constants'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

interface PendingConfirmation {
  id: string
  toolName: string
  args: Record<string, unknown>
}

const TOOL_LABELS: Record<string, string> = {
  delete_client: 'Kunde löschen',
  delete_project: 'Projekt löschen',
  delete_document: 'Dokument löschen',
  update_article_price: 'Artikelpreis ändern',
  invite_client: 'Kunde zum Portal einladen',
  convert_lead_to_client: 'Lead zu Kunde konvertieren',
  create_invoice: 'Rechnung anlegen',
  issue_invoice: 'Rechnung stellen',
  send_invoice: 'Rechnung versenden',
  create_credit_note: 'Gutschrift erstellen',
  send_document: 'Dokument versenden',
  send_followup_email: 'Follow-up-E-Mail versenden',
  calendar_create_event: 'Termin anlegen',
  domain_renew: 'Domain verlängern',
  figma_post_comment: 'Figma-Kommentar posten',
  figma_delete_comment: 'Figma-Kommentar löschen',
  figma_create_dev_resource: 'Figma Dev-Resource anlegen',
  figma_delete_dev_resource: 'Figma Dev-Resource löschen',
  figma_update_variable_value: 'Figma-Variable ändern',
}

const HISTORY_SENT_TO_MODEL = 40
const OPEN_STORAGE_KEY = 'jarvis-widget-open'
const PAGE_TEXT_MAX = 6000
const FIELD_VALUE_MAX = 2000
// War die letzte Nachricht länger her als das, öffnet JARVIS beim nächsten Aufruf keinen
// alten Chat mehr weiter, sondern startet automatisch neu (wie der "Neuer Chat"-Button) —
// rollierend seit der letzten Nachricht, nicht an Kalendertagen/Mitternacht festgemacht.
const AUTO_NEW_CHAT_AFTER_MS = 24 * 60 * 60 * 1000

function formatTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

type TrackableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const UNTRACKED_INPUT_TYPES = new Set(['password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'file'])

function isTrackableField(el: EventTarget | null): el is TrackableField {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement) return !UNTRACKED_INPUT_TYPES.has(el.type)
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

// Sucht ein sprechendes Label fürs Feld — <label for>, umschließendes <label>,
// aria-label, placeholder, dann name — damit JARVIS weiß, WAS Eric gerade tippt,
// nicht nur den rohen Wert.
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

// Extrahiert den sichtbaren Text der aktuellen Seite (main-Element, ohne Nav und
// ohne das JARVIS-Widget selbst, das außerhalb von <main> gerendert wird).
function extractPageText(): string | null {
  if (typeof document === 'undefined') return null
  const main = document.querySelector('main')
  const text = main?.innerText?.replace(/\n{3,}/g, '\n\n').trim()
  if (!text) return null
  return text.length > PAGE_TEXT_MAX ? `${text.slice(0, PAGE_TEXT_MAX)}…` : text
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

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user'
  const showTyping = !isUser && isStreaming && !message.content

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div
        className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-semibold ${
          isUser ? 'bg-white/10 text-white/60' : 'bg-violet-400/15 border border-violet-400/25 text-violet-300'
        }`}
      >
        {isUser ? 'E' : 'J'}
      </div>
      <div
        className={`max-w-[calc(100%-2rem)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-violet-400/15 text-white border border-violet-400/20 rounded-br-sm'
            : 'bg-white/5 text-white/85 border border-white/8 rounded-bl-sm'
        }`}
      >
        {showTyping ? (
          <TypingDots />
        ) : (
          <div className="jarvis-markdown">
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
                code: ({ children }) => (
                  <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono text-violet-200">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-black/30 rounded-lg p-3 overflow-x-auto text-xs font-mono my-2 text-white/80">{children}</pre>
                ),
                h1: ({ children }) => <p className="font-semibold text-white mt-1 mb-1">{children}</p>,
                h2: ({ children }) => <p className="font-semibold text-white mt-1 mb-1">{children}</p>,
                h3: ({ children }) => <p className="font-semibold text-white mt-1 mb-1">{children}</p>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.createdAt && !showTyping && (
          <p className={`text-[10px] mt-1 ${isUser ? 'text-white/30 text-right' : 'text-white/25'}`}>
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  )
}

export function JarvisWidget({ mode }: { mode: 'floating' | 'full' }) {
  const pathname = usePathname()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const [isOpen, setIsOpen] = useState(mode === 'full')
  const [hasUnseen, setHasUnseen] = useState(false)
  const hasTriggeredColdStart = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Letztes Formularfeld, das Eric außerhalb des JARVIS-Chats fokussiert hat — bleibt
  // auch nach dem Blur stehen (z.B. wenn er danach in den Chat klickt, um JARVIS zu
  // fragen), damit sendMessage() den zu diesem Zeitpunkt aktuellen Live-Wert lesen kann.
  const lastFieldRef = useRef<TrackableField | null>(null)

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

  // Historie einmalig aus der DB laden — verhindert, dass bei jedem Reload/Mount
  // neu generiert wird, was Eric explizit als Ziel (Token/Kontext sparen) genannt hat.
  // Ist die letzte Nachricht aber schon länger als AUTO_NEW_CHAT_AFTER_MS her, macht JARVIS
  // stattdessen automatisch das, was der "Neuer Chat"-Button manuell auslöst: alte Historie
  // in der DB löschen und lokal leer starten — der Cold-Start-Effekt unten (ausgelöst durch
  // messages.length === 0) übernimmt danach von selbst die neue Begrüßung. So bekommt Eric
  // beim ersten Öffnen nach einer Pause wieder ein "Hallo, was steht an" statt eines
  // tagealten Gesprächsrests.
  useEffect(() => {
    let cancelled = false
    fetch('/api/jarvis/history')
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data: { messages?: { role: 'user' | 'assistant'; content: string; created_at: string }[] }) => {
        if (cancelled) return
        const loaded = data.messages ?? []
        const lastMessage = loaded[loaded.length - 1]
        const isStale = lastMessage && Date.now() - new Date(lastMessage.created_at).getTime() > AUTO_NEW_CHAT_AFTER_MS

        if (isStale) {
          void fetch('/api/jarvis/history', { method: 'DELETE' })
          return
        }
        setMessages(loaded.map((m) => ({ role: m.role, content: m.content, createdAt: m.created_at })))
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
    void sendMessage(JARVIS_COLD_START_TRIGGER, { hidden: true })
  }

  // Cold-Start läuft nur noch einmal, wenn die Historie leer ist — und im
  // schwebenden Modus nur, wenn Eric das Panel tatsächlich öffnet (kein
  // Cold-Start auf jeder Seite, die er nie aufklappt).
  useEffect(() => {
    if (!historyLoaded || messages.length > 0) return
    if (mode === 'full' || isOpen) maybeColdStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded, messages.length, mode, isOpen])

  // Verfolgt fortlaufend, welches Formularfeld auf der Seite zuletzt fokussiert war —
  // JARVIS soll auch mitbekommen, was Eric gerade eintippt, bevor er es speichert.
  // Das eigene Chat-Textarea zählt bewusst nicht mit (sonst würde JARVIS sich selbst
  // "zitieren", sobald Eric ins Chatfeld klickt).
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
  }, [messages, pendingConfirmation])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [input])

  function appendToLastAssistantMessage(chunk: string) {
    setMessages((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'assistant') return prev
      next[next.length - 1] = { ...last, content: last.content + chunk }
      return next
    })
  }

  function replaceLastAssistantMessage(content: string) {
    setMessages((prev) => {
      const next = [...prev]
      next[next.length - 1] = { role: 'assistant', content, createdAt: new Date().toISOString() }
      return next
    })
  }

  async function consumeSSE(response: Response) {
    if (!response.ok || !response.body) {
      let detail = ''
      try {
        detail = (await response.json())?.error ?? ''
      } catch {
        // kein JSON-Body – ignorieren
      }
      throw new Error(detail || `Anfrage fehlgeschlagen (${response.status})`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let gotAssistantText = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const rawEvents = buffer.split('\n\n')
      buffer = rawEvents.pop() ?? ''

      for (const rawEvent of rawEvents) {
        const lines = rawEvent.split('\n')
        const eventLine = lines.find((line) => line.startsWith('event:'))
        const dataLine = lines.find((line) => line.startsWith('data:'))
        if (!dataLine) continue

        const event = eventLine?.slice('event:'.length).trim() ?? 'message'
        const data = JSON.parse(dataLine.slice('data:'.length).trim())

        if (event === 'delta' && typeof data.text === 'string') {
          appendToLastAssistantMessage(data.text)
          gotAssistantText = true
        } else if (event === 'error') {
          replaceLastAssistantMessage(`Fehler: ${data.message}`)
        } else if (event === 'confirmation_required') {
          setPendingConfirmation({ id: data.id, toolName: data.toolName, args: data.args })
        }
      }
    }

    if (mode === 'floating' && !isOpen && gotAssistantText) setHasUnseen(true)

    // JARVIS kann Tools ausführen, die Daten ändern (Todos, Kunden, Projekte, …) — die
    // gerade offene Admin-Seite bekommt das sonst nicht mit, da Server Components nur beim
    // Navigieren/Reload neu rendern. router.refresh() holt die aktuelle Route serverseitig
    // frisch, ohne den Chat-Zustand des Widgets zu verlieren (kein Reload, kein Remount).
    router.refresh()
  }

  async function sendMessage(text: string, opts?: { hidden?: boolean }) {
    const hidden = opts?.hidden ?? false
    const capped = [...messages, { role: 'user' as const, content: text }].slice(-HISTORY_SENT_TO_MODEL)
    const history = capped.map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [
      ...(hidden ? prev : [...prev, { role: 'user' as const, content: text, createdAt: new Date().toISOString() }]),
      { role: 'assistant', content: '' },
    ])
    setIsStreaming(true)

    try {
      const response = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          currentPath: pathname,
          pageHeading: typeof document !== 'undefined' ? document.querySelector('h1')?.textContent?.trim() || null : null,
          // Nur im schwebenden Widget sinnvoll — auf der Vollbild-Jarvis-Seite selbst
          // wäre "Seiteninhalt" nur der Chat-Verlauf, den das Modell schon kennt.
          pageText: mode === 'floating' ? extractPageText() : null,
          focusedField: mode === 'floating' ? getFocusedFieldContext() : null,
        }),
      })
      await consumeSSE(response)
    } catch (error) {
      replaceLastAssistantMessage(`Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleConfirmation(decision: 'approve' | 'reject') {
    if (!pendingConfirmation) return
    const { id } = pendingConfirmation
    setPendingConfirmation(null)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    try {
      const response = await fetch('/api/jarvis/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      await consumeSSE(response)
    } catch (error) {
      replaceLastAssistantMessage(`Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleNewChat() {
    if (isStreaming) return
    setMessages([])
    setPendingConfirmation(null)
    hasTriggeredColdStart.current = false
    try {
      await fetch('/api/jarvis/history', { method: 'DELETE' })
    } catch {
      // best effort — lokaler State ist bereits geleert
    }
    if (mode === 'full' || isOpen) maybeColdStart()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming || pendingConfirmation) return
    setInput('')
    void sendMessage(text)
  }

  const chatBody = (
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-violet-400/12 border border-violet-400/25 flex items-center justify-center text-violet-300 font-semibold text-sm shrink-0">
            J
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-playfair)' }}>
              JARVIS
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
                href="/admin/jarvis/cockpit"
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
                href="/admin/jarvis"
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

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} isStreaming={isStreaming && index === messages.length - 1} />
        ))}

        {pendingConfirmation && (
          <div className="self-start max-w-[calc(100%-2rem)] rounded-2xl px-4 py-3 border border-amber-400/25 bg-amber-400/10">
            <p className="text-amber-300 text-sm font-medium mb-2">
              Bestätigung erforderlich: {TOOL_LABELS[pendingConfirmation.toolName] ?? pendingConfirmation.toolName}
            </p>
            <pre className="text-xs text-white/60 whitespace-pre-wrap mb-3 overflow-x-auto">
              {JSON.stringify(pendingConfirmation.args, null, 2)}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleConfirmation('approve')}
                className="px-3 py-1.5 rounded-lg bg-emerald-400/90 hover:bg-emerald-400 text-[#0d0d0d] text-xs font-medium transition-colors"
              >
                Bestätigen
              </button>
              <button
                type="button"
                onClick={() => handleConfirmation('reject')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
              >
                Ablehnen
              </button>
            </div>
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
            disabled={isStreaming || !!pendingConfirmation}
            placeholder={pendingConfirmation ? 'Bitte zuerst bestätigen oder ablehnen…' : 'Frag JARVIS…'}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50 max-h-40 py-1.5"
          />
          <button
            type="submit"
            disabled={isStreaming || !!pendingConfirmation || !input.trim()}
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
    // Eigenständiger, fixed-positionierter Shell wie /admin/jarvis/cockpit (siehe dort) —
    // ignoriert das gepolsterte (admin)-Layout komplett statt sich mit Prozent-Höhen durch
    // mehrere verschachtelte Container zu kämpfen. top-14 gleicht auf Mobile die AdminNav-
    // Topbar aus, md:left-60 die Desktop-Sidebar. Die Nachrichtenliste in chatBody scrollt
    // selbst (eigenes overflow-y-auto) — der Rest der Seite bleibt fix, kein Page-Scroll.
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-hidden bg-[#0d0d0d] flex flex-col">
        {chatBody}
      </div>
    )
  }

  // Schwebender Modus: nicht auf der eigenen Vollbild-Seite anzeigen (dort ist die
  // "full"-Variante bereits die Chat-Oberfläche — ein zweiter Chat wäre redundant).
  if (pathname === '/admin/jarvis') return null

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
        aria-label={isOpen ? 'JARVIS schließen' : 'JARVIS öffnen'}
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
