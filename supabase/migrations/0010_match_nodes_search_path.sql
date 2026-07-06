-- ============================================================
-- 0010 – Fix: match_nodes() hatte keinen fixen search_path
-- (Security-Advisor-Warning "function_search_path_mutable").
-- ============================================================

create or replace function public.match_nodes(query_embedding vector(1536), match_count int default 20)
returns setof public.nodes
language sql
stable
set search_path = public
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
