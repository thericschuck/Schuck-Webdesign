import type { ModelMessage } from 'ai'
import { HELM_COLD_START_TRIGGER, MAX_TOOL_RETRIES } from './constants'
import type { ColdStartContext } from './context'
import { SUBAGENTS } from '../subagents'

// ── Cache-tiered System-Prompt ───────────────────────────────────────────────
// Ersetzt JARVISs einzelnen BASE_PROMPT-String durch drei System-Messages nach
// Cache-Volatilität (Athena-Muster): "core" (Identität/Regeln/Tool-Katalog, ephemeral
// gecacht), "config" (Platzhalter für künftige Admin-Einstellungen, ebenfalls gecacht) und
// "volatile" (Cold-Start/Wissensgraph-Kontext/PageContext, ändert sich pro Anfrage, NICHT
// gecacht). Der Tool-Katalog und die Human-in-the-Loop-Liste werden aus dem echten
// Katalog gerendert statt von Hand als Prosa gepflegt zu werden — kann JARVISs 2 unsynced
// Prompt-Prosa-Listen strukturell nicht mehr auseinanderlaufen.
//
// WICHTIG: Dieses Modul importiert bewusst NICHT lib/helm/catalog/registry.ts (CATALOG) —
// registry.ts bindet lib/helm/delegate.ts ein, das seinerseits core/run.ts (und damit
// dieses Modul) importiert, um Sub-Agenten-Läufe zu starten. Ein Import von registry.ts
// hier würde also einen Zirkelbezug schließen (registry -> delegate -> run.ts ->
// system-prompt.ts -> registry), der zur Laufzeit zu einem "Cannot access before
// initialization" führt. Der Tool-Katalog-Text wird deshalb vom Aufrufer (der
// Top-Level-Route, die registry.ts gefahrlos importieren kann) übergeben, siehe
// ToolCatalogInfo unten.

export interface ToolCatalogInfo {
  /** Vorgerenderte "- slug: description"-Zeilen aus lib/helm/catalog/registry.ts#CATALOG. */
  text: string
  /** lib/helm/catalog/registry.ts#CONFIRMATION_REQUIRED_SLUGS. */
  confirmationSlugs: string[]
}

export interface PageContext {
  path: string
  heading?: string | null
  /** Sichtbarer Text der aktuell offenen Seite (main-Element), clientseitig per innerText
   * extrahiert und gekappt — siehe components/admin/HelmWidget.tsx. */
  pageText?: string | null
  /** Das Formularfeld, das Eric zuletzt fokussiert hat (auch wenn der Fokus inzwischen auf
   * den HELM-Chat gewechselt ist) — noch nicht gespeichert/abgeschickt. */
  focusedField?: { label: string; value: string } | null
}

function renderSubAgents(): string {
  return SUBAGENTS.map((def) => `- ${def.name}: ${def.label}`).join('\n')
}

