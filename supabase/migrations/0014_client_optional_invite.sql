-- ============================================================
-- 0014 – Kunden anlegen ohne Portal-Einladung
-- ============================================================
-- profile_id war bisher zwingend (jeder Kunde brauchte einen Auth-User/Invite).
-- contact_name/contact_email erlauben, einen Kunden vollständig zu verwalten,
-- bevor (oder ohne dass) eine Portal-Einladung verschickt wird.

alter table public.clients alter column profile_id drop not null;
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists contact_email text;

-- Backfill: bestehende (bereits eingeladene) Kunden bekommen ihre Kontaktdaten auch auf
-- clients gespiegelt, damit alte und neue Kunden derselben Anzeige-/Fallback-Logik folgen.
update public.clients c
set contact_name = coalesce(c.contact_name, p.full_name),
    contact_email = coalesce(c.contact_email, p.email)
from public.profiles p
where p.id = c.profile_id and (c.contact_name is null or c.contact_email is null);
