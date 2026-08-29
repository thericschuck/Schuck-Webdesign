-- Push-Abos sind konstruktionsbedingt PRO GERÄT/BROWSER: jeder Browser erzeugt eine
-- eigene Subscription mit eigenem Endpoint. Bisher gab es dazu nur den Endpoint selbst —
-- eine unlesbare URL. Für eine Geräteliste in den Einstellungen ("Chrome auf Windows,
-- registriert am …, entfernen") braucht es einen sprechenden Namen und die Info, wann
-- zuletzt erfolgreich an dieses Gerät zugestellt wurde.

alter table public.push_subscriptions
  add column if not exists label text,
  add column if not exists last_used_at timestamptz;
