// Persona-Identität für die Chat-Oberfläche (Avatar/Name/Farbe) — getrennt von SUBAGENTS
// (lib/helm/subagents.ts, die Backend-Definition: System-Prompt-Fallback/Tool-Zuordnung).
// Bewusst client-sicher (keine Server-only-Imports): direkt von components/admin/helm/*
// importierbar, ohne den Katalog/Supabase-Admin-Client in den Client-Bundle zu ziehen.

export interface HelmPersona {
  /** Tool-Slug bei Sub-Agenten, 'orchestrator' für Jarvis selbst. */
  slug: string
  label: string
  /** Kurzbeschreibung fürs @-Mention-Menü. */
  description: string
  /** agents.role-Wert — für colorForAgentRole() (app/(admin)/admin/helm/cockpit/types.ts),
   * damit Chat und Cockpit dieselbe Farbe je Agent zeigen statt einer zweiten, separat
   * gepflegten Farbtabelle. */
  colorRole: string
  /** Ein Buchstabe als Avatar-Fallback (kein Bildgenerierungs-Aufwand, siehe Nutzer-Entscheidung). */
  initial: string
}

export const JARVIS_PERSONA: HelmPersona = {
  slug: 'orchestrator',
  label: 'Jarvis',
  description: 'Kennt alle Bereiche, delegiert bei Bedarf an die Spezial-Agenten.',
  colorRole: 'orchestrator',
  initial: 'J',
}

export const HELM_PERSONAS: HelmPersona[] = [
  JARVIS_PERSONA,
  {
    slug: 'design_agent',
    label: 'Design-Agent',
    description: 'Figma-Design-Feedback — liest, ändert nichts.',
    colorRole: 'design',
    initial: 'D',
  },
  {
    slug: 'code_agent',
    label: 'Code-Agent',
    description: 'Repo-/Deploy-Status (GitHub, Vercel).',
    colorRole: 'code',
    initial: 'C',
  },
  {
    slug: 'seo_agent',
    label: 'SEO-Agent',
    description: 'Search-Console- & PageSpeed-Empfehlungen.',
    colorRole: 'seo',
    initial: 'S',
  },
  {
    slug: 'care_agent',
    label: 'Care-Agent',
    description: 'Monatsüberblick für Care-Kunden.',
    colorRole: 'care',
    initial: 'C',
  },
  {
    slug: 'akquise_agent',
    label: 'Akquise-Agent',
    description: 'Follow-Ups & Kalender-Vorbereitung für Leads.',
    colorRole: 'akquise',
    initial: 'A',
  },
  {
    slug: 'finance_agent',
    label: 'Finanzen-Agent',
    description: 'Umsatz & überfällige Rechnungen.',
    colorRole: 'finanzen',
    initial: 'F',
  },
]

export const HELM_PERSONAS_BY_SLUG = new Map(HELM_PERSONAS.map((p) => [p.slug, p]))

/** Sub-Agenten, die per @-Mention direkt ansprechbar sind (Jarvis selbst ist der Default,
 * kein Mention nötig). */
export const MENTIONABLE_PERSONAS = HELM_PERSONAS.filter((p) => p.slug !== 'orchestrator')

export function personaFor(slug: string | null | undefined): HelmPersona {
  return (slug && HELM_PERSONAS_BY_SLUG.get(slug)) || JARVIS_PERSONA
}
