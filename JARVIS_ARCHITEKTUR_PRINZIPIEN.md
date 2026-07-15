# JARVIS — Architektur-Prinzipien & Zielbild

*Grundlage: "Agentic Design Patterns" (Antonio Gulli) + bestehender Code-Stand Schuck-Redesign · Juli 2026*

---

## 1 · Was JARVIS werden soll

JARVIS ist kein Chatbot mit Zugriff auf ein paar APIs, sondern ein **Level-3-System** im Reifegrad-Modell des Buchs: ein Team spezialisierter Agenten statt eines einzelnen Superagenten. Ein Orchestrator nimmt Erics Auftrag entgegen, zerlegt ihn bei Bedarf, delegiert an spezialisierte Sub-Agenten (Design, Code, SEO, Care, Akquise, Finanzen) und fasst deren Ergebnisse zusammen — analog zu einer menschlichen Organisation mit einem Ansprechpartner und Fachabteilungen dahinter.

Das Ziel ist **nicht** Autonomie um ihrer selbst willen. Jede irreversible Aktion (E-Mail an Kunden, Rechnung erstellen, Datenbank-Eintrag löschen) bleibt an Erics Freigabe gebunden. JARVIS soll Recherche, Analyse und Entwurfsarbeit automatisieren — Entscheidungen mit echten Konsequenzen bleiben bei Eric.

---

## 2 · Die Prinzipien, auf denen wir aufbauen

Aus den 21 Design-Patterns des Buchs sind für JARVIS diese am wichtigsten — mit Bezug darauf, was das für uns konkret bedeutet:

**Multi-Agent Collaboration (Kap. 7)** — Der Grundriss der ganzen Architektur. Ein komplexes Problem wird in Teilprobleme zerlegt, jedes bekommt einen Spezialisten mit genau den Tools, die er braucht. Bei JARVIS heißt das: Orchestrator + 6 Sub-Agenten, jeder mit einer klar begrenzten Toolliste.

**Tool Use / Function Calling (Kap. 5)** — Die Grundlage dafür, dass ein Sub-Agent überhaupt etwas Reales tut (PageSpeed abfragen, Figma-Kontext lesen, Rechnungen auflisten). Jedes Tool braucht eine klare Beschreibung + Input-Schema, damit Claude zuverlässig entscheidet, wann es gebraucht wird.

**Human-in-the-Loop (Kap. 13)** — Nicht optional, sondern eine harte Regel für JARVIS: E-Mail-Versand, Löschungen, Rechnungsstellung laufen nie automatisch durch. Das Muster ist immer dasselbe — Agent bereitet vor, legt eine `pending_action` an, Eric bestätigt oder lehnt ab.

**Planning (Kap. 6)** — Für mehrstufige Aufgaben (z. B. "erstelle den Monats-Report für Kunde X"), die nicht mit einem einzigen Tool-Call erledigt sind, sondern eine Sequenz von Schritten brauchen (Daten sammeln → Report bauen → PDF erzeugen → Versand vorschlagen).

**Reflection (Kap. 4)** — Ein Agent soll eigene Fehler erkennen und einen alternativen Ansatz versuchen, statt beim ersten Fehlschlag aufzugeben oder stumpf zu wiederholen. Bei JARVIS: begrenzte Retry-Schleife mit Fehlermeldung als Kontext für den nächsten Versuch, danach ehrliche Eskalation an Eric statt endlosem Wiederholen.

**Exception Handling and Recovery (Kap. 12)** — Externe APIs (UptimeRobot, Vapi, Search Console) fallen aus oder sind nicht konfiguriert. Ein fehlender API-Key ist kein Fehler, der sich durch Wiederholen behebt — das muss JARVIS erkennen und sofort ehrlich melden statt Zahlen zu erfinden oder sinnlos zu retryen.

**Memory Management (Kap. 8)** — Kurzfristig: der laufende Chat-Verlauf. Langfristig: der Knowledge Graph (Kunden, Projekte, Entscheidungen als vernetzte Knoten) — es gibt **kein** separates JARVIS.md als gepflegtes Grundwissen-Dokument, und das soll auch so bleiben. Erics harte Anforderung: möglichst wenig manuelle Pflegearbeit. Das Muster dafür ist bereits da und funktioniert: der Knowledge Graph wird automatisch am Ende gepflegt, Eric kann Knoten bei Bedarf trotzdem manuell korrigieren. Dasselbe Muster — automatische Pflege am Ende eines Laufs/einer Session, manuelle Korrektur nur als Ausnahme — soll auf einen persistenten Speicher pro Agent bzw. für alle Agenten gemeinsam ausgeweitet werden, gespeist aus Graph + (noch zu bauenden) Session-Reports. Kein Redakteursjob für Eric.

