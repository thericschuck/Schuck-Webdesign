-- HELM (JARVIS-Nachfolger): pending_actions von "ganze Konversation als jsonb pausieren"
-- auf "Schreibaktion vorschlagen, Modell-Loop läuft unpaused weiter" umgestellt.
-- Siehe lib/helm/actions/pending-actions.ts (Vorschlag) + lib/helm/actions/confirm.ts
-- (Bestätigung/Ablehnung).

alter table public.pending_actions
  drop column if exists conversation,   -- die "ganze Konversation als jsonb" pausieren war der Grund für
                                        -- die fragile Resume-Logik von /api/jarvis/confirm — nicht mehr nötig,
                                        -- da eine vorgeschlagene Aktion den Modell-Loop nie pausiert.
  drop column if exists action_type,    -- bestätigt tot: nur im generierten types/database.ts, nie im App-Code gelesen/geschrieben.
  drop column if exists decided_by,     -- bestätigt tot (nie gelesen/geschrieben) — unten mit echter Semantik neu angelegt.
  drop column if exists decided_at;     -- ebenfalls bestätigt tot — unten mit echter Semantik neu angelegt.

alter table public.pending_actions
  add column if not exists summary    text,
  add column if not exists result     jsonb,
  add column if not exists error      jsonb,
  add column if not exists decided_by uuid references public.profiles(id),
  add column if not exists decided_at timestamptz;

-- status existiert bereits seit 0017, wurde aber nie genutzt (der alte Code hat die Zeile
-- stattdessen gelöscht) — jetzt tragend: confirm/reject machen ein race-sicheres
-- `update ... where status = 'pending'`, die Zeile bleibt für die Nachvollziehbarkeit erhalten.
comment on column public.pending_actions.status is
  'pending → approved|rejected|expired via conditional UPDATE ... WHERE status=''pending''; Zeile bleibt (kein Delete) für Audit-Zwecke erhalten.';

comment on column public.pending_actions.summary is
  'Menschenlesbare Zusammenfassung der vorgeschlagenen Aktion (aus HelmToolDef.summarize bzw. .label generiert) — für den Bestätigungsdialog.';

comment on column public.pending_actions.result is
  'Rückgabewert von HelmToolDef.execute() nach erfolgreicher Bestätigung (status=''approved'').';

comment on column public.pending_actions.error is
  'Fehlermeldung, falls die Ausführung nach Bestätigung fehlgeschlagen ist.';
