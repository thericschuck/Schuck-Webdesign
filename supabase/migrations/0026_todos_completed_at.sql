-- Abschlussdatum für Todos: wird beim Abhaken gesetzt, beim Reaktivieren wieder auf NULL
-- gesetzt. Ermöglicht "neueste zuerst"-Sortierung der erledigten Aufgaben nach echtem
-- Abschlussdatum statt nach Erstellungsdatum.
alter table public.todos add column completed_at timestamptz;

update public.todos set completed_at = created_at where done = true;
