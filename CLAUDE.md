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
- Migrationen: `supabase/migrations/NNNN_beschreibung.sql`, fortlaufend nummeriert (aktuell bis `0025`); Buchstaben-Suffixe (`0008b`, `0008c`) markieren Nachträge zu einer bestehenden Migration

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

## JARVIS – Admin-Agenten-System

Internes, admin-only KI-Cockpit (Anthropic Messages API direkt, kein Agent-Framework). Eingebettet als Widget (`components/admin/JarvisWidget.tsx`, floating oder full-page unter `/admin/jarvis`) und als Cockpit-Ansicht (`/admin/jarvis/cockpit`).

**Agent-Loop (`lib/jarvis/agent.ts`)**
- Eine gemeinsame Loop (`runJarvisAgent`) für Orchestrator und alle Sub-Agenten; max. 10 Iterationen, streamt über `client.messages.stream()`.
- Tools mit `requiresConfirmation: true` pausieren die Loop → Human-in-the-loop; Zustand wird in `pending_actions` persistiert und über `/api/jarvis/confirm` fortgesetzt.
- Jeder Run/Tool-Call wird in `agent_runs` / `agent_steps` protokolliert (Observability, keine Business-Daten).

**Sub-Agenten**
- 6 Stück (`design_agent`, `code_agent`, `seo_agent`, `care_agent`, `akquise_agent`, `finance_agent`), Code-Konstanten in `lib/jarvis/subagents.ts` sind nur Fallback/Seed.
- **Laufzeit-Quelle ist die DB**: `public.agents` (system_prompt, model, status) + `public.agent_tools`/`public.tools` — live editierbar über `PATCH /api/admin/jarvis/agents/[id]`. `buildScopedRegistry()` liest das bei jedem Sub-Agent-Call frisch (kein Caching).
- Sub-Agenten dürfen nur read-only Tools halten; ein zugewiesenes `requiresConfirmation`-Tool wirft einen Fehler.

**System-Prompt (`lib/jarvis/system-prompt.ts`)**
- Orchestrator-Prompt ist **hardcoded** (großer deutscher `BASE_PROMPT`), nicht DB-gesteuert — im Gegensatz zu den Sub-Agenten-Prompts.
- `buildJarvisSystemPrompt()` hängt dynamisch an: Cold-Start-Kontext (offene Todos, ungelesene Kontaktanfragen), Wissensgraph-Suchtreffer zur letzten Nachricht, und `PageContext` (aktuelle Route, sichtbarer Seitentext, fokussiertes Formularfeld) vom Widget.

**API-Einstiegspunkte**
- `POST /api/jarvis/chat` (`app/api/jarvis/chat/route.ts`) — admin-only, gibt SSE-Stream zurück (`delta`/`confirmation_required`/`done`/`error`), persistiert sichtbare Turns in `jarvis_messages`.
- `/api/jarvis/confirm` — setzt einen pausierten Run nach Bestätigung/Ablehnung fort.
- `/api/admin/jarvis/cockpit`, `/api/admin/jarvis/agent-runs/[id]`, `/api/admin/jarvis/agents/[id]` — Observability + Live-Konfiguration der Agenten (alle admin-only).

**Relevante Tabellen** (siehe `supabase/migrations/0017_jarvis_phase1_agents.sql` ff.): `agents`, `tools`, `agent_tools`, `agent_runs`, `agent_steps`, `pending_actions`, `jarvis_messages`. Migrationen `0021`/`0022` sind reine Daten-Migrationen (echte System-Prompts bzw. Modell-Rightsizing pro Sub-Agent), keine Schema-Änderungen.

**Wissensgraph (`/admin/wissen`, `/admin/wissen/sessions`)** — verwandt, aber nicht JARVIS-exklusiv: `public.nodes`/`public.edges`/`public.conversation_logs` (Migration `0009`), Domain-Layer in `lib/domain/knowledge.ts`. JARVIS liest/schreibt hier über eigene Tools (`add_knowledge_node`, `semantic_search`, `write_session_log`, …); die Sessions-Ansicht zeigt `write_session_log`-Einträge und ist getrennt von der `agent_runs`-Observability (Wissen vs. Ausführung).

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
