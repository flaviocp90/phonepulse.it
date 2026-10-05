begin;

-- Do not add this schema to PostgREST's exposed schemas.
create schema editorial_private;
revoke all on schema editorial_private from public, anon, authenticated, service_role;
grant usage on schema editorial_private to authenticated, service_role;

create table public.article_events (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  action text not null check (action in ('saved', 'approved', 'published', 'corrected', 'draft', 'discarded')),
  version bigint not null check (version >= 1),
  actor_id uuid references auth.users(id),
  actor_role text not null check (actor_role in ('authenticated', 'service_role')),
  created_at timestamptz not null default clock_timestamp(),
  review jsonb check (review is null or jsonb_typeof(review) = 'object')
);
create index article_events_article_created_idx on public.article_events(article_id, created_at);
alter table public.article_events enable row level security;
revoke all on public.article_events from public, anon, authenticated, service_role;
grant select on public.article_events to authenticated;
create policy article_events_editor_read on public.article_events for select to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');

revoke insert, update, delete, truncate, references, trigger on public.articles, public.article_tags
from public, anon, authenticated;
drop policy articles_editor_insert on public.articles;
drop policy articles_editor_update on public.articles;
drop policy articles_editor_delete on public.articles;
-- Tag associations follow the visibility of their article, including editor drafts.
alter table public.article_tags enable row level security;
drop policy "Public read article_tags" on public.article_tags;
create policy article_tags_visible_article on public.article_tags for select to anon, authenticated
using (exists(select 1 from public.articles a where a.id = article_id));

create function editorial_private.caller_role() returns text
language sql stable security invoker set search_path = '' as $$
  -- PostgreSQL itself validates SET ROLE, including set_config('role', ...).
  -- Unlike current_user, this survives SECURITY DEFINER; JWT role is not trusted.
  select case when current_setting('role', true) in ('none', '')
    or current_setting('role', true) is null then session_user::text
    else current_setting('role', true) end
$$;

create function editorial_private.require_editor() returns uuid
language plpgsql security invoker set search_path = '' as $$
begin
  if editorial_private.caller_role() <> 'authenticated' or auth.uid() is null
    or (auth.jwt()->'app_metadata'->>'phonepulse_role') is distinct from 'editor' then
    raise exception 'Editor permission required' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

create function editorial_private.validate_review(p_review jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_review) is distinct from 'object' or not p_review @>
    '{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}'::jsonb then
    raise exception 'Complete seven-point editorial checklist required' using errcode = '22023';
  end if;
end $$;