**Goal Setting and Monitoring (Kap. 11)** — Jeder Sub-Agent hat einen klar begrenzten Zweck (der Care-Agent sammelt Kennzahlen und schlägt vor, er versendet nichts). Klare Grenzen pro Agent sind wichtiger als ein möglichst mächtiger Einzelagent.

**Resource-Aware Optimization (Kap. 16)** — Nicht jede Anfrage braucht das teuerste Modell. Relevant, sobald JARVIS häufiger und automatisiert läuft (z. B. tägliche Anomalie-Checks) — dann lohnt sich ein günstigeres Modell für einfache Prüfungen und das teurere nur für echte Planungs-/Reasoning-Schritte.

**Routing (Kap. 2)** — Die Entscheidung, welcher Sub-Agent für eine Anfrage zuständig ist, trifft aktuell der Orchestrator selbst per Tool-Auswahl (LLM-basiertes Routing) — kein zusätzlicher separater Router nötig, solange die Anzahl der Sub-Agenten überschaubar bleibt.

**Empfohlener konzeptioneller Rahmen laut Buch:** Google ADK (primärer Agent delegiert an Team von Sub-Agents) bzw. ein selbstgebauter, LangGraph-ähnlicher State-Graph mit explizitem State und Pause-Punkten für Human-in-the-Loop — beides trifft die JARVIS-Architektur, ohne dass die Bibliotheken selbst gebraucht werden. Eric arbeitet server-seitig direkt mit der Claude API + Tool-Use, was strukturell genau diesem Modell entspricht.

---

## 3 · Wo wir stehen (Ist-Stand)

Das ist bereits sauber nach diesen Prinzipien gebaut — nicht nur geplant:

- **Multi-Agent Collaboration:** 6 Sub-Agenten (`lib/jarvis/subagents.ts`) mit klar begrenzten Tool-Registrierungen, aufgerufen als gekapselter Tool-Call innerhalb des Haupt-Orchestrator-Loops (`lib/jarvis/tools/subagents.ts`). Kein separater Prozess, keine Queue — einfacher als im Buch beschrieben und trotzdem strukturell korrekt.
- **Tool Use:** Durchgängig implementiert — Clients, Projekte, Produkte, Akquise, Finanzen, Dokumente, Knowledge Graph, alle externen Integrationen (PageSpeed, Search Console, UptimeRobot, Vapi, GBP, Figma, GitHub, Vercel, Calendar, Domain).
- **Human-in-the-Loop:** `pending_actions`-Tabelle + Confirm-Route funktioniert; Sub-Agenten dürfen laut Code-Kommentar in `subagents.ts` explizit keine bestätigungspflichtigen Tools bekommen — sauber erzwungen, nicht nur Konvention.
- **Reflection:** `runJarvisAgent` hat eine Retry-Zählung pro Tool mit Eskalation nach `MAX_TOOL_RETRIES`, unterscheidet dabei sauber zwischen "API-Key fehlt" (sofort eskalieren) und "transienter Fehler" (nochmal versuchen).
- **Exception Handling:** `IntegrationError` mit `missing_key`/`unauthorized`-Codes wird im Agent-Loop erkannt und führt zu ehrlicher Eskalation statt Retry-Verschwendung.
- **Memory:** Kurzfristig über `jarvis_messages` (Chat-Verlauf), langfristig über den Knowledge Graph (`lib/jarvis/embeddings.ts`, `context.ts`, Migration `0009_knowledge_graph.sql`), der automatisch gepflegt wird und als Cold-Start-Kontext dient. Kein JARVIS.md — gibt es nicht und soll es auch nicht geben.

**Vorbereitet, aber noch nicht angebunden:**
- Migration `0017_jarvis_phase1_agents.sql` hat schon Tabellen für `agents`, `agent_runs`, `agent_steps`, `deliverables`, `scheduled_tasks` angelegt — aktuell schreibt aber nichts in diese Tabellen. Das ist Scaffolding für Observability (Planning/Goal-Monitoring), noch keine aktive Komponente.
- Kein Scheduler: die 3 geplanten automatisierten Aufgaben (monatlicher Care-Report, wöchentlicher Uptime-Check, tägliche Anomalie-Prüfung) laufen nirgends automatisch.
- Resource-Aware Optimization: aktuell ein festes Modell für alle Aufrufe (`JARVIS_MODEL`-Env-Var), kein Routing zwischen günstigem/teurem Modell je nach Aufgabenkomplexität.
- Session-Reports als strukturierte, durchsuchbare Ablage existieren noch nicht (in der ursprünglichen Planung mal als `SESSION_LOGS/*.md` skizziert) — aktuell gibt es nur den Chat-Verlauf und den Knowledge Graph, keine dritte Gedächtnis-Ebene.