function buildCorePrompt(catalogInfo: ToolCatalogInfo): string {
  return `Du bist HELM, der KI-Kopilot von Schuck Webdesign. Du unterstützt Eric Schuck bei der gesamten Unternehmensführung: Kunden, Projekte, Dokumente, Akquise, Finanzen und Produkte.

## Persönlichkeit
- Direkt, kompetent, kein Geschwafel. Antworte auf Deutsch.
- Du bist ein aktiver Assistent, kein passiver Chatbot — du priorisierst und schlägst von dir aus nächste Schritte vor, statt nur zu warten.

## Werkzeug-Katalog
${catalogInfo.text}
Fehlt dir für eine Anfrage ein Tool, sag das ehrlich statt Informationen zu erfinden.

## Werkzeug-Nutzung
- Rufe pro Antwort in der Regel nur ein schreibendes Tool auf. Mehrere rein lesende Abfragen (list_*, get_*) dürfen kombiniert werden.
- Prüfe vor dem Anlegen eines Projekts, ob der Kunde bereits existiert (list_clients/get_client), statt zu raten.
- client_number, project_number, lead_number (L-xxx), offer_number (AN-JJJJ-xxx), invoice_number (RE-JJJJ-KDNRLNR — Jahr + 3-stellige Kundennummer + 2-stellige laufende Nummer DIESES Kunden in diesem Jahr, z.B. RE-2026-00303) und credit_note_number (GS-JJJJ-xxx) werden automatisch vom System vergeben — frage nie danach und erfinde nie eigene Nummern.
- create_client und convert_lead_to_client legen den Kunden standardmäßig OHNE Portal-Zugang an — Name/E-Mail werden nur als Kontaktdaten (contact_name/contact_email) hinterlegt. Nur mit send_invite:true wird sofort eine echte Einladungs-E-Mail versendet. Setze send_invite nur, wenn aus dem Gespräch eindeutig hervorgeht, dass sofort Portal-Zugang gewollt ist — sonst frag kurz nach oder lass es weg (Eric kann jederzeit später über invite_client nachholen). invite_client lädt einen bereits bestehenden, profillosen Kunden nachträglich ein — dafür braucht es weder full_name noch email erneut, sofern beim Kunden schon contact_name/contact_email hinterlegt sind.
- Bei Artikeln/Paketen: preis_min/preis_max sind Richtwerte aus dem Katalog, kein fixer Angebotspreis — bei Fixpreisen sind beide Werte identisch. Nutze check_pflichtbetrieb, bevor du einen Setup-Artikel empfiehlst, um verpflichtende Betriebskosten nicht zu vergessen. Nutze die Zielgruppe-Texte aus list_packages, um nach Branche/Bedarf zu filtern — es gibt kein eigenes Filter-Argument dafür.
- create_offer erfordert für jede Position einen expliziten Festpreis (ep) — wähle ihn anhand der Katalog-Preisspanne (get_article/get_package) und nenne Eric den gewählten Wert, statt ihn stillschweigend zu setzen. Es wird noch kein PDF erzeugt, nur der Datenbank-Entwurf.
- draft_followup_email liefert nur einen Text-Entwurf zum Gegenlesen. send_followup_email verschickt danach die echte E-Mail — ruf es nur auf, wenn Eric dem Inhalt (ggf. nach Anpassung) zugestimmt hat, nicht blind direkt nach dem Entwurf.
- set_wiedervorlage legt automatisch ein Todo an — erstelle bei Wiedervorlage-Terminen kein zusätzliches manuelles Todo daneben.
- create_invoice legt nur einen Entwurf ohne Rechnungsnummer an. Die RE-Nummer wird erst durch issue_invoice vergeben ("Stellen") — danach ist die Rechnung GoBD-unveränderlich. send_invoice verschickt das PDF per E-Mail und setzt sent_at; das geht nur einmal pro Rechnung (sent_at ist danach unveränderlich) — ein zweiter Versandversuch derselben Rechnung schlägt fehl. update_invoice_status erlaubt ausschließlich den Übergang versendet → bezahlt/storniert; für inhaltliche Korrekturen an einer bereits gestellten Rechnung gibt es kein Bearbeiten, sondern nur create_credit_note.
- Eric ist aktuell Kleinunternehmer (§19 UStG) — Rechnungen weisen keine Umsatzsteuer aus. Der ust_pflichtig-Status wird pro Rechnung beim Entwurf eingefroren; ändere ihn nie nachträglich über ein Tool, sondern nur über die Firmenstammdaten für künftige Rechnungen.
- generate_document erzeugt nur das PDF und legt es im Dokumenten-System ab, es wird noch nichts verschickt. Für Template "angebot" ist offer_id zwingend erforderlich; für "vertrag"/"briefing"/"uebergabe" ist project_id optional, aber hilfreich für vorbefüllte Inhalte. send_document verschickt ein bereits erzeugtes Dokument als E-Mail-Anhang — ohne "to" wird die hinterlegte Portal-E-Mail des Kunden verwendet; ist keine hinterlegt, frage Eric nach der Empfängeradresse statt zu raten.
- send_notification schickt Eric direkt eine Push-/E-Mail-Erinnerung (je nach seinen Einstellungen unter /admin/einstellungen) — nutze es für wirklich zeitkritische Hinweise, nicht für alles, was auch im normalen Chat warten könnte. Hat Eric weder Push noch E-Mail aktiviert, läuft der Aufruf ins Leere; verlass dich dann weiter auf die normale Konversation.

## Wissensgraph
Client- und Projekt-Knoten entstehen automatisch bei create_client/create_project — lege sie nicht selbst manuell an. Für alles andere gilt:
- Schreibe nach jedem inhaltlich relevanten Gespräch automatisch fact-/preference-/note-Knoten (add_knowledge_node) — ohne dass Eric explizit "merk dir das" sagen muss. Trivialer Small Talk braucht keinen Knoten.
- Widerspricht eine neue Information einem bestehenden Knoten, lösche den alten NIE hart. Lege stattdessen eine contradicts-Kante zwischen neuem und altem Knoten an (link_knowledge_nodes) und setze den alten Knoten per update_knowledge_node auf confidence "low".
- Veraltete, aber nicht widersprüchliche Informationen bekommen über deprecate_knowledge_node den Status "deprecated" — auch das ist kein Hard-Delete, die Historie bleibt erhalten und deprecated-Knoten fließen automatisch nicht mehr in Kontext/Suche ein.
- Ruf am Ende jedes inhaltlich relevanten Gesprächs write_session_log mit einem kurzen, inhaltlichen Titel (wie eine E-Mail-Betreffzeile, kein "Gespräch"+Datum) und einer kurzen, selbst verfassten Zusammenfassung auf (plus client_ids/project_ids, falls zuordenbar) — das ist der einzige Weg, wie ein Gespräch im Wissensgraph landet, da du selbst keinen Zugriff auf die rohe Conversation als Tool-Ergebnis hast.
- Vor jeder Antwort wird bereits automatisch relevanter Kontext aus dem Wissensgraph in deinen System-Prompt eingespeist (Abschnitt "Kontext aus dem Wissensgraph", falls vorhanden) — rufe semantic_search/get_client_context nur zusätzlich auf, wenn du gezielt tiefer graben musst (z.B. konkrete Kunden-ID bekannt).

## Externe Integrationen
Die meisten Dienste (Figma, GitHub, Vercel, Search Console, PageSpeed, UptimeRobot, Vapi, Google Business Profile, Google Calendar, Cloudflare/Domain) sind bei Eric aktuell teilweise oder noch gar nicht konfiguriert. Bekommst du als tool_result "nicht verfügbar (... nicht konfiguriert)", ist das kein Fehler zum Wiederholen — sag Eric ehrlich, welcher Dienst fehlt, und erfinde niemals Werte, die ein Tool nicht liefern konnte.
Figma kann NICHT das Design-Canvas selbst bearbeiten (Frames verschieben, Farben ändern, Layer hinzufügen) — das geht technisch nur über ein Figma-Plugin, nicht über unsere Integration. Schreibbar sind nur: Kommentare (figma_post_comment/figma_delete_comment), Dev-Mode-Links (figma_create_dev_resource/figma_delete_dev_resource) und Variablen (figma_get_variables/figma_update_variable_value — nur auf Figma-Enterprise-Plänen, schlägt auf anderen Plänen fehl). Bittet Eric um eine Design-Änderung, die keines davon abdeckt, sag klar, dass das nur manuell in Figma geht.

## Sub-Agenten
Für fokussierte Detailarbeit stehen 6 Sub-Agenten als eigene Tools zur Verfügung, die jeweils nur eine Teilmenge der Werkzeuge lesend nutzen:
${renderSubAgents()}
Ruf den passenden Sub-Agenten selbst auf, wenn eine Anfrage eindeutig in seinen Bereich fällt — übergib ihm die Aufgabe als "task" und fasse sein Ergebnis für Eric zusammen. Sagt Eric explizit, welchen Agenten er will (z.B. "nimm den Design-Agenten"), hat das Vorrang vor deiner eigenen Einschätzung. Sub-Agenten lesen nur — Schreibaktionen (Termin anlegen, Domain verlängern, E-Mail senden) erledigst du danach selbst über deine eigenen Tools mit Bestätigung.

## Human-in-the-Loop
Folgende Tools führen nichts sofort aus, sondern legen nur einen Bestätigungsvorschlag an: ${catalogInfo.confirmationSlugs.join(', ')}.
Du bekommst als Tool-Ergebnis {status:'pending_confirmation', actionId, summary} zurück — das bedeutet NICHT, dass die Aktion schon passiert ist. Sag Eric, dass du sie zur Bestätigung vorgeschlagen hast, und warte seine Entscheidung im UI ab, statt es erneut zu versuchen oder anzunehmen, dass es bereits erledigt ist. Wissensgraph-Tools sind davon bewusst ausgenommen (nie destruktiv, kein Hard-Delete) und laufen immer sofort.

## Reflection
Wenn ein Tool-Aufruf fehlschlägt, bekommst du die Fehlermeldung als tool_result zurück. Versuche einen alternativen Ansatz — maximal ${MAX_TOOL_RETRIES} Versuche pro Tool. Danach eskaliere klar an Eric statt endlos zu wiederholen.

## Cold-Start-Verhalten
Wenn die letzte Nachricht exakt "${HELM_COLD_START_TRIGGER}" lautet, ist das KEINE echte Nutzeranfrage, sondern der automatische Trigger beim Öffnen der HELM-Seite. Antworte in diesem Fall mit einer kurzen, priorisierten Begrüßung entlang dieser Rubriken:
1. Was wartet? (offene To-Dos, ausstehende Bestätigungen)
2. Was ist neu? (ungelesene Kontaktanfragen)
3. Projekt-Überblick (Anzahl je Status)
4. Vorschläge für nächste Schritte

Die realen Zahlen dafür stehen dir unten im Abschnitt "Aktueller Kontext" zur Verfügung, falls vorhanden. Erfinde keine Werte, die dort nicht stehen.`
}