create function editorial_private.source_timestamp(p_value jsonb, p_required boolean) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare stamp timestamptz;
begin
  if p_value is null or p_value = 'null'::jsonb then
    if p_required then raise exception 'Source timestamp required' using errcode = '22023'; end if;
    return null;
  end if;
  if jsonb_typeof(p_value) <> 'string' or (p_value #>> '{}') !~
    '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then
    raise exception 'Source timestamp must be ISO 8601 with timezone' using errcode = '22023';
  end if;
  begin stamp := (p_value #>> '{}')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'Invalid source timestamp' using errcode = '22023';
  end;
  if stamp > clock_timestamp() then
    raise exception 'Future source timestamp' using errcode = '22023';
  end if;
  return stamp;
end $$;

create function editorial_private.validate_content(p_article public.articles, p_news_ttl boolean) returns void
language plpgsql security invoker set search_path = '' as $$
declare src jsonb; principal timestamptz; field text; ordinal bigint;
begin
  if nullif(btrim(p_article.author), '') is null or p_article.content_format is null
    or nullif(btrim(p_article.title), '') is null or nullif(btrim(p_article.content), '') is null
    or jsonb_array_length(p_article.sources) = 0 then
    raise exception 'Author, format, content and sources required for approval' using errcode = '22023';
  end if;
  for src, ordinal in select value, ordinality from jsonb_array_elements(p_article.sources) with ordinality loop
    if jsonb_typeof(src) is distinct from 'object' then
      raise exception 'Invalid source object' using errcode = '22023';
    end if;
    foreach field in array array['url', 'title', 'publisher'] loop
      if jsonb_typeof(src->field) is distinct from 'string' or nullif(btrim(src->>field), '') is null then
        raise exception 'Source URL, title and publisher required' using errcode = '22023';
      end if;
    end loop;
    if src->>'url' !~ '^https?://[^[:space:]/?#]+[^[:space:]]*$' then
      raise exception 'Source URL must be HTTP(S)' using errcode = '22023';
    end if;
    perform editorial_private.source_timestamp(src->'retrieved_at', true);
    principal := editorial_private.source_timestamp(src->'published_at', ordinal = 1 and p_article.content_format = 'news');
    if ordinal = 1 and p_article.content_format = 'news' and p_news_ttl
      and principal < clock_timestamp() - interval '72 hours' then
      raise exception 'Principal news source is older than 72 hours' using errcode = '22023';
    end if;
  end loop;
end $$;

create function editorial_private.save_article(p_article jsonb, p_tag_ids uuid[], p_expected_version bigint,
  p_publish_correction boolean default false, p_review jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := editorial_private.require_editor();
  old_row public.articles; next_row public.articles;
  v_article_id uuid; tag_ids uuid[]; old_tags uuid[]; field text; val jsonb;
  changed boolean; correction boolean; stamp timestamptz := clock_timestamp();
begin
  if jsonb_typeof(p_article) is distinct from 'object' or p_tag_ids is null
    or array_position(p_tag_ids, null) is not null or coalesce(array_ndims(p_tag_ids), 1) <> 1
    or p_publish_correction is null then
    raise exception 'Article object, one-dimensional tag UUID array and correction flag required' using errcode = '22023';
  end if;
  for field, val in select key, value from jsonb_each(p_article) loop
    if field not in ('id','title','slug','excerpt','content','category_id','cover_image_url','author',
      'seo_title','seo_description','affiliate_links','score','image_source','sources','content_format','source_key') then
      raise exception 'Unsupported article field: %', field using errcode = '22023';
    end if;
    if field in ('title','slug','excerpt','content','cover_image_url','author','seo_title','seo_description','image_source','content_format','source_key')
      and jsonb_typeof(val) not in ('string', 'null') then
      raise exception 'Invalid text field: %', field using errcode = '22023';
    end if;
    if field in ('id','category_id') and val <> 'null'::jsonb then
      if jsonb_typeof(val) <> 'string' or not pg_input_is_valid(val #>> '{}', 'uuid') then
        raise exception 'Invalid UUID field: %', field using errcode = '22023';
      end if;
    end if;
    if field = 'score' and val <> 'null'::jsonb and
      (jsonb_typeof(val) <> 'number' or not pg_input_is_valid(val #>> '{}', 'integer')
        or (val #>> '{}')::numeric not between 0 and 100) then
      raise exception 'Score must be an integer from 0 to 100' using errcode = '22023';
    end if;
    if field = 'sources' and jsonb_typeof(val) <> 'array'
      or field = 'affiliate_links' and jsonb_typeof(val) not in ('array','null') then
      raise exception 'Invalid array field: %', field using errcode = '22023';
    end if;
  end loop;
  v_article_id := (p_article->>'id')::uuid;
  if p_article ? 'id' and v_article_id is null then
    raise exception 'Article id cannot be null' using errcode = '22023';
  end if;
  if v_article_id is not null then
    select * into old_row from public.articles where id = v_article_id for update;
    if not found then raise exception 'Article not found' using errcode = 'P0002'; end if;
    if p_expected_version is distinct from old_row.version then
      raise exception 'Article version conflict' using errcode = '40001';
    end if;
    if old_row.status = 'published' and not p_publish_correction then
      raise exception 'Explicit published correction required' using errcode = '23514';
    end if;
  elsif p_expected_version is not null or p_publish_correction then
    raise exception 'New article has no expected version or published correction' using errcode = '22023';
  else
    old_row.sources := '[]'::jsonb;
    old_row.affiliate_links := '[]'::jsonb;
  end if;
  correction := coalesce(old_row.status = 'published', false);
  if p_publish_correction and not correction then
    raise exception 'Correction requires a published article' using errcode = '23514';
  end if;
  next_row := jsonb_populate_record(old_row, p_article);
  if nullif(btrim(next_row.title), '') is null or next_row.slug is null or next_row.slug ~ '[[:space:]]' or next_row.slug = ''
    or (next_row.content_format is not null and next_row.content_format not in ('news','guide','comparison','review'))
    or (next_row.source_key is not null and nullif(btrim(next_row.source_key), '') is null) then
    raise exception 'Title, whitespace-free slug and valid format/source key required' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct t order by t), '{}'::uuid[]) into tag_ids from unnest(p_tag_ids) t;
  select coalesce(array_agg(tag_id order by tag_id), '{}'::uuid[]) into old_tags from public.article_tags where article_tags.article_id = v_article_id;
  changed := v_article_id is null or tag_ids is distinct from old_tags
    or (to_jsonb(next_row) - 'id') is distinct from (to_jsonb(old_row) - 'id');
  if correction then
    perform editorial_private.validate_review(p_review);
    -- A historical correction preserves the primary source date. No TTL bypass for new publication.
    perform editorial_private.validate_content(next_row, false);
  end if;
  if v_article_id is null then
    insert into public.articles(title,slug,excerpt,content,category_id,cover_image_url,author,seo_title,seo_description,
      affiliate_links,score,image_source,sources,source_key,content_format,content_updated_at,updated_at)
    values(next_row.title,next_row.slug,next_row.excerpt,next_row.content,next_row.category_id,next_row.cover_image_url,
      next_row.author,next_row.seo_title,next_row.seo_description,next_row.affiliate_links,next_row.score,next_row.image_source,
      next_row.sources,next_row.source_key,next_row.content_format,stamp,stamp)
    returning * into next_row;
    v_article_id := next_row.id;
  elsif changed then
    update public.articles set title=next_row.title,slug=next_row.slug,excerpt=next_row.excerpt,content=next_row.content,
      category_id=next_row.category_id,cover_image_url=next_row.cover_image_url,author=next_row.author,
      seo_title=next_row.seo_title,seo_description=next_row.seo_description,affiliate_links=next_row.affiliate_links,
      score=next_row.score,image_source=next_row.image_source,sources=next_row.sources,source_key=next_row.source_key,
      content_format=next_row.content_format,version=old_row.version+1,content_updated_at=stamp,updated_at=stamp,
      status=case when old_row.status='approved' then 'draft' else old_row.status end,
      approved_version=null,approved_by=null,approved_at=null,last_verified_at=null
    where id=v_article_id returning * into next_row;
  end if;
  if changed then
    delete from public.article_tags where article_tags.article_id = v_article_id;
    insert into public.article_tags(article_id,tag_id) select v_article_id,unnest(tag_ids);
    if not correction then
      insert into public.article_events(article_id,action,version,actor_id,actor_role)
      values(v_article_id,'saved',next_row.version,actor,'authenticated');
    end if;
  end if;
  if correction then
    update public.articles set approved_version=version,approved_by=actor,approved_at=stamp,last_verified_at=stamp,updated_at=stamp
    where id=v_article_id returning * into next_row;
    insert into public.article_events(article_id,action,version,actor_id,actor_role,review)
    values(v_article_id,'corrected',next_row.version,actor,'authenticated',p_review);
  end if;
  return jsonb_build_object('id',v_article_id,'version',next_row.version,'status',next_row.status);
end $$;

create function editorial_private.approve_article(p_id uuid, p_expected_version bigint, p_review jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := editorial_private.require_editor(); a public.articles; stamp timestamptz := clock_timestamp();
begin
  select * into a from public.articles where id = p_id for update;
  if not found then raise exception 'Article not found' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from a.version then raise exception 'Article version conflict' using errcode = '40001'; end if;
  if a.status <> 'draft' then raise exception 'Approval requires a draft' using errcode = '23514'; end if;
  perform editorial_private.validate_review(p_review);
  perform editorial_private.validate_content(a, true);
  update public.articles set status='approved',approved_version=version,approved_by=actor,
    approved_at=stamp,last_verified_at=stamp,updated_at=stamp where id=p_id;
  insert into public.article_events(article_id,action,version,actor_id,actor_role,review)
  values(p_id,'approved',a.version,actor,'authenticated',p_review);
  return jsonb_build_object('id',p_id,'version',a.version,'status','approved');
end $$;

create function editorial_private.publish_article(p_id uuid, p_expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; db_role text := editorial_private.caller_role(); a public.articles;
begin
  if db_role <> 'service_role' then actor := editorial_private.require_editor(); end if;
  select * into a from public.articles where id = p_id for update;
  if not found then raise exception 'Article not found' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from a.version then raise exception 'Article version conflict' using errcode = '40001'; end if;
  if db_role = 'service_role' and a.origin = 'legacy' then
    raise exception 'Service publisher cannot publish legacy articles' using errcode = '42501';
  end if;
  if a.status not in ('approved','published') or a.approved_version is distinct from a.version
    or a.approved_by is null or a.approved_at is null or a.last_verified_at is null then
    raise exception 'Current version approval required' using errcode = '23514';
  end if;
  -- Freshness gates new transitions, not successful retries of historical publication.
  perform editorial_private.validate_content(a, a.status <> 'published');
  if a.status = 'published' then
    return jsonb_build_object('id',p_id,'version',a.version,'status','published','changed',false);
  end if;
  update public.articles set status='published',published_at=coalesce(published_at,clock_timestamp()),updated_at=clock_timestamp() where id=p_id;
  insert into public.article_events(article_id,action,version,actor_id,actor_role)
  values(p_id,'published',a.version,actor,db_role);
  return jsonb_build_object('id',p_id,'version',a.version,'status','published','changed',true);
end $$;

create function editorial_private.set_article_status(p_id uuid, p_expected_version bigint, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := editorial_private.require_editor(); a public.articles;
begin
  if p_status is null or p_status not in ('draft','discarded') then
    raise exception 'Status must be draft or discarded' using errcode = '22023';
  end if;
  select * into a from public.articles where id=p_id for update;
  if not found then raise exception 'Article not found' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from a.version then raise exception 'Article version conflict' using errcode = '40001'; end if;
  if a.status <> p_status then
    update public.articles set status=p_status,approved_version=null,approved_at=null,approved_by=null,
      last_verified_at=null,updated_at=clock_timestamp() where id=p_id;
    insert into public.article_events(article_id,action,version,actor_id,actor_role)
    values(p_id,p_status,a.version,actor,'authenticated');
  end if;
  return jsonb_build_object('id',p_id,'version',a.version,'status',p_status);
end $$;

-- Public Data API surface; each private implementation rechecks its caller.
create function public.save_article(p_article jsonb, p_tag_ids uuid[], p_expected_version bigint,
  p_publish_correction boolean default false, p_review jsonb default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select editorial_private.save_article(p_article,p_tag_ids,p_expected_version,p_publish_correction,p_review)
$$;
create function public.approve_article(p_id uuid, p_expected_version bigint, p_review jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select editorial_private.approve_article(p_id,p_expected_version,p_review)
$$;
create function public.publish_article(p_id uuid, p_expected_version bigint) returns jsonb
language sql security invoker set search_path = '' as $$
  select editorial_private.publish_article(p_id,p_expected_version)
$$;
create function public.set_article_status(p_id uuid, p_expected_version bigint, p_status text) returns jsonb
language sql security invoker set search_path = '' as $$
  select editorial_private.set_article_status(p_id,p_expected_version,p_status)
$$;

revoke all on all functions in schema editorial_private from public, anon, authenticated, service_role;
revoke all on function public.save_article(jsonb,uuid[],bigint,boolean,jsonb), public.approve_article(uuid,bigint,jsonb),
  public.publish_article(uuid,bigint), public.set_article_status(uuid,bigint,text) from public, anon, authenticated, service_role;
grant execute on function public.save_article(jsonb,uuid[],bigint,boolean,jsonb), public.approve_article(uuid,bigint,jsonb),
  public.publish_article(uuid,bigint), public.set_article_status(uuid,bigint,text) to authenticated;
grant execute on function editorial_private.save_article(jsonb,uuid[],bigint,boolean,jsonb), editorial_private.approve_article(uuid,bigint,jsonb),
  editorial_private.publish_article(uuid,bigint), editorial_private.set_article_status(uuid,bigint,text) to authenticated;
grant execute on function public.publish_article(uuid,bigint), editorial_private.publish_article(uuid,bigint) to service_role;

commit;
