-- ============================================================
-- 0016 – todos.project_id nachträglich optional machen
-- ============================================================
-- schema.sql (Abschnitt 10, "Allgemeine To-Dos ohne Projekt-Zuordnung") dokumentierte
-- `alter column project_id drop not null` bereits seit Längerem, dieser Schritt wurde auf der
-- Live-Datenbank aber nie tatsächlich ausgeführt — project_id war weiterhin NOT NULL. Dadurch
-- schlug jedes Anlegen eines "Allgemein"-Todos (ohne Projekt), sowohl über die Admin-UI als auch
-- über JARVIS' create_todo-Tool, mit einer Constraint-Verletzung fehl.

alter table public.todos alter column project_id drop not null;
