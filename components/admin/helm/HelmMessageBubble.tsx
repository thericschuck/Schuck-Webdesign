'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isToolUIPart, isReasoningUIPart, getToolName, type UIMessage } from 'ai'
import { Brain, Wrench } from 'lucide-react'
import { personaFor } from '@/lib/helm/personas'
import { HelmPendingActionCard } from './HelmPendingActionCard'
import { PersonaAvatar } from './PersonaAvatar'

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/** Höhe des Denk-Fensters während des Streamens, in px — fest statt mitwachsend, damit der
 * Gedankengang nicht bei jedem Satz alles darunter nach unten schiebt (Athenas Pattern). */
const REASONING_VIEWPORT_PX = 96
const SCROLL_EDGE_PX = 8

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

/** Aufklappbare Werkzeug-Spur: was HELM in diesem Zug getan hat — Labels aus dem
 * Server-übergebenen toolLabels-Prop (Katalog-Import ist client-seitig nicht möglich, siehe
 * lib/helm/catalog/registry.ts#toolLabelMap). */
function ToolTrace({ parts, toolLabels }: { parts: UIMessage['parts']; toolLabels: Record<string, string> }) {
  const toolParts = parts.filter(isToolUIPart)
  if (toolParts.length === 0) return null

  return (
    <details className="mt-2 text-xs text-white/40">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 transition-colors hover:text-white/70">
        <Wrench className="size-3" />
        {toolParts.length} Schritt{toolParts.length === 1 ? '' : 'e'}
      </summary>
      <ol className="mt-1.5 space-y-1 border-l border-white/10 pl-3">
        {toolParts.map((part) => {
          const name = getToolName(part)
          return (
            <li key={part.toolCallId} className="flex items-center gap-1.5">
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  part.state === 'output-available'
                    ? 'bg-emerald-400'
                    : part.state === 'output-error'
                      ? 'bg-red-400'
                      : 'animate-pulse bg-amber-400'
                }`}
              />
              <span>{toolLabels[name] ?? name}</span>
              {part.state === 'output-error' && <span className="text-red-400">Fehler</span>}
            </li>
          )
        })}
      </ol>
    </details>
  )
}

function ReasoningTrace({ parts, streaming }: { parts: UIMessage['parts']; streaming: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)
  const [atTop, setAtTop] = useState(true)
  const text = parts
    .filter(isReasoningUIPart)
    .map((p) => p.text)
    .join('\n')
    .trim()

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !streaming || !pinned) return
    viewport.scrollTop = viewport.scrollHeight
  }, [text, streaming, pinned])

  function handleScroll() {
    const viewport = viewportRef.current
    if (!viewport) return
    const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    setPinned(distanceToBottom <= SCROLL_EDGE_PX)
    setAtTop(viewport.scrollTop <= SCROLL_EDGE_PX)
  }

  if (!text) return null

  if (streaming) {
    return (
      <div className="mb-2 text-xs text-white/40">
        <p className="flex items-center gap-1.5">
          <Brain className="size-3 animate-pulse" />
          Denkt nach…
        </p>
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          style={{ height: REASONING_VIEWPORT_PX }}
          className={`mt-1.5 overflow-y-auto overscroll-contain border-l border-white/10 pl-3 italic opacity-80 ${
            !atTop ? '[mask-image:linear-gradient(to_bottom,transparent,black_2rem)]' : ''
          }`}
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <details className="mb-2 text-xs text-white/40">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 transition-colors hover:text-white/70">
        <Brain className="size-3" />
        Gedankengang
      </summary>
      <div className="mt-1.5 max-h-64 overflow-y-auto overscroll-contain whitespace-pre-wrap border-l border-white/10 pl-3 italic opacity-80">
        {text}
      </div>
    </details>
  )
}

interface PendingConfirmation {
  toolCallId: string
  toolName: string
  actionId: string
  summary: string
  args: unknown
}

function extractPendingConfirmations(message: UIMessage): PendingConfirmation[] {
  const results: PendingConfirmation[] = []
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
      args: part.input,
    })
  }
  return results
}

export const HelmMessageBubble = memo(function HelmMessageBubble({
  message,
  isStreaming,
  toolLabels,
  resolvedActionIds,
  onDecide,
}: {
  message: UIMessage
  isStreaming: boolean
  toolLabels: Record<string, string>
  resolvedActionIds: Set<string>
  onDecide: (actionId: string, decision: 'approve' | 'reject') => void
}) {
  const isUser = message.role === 'user'
  const text = useMemo(() => messageText(message), [message])
  const pending = useMemo(
    () => (isUser ? [] : extractPendingConfirmations(message).filter((p) => !resolvedActionIds.has(p.actionId))),
    [isUser, message, resolvedActionIds]
  )
  const showTyping = !isUser && isStreaming && !text && pending.length === 0
  const agentSlug = (message.metadata as { agentSlug?: string } | undefined)?.agentSlug
  const persona = personaFor(agentSlug)

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      {isUser ? (
        <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-semibold bg-white/10 text-white/60">
          E
        </div>
      ) : (
        <PersonaAvatar persona={persona} size={24} />
      )}
      <div className="max-w-[calc(100%-2rem)] flex flex-col gap-2">
        {!isUser && agentSlug && agentSlug !== 'orchestrator' && (text || showTyping) && (
          <p className="text-[11px] font-medium text-white/40">{persona.label}</p>
        )}
        {(text || showTyping) && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-violet-400/15 text-white border border-violet-400/20 rounded-br-sm'
                : 'bg-white/5 text-white/85 border border-white/8 rounded-bl-sm'
            }`}
          >
            {showTyping ? (
              <TypingDots />
            ) : (
              <>
                {!isUser && <ReasoningTrace parts={message.parts} streaming={isStreaming} />}
                <MarkdownBubble text={text} />
                {!isUser && <ToolTrace parts={message.parts} toolLabels={toolLabels} />}
              </>
            )}
          </div>
        )}

        {pending.map((p) => (
          <HelmPendingActionCard
            key={p.actionId}
            toolLabel={toolLabels[p.toolName] ?? p.toolName}
            summary={p.summary}
            args={p.args}
            onDecide={(decision) => onDecide(p.actionId, decision)}
          />
        ))}
      </div>
    </div>
  )
})
