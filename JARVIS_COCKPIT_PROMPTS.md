# JARVIS Cockpit — Claude Code Prompts

*Setzt JARVIS_COCKPIT_KONZEPT.md um. Jeden Prompt einzeln an Claude Code geben, Ergebnis prüfen (insbesondere: baut es? bestehender Chat-Flow noch intakt?), dann den nächsten. Reihenfolge ist bewusst so gewählt, dass jeder Prompt für sich testbar ist.*

---

### Prompt 1 — Migration: Significance + Realtime aktivieren

```
Lies CLAUDE.md für Konventionen. Erstelle eine neue Supabase-Migration unter
supabase/migrations/, die auf 0017_jarvis_phase1_agents.sql aufbaut:

1. Füge der Tabelle public.agent_runs eine Spalte significance hinzu:
   text not null default 'normal', check (significance in ('trivial','normal','notable')).
2. Aktiviere Supabase Realtime für die Tabellen public.agent_runs und
   public.agent_steps (alter publication supabase_realtime add table ...,
   defensiv mit Existenzprüfung, da diese Publication evtl. noch nicht
   alle Tabellen enthält).
3. Prüfe, ob RLS-Policies für Realtime-Subscriptions ausreichen (die
   bestehende "Admin verwaltet alle"-Policy aus 0017 sollte greifen,
   aber Realtime braucht zusätzlich, dass die Rolle des eingeloggten
   Admin-Users SELECT auf beide Tabellen darf — verifiziere das anhand
   von schema.sql/get_my_role()).

Keine Breaking Changes an bestehenden Spalten. Migration muss idempotent
ausführbar sein (IF NOT EXISTS / defensive Checks wie in 0017 üblich).
```

---

### Prompt 2 — `agent_tools` als Laufzeit-Quelle für Sub-Agenten-Tools

```
Lies CLAUDE.md und lib/jarvis/subagents.ts sowie lib/jarvis/tools/subagents.ts
für den aktuellen Stand.

Aktuell bestimmt die Konstante SUBAGENTS in lib/jarvis/subagents.ts
(toolNames-Array pro Sub-Agent) fest im Code, welche Tools ein Sub-Agent
bekommt. Das soll sich ändern: die Datenbank-Tabelle public.agent_tools
(verknüpft mit public.agents und public.tools aus Migration
0017_jarvis_phase1_agents.sql) wird die Laufzeit-Quelle der Wahrheit.

Baue das so um:
1. lib/jarvis/subagents.ts behält System-Prompt (systemPrompt) und Metadaten
   (name, label) der SUBAGENTS-Konstante bei — das toolNames-Array entfällt
   als Laufzeit-Quelle, dient höchstens noch als Kommentar/Referenz für die
   Seed-Migration.
2. In lib/jarvis/tools/subagents.ts: buildScopedRegistry(def) liest
   stattdessen zur Laufzeit aus der Datenbank (agent_tools + tools JOIN,
   gefiltert über agents.slug = def.name), welche Tool-Slugs diesem Agenten
   zugeordnet sind, und baut daraus die scoped Registry gegen ALL_TOOLS_BY_NAME.
   Nutze createAdminClient() (Service Role) für diesen Read, analog zu
   anderen lib/domain/*.ts-Modulen.
3. Behalte die bestehende Sicherheitsprüfung bei: ein Tool mit
   requiresConfirmation=true darf einem Sub-Agenten weiterhin nicht
   zugeordnet werden können — wirf beim Laden einen Fehler, wenn agent_tools
   so ein Tool referenziert (Datenintegritäts-Check, nicht nur zur Build-Zeit).
4. Sorge dafür, dass die tools-Tabelle aus 0017 (slug, name, description,
   input_schema, is_irreversible) mit den tatsächlich im Code registrierten
   Tools (ALL_TOOLS in lib/jarvis/tools/subagents.ts) synchron gehalten
   werden kann — schreibe dafür ein einfaches Seed/Sync-Script unter
   scripts/import/ (ähnlich import-catalog.ts), das bestehende Tool-Definitionen
   aus dem Code in die tools-Tabelle upserted (slug als Konflikt-Schlüssel),
   und lege für jeden der 6 aktiven/inaktiven Sub-Agenten in agent_tools
   die aktuellen Zuordnungen aus der bisherigen SUBAGENTS-Konstante als
   Startdaten an (einmalig auszuführen, nicht Teil der Migration).

Wichtig: Der Chat-Flow über /api/jarvis/chat darf durch diesen Umbau nicht
brechen — buildSubAgentTool() muss weiterhin dieselbe JarvisTool-Schnittstelle
zurückgeben wie vorher.
```

