# CLAUDE.md – Schuck-Redesign

> Lies zuerst: `C:\Users\eschu\Desktop\Unternehmensstruktur\CLAUDE.md` für globalen Kontext.

---

## Projekt-Überblick

**Schuck-Redesign** ist das interne Backoffice + Kundenportal von Schuck Webdesign.
Admin-Bereich für Eric (Projektverwaltung, Kundenverwaltung) + Portal für Kunden (Projektstatus, Dokumente, Upload).

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS 4
- **Datenbank/Auth:** Supabase (SSR: `@supabase/ssr`)
- **Animationen:** framer-motion (Hero-Section)
- **Fonts:** Playfair Display (`--font-playfair`), DM Sans (`--font-dm-sans`)
- **Deployment:** Vercel (geplant)
- **Package Manager:** npm

---

## Befehle

- `npm run dev` – Dev-Server (Next.js)
- `npm run build` – Production-Build
- `npm run start` – Production-Server
- `npm run lint` – ESLint (flat config `eslint.config.mjs`, basiert auf `eslint-config-next`)
- **Kein Test-Framework konfiguriert** (kein Jest/Vitest/Playwright, keine `__tests__`, kein `.github/workflows/`) — nicht nach Tests suchen oder `npm test` annehmen
- Import-/Batch-Skripte (via `tsx`): `npm run import:catalog[:dry]`, `npm run import:leads[:dry]`, `npm run import:backfill-graph[:dry]` (Dry-Run-Varianten zum Testen ohne DB-Writes)
- Kein `supabase/config.toml` → kein lokaler Supabase-Stack; Code verbindet direkt gegen das gehostete Supabase-Projekt über Env-Vars
- Migrationen: `supabase/migrations/NNNN_beschreibung.sql`, fortlaufend nummeriert (aktuell bis `0041`); Buchstaben-Suffixe (`0008b`, `0008c`) markieren Nachträge zu einer bestehenden Migration

---

## Projektstruktur

```
Schuck-Redesign/
├── app/
│   ├── (public)/          → Öffentliche Startseite (Hero etc.)
│   ├── (auth)/login/      → Login (E-Mail + Passwort)
│   ├── (admin)/admin/     → Admin-Backoffice (nur role=admin)
│   │   ├── dashboard/
│   │   ├── clients/       → Kundenverwaltung (CRUD + Invite)
│   │   └── projects/      → Projektverwaltung
│   ├── (portal)/portal/   → Kundenportal (role=client)
│   │   ├── project/       → Projektstatus + Updates
│   │   ├── documents/     → Dokumente pro Projekt + Ordner
│   │   ├── upload/        → Datei-Upload mit Projekt/Ordner-Wahl
│   │   └── settings/      → Konto + Passwort ändern
│   └── auth/
│       ├── callback/      → Supabase Auth Callback (PKCE + Implicit Flow)
│       ├── set-password/  → Invite-Flow: Passwort einrichten
│       └── logout/
├── components/
│   ├── admin/AdminNav.tsx
│   └── portal/PortalNav.tsx, StatusTimeline.tsx
├── lib/supabase/
│   ├── server.ts          → createClient (Server Components/Actions)
│   ├── admin.ts           → createAdminClient (Service Role, bypasses RLS)
│   └── middleware.ts      → Session-Refresh + Route Guards
├── types/database.ts      → Supabase DB-Typen (manuell gepflegt)
└── supabase/schema.sql    → Schema + Migrations
```

---

## Auth-Flow

| Szenario | Flow |
|----------|------|
| Admin-Login | `/login` → `signInWithPassword` → `/admin/dashboard` |
| Client-Login | `/login` → `signInWithPassword` → `/portal` |
| Client-Invite | Admin invited → E-Mail → Link → `/auth/callback` → `/auth/set-password` → `/portal` |
| Callback-Typen | PKCE (`?code=`) + Implicit (`#access_token=`) werden beide gehandelt |

---

## HELM – Admin-Agenten-System

Internes, admin-only KI-Cockpit auf dem Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) — Nachfolger von "JARVIS" (bis Sept. 2026, siehe git-Historie/`JARVIS_*.md` für die alte Architektur). Eingebettet als Widget (`components/admin/HelmWidget.tsx`, floating oder full-page unter `/admin/helm`) und als Cockpit-Ansicht (`/admin/helm/cockpit`).

