-- ============================================================
-- 0009 – Knowledge Graph (JARVIS Bereich 1 "Das Gehirn")
-- ============================================================

create extension if not exists vector;

-- 1. Knoten ---------------------------------------------------

create table if not exists public.nodes (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in (
                'client', 'project', 'contact', 'fact', 'preference', 'note', 'process', 'product', 'session'
              )),
  label       text not null,
  body        text,
  ref_id      uuid,
  ref_table   text,
  source      text not null default 'jarvis_auto'
              check (source in ('jarvis_auto', 'user_explicit', 'imported')),
  confidence  text not null default 'high'
              check (confidence in ('high', 'medium', 'low', 'deprecated')),
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.nodes enable row level security;

create index if not exists nodes_ref_idx on public.nodes(ref_table, ref_id);
create index if not exists nodes_type_idx on public.nodes(type);
-- HNSW statt IVFFlat: kein Trainingsschritt nötig, bessere Recall/Latenz-Kurve
-- für die hier erwartete Knotenzahl (aktuelle pgvector-Empfehlung).
create index if not exists nodes_embedding_hnsw_idx
  on public.nodes using hnsw (embedding vector_cosine_ops);

drop policy if exists "nodes: Admin verwaltet alle" on public.nodes;
create policy "nodes: Admin verwaltet alle"
  on public.nodes for all
  using (public.get_my_role() = 'admin');

-- 2. Kanten -----------------------------------------------------

create table if not exists public.edges (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references public.nodes(id) on delete cascade,
  to_id      uuid not null references public.nodes(id) on delete cascade,
  type       text not null check (type in (
               'has_project', 'has_contact', 'mentioned_in', 'contradicts',
               'confirms', 'relates_to', 'learned_from', 'part_of_session'
             )),
  weight     float not null default 1.0,
  created_at timestamptz not null default now(),
  unique (from_id, to_id, type)
);
alter table public.edges enable row level security;

create index if not exists edges_from_idx on public.edges(from_id);
create index if not exists edges_to_idx on public.edges(to_id);

drop policy if exists "edges: Admin verwaltet alle" on public.edges;
create policy "edges: Admin verwaltet alle"
  on public.edges for all
  using (public.get_my_role() = 'admin');

-- 3. Gesprächsprotokolle -----------------------------------------

create table if not exists public.conversation_logs (
  id         uuid primary key default gen_random_uuid(),
  node_id    uuid references public.nodes(id) on delete set null,
  messages   jsonb not null default '[]',
  summary    text,
  created_at timestamptz not null default now()
);
alter table public.conversation_logs enable row level security;

drop policy if exists "conversation_logs: Admin verwaltet alle" on public.conversation_logs;
create policy "conversation_logs: Admin verwaltet alle"
  on public.conversation_logs for all
  using (public.get_my_role() = 'admin');

-- 4. link_nodes() — Kante anlegen, Gewicht erhöhen statt Duplikat -----------
--    ("weight steigt durch Bestätigung": erneutes Verlinken desselben Paars
--    mit demselben Typ zählt als Bestätigung, statt eine zweite Kante anzulegen)

create or replace function public.link_nodes(p_from uuid, p_to uuid, p_type text, p_weight float default 1.0)
returns public.edges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edge public.edges;
begin
  insert into public.edges (from_id, to_id, type, weight)
  values (p_from, p_to, p_type, p_weight)
  on conflict (from_id, to_id, type)
  do update set weight = public.edges.weight + 1
  returning * into v_edge;

  return v_edge;
end;
$$;

revoke execute on function public.link_nodes(uuid, uuid, text, float) from public, anon, authenticated;
grant execute on function public.link_nodes(uuid, uuid, text, float) to service_role;

-- 5. match_nodes() — Semantic Search per Cosine-Distanz ---------------------
--    Schließt deprecated-Knoten und Knoten ohne Embedding aus.

create or replace function public.match_nodes(query_embedding vector(1536), match_count int default 20)
returns setof public.nodes
language sql
stable
as $$
  select *
  from public.nodes
  where confidence != 'deprecated'
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_nodes(vector, int) from public, anon, authenticated;
grant execute on function public.match_nodes(vector, int) to service_role;