---

### Prompt 3 — Observability-Wiring in `lib/jarvis/agent.ts`

```
Lies CLAUDE.md und lib/jarvis/agent.ts, lib/jarvis/tools/subagents.ts,
lib/jarvis/persistence.ts für den aktuellen Stand.

runJarvisAgent() soll jetzt Runs und Steps in public.agent_runs und
public.agent_steps protokollieren (Migration 0017 + die significance-Spalte
aus Prompt 1). Baue das so:

1. Erweitere RunJarvisAgentOptions um optionale Felder parentRunId?: string
   und agentSlug?: string (Default 'orchestrator', wenn kein systemPrompt-
   Override gesetzt ist; bei Sub-Agenten-Aufrufen aus buildSubAgentTool()
   wird der jeweilige def.name übergeben).
2. Zu Beginn von runJarvisAgent(): lege einen agent_runs-Eintrag an
   (agent_id über agents.slug aufgelöst, parent_run_id falls übergeben,
   trigger='user' für den äußersten Aufruf, 'sub_agent' für delegierte,
   status='running', started_at=now()). Speichere die run_id für die
   Dauer des Loops.
3. Für jeden Tool-Call innerhalb der Iteration: schreibe einen
   agent_steps-Eintrag (type='tool_call', tool_slug=block.name, input=block.input,
   status='running'), und nach Abschluss einen Folge-Eintrag oder Update
   (type='tool_result', output/error, status='done'|'error', duration_ms,
   retry_count aus toolFailureCounts). Bei Retry (Reflection-Loop) den
   retry_count entsprechend hochzählen statt neue Steps anzuhäufen.
4. Bei confirmation_required: Run-Status auf 'waiting_human' setzen statt
   ihn abzuschließen (die Fortsetzung nach Confirm passiert im bestehenden
   /api/jarvis/confirm-Flow — dort ebenfalls den zugehörigen Run wieder auf
   'running' setzen und bei Abschluss finalisieren).
5. Am Ende (type:'final' oder MAX_ITERATIONS erreicht): Run-Status auf
   'succeeded' oder 'failed' setzen, ended_at=now(), und significance
   berechnen: 'notable' wenn mind. ein Sub-Agent-Tool aufgerufen wurde
   oder eine pending_action ausgelöst wurde oder der Run fehlgeschlagen ist;
   'normal' wenn mind. ein Tool aufgerufen wurde ohne Sub-Agent-Delegation;
   sonst 'trivial'.
6. Alle DB-Writes über createAdminClient() (Service Role), analog zu
   lib/jarvis/persistence.ts. Fehler beim Schreiben der Observability-Daten
   dürfen den eigentlichen Chat-Flow NICHT unterbrechen — fange sie ab und
   logge sie nur (console.error), der Nutzer darf davon nichts merken.

Verifiziere danach: ein normaler Chat ohne Tool-Nutzung, ein Chat mit
einem einfachen Tool-Call, und ein Chat mit Sub-Agent-Delegation erzeugen
jeweils plausible Zeilen in agent_runs/agent_steps mit korrekter significance.
```

---

### Prompt 4 — Cockpit-Grundgerüst (statischer Node-Graph + Run-Historie)