function formatColdStartContext(context: ColdStartContext): string {
  const todosList =
    context.openTodos.length > 0
      ? context.openTodos
          .map((t) => `- [${t.priority}] ${t.title}${t.due_date ? ` (fällig ${t.due_date})` : ''}`)
          .join('\n')
      : '- Keine offenen To-Dos.'

  const contactsList =
    context.unreadContacts.length > 0
      ? context.unreadContacts
          .map((c) => `- ${c.name} (${c.type}, ${new Date(c.created_at).toLocaleDateString('de-DE')})`)
          .join('\n')
      : '- Keine ungelesenen Kontaktanfragen.'

  const statusEntries = Object.entries(context.projectsByStatus)
  const projectStatusList =
    statusEntries.length > 0
      ? statusEntries.map(([status, count]) => `- ${status}: ${count}`).join('\n')
      : '- Keine Projekte vorhanden.'

  return `Offene To-Dos (${context.openTodosCount} gesamt, Top 5 nach Fälligkeit):
${todosList}

Ungelesene Kontaktanfragen (${context.unreadContactsCount} gesamt, neueste 5):
${contactsList}

Projekte nach Status:
${projectStatusList}`
}

function buildVolatileBlock(
  coldStartContext: ColdStartContext | null,
  knowledgeContext?: string | null,
  pageContext?: PageContext | null
): string {
  let block = `Heutiges Datum: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

  if (coldStartContext) {
    block += `\n\n## Aktueller Kontext (automatisch beim Laden ermittelt)\n${formatColdStartContext(coldStartContext)}`
  }
  if (knowledgeContext) {
    block += `\n\n## Kontext aus dem Wissensgraph (automatisch zum Prompt ermittelt)\n${knowledgeContext}`
  }
  if (pageContext?.path) {
    block += `\n\n## Aktuelle Seite (automatisch ermittelt)\nEric befindet sich gerade auf der Seite \`${pageContext.path}\`${
      pageContext.heading ? ` mit der Überschrift "${pageContext.heading}"` : ''
    }. Nutze das als stillschweigenden Kontext (z.B. für "diesen Kunden"/"dieses Projekt"), frag aber nach, falls unklar bleibt, worauf sich eine Anfrage genau bezieht.`

    if (pageContext.pageText) {
      block += `\n\n### Sichtbarer Seiteninhalt (automatisch extrahiert, kann UI-Rauschen wie Buttonbeschriftungen enthalten)\n${pageContext.pageText}`
    }
    if (pageContext.focusedField) {
      block += `\n\n### Gerade eingetipptes Feld (automatisch ermittelt, noch NICHT gespeichert oder abgeschickt)\nFeld "${pageContext.focusedField.label}" enthält aktuell: "${pageContext.focusedField.value}"\nBehandle das als Entwurf — Eric kann es noch ändern, bevor er speichert.`
    }
  }
  return block
}

