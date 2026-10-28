-- =============================================================================
-- FarmEcho: ranked knowledge search for the AI assistant.
--
-- websearch_to_tsquery requires every word to match (AND), which is too strict
-- for natural questions. This function takes a list of keywords, matches any of
-- them (OR), and ranks by relevance. Only published articles are returned.
-- Runs as the caller (security invoker), so the article RLS still applies.
-- =============================================================================

create or replace function public.search_knowledge(
  p_terms    text[],
  p_language text default null,
  p_limit    int default 5
)
returns table (
  id       uuid,
  title    text,
  body     text,
  language text,
  tags     text[],
  rank     real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    -- Each term is reduced to letters and digits, so the query text cannot
    -- inject tsquery operators. An empty result is returned if no term survives.
    select to_tsquery(
      'simple',
      string_agg(t, ' | ')
    ) as query
    from (
      select distinct lower(regexp_replace(term, '[^[:alnum:]]', '', 'g')) as t
      from unnest(p_terms) as term
    ) cleaned
    where t <> ''
  )
  select a.id, a.title, a.body, a.language, a.tags,
         ts_rank(a.search_vector, q.query) as rank
  from public.knowledge_articles a, q
  where q.query is not null
    and a.published
    and a.search_vector @@ q.query
    and (p_language is null or a.language = p_language)
  order by rank desc, a.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

revoke all on function public.search_knowledge(text[], text, int) from public;
grant execute on function public.search_knowledge(text[], text, int) to anon, authenticated;
