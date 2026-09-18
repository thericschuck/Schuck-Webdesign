import { colorForAgentRole } from '@/app/(admin)/admin/helm/cockpit/types'
import { type HelmPersona } from '@/lib/helm/personas'

const JARVIS_COLOR = '#7F77DD'

export function colorForPersona(persona: HelmPersona): string {
  return persona.slug === 'orchestrator' ? JARVIS_COLOR : colorForAgentRole(persona.colorRole)
}

/** Farbiger Avatar-Kreis je Agenten-Persona (Initiale statt generiertem Bild, siehe
 * Nutzer-Entscheidung) — dieselbe Farbe wie im Cockpit-Graph für denselben Agenten
 * (colorForAgentRole), damit Chat und Cockpit optisch zusammengehören. */
export function PersonaAvatar({ persona, size = 24 }: { persona: HelmPersona; size?: number }) {
  const color = colorForPersona(persona)
  return (
    <div
      className="shrink-0 rounded-lg flex items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        color,
        background: `${color}22`,
        border: `1px solid ${color}40`,
      }}
    >
      {persona.initial}
    </div>
  )
}
