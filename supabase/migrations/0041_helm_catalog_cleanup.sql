-- HELM (JARVIS-Nachfolger): public.tools wird auf eine reine FK-Zielrelation für
-- agent_tools abgespeckt — Name/Beschreibung/Schema/Bestätigungspflicht kommen zur
-- Laufzeit ausschließlich aus dem Code-Katalog (lib/helm/catalog/registry.ts#CATALOG),
-- nicht mehr aus einer separat gepflegten DB-Kopie (siehe scripts/import/sync-tool-catalog.ts).
-- Zusätzlich werden ungenutzte Scaffolding-Tabellen/-Spalten aus 0017 entfernt, die nie
-- verdrahtet wurden (kein Code schreibt/liest sie) — bestätigt per Code-Review vor dieser
-- Migration, nicht geraten.

alter table public.tools
  drop column if exists name,
  drop column if exists description,
  drop column if exists input_schema,
  drop column if exists timeout_ms,
  drop column if exists is_irreversible;

-- agents.position: Cockpit-Node-Positionen leben nur im React-State (CockpitExplorer),
-- werden nie in die DB zurückgeschrieben. agents.config: nie gelesen/geschrieben.
alter table public.agents
  drop column if exists position,
  drop column if exists config;

-- agent_messages: Inter-Agenten-Messaging-Scaffolding, das nie zur eingesetzten Architektur
-- passte — Sub-Agenten-Aufrufe sind rekursive Funktionsaufrufe (lib/helm/delegate.ts), kein
-- Message-Passing. Kein Code schreibt in diese Tabelle.
drop table if exists public.agent_messages;

-- deliverables (+ Storage-Bucket): Scaffolding für ein nie gebautes "generiertes
-- Report/Dokument aus einem Agent-Lauf"-Feature. Kein Code schreibt in diese Tabelle.
-- Der zugehörige private Storage-Bucket ("deliverables") bleibt von dieser Migration
-- unberührt — direktes SQL-Delete aus storage.buckets ist von Supabase blockiert
-- ("Use the Storage API instead", schützt vor verwaisten Objekten). Der leere Bucket kann
-- bei Bedarf manuell im Supabase-Dashboard entfernt werden.
drop table if exists public.deliverables;

-- scheduled_tasks: Scaffolding für einen nie gebauten Scheduler/Cron. Kein Code schreibt
-- in diese Tabelle.
drop table if exists public.scheduled_tasks;