**Agent-Loop (`lib/helm/core/run.ts`)**
- `runHelmAgent()` ist ein dünner `streamText()`-Wrapper (kein handgeschriebener Loop) für Orchestrator und alle Sub-Agenten-Läufe gleichermaßen; `stopWhen: stepCountIs(10)`.
- **Bestätigung ist entkoppelt vom Modell-Loop**: ein `requiresConfirmation:true`-Tool pausiert nichts — es legt sofort einen `pending_actions`-Eintrag (`status='pending'`) an und gibt `{status:'pending_confirmation', actionId, summary}` als normales Tool-Ergebnis zurück. Die eigentliche Ausführung passiert erst bei Bestätigung über die Server Actions `confirmPendingAction`/`rejectPendingAction` (`lib/helm/actions/confirm.ts`).
- Jeder Run/Tool-Call wird in `agent_runs`/`agent_steps` protokolliert (Observability, keine Business-Daten), inkl. Token-Verbrauch (`agent_steps.tokens_used`, aus `streamText`s `onStepFinish`).

**Tool-Katalog (`lib/helm/catalog/`)**
- Single Source of Truth: jedes Tool ist ein `HelmToolDef` (`slug`, `label`, `description`, zod-`schema`, `requiresConfirmation`, optional `summarize`, `execute`) in `lib/helm/catalog/domains/*.ts` — das zod-Schema validiert Argumente UND liefert die im System-Prompt gerenderte Beschreibung; keine separate DB-Kopie mehr (`public.tools` ist seit Migration `0041` nur noch `id`/`slug` als FK-Ziel für `agent_tools`).
- `lib/helm/catalog/registry.ts#CATALOG` = alle Domänen-Tools + die 6 Sub-Agenten-Delegations-Tools; `toAiSdkTools(context)` baut daraus die AI-SDK-Tool-Map für den Orchestrator (Bestätigungs-Tools automatisch als "Vorschlag"-Wrapper über `lib/helm/actions/pending-actions.ts`).

**Sub-Agenten (`lib/helm/delegate.ts`, `lib/helm/subagents.ts`)**
- 6 Stück (`design_agent`, `code_agent`, `seo_agent`, `care_agent`, `akquise_agent`, `finance_agent`), Code-Konstanten in `lib/helm/subagents.ts` sind nur Fallback/Seed.
- **Laufzeit-Quelle ist die DB**: `public.agents` (system_prompt, model, status) + `public.agent_tools`/`public.tools` — live editierbar über `PATCH /api/admin/helm/agents/[id]`. `buildScopedRegistry()` liest das bei jedem Sub-Agent-Call frisch (kein Caching).
- Sub-Agenten dürfen nur read-only Tools halten (Policy-Entscheidung, keine technische Notwendigkeit mehr unter dem entkoppelten Bestätigungsmodell); ein zugewiesenes `requiresConfirmation`-Tool wirft einen Fehler.

**System-Prompt (`lib/helm/core/system-prompt.ts`)**
- Cache-tiered: `core` (Identität/Regeln/Tool-Katalog, aus `CATALOG` gerendert) + `volatile` (Cold-Start-Kontext, Wissensgraph-Treffer, `PageContext`) als separate System-Messages, `core` mit Anthropic `cacheControl: {type:'ephemeral'}`.
- Der Tool-Katalog-Text wird vom Aufrufer (`app/api/helm/chat/route.ts`) übergeben, nicht von `system-prompt.ts` selbst aus `registry.ts` importiert — sonst entstünde ein Zirkelbezug (`registry.ts → delegate.ts → core/run.ts → system-prompt.ts → registry.ts`).
- Sub-Agenten bekommen einen eigenen, fokussierten Prompt-Override ohne Cache-Tiering (`buildHelmOverrideSystemMessage`).

