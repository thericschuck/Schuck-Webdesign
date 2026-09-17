'use client'

import { useState } from 'react'
import {
  ALLOWED_AGENT_MODELS,
  colorForNode,
  formatDateTime,
  formatDuration,
  formatStepDuration,
  KIND_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  type AgentDetailResponse,
  type AgentRunDetail,
  type AgentStatus,
  type CockpitNode,
} from './types'
import { SignificanceBadge } from './SignificanceBadge'

const rawId = (nodeId: string) => nodeId.replace(/^(agent|tool):/, '')

/** Merged eine AgentDetailResponse (Antwort von PATCH/PUT) in den bestehenden Node — die
 * API kennt kein `label`/`kind`, deshalb kein direktes Ersetzen, nur ein gezieltes Merge
 * genau der bearbeitbaren Felder. */
function mergeAgentDetail(node: CockpitNode, detail: AgentDetailResponse): CockpitNode {
  return {
    ...node,
    role: detail.role,
    model: detail.model,
    agentStatus: detail.agentStatus,
    systemPrompt: detail.systemPrompt,
    assignedTools: detail.assignedTools,
  }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return typeof body?.error === 'string' ? body.error : fallback
}

const STEP_TYPE_LABEL: Record<string, string> = {
  reasoning: 'Reasoning',
  llm: 'LLM-Aufruf',
  tool_call: 'Tool-Call',
  tool_result: 'Tool-Ergebnis',
  handoff: 'Übergabe',
  error: 'Fehler',
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      aria-label="Schließen"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function RunStepsList({ steps }: { steps: AgentRunDetail['steps'] }) {
  if (steps.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Keine Tool-Aufrufe in diesem Run.
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-2 py-2">
      {steps.map((step) => (
        <li key={step.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              #{step.seq} {STEP_TYPE_LABEL[step.type] ?? step.type}
              {step.toolSlug ? ` — ${step.toolSlug}` : ''}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                step.status === 'error'
                  ? 'bg-red-50 text-red-700'
                  : step.status === 'done'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {step.status ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            <span>{formatStepDuration(step.durationMs)}</span>
            {!!step.retryCount && <span>{step.retryCount}× wiederholt</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function AgentEditForm({
  node,
  allTools,
  onSaved,
  onCancel,
}: {
  node: CockpitNode
  allTools: CockpitNode[]
  onSaved: (updated: CockpitNode) => void
  onCancel: () => void
}) {
  const [systemPromptDraft, setSystemPromptDraft] = useState(node.systemPrompt ?? '')
  const [modelDraft, setModelDraft] = useState(node.model ?? ALLOWED_AGENT_MODELS[0])
  const [statusDraft, setStatusDraft] = useState<AgentStatus>(node.agentStatus ?? 'active')
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(
    new Set((node.assignedTools ?? []).map((t) => t.id))
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Der Orchestrator liest seine Tools aus dem vollen Code-Katalog (lib/helm/catalog/
  // registry.ts#toAiSdkTools), nicht aus agent_tools — anders als bei Sub-Agenten
  // (buildScopedRegistry, lib/helm/delegate.ts). Eine Zuordnungs-Checkliste hier würde also
  // Zeilen anlegen, die nie gelesen werden — deshalb nur für kind='agent' gezeigt.
  const showToolAssignment = node.kind === 'agent'

  function toggleTool(toolId: string) {
    setSelectedToolIds((prev) => {
      const next = new Set(prev)
      if (next.has(toolId)) next.delete(toolId)
      else next.add(toolId)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const agentId = rawId(node.id)

    try {
      const patchRes = await fetch(`/api/admin/helm/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: systemPromptDraft, model: modelDraft, status: statusDraft }),
      })
      if (!patchRes.ok) throw new Error(await readErrorMessage(patchRes, 'Speichern fehlgeschlagen.'))
      let detail: AgentDetailResponse = await patchRes.json()

      if (showToolAssignment) {
        const toolsRes = await fetch(`/api/admin/helm/agents/${agentId}/tools`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolIds: [...selectedToolIds] }),
        })
        if (!toolsRes.ok) throw new Error(await readErrorMessage(toolsRes, 'Tool-Zuordnung konnte nicht gespeichert werden.'))
        detail = await toolsRes.json()
      }

      const updatedNode = mergeAgentDetail(node, detail)
      onSaved(updatedNode)

      // Re-Fetch zur Absicherung nach dem optimistischen Update oben — rein defensiv, für
      // den Fall, dass parallel (z.B. ein zweiter Admin-Tab) denselben Agenten verändert hat.
      fetch(`/api/admin/helm/agents/${agentId}`)
        .then((res) => (res.ok ? (res.json() as Promise<AgentDetailResponse>) : null))
        .then((fresh) => {
          if (fresh) onSaved(mergeAgentDetail(updatedNode, fresh))
        })
        .catch(() => {})
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unbekannter Fehler.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Modell
        </h2>
        <select
          value={modelDraft}
          onChange={(e) => setModelDraft(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 font-mono outline-none focus:border-gray-400"
        >
          {ALLOWED_AGENT_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Status
        </h2>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusDraft(s)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusDraft === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {s === 'active' ? 'Aktiv' : 'Inaktiv'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          System-Prompt
        </h2>
        <textarea
          value={systemPromptDraft}
          onChange={(e) => setSystemPromptDraft(e.target.value)}
          rows={8}
          className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-gray-400 resize-none"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
      </div>

      {showToolAssignment && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Zugeordnete Tools ({selectedToolIds.size})
          </h2>
          <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto border border-gray-100 rounded-xl p-1">
            {allTools.map((tool) => {
              const toolId = rawId(tool.id)
              const disabled = !!tool.isIrreversible
              return (
                <label
                  key={tool.id}
                  title={disabled ? 'Bestätigungspflichtige Tools können keinem Sub-Agenten zugeordnet werden.' : undefined}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                    disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }`}
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedToolIds.has(toolId)}
                    disabled={disabled}
                    onChange={() => toggleTool(toolId)}
                    className="rounded accent-gray-900"
                  />
                  <span className="flex-1 min-w-0 truncate">{tool.label}</span>
                  {disabled && <span className="text-[10px] text-amber-500 shrink-0">bestätigungspflichtig</span>}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {saveError && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {saveError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

function AgentPanelBody({
  node,
  onSelectNode,
  allTools,
  onNodeUpdate,
}: {
  node: CockpitNode
  onSelectNode: (id: string) => void
  allTools: CockpitNode[]
  onNodeUpdate: (updated: CockpitNode) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [runDetails, setRunDetails] = useState<Map<string, AgentRunDetail>>(new Map())
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null)

  async function toggleRun(runId: string) {
    if (expandedRunId === runId) {
      setExpandedRunId(null)
      return
    }
    setExpandedRunId(runId)
    if (runDetails.has(runId)) return

    setLoadingRunId(runId)
    try {
      const res = await fetch(`/api/admin/helm/agent-runs/${runId}`)
      if (!res.ok) throw new Error('Run-Details konnten nicht geladen werden.')
      const detail: AgentRunDetail = await res.json()
      setRunDetails((prev) => new Map(prev).set(runId, detail))
    } catch (err) {
      console.error('[cockpit] Run-Details konnten nicht geladen werden:', err)
    } finally {
      setLoadingRunId(null)
    }
  }

  if (isEditing) {
    return (
      <AgentEditForm
        node={node}
        allTools={allTools}
        onSaved={(updated) => {
          onNodeUpdate(updated)
          setIsEditing(false)
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <>
      <button
        onClick={() => setIsEditing(true)}
        className="self-start px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        Bearbeiten
      </button>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Rolle
          </dt>
          <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {node.role ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Modell
          </dt>
          <dd className="text-sm text-gray-800 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {node.model ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Status
          </dt>
          <dd>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                node.agentStatus === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {node.agentStatus === 'active' ? 'Aktiv' : 'Inaktiv'}
            </span>
          </dd>
        </div>
      </dl>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          System-Prompt
        </h2>
        <pre
          className="text-xs text-gray-700 whitespace-pre-wrap wrap-break-word bg-gray-50 border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {node.systemPrompt || '—'}
        </pre>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Zugeordnete Tools ({node.assignedTools?.length ?? 0})
        </h2>
        {node.assignedTools && node.assignedTools.length > 0 ? (
          <div className="flex flex-col gap-1">
            {node.assignedTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelectNode(`tool:${tool.id}`)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorForNode({ kind: 'tool' }) }} />
                <span className="flex-1 min-w-0 text-sm text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {tool.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Keine Tools zugeordnet.
          </p>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Letzte Runs ({node.recentRuns?.length ?? 0})
        </h2>
        {node.recentRuns && node.recentRuns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {node.recentRuns.map((run) => (
              <div key={run.id} className="rounded-lg border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleRun(run.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[run.status]}`}>
                    {STATUS_LABEL[run.status]}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {run.task ?? 'Ohne Aufgabentext'}
                  </span>
                  <SignificanceBadge significance={run.significance} />
                </button>
                <div className="px-2.5 pb-2 flex items-center gap-3 text-[11px] text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  <span>{formatDateTime(run.startedAt)}</span>
                  <span>{formatDuration(run.startedAt, run.endedAt, run.status)}</span>
                </div>
                {expandedRunId === run.id && (
                  <div className="px-2.5 pb-2 border-t border-gray-100">
                    {loadingRunId === run.id ? (
                      <p className="text-xs text-gray-400 py-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        Lädt…
                      </p>
                    ) : (
                      <RunStepsList steps={runDetails.get(run.id)?.steps ?? []} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Runs.
          </p>
        )}
      </div>
    </>
  )
}

function ToolPanelBody({ node, onSelectNode }: { node: CockpitNode; onSelectNode: (id: string) => void }) {
  return (
    <>
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Beschreibung
        </h2>
        <p className="text-sm text-gray-700 wrap-break-word" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {node.description || '—'}
        </p>
      </div>

      {node.isIrreversible && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Bestätigungspflichtig — dieses Tool kann keinem Sub-Agenten zugeordnet werden und läuft nur über den
            Haupt-Orchestrator mit Erics Bestätigung.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Genutzt von ({node.usedByAgents?.length ?? 0})
        </h2>
        {node.usedByAgents && node.usedByAgents.length > 0 ? (
          <div className="flex flex-col gap-1">
            {node.usedByAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectNode(`agent:${agent.id}`)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorForNode({ kind: 'agent', agentStatus: 'active' }) }} />
                <span className="flex-1 min-w-0 text-sm text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {agent.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Von keinem Agenten genutzt.
          </p>
        )}
      </div>
    </>
  )
}

export function CockpitNodePanel({
  node,
  onClose,
  onSelectNode,
  allTools,
  onNodeUpdate,
}: {
  node: CockpitNode
  onClose: () => void
  onSelectNode: (id: string) => void
  /** Alle Tool-Knoten des Graphen — für die Zuordnungs-Checkliste im Bearbeiten-Formular. */
  allTools: CockpitNode[]
  onNodeUpdate: (updated: CockpitNode) => void
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-70 w-full sm:w-104 bg-white border-l border-gray-100 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForNode(node) }} />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {KIND_LABEL[node.kind]}
          </h2>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          {node.label}
        </h1>

        {node.kind === 'tool' ? (
          <ToolPanelBody node={node} onSelectNode={onSelectNode} />
        ) : (
          <AgentPanelBody node={node} onSelectNode={onSelectNode} allTools={allTools} onNodeUpdate={onNodeUpdate} />
        )}
      </div>
    </div>
  )
}
