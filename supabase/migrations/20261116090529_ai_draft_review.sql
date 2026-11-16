begin;

alter table public.article_events drop constraint article_events_action_check;
alter table public.article_events add constraint article_events_action_check
  check (action in ('saved', 'approved', 'published', 'corrected', 'draft', 'discarded', 'ai_reviewed'));

create unique index article_events_ai_review_version
  on public.article_events (article_id, version) where action = 'ai_reviewed';

create function public.list_drafts_for_ai_review() returns setof public.articles
language sql stable security invoker set search_path = '' as $$
  select a.* from public.articles a
  where a.status = 'draft' and a.origin in ('rss', 'manual')
    and not exists (
      select 1 from public.article_events e
      where e.article_id = a.id and e.version = a.version and e.action = 'ai_reviewed'
    )
  order by a.created_at, a.id
  limit 8
$$;

-- The review and the optional archive transition are applied under the same row lock.
create function editorial_private.record_ai_draft_review(p_id uuid, p_expected_version bigint, p_review jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  a public.articles;
  outcome text := p_review->>'outcome';
  matches_filter boolean := coalesce(p_review #>> '{filters,us_only,status}' = 'yes', false)
                         or coalesce(p_review #>> '{filters,discount,status}' = 'yes', false);
begin
  if editorial_private.caller_role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_review->>'model' is distinct from 'gpt-6-luna'
     or outcome is null or outcome not in ('passed', 'needs_attention', 'discarded')
     or (outcome = 'discarded') <> matches_filter then
    raise exception 'Invalid AI review' using errcode = '22023';
  end if;

  select * into a from public.articles where id = p_id for update;
  if not found or a.status <> 'draft' or a.origin not in ('rss', 'manual')
     or a.version is distinct from p_expected_version
     or exists (select 1 from public.article_events
                where article_id = p_id and action = 'ai_reviewed' and version = a.version) then
    return false;
  end if;

  insert into public.article_events(article_id, action, version, actor_role, review)
    values (p_id, 'ai_reviewed', a.version, 'service_role', p_review);

  if outcome = 'discarded' then
    update public.articles set status = 'discarded', approved_version = null, approved_at = null,
      approved_by = null, last_verified_at = null, updated_at = clock_timestamp()
      where id = p_id;
    insert into public.article_events(article_id, action, version, actor_role)
      values (p_id, 'discarded', a.version, 'service_role');
  end if;
  return true;
end $$;

create function public.record_ai_draft_review(p_id uuid, p_expected_version bigint, p_review jsonb)
returns boolean language sql security invoker set search_path = '' as $$
  select editorial_private.record_ai_draft_review(p_id, p_expected_version, p_review)
$$;

-- The service worker can read the existing audit through RLS bypass, while editors
-- retain their existing RLS-scoped access and anonymous clients have no access.
grant select on public.article_events to service_role;
revoke all on function public.list_drafts_for_ai_review(),
  public.record_ai_draft_review(uuid,bigint,jsonb),
  editorial_private.record_ai_draft_review(uuid,bigint,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.list_drafts_for_ai_review(),
  public.record_ai_draft_review(uuid,bigint,jsonb),
  editorial_private.record_ai_draft_review(uuid,bigint,jsonb) to service_role;

commit;