**API-Einstiegspunkte**
- `POST /api/helm/chat` (`app/api/helm/chat/route.ts`) — admin-only, `runHelmAgent(...).toUIMessageStreamResponse(...)`; Client ist `@ai-sdk/react`s `useChat`, kein handgerolltes SSE-Parsing mehr.
- Bestätigen/Ablehnen läuft nicht mehr über einen Route/Stream, sondern über die Server Actions `confirmPendingAction`/`rejectPendingAction` (`lib/helm/actions/confirm.ts`) — der Modell-Turn, der den Vorschlag erzeugt hat, ist ja schon abgeschlossen.
- `/api/admin/helm/cockpit`, `/api/admin/helm/agent-runs/[id]`, `/api/admin/helm/agents/[id]` (+ `.../tools`), `/api/admin/helm/tools` (Katalog-Metadaten für die Cockpit-UI, da Client-Komponenten `lib/helm/catalog/registry.ts` nicht direkt importieren können) — Observability + Live-Konfiguration (alle admin-only).

**Relevante Tabellen** (siehe `supabase/migrations/0017_jarvis_phase1_agents.sql` ff., abgespeckt/umgebaut in `0039`–`0041`): `agents`, `tools` (nur noch `id`/`slug`), `agent_tools`, `agent_runs`, `agent_steps`, `pending_actions` (`status`/`summary`/`result`/`error`/`decided_by`/`decided_at` jetzt tragend, kein Delete-on-decide mehr), `helm_messages` (volle `UIMessage`-jsonb, ersetzt das textbasierte `jarvis_messages`). `agent_messages`/`deliverables`/`scheduled_tasks` sowie `agents.position`/`agents.config` wurden per Migration `0041` als nie verdrahtetes Scaffolding entfernt.

**Wissensgraph (`/admin/wissen`, `/admin/wissen/sessions`)** — verwandt, aber nicht HELM-exklusiv und **unverändert** durch den JARVIS→HELM-Umbau: `public.nodes`/`public.edges`/`public.conversation_logs` (Migration `0009`), Domain-Layer in `lib/domain/knowledge.ts` (inkl. `lib/embeddings.ts`, aus `lib/jarvis/embeddings.ts` hierher verschoben, da von `lib/domain/knowledge.ts` genutzt, nicht agent-spezifisch). HELM liest/schreibt hier über eigene Tools (`add_knowledge_node`, `semantic_search`, `write_session_log`, …); die Sessions-Ansicht zeigt `write_session_log`-Einträge und ist getrennt von der `agent_runs`-Observability (Wissen vs. Ausführung). Der DB-Enum-Wert `nodes.source = 'jarvis_auto'` bleibt bewusst unverändert (historischer Datenwert, keine Code-Referenz mehr).

---

## Supabase-Konfiguration

- **Site URL:** `http://localhost:3000/auth/callback` (muss so eingestellt sein!)
- **Redirect URLs:** `http://localhost:3000/auth/callback` in Allowlist
- **RLS:** Aktiv auf allen Tabellen — Admin-Actions nutzen `createAdminClient` (Service Role)

---

## Wichtige Konventionen

- `createClient()` (anon key + Session) für normale Queries
- `createAdminClient()` (service role) wenn RLS umgangen werden muss (Admin-Actions, Status-Updates nach Invite)
- Server Actions geben `{ status: 'error'; message: string } | null` zurück — kein `{ status: 'success' }` wenn `redirect()` verwendet wird
- `useActionState<State, FormData>` für alle Forms
- Tailwind canonical classes: `bg-white/3` statt `bg-white/[0.03]`, `max-w-35` statt `max-w-[140px]`

---

## graphify – Knowledge Graph (Token-Effizienz)

Dieses Projekt hat einen Graphify Knowledge Graph unter `graphify-out/`.

### PFLICHT: Zu Beginn jeder Konversation

**Lies immer zuerst `graphify-out/GRAPH_REPORT.md`** bevor du einzelne Dateien öffnest.
Der Graph gibt dir Architektur, God Nodes und Community-Struktur auf einen Blick — das spart 100–200x Tokens gegenüber blindem File-Lesen.

Workflow:
1. `graphify-out/GRAPH_REPORT.md` lesen → God Nodes und Communities verstehen
2. Erst dann gezielt einzelne Dateien öffnen, die für die Aufgabe relevant sind
3. Niemals das gesamte `app/` blind durchsuchen — Graph zuerst!

### Weitere Regeln
- Für gezielte Fragen: `python -m graphify query "deine Frage"` in `graphify-out/graph.json`
- Nach Code-Änderungen Graph aktualisieren: `python -m graphify . --update`
- Graph neu aufbauen bei großen Änderungen: `/graphify .`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