```
Lies CLAUDE.md sowie app/(admin)/admin/graph/GraphExplorer.tsx,
FilterPanel.tsx, NodePanel.tsx, types.ts und app/api/admin/graph/route.ts
als Vorlage — das Cockpit soll denselben Aufbau wiederverwenden
(react-force-graph-2d, next/dynamic mit ssr:false, Klick-Panel), nur für
Agenten/Tools statt Business-Entitäten.

Baue:

1. app/api/admin/jarvis/cockpit/route.ts (GET, admin-only via assertAdmin()):
   liefert { nodes, edges } im selben Format wie /api/admin/graph
   (GraphNode/GraphEdge-Shape aus app/(admin)/admin/graph/types.ts
   wiederverwenden oder als eigenen, kompatiblen Typ in einer neuen
   types.ts für den Cockpit-Bereich definieren). Knoten:
   - ein Knoten für den Orchestrator (agents.slug='orchestrator')
   - je ein Knoten pro Sub-Agent aus public.agents (auch inactive-Agenten,
     mit status als Detail-Feld)
   - je ein Knoten pro Tool aus public.tools, das über agent_tools
     mindestens einem Agenten zugeordnet ist
   Kanten: orchestrator -> jeder Sub-Agent (type 'delegates_to'),
   Sub-Agent -> Tool (type 'uses_tool') aus agent_tools.
2. app/(admin)/admin/jarvis/cockpit/page.tsx + CockpitExplorer.tsx
   (Client Component, 'use client'): rendert react-force-graph-2d
   (kein 3D nötig, siehe Konzept), lädt einmalig von
   /api/admin/jarvis/cockpit. Noch KEIN Realtime in diesem Prompt —
   das kommt in Prompt 5.
3. CockpitNodePanel.tsx (analog NodePanel.tsx, aber read-only in diesem
   Prompt): bei Klick auf einen Agenten-Knoten zeigt es Name, Rolle,
   Modell, Status, System-Prompt (read-only Textblock), zugeordnete Tools,
   und die letzten 10 agent_runs dieses Agenten (Status, Task, gestartet,
   Dauer, significance als farbiges Badge: notable=auffällig, normal=neutral,
   trivial=gedimmt/klein). Bei Klick auf einen Tool-Knoten: Name,
   Beschreibung, is_irreversible-Hinweis, welche Agenten es nutzen.
4. Unterhalb/neben dem Graph: RunHistoryTable.tsx — Liste der letzten 30
   agent_runs über alle Agenten (Agent, Task, Status, gestartet, Dauer,
   significance-Badge wie oben), neueste oben, per Server Component mit
   normalem fetch beim Seitenaufbau (kein Realtime in diesem Prompt).
5. Neuer API-Endpoint app/api/admin/jarvis/agent-runs/[id]/route.ts (GET):
   liefert einen einzelnen agent_runs-Eintrag inkl. aller zugehörigen
   agent_steps (sortiert nach seq) für die Step-für-Step-Detailansicht
   im Node-Panel.
6. Verlinke die neue Seite in components/admin/AdminNav.tsx neben dem
   bestehenden JARVIS-Chat-Link.

Nutze durchgängig die Design-Token-Konvention aus CLAUDE.md (--accent,
--surface2, --text3), keine Shadcn/Radix/Lucide, Icons Phosphor/Tabler.
```

---

### Prompt 5 — Live-Aktivitätsanzeige über Supabase Realtime

```
Lies CLAUDE.md und die in Prompt 4 gebauten Dateien
(app/(admin)/admin/jarvis/cockpit/CockpitExplorer.tsx, RunHistoryTable.tsx).
Dies ist die erste Stelle im Projekt, die Supabase Realtime
(postgres_changes) nutzt — es gibt noch kein Vorbild dafür im Code,
also baue es sauber und mit Kommentar, warum hier (im Gegensatz zum Rest
des Admin-Bereichs) eine Live-Subscription statt Fetch+router.refresh()
nötig ist: automatisierte/Cron-getriggerte Runs sollen sichtbar werden,
ohne dass jemand die Seite aktiv neu lädt.

1. In CockpitExplorer.tsx: abonniere via createClient() (Browser-Client,
   lib/supabase/client.ts) einen Realtime-Channel auf INSERT/UPDATE von
   public.agent_runs (gefiltert auf relevante Spalten: status, significance,
   agent_id, ended_at). Bei jedem Event:
   - Finde den zugehörigen Knoten (agent_id) im lokalen Graph-State.
   - Setze einen "aktiv"-Zustand für die Dauer, in der status='running' ist;
     entferne ihn bei Status-Wechsel zu succeeded/failed/waiting_human.
   - Visualisiere den aktiven Zustand als pulsierenden Rand/Farbe am Knoten
     (CSS-Animation oder force-graph nodeCanvasObject-Override, je nachdem
     was mit react-force-graph-2d sauberer geht). Pulse-Intensität/Dauer
     abhängig von significance: 'notable' deutlich auffälliger/länger als
     'trivial'.
   - Ziehe optional eine kurze "Partikel"-Animation entlang der Kante
     orchestrator->agent, wenn ein Sub-Agent gerade delegiert wurde
     (orientiere dich an der Partikel-Fluss-Logik der 3D-Knowledge-Graph-
     Seite, falls dort vorhanden, sonst reicht ein einfacherer Effekt).
2. In RunHistoryTable.tsx (als Client Component umbauen, falls nötig):
   dieselbe Realtime-Subscription sorgt dafür, dass neue Runs oben in der
   Liste erscheinen, ohne Seiten-Reload.
3. Fehlerfall: Subscription-Abbruch (z. B. Netzwerkwechsel) soll sich
   automatisch neu verbinden (Supabase-Client macht das i. d. R. selbst,
   aber baue einen sichtbaren, dezenten "Verbindung verloren"-Hinweis ein,
   falls der Channel-Status auf CHANNEL_ERROR/TIMED_OUT wechselt).
4. Cleanup: Channel bei Unmount der Komponente sauber unsubscriben.

Teste: einen Chat-Turn im bestehenden JARVIS-Widget auslösen, während die
Cockpit-Seite in einem zweiten Tab offen ist — der Orchestrator-Knoten
(und ggf. der delegierte Sub-Agent) muss dort live aufleuchten, ohne
Reload der Cockpit-Seite.
```

