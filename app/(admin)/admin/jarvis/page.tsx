'use client'

import { useEffect, useRef, useState } from 'react'
import { JARVIS_COLD_START_TRIGGER } from '@/lib/jarvis/constants'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface PendingConfirmation {
  id: string
  toolName: string
  args: Record<string, unknown>
}

const TOOL_LABELS: Record<string, string> = {
  delete_client: 'Kunde löschen',
  delete_project: 'Projekt löschen',
}

export default function JarvisPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const hasColdStarted = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasColdStarted.current) return
    hasColdStarted.current = true
    void sendMessage(JARVIS_COLD_START_TRIGGER, { hidden: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingConfirmation])

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
      next[next.length - 1] = { role: 'assistant', content }
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
        } else if (event === 'error') {
          replaceLastAssistantMessage(`Fehler: ${data.message}`)
        } else if (event === 'confirmation_required') {
          setPendingConfirmation({ id: data.id, toolName: data.toolName, args: data.args })
        }
      }
    }
  }

  async function sendMessage(text: string, opts?: { hidden?: boolean }) {
    const hidden = opts?.hidden ?? false
    const history: ChatMessage[] = [...messages, { role: 'user', content: text }]

    setMessages((prev) => [
      ...(hidden ? prev : [...prev, { role: 'user' as const, content: text }]),
      { role: 'assistant', content: '' },
    ])
    setIsStreaming(true)

    try {
      const response = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      await consumeSSE(response)
    } catch (error) {
      replaceLastAssistantMessage(
        `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannt'}`
      )
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
      replaceLastAssistantMessage(
        `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannt'}`
      )
    } finally {
      setIsStreaming(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming || pendingConfirmation) return
    setInput('')
    void sendMessage(text)
  }

  return (
    <div className="flex flex-col h-[75vh] rounded-2xl border border-white/8 bg-[#0d0d0d] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-violet-400/12 border border-violet-400/25 flex items-center justify-center text-violet-300 font-semibold text-sm">
          J
        </div>
        <div>
          <p className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-playfair)' }}>
            JARVIS
          </p>
          <p className="text-white/40 text-xs">Kommandozentrale · Schuck Webdesign</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              message.role === 'user'
                ? 'self-end bg-violet-400/15 text-white border border-violet-400/20'
                : 'self-start bg-white/5 text-white/85 border border-white/8'
            }`}
          >
            {message.content || (isStreaming && index === messages.length - 1 ? '…' : '')}
          </div>
        ))}

        {pendingConfirmation && (
          <div className="self-start max-w-2xl rounded-2xl px-4 py-3 border border-amber-400/25 bg-amber-400/10">
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

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-4 border-t border-white/8">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isStreaming || !!pendingConfirmation}
          placeholder={pendingConfirmation ? 'Bitte zuerst bestätigen oder ablehnen…' : 'Frag JARVIS…'}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !!pendingConfirmation || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-violet-400/90 hover:bg-violet-400 text-[#0d0d0d] text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Senden
        </button>
      </form>
    </div>
  )
}
