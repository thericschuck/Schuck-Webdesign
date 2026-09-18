-- HELM: Modell-/Denktiefe-Wahl pro Profil (Chat-Header-Picker). Bewusst schlank — kein
-- Pendant zu Athenas vollem ai_settings (Persona/WebResearch/Limits gibt es bei HELM nicht).

create table public.helm_settings (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  model       text not null default 'claude-sonnet-5',
  effort      text not null default 'medium' check (effort in ('low', 'medium', 'high', 'xhigh', 'max')),
  updated_at  timestamptz not null default now()
);

alter table public.helm_settings enable row level security;

create policy "helm_settings: Admin verwaltet alle"
  on public.helm_settings for all
  using (public.get_my_role() = 'admin');