---

### Prompt 6 — Bearbeitbarkeit (System-Prompt, Modell, Status, Tool-Zuordnung)

```
Lies CLAUDE.md und die bisherigen Cockpit-Dateien aus Prompt 4/5.

Erweitere CockpitNodePanel.tsx von read-only zu bearbeitbar, ausschließlich
für Agenten-Knoten (keine Neuanlage von Agenten — bewusst außerhalb des
Umfangs, siehe JARVIS_COCKPIT_KONZEPT.md):

1. app/api/admin/jarvis/agents/[id]/route.ts:
   - PATCH: aktualisiert system_prompt, model und/oder status ('active'|
     'inactive') eines einzelnen agents-Eintrags. assertAdmin() prüfen,
     Input validieren (model gegen eine erlaubte Liste, status gegen den
     Check-Constraint aus 0017), updated_at setzen.
   - Optional GET für Einzelabruf, falls das Node-Panel nicht schon alle
     nötigen Daten aus der Cockpit-API (Prompt 4) hat.
2. app/api/admin/jarvis/agents/[id]/tools/route.ts:
   - PUT: ersetzt die agent_tools-Zuordnung eines Agenten durch eine im
     Body übergebene Liste von tool_ids (transaktional: erst bestehende
     Zeilen für diesen agent_id löschen, dann neue einfügen). Validiere,
     dass keines der zugeordneten Tools is_irreversible=true hat — bei
     Verstoß 400 mit klarer Fehlermeldung zurückgeben (dieselbe Regel,
     die schon in buildScopedRegistry aus Prompt 2 gilt, hier zusätzlich
     an der Eingabe-Kante durchsetzen, nicht erst beim nächsten Chat-Lauf
     merken).
3. Im CockpitNodePanel.tsx: Bearbeitungsformular mit
   - Textarea für system_prompt (mit Speichern/Abbrechen),
   - Dropdown für model,
   - Toggle für status (active/inactive),
   - Checkbox-Liste aller public.tools mit Vorauswahl der aktuell
     zugeordneten (aus agent_tools), bestätigungspflichtige Tools
     (is_irreversible=true) ausgegraut mit Tooltip-Hinweis, warum sie
     nicht zuordenbar sind.
   Nach dem Speichern: optimistisches UI-Update + Re-Fetch, kein
   vollständiger Seiten-Reload nötig.
4. Nach jeder Änderung an agent_tools muss der nächste Chat-Lauf sofort
   die neue Zuordnung verwenden (kommt automatisch, weil buildScopedRegistry
   aus Prompt 2 zur Laufzeit liest) — verifiziere das explizit: Tool von
   einem Sub-Agenten entfernen, direkt danach eine Aufgabe stellen, die
   dieses Tool bräuchte, und prüfen, dass der Agent es nicht mehr aufruft.

Halte dich an die bestehenden pending_actions-Regeln: diese Bearbeitungen
selbst sind keine irreversiblen Kundenaktionen und brauchen daher KEINE
Bestätigung über den JARVIS-Chat-Flow — es ist reine Admin-Konfiguration,
direkt durch Eric im Cockpit bedient.
```

---

## Hinweis zur Abarbeitung

Prompt 1 → prüfen (Migration angewendet, Realtime aktiv) → Prompt 2 → prüfen
(Chat funktioniert noch, Tools werden aus DB gezogen) → Prompt 3 → prüfen
(Runs/Steps werden befüllt) → Prompt 4 → prüfen (Cockpit-Seite zeigt Graph +
Historie) → Prompt 5 → prüfen (Live-Pulse funktioniert in Echtzeit) →
Prompt 6 → prüfen (Bearbeiten wirkt sich auf den nächsten Chat-Lauf aus).

Nicht alle auf einmal geben — genau wie beim ursprünglichen Blueprint-Ansatz,
nur dass die Prompts hier zum tatsächlichen Code-Stand passen.
