# JARVIS Cockpit — Konzept (Observability + visuelles Cockpit)

*Baut auf JARVIS_ARCHITEKTUR_PRINZIPIEN.md Abschnitt 5+6. Vor Umsetzung zu bestätigen.*

---

## 0 · Was schon wiederverwendbar ist

Bevor irgendwas Neues entsteht: die Knowledge-Graph-Seite (`app/(admin)/admin/graph/`) liefert bereits fast das komplette Bau-Muster für ein Node-basiertes Cockpit — nur für Business-Entitäten statt Agenten:

- `GraphExplorer.tsx` (Client Component) rendert `react-force-graph-2d`/`3d` (`next/dynamic`, `ssr:false`), lädt einmalig über `fetch('/api/admin/graph')`, State lokal in React.
- `NodePanel.tsx` — Klick auf einen Knoten öffnet ein Detail-Panel mit Verbindungen.
- `FilterPanel.tsx` — Typ-Legende, Such-/Fokus-Funktionen, 2D/3D-Umschalter.
- API-Route liefert `{ nodes: {id,type,label,status?,details?}[], edges: {source,target,type,weight?}[] }`.

**Wichtig:** Es gibt aktuell **keine** Supabase-Realtime-Nutzung im ganzen Projekt (kein `postgres_changes`, kein `.channel()`). Alles läuft über einmaligen Fetch + `router.refresh()`. Für "wie ein Gehirn beim Arbeiten zuschauen" reicht das nicht — das ist der einzige wirklich neue technische Baustein, den das Cockpit braucht.

---

## 1 · Observability-Layer (Fundament, ohne UI)

Die Tabellen aus Migration `0017` existieren, werden aber nirgends beschrieben. Vorschlag, wie `lib/jarvis/agent.ts` sie befüllt:

- **Ein `agent_runs`-Eintrag pro Konversationsturn**, den Eric im Chat auslöst (`trigger='user'`), Agent = Orchestrator.
- **Jeder Sub-Agent-Aufruf** (`buildSubAgentTool` in `lib/jarvis/tools/subagents.ts`) erzeugt einen **eigenen `agent_runs`-Eintrag** mit `parent_run_id` = Orchestrator-Run, `agent_id` = der jeweilige Sub-Agent. Das bildet 1:1 ab, was im Code eh passiert (rekursiver `runJarvisAgent`-Aufruf), nur jetzt sichtbar in der DB statt nur im Speicher.
- **Jeder Tool-Call innerhalb eines Runs** wird als `agent_steps`-Zeile geloggt (`type:'tool_call'` + zugehöriges `type:'tool_result'`, mit `duration_ms`, `status`, `retry_count`).
- **Reflection-Fehlschläge** (aktuell nur als `tool_result`-Text an Claude zurückgegeben) zusätzlich als `agent_steps`-Zeile mit `type:'error'` — sonst ist im Cockpit später nicht sichtbar, warum ein Run 3 Anläufe brauchte.
- Status-Übergänge (`queued → running → succeeded/failed/waiting_human`) sauber pflegen, `waiting_human` beim `confirmation_required`-Pfad setzen.
- Neue Spalte `agent_runs.significance` (`trivial|normal|notable`, siehe Entscheidung 2 unten), beim Abschluss des Runs serverseitig berechnet aus: Tool-Nutzung ja/nein, Sub-Agent-Delegation ja/nein, `pending_action` ausgelöst ja/nein, fehlgeschlagen ja/nein.

Das ist reines Backend, ändert das Nutzererlebnis im Chat nicht — Voraussetzung für alles Weitere.

---

## 2 · Live-Mechanismus: Supabase Realtime statt SSE-Ausbau

Zwei Optionen, eine Empfehlung:

- **SSE ausbauen** (wie es JARVIS-Chat schon macht): einfach, aber nur für die Verbindung sichtbar, die den Run ausgelöst hat. Sobald Scheduling (Punkt 1 aus den Prinzipien) automatisierte Runs erzeugt, die niemand gerade im Chat-Fenster offen hat, sieht das Cockpit davon nichts.
- **Supabase Realtime (`postgres_changes`) auf `agent_runs`/`agent_steps`** — neues Pattern fürs Projekt, aber die Cockpit-Seite abonniert einfach die Tabellen und bekommt jeden Run live mit, egal ob User-Chat oder Cron-Trigger. Das ist auch der Weg, den das ursprüngliche Blueprint-Dokument fürs Freigabe-Popup vorgeschlagen hatte — dort so noch nicht gebaut, aber als Muster tragfähig.

**Empfehlung: Realtime**, weil es die einzige Variante ist, die auch mit dem geplanten Scheduler (Vercel Cron, Punkt 1 der offenen Bausteine) sauber zusammenspielt, ohne dass wir später nochmal umbauen müssen.

---

## 3 · Visualisierung

Neue Seite, z. B. `app/(admin)/admin/jarvis/cockpit/page.tsx` (der bestehende `/admin/jarvis` bleibt der Chat, das Cockpit daneben oder als Tab).