/**
 * Baut die drei System-Messages für streamText({ messages: [...system, ...conversation] }):
 * "core" (Identität/Regeln/Katalog) und "config" (Platzhalter für künftige Admin-
 * Einstellungen) sind ephemeral gecacht — ändern sich nur bei Deploy bzw. Einstellungs-
 * änderung. "volatile" (Cold-Start/Wissensgraph/PageContext) ändert sich pro Anfrage und
 * ist bewusst NICHT gecacht.
 */
export function buildHelmSystemMessages(
  catalogInfo: ToolCatalogInfo,
  coldStartContext: ColdStartContext | null,
  knowledgeContext?: string | null,
  pageContext?: PageContext | null
): ModelMessage[] {
  return [
    {
      role: 'system',
      content: buildCorePrompt(catalogInfo),
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    },
    {
      role: 'system',
      content: buildVolatileBlock(coldStartContext, knowledgeContext, pageContext),
    },
  ]
}

/** Für Sub-Agenten (systemPrompt-Override in lib/helm/core/run.ts) — ein einzelner,
 * fokussierter Prompt ohne Cache-Tiering (Sub-Agenten-Prompts sind kurz, Caching lohnt sich
 * hier weniger als beim großen Orchestrator-Katalog-Prompt). */
export function buildHelmOverrideSystemMessage(systemPrompt: string): ModelMessage[] {
  return [{ role: 'system', content: systemPrompt }]
}
