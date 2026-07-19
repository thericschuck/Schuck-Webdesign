'use client'

import type { ReactNode } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Bot, Cpu, GitBranch, Hourglass, Wrench, Zap } from 'lucide-react'
import type { CockpitNode } from '../types'
import { StatusBadge, type RunVisualStatus } from './StatusBadge'

/** Node-Daten für alle Flow-Knotentypen. `cockpitNode` ist null für die drei
 * client-seitig synthetischen Branch-Knoten (condition/pending/direct) — die haben keine
 * Entsprechung in /api/admin/jarvis/cockpit, siehe flow/computeLayout.ts.
 *
 * `accent` wird zentral in flow/computeLayout.ts berechnet (eine Quelle statt jede
 * Node-Komponente ihre Farbe selbst herleiten zu lassen) — Tool-Knoten bekommen dort exakt
 * die Farbe ihres Eltern-Agenten mit, nicht nur ihren eigenen "kind". */
export type FlowNodeData = {
  cockpitNode: CockpitNode | null
  label: string
  runStatus: RunVisualStatus
  accent: string
} & Record<string, unknown>

type FlowNode = Node<FlowNodeData>

/**
 * Gemeinsame Karten-Hülle für alle 6 Knotentypen — Hover-Scale/Glow, eine dezente
 * durchgehende "Atem"-Animation im Ruhezustand (damit der Graph auch ganz ohne aktiven Run
 * nicht komplett statisch wirkt) und eine kurze Einblend-Animation beim ersten Mounten.
 * Die CSS-Keyframes dafür (`cockpit-node-in`/`cockpit-breathe`) stehen im <style>-Block in
 * CockpitExplorer.tsx.
 */
function NodeCard({
  accent,
  active,
  dashed,
  dimmed,
  minWidthClassName,
  children,
}: {
  accent: string
  active: boolean
  dashed?: boolean
  dimmed?: boolean
  minWidthClassName: string
  children: ReactNode
}) {
  return (
    <div
      className={`relative ${minWidthClassName} rounded-xl border ${dashed ? 'border-dashed' : ''} bg-[#111111] shadow-lg px-4.5 py-3.5 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 cockpit-node-in ${dimmed ? 'opacity-60' : ''}`}
      style={{ borderColor: active ? accent : `${accent}80`, boxShadow: active ? `0 0 22px ${accent}66` : undefined }}
    >
      <span
        aria-hidden
        className={`absolute -inset-1.5 rounded-2xl pointer-events-none ${active ? '' : 'cockpit-breathe'}`}
        style={{ boxShadow: `0 0 16px ${accent}` }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

function IconBadge({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${accent}22`, color: accent }}
    >
      {children}
    </div>
  )
}

export function OrchestratorNode({ data }: NodeProps<FlowNode>) {
  const accent = data.accent
  return (
    <NodeCard accent={accent} active={data.runStatus === 'running'} minWidthClassName="min-w-65">
      <Handle type="source" position={Position.Right} style={{ background: accent, width: 9, height: 9 }} />
      <div className="flex items-center gap-3">
        <IconBadge accent={accent}>
          <Bot className="w-5.5 h-5.5" />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-white truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {data.label}
          </p>
          <p className="text-xs text-white/40">Orchestrator</p>
        </div>
        <StatusBadge status={data.runStatus} />
      </div>
    </NodeCard>
  )
}

export function SubAgentNode({ data }: NodeProps<FlowNode>) {
  const node = data.cockpitNode
  const accent = data.accent
  const isInactive = node?.agentStatus === 'inactive'
  return (
    <NodeCard accent={accent} active={data.runStatus === 'running'} dimmed={isInactive} minWidthClassName="min-w-58">
      <Handle type="target" position={Position.Left} style={{ background: accent, width: 9, height: 9 }} />
      <Handle type="source" position={Position.Right} style={{ background: accent, width: 9, height: 9 }} />
      <div className="flex items-center gap-3">
        <IconBadge accent={accent}>
          <Cpu className="w-5 h-5" />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {data.label}
          </p>
          <p className="text-xs text-white/40">{isInactive ? 'inaktiv' : node?.role ?? 'Sub-Agent'}</p>
        </div>
        <StatusBadge status={data.runStatus} />
      </div>
    </NodeCard>
  )
}

export function ToolNode({ data }: NodeProps<FlowNode>) {
  const accent = data.accent
  return (
    <NodeCard accent={accent} active={false} minWidthClassName="min-w-48">
      <Handle type="target" position={Position.Left} style={{ background: accent, width: 8, height: 8 }} />
      <div className="flex items-center gap-2.5">
        <span className="shrink-0" style={{ color: accent }}>
          <Wrench className="w-4 h-4" />
        </span>
        <p className="text-sm text-white/80 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {data.label}
        </p>
      </div>
    </NodeCard>
  )
}

export function ConditionNode({ data }: NodeProps<FlowNode>) {
  const accent = data.accent
  return (
    <NodeCard accent={accent} active={data.runStatus !== 'idle'} dashed minWidthClassName="min-w-50">
      <Handle type="target" position={Position.Left} style={{ background: accent, width: 9, height: 9 }} />
      <Handle type="source" position={Position.Right} style={{ background: accent, width: 9, height: 9 }} />
      <div className="flex items-center gap-2.5">
        <span className="shrink-0" style={{ color: accent }}>
          <GitBranch className="w-5 h-5" />
        </span>
        <p className="text-sm font-medium text-white/85 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {data.label}
        </p>
      </div>
    </NodeCard>
  )
}

export function PendingNode({ data }: NodeProps<FlowNode>) {
  const accent = data.accent
  return (
    <NodeCard accent={accent} active={data.runStatus === 'running'} minWidthClassName="min-w-61">
      <Handle type="target" position={Position.Left} style={{ background: accent, width: 9, height: 9 }} />
      <div className="flex items-center gap-3">
        <IconBadge accent={accent}>
          <Hourglass className="w-5 h-5" />
        </IconBadge>
        <p className="text-sm font-medium text-white/85" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {data.label}
        </p>
      </div>
    </NodeCard>
  )
}

export function DirectNode({ data }: NodeProps<FlowNode>) {
  const accent = data.accent
  return (
    <NodeCard accent={accent} active={false} minWidthClassName="min-w-54">
      <Handle type="target" position={Position.Left} style={{ background: accent, width: 9, height: 9 }} />
      <div className="flex items-center gap-3">
        <IconBadge accent={accent}>
          <Zap className="w-5 h-5" />
        </IconBadge>
        <p className="text-sm font-medium text-white/70" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {data.label}
        </p>
      </div>
    </NodeCard>
  )
}

export const nodeTypes = {
  orchestrator: OrchestratorNode,
  agent: SubAgentNode,
  tool: ToolNode,
  condition: ConditionNode,
  pending: PendingNode,
  direct: DirectNode,
}