- **2D reicht und ist klarer** für einen Workflow-Graphen (n8n ist auch 2D) — kein Grund, die aufwendigere 3D-Variante der Knowledge-Graph-Seite zu kopieren.
- **Statische Grundstruktur:** Orchestrator in der Mitte → 6 Sub-Agenten als Satelliten → zugeordnete Tools als äußere Blätter. Kommt direkt aus `agents`/`agent_tools`, nicht aus `subagents.ts` (dazu mehr unter Entscheidung 1 unten).
- **Live-Aktivität:** ein Knoten bekommt einen "aktiv"-Zustand (pulsierender Rand/Farbe), solange ein `agent_runs`-Eintrag mit `status='running'` auf ihn zeigt — gespeist aus der Realtime-Subscription. Die Pulse-Intensität/Dauer richtet sich nach `significance`: ein `trivial`-Run pulsiert kurz und dezent, ein `notable`-Run deutlich sichtbarer.
- **Klick auf Knoten → Panel** (analog `NodePanel.tsx`): System-Prompt, Modell, zugeordnete Tools, letzte N Runs mit Status/Dauer/Relevanz, Klick auf einen Run → Step-für-Step-Ablauf (aus `agent_steps`).
- **Run-Historie** darunter/daneben als Tabelle (Agent, Task, Status, gestartet, gedauert, Relevanz-Badge) — im Prinzip die `RunHistoryList` aus dem ursprünglichen Blueprint-Dokument, nur mit echtem Realtime-Unterbau statt Polling. Nichts wird gefiltert; `trivial`-Zeilen sind kleiner/gedimmt dargestellt, `notable`-Zeilen farblich hervorgehoben — die ganze Historie bleibt durchsuchbar.

---

## 4 · Bearbeitbarkeit

- **System-Prompt editieren** (`agents.system_prompt`) und **Modell wechseln** (`agents.model`) über ein einfaches Formular im Node-Panel → `PATCH /api/admin/jarvis/agents/[id]`.
- **Agent aktiv/inaktiv schalten** — genau die Aktion aus Prinzipien-Dokument Punkt 6 ("weitere Sub-Agenten scharfschalten"), jetzt als UI-Toggle statt SQL-Update.
- **Tool-Zuordnung bearbeiten** (`agent_tools`) — hier gibt es eine Weiche, siehe offene Entscheidung 1 unten: nur Anzeige, oder echte Wirkung auf den Agenten-Lauf?

---

## Entscheidungen (Stand nach Rücksprache mit Eric)

1. **DB wird echte Laufzeit-Quelle für Tool-Zuordnung — entschieden.** `agent_tools` darf nicht nur zur Anzeige da sein. Konsequenz für die Umsetzung: `lib/jarvis/subagents.ts` (aktuell feste `toolNames`-Arrays im Code) und `buildScopedRegistry`/`buildSubAgentTool` in `lib/jarvis/tools/subagents.ts` müssen umgebaut werden, sodass die Tool-Liste eines Sub-Agenten zur Laufzeit aus `agent_tools` (gejoint mit `tools.slug`) gelesen wird statt aus der Konstante. Die Konstante entfällt dann als Quelle der Wahrheit — bleibt höchstens als Seed-Daten für die Migration. Das ist der aufwendigere, aber ehrliche Weg: was man im Cockpit einstellt, wirkt auch wirklich.

2. **Granularität der Runs — entschieden: Variante A, verfeinert.** Jeder Chat-Turn erzeugt einen `agent_runs`-Eintrag, auch ohne Tool-Nutzung. Statt trivialer Einträge einfach nur wegzufiltern: jeder Run bekommt eine **Relevanz-Markierung**, die im Cockpit visuell unterscheidet statt zu verstecken.
   - Neue Spalte `agent_runs.significance` (z. B. `trivial | normal | notable`), serverseitig beim Abschluss eines Runs gesetzt: `trivial` = keine Tool-Calls, reine Konversation; `normal` = mind. ein Tool-Call ohne Sub-Agent-Delegation; `notable` = mind. ein Sub-Agent wurde delegiert, oder eine `pending_action` wurde ausgelöst, oder der Run ist fehlgeschlagen.
   - In der Run-Historie und im Node-Graph wirkt sich das nur auf **Darstellung** aus, nicht auf Sichtbarkeit: `trivial` klein/gedimmt in der Liste, `normal` normal, `notable` mit Badge/Farbe hervorgehoben (auch der auslösende Agent-Knoten pulsiert bei `notable` stärker/länger als bei `trivial`). Nichts wird aus der Historie entfernt oder gefiltert — alles bleibt einsehbar, nur die Aufmerksamkeitslenkung ist automatisch.
   - Grund für diesen Ansatz statt reinem UI-Filter: eine feste Filter-Voreinstellung würde bei Bedarf ("was hat JARVIS eigentlich die ganze Zeit gemacht") aktiv umgeschaltet werden müssen — die Relevanz-Markierung zeigt stattdessen von selbst, wo hinzuschauen sich lohnt, ohne etwas zu verbergen.

3. **Keine Agenten-Neuanlage im Cockpit — entschieden, vertagt.** Phase 1 beschränkt sich auf Bearbeiten bestehender Agenten (System-Prompt, Modell, Status, Tool-Zuordnung). Neue Agenten anlegen bleibt Zukunftsmusik.

---

## Vorschlag Reihenfolge (bei Bestätigung)

1. Observability-Wiring (Abschnitt 1) — unsichtbar, aber Grundlage für alles.
2. Realtime-Grundgerüst + einfache Cockpit-Seite: statischer Node-Graph (aus `agents`/`agent_tools`), Klick → Read-only-Panel, Run-Historie-Tabelle. Noch keine Bearbeitung.
3. Live-Aktivitätsanzeige (Realtime-getriebene Pulse/Status auf den Knoten).
4. Bearbeitbarkeit (System-Prompt/Modell/Status editieren) — inklusive der Entscheidung aus Punkt 1 oben.
