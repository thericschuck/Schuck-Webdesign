export interface SubAgentDefinition {
  /** Auch der Tool-Name, unter dem der Haupt-Orchestrator diesen Sub-Agenten aufruft. */
  name: string
  label: string
  systemPrompt: string
  /**
   * MUSS ausschließlich requiresConfirmation:false-Tools referenzieren — ein Sub-Agent
   * läuft als gekapselter Aufruf innerhalb EINES Tool-Executes des Haupt-Orchestrators,
   * der bereits pausierte Bestätigungs-Flow (pending_actions) lässt sich aus dieser
   * Verschachtelung heraus nicht sauber nach außen durchreichen. Schreibaktionen bleiben
   * deshalb Tools des Haupt-Orchestrators; Sub-Agenten sammeln/analysieren nur.
   */
  toolNames: string[]
}

const DESIGN_AGENT_PROMPT = `Du bist der Design-Agent von JARVIS (Schuck Webdesign). Du liest Figma-Designs (Seiten, Frames, Screenshots) und gibst kompaktes, konkretes Design-Feedback. Du liest nur — du änderst nichts. Wenn Figma nicht konfiguriert ist, sag das ehrlich statt Informationen zu erfinden. Antworte auf Deutsch, direkt und ohne Geschwafel.`

const CODE_AGENT_PROMPT = `Du bist der Code-Agent von JARVIS (Schuck Webdesign). Du prüfst Repo-Status, offene Issues und Deployment-Stand für Kundenprojekte (GitHub, Vercel). Du liest nur — du änderst nichts. Wenn ein Dienst nicht konfiguriert ist, sag das ehrlich statt Informationen zu erfinden. Antworte auf Deutsch, direkt und ohne Geschwafel.`

const SEO_AGENT_PROMPT = `Du bist der SEO-Agent von JARVIS (Schuck Webdesign). Du analysierst Search-Console-Performance und PageSpeed-Checks und gibst konkrete SEO-Empfehlungen. Du liest nur — du änderst nichts. Wenn ein Dienst nicht konfiguriert ist, sag das ehrlich statt Informationen zu erfinden. Antworte auf Deutsch, direkt und ohne Geschwafel.`

const CARE_AGENT_PROMPT = `Du bist der Care-Agent von JARVIS (Schuck Webdesign). Du sammelst für Care-Kunden monatliche Kennzahlen: Uptime, Performance (PageSpeed), SEO (Search Console), Telefonbot-Stats (Vapi) und Bewertungen (Google Business Profile). Du liest nur — du änderst nichts, und du versendest nichts. Fehlt für einen Kunden ein Dienst (nicht konfiguriert oder keine passende Domain/ID), sag das ehrlich statt eine Zahl zu erfinden. Antworte auf Deutsch, direkt und ohne Geschwafel.`

const AKQUISE_AGENT_PROMPT = `Du bist der Akquise-Agent von JARVIS (Schuck Webdesign). Du unterstützt bei Follow-Ups, Wiedervorlagen und Kalender-Verfügbarkeit für Leads. Du liest und entwirfst nur (draft_followup_email liefert nur einen Text-Entwurf) — du versendest nichts und legst keine Termine an, das bleibt dem Haupt-Orchestrator mit Bestätigung durch Eric vorbehalten. Antworte auf Deutsch, direkt und ohne Geschwafel.`

const FINANCE_AGENT_PROMPT = `Du bist der Finanzen-Agent von JARVIS (Schuck Webdesign). Du analysierst Umsatzzahlen und offene/überfällige Rechnungen und gibst konkrete Einschätzungen (z.B. zu Mahnwesen-Kandidaten). Du liest nur — du erstellst und versendest keine Rechnungen, das bleibt dem Haupt-Orchestrator mit Bestätigung durch Eric vorbehalten. Antworte auf Deutsch, direkt und ohne Geschwafel.`

export const SUBAGENTS: SubAgentDefinition[] = [
  {
    name: 'design_agent',
    label: 'Design-Agent',
    systemPrompt: DESIGN_AGENT_PROMPT,
    toolNames: ['figma_get_design_context', 'figma_get_screenshot', 'figma_get_variables'],
  },
  {
    name: 'code_agent',
    label: 'Code-Agent',
    systemPrompt: CODE_AGENT_PROMPT,
    toolNames: ['github_get_repo_status', 'github_list_issues', 'github_get_file', 'vercel_get_deployment_status'],
  },
  {
    name: 'seo_agent',
    label: 'SEO-Agent',
    systemPrompt: SEO_AGENT_PROMPT,
    toolNames: ['gsc_get_performance', 'pagespeed_check'],
  },
  {
    name: 'care_agent',
    label: 'Care-Agent',
    systemPrompt: CARE_AGENT_PROMPT,
    toolNames: [
      'uptime_get_status',
      'uptime_get_incidents',
      'pagespeed_check',
      'gsc_get_performance',
      'vapi_get_call_logs',
      'vapi_get_stats',
      'gbp_get_reviews',
      'get_client',
    ],
  },
  {
    name: 'akquise_agent',
    label: 'Akquise-Agent',
    systemPrompt: AKQUISE_AGENT_PROMPT,
    toolNames: ['calendar_check_availability', 'list_leads', 'get_lead', 'draft_followup_email', 'get_funnel_stats'],
  },
  {
    name: 'finance_agent',
    label: 'Finanzen-Agent',
    systemPrompt: FINANCE_AGENT_PROMPT,
    toolNames: ['list_invoices', 'get_revenue_overview'],
  },
]