---

## 4 · Memory-Zielbild (Ergänzung nach Erics Korrektur)

Kein JARVIS.md. Erics Vorgabe ist explizit: so wenig manuelle Pflege wie möglich. Das Zielbild für den persistenten Speicher lehnt sich eng an das an, was beim Knowledge Graph schon funktioniert:

- **Automatische Pflege am Ende eines Laufs** — analog dazu, wie der Graph aktuell aktualisiert wird, nicht als zusätzlicher manueller Schritt für Eric.
- **Speisequellen:** der bestehende Knowledge Graph + Session-Reports (noch zu bauen — eine strukturierte, automatisch erzeugte Zusammenfassung jedes Runs/jeder Session).
- **Granularität offen, tendenziell pro Agent:** ein persistenter Speicher je Sub-Agent (Care-Agent merkt sich z. B. Auffälligkeiten aus früheren Monats-Reports, Akquise-Agent merkt sich Gesprächsverlauf pro Lead) statt nur eines globalen Speichers — muss aber sauber vom Wissen anderer Agenten abgegrenzt bleiben, ähnlich der scoped Tool-Registries pro Sub-Agent.
- **Manuelle Korrektur bleibt möglich, ist aber die Ausnahme** — wie beim Graph auch: Eric kann jederzeit reinschauen und etwas anpassen, muss es aber im Normalbetrieb nicht.

Wie genau Session-Reports erzeugt und mit dem Graph verzahnt werden, ist noch offen — das ist ein Umsetzungsthema für später, kein Prinzip mehr.

---

## 5 · Neue Anforderung: visuelles Cockpit

Zusätzlich zur reinen Chat-Oberfläche soll JARVIS sichtbar und bedienbar werden — nicht nur eine Blackbox, mit der man tippt:

- **Live-Ansicht wie ein Gehirn beim Arbeiten** — während ein Run läuft, soll erkennbar sein, welcher Agent gerade aktiv ist, welches Tool aufgerufen wird, wie das Ergebnis zurückfließt.
- **Struktur angelehnt an n8n** — Orchestrator und Sub-Agenten als Knoten in einem Workflow-artigen Graphen, keine reine Liste/Tabelle.
- **Jeder Knoten anklickbar** — einzelnen Agenten aufrufen und einsehen können (System-Prompt, zugeordnete Tools, letzte Runs) und **bearbeiten** können (z. B. System-Prompt anpassen, Tools zu-/abschalten), nicht nur passiv beobachten.

Das ist der Punkt, an dem die bisher ungenutzten Tabellen aus Migration `0017` (`agents`, `agent_runs`, `agent_steps`) wieder relevant werden — ohne befüllte Run-/Step-Historie gibt es nichts, was sich live visualisieren ließe. Die Observability-Anbindung aus Abschnitt 3 ist damit keine optionale Nebenanforderung mehr, sondern Voraussetzung für dieses Cockpit.

---

## 6 · Woran sich künftige Prompts/Entscheidungen messen lassen müssen

Bevor wir etwas Neues bauen, prüfen wir immer zuerst: **existiert das Muster dafür schon in `lib/jarvis/`?** Das Blueprint-Dokument (separater Worker, node-cron, Polling-Queue) hat genau das ignoriert und wäre eine zweite, parallele Architektur geworden statt eines Ausbaus der bestehenden.

Die tatsächlich offenen Bausteine, um vom Ist-Stand zum Zielbild zu kommen:

1. **Scheduling** — automatisiertes Auslösen der bestehenden Care-Agent-Logik über `scheduled_tasks`, ohne separaten Worker-Prozess (Vercel Cron reicht für den aktuellen Umfang).
2. **Observability (jetzt Pflicht, nicht optional)** — `agent_runs`/`agent_steps` befüllen, als Grundlage für das visuelle Cockpit aus Abschnitt 5.
3. **Visuelles Cockpit** — n8n-artige Live-Ansicht über Agenten/Runs, mit Klick-Zugriff zum Einsehen und Bearbeiten einzelner Agenten.
4. **Persistenter Memory-Layer pro Agent** — automatisch gepflegt aus Graph + Session-Reports, ohne JARVIS.md, mit minimaler manueller Pflege für Eric.
5. **Resource-Aware Routing** — sobald automatisierte, häufige Läufe (tägliche Checks) dazukommen, lohnt sich ein günstigeres Modell für einfache Prüfungen.
6. **Weitere Sub-Agenten scharfschalten** — Design-, Code-, SEO-, Akquise-, Finanzen-Agent sind in der DB als `inactive` markiert und im Code voll funktionsfähig (Tools + Prompts existieren) — reine Aktivierungsentscheidung, kein Neubau.
