begin;

-- Keep unfinished reviews out of the publicly readable articles row.
create table public.article_review_drafts (
  article_id uuid primary key references public.articles(id) on delete cascade,
  version bigint not null check (version >= 1),
  claims jsonb not null check (jsonb_typeof(claims) = 'array' and jsonb_array_length(claims) <= 12 and octet_length(claims::text) <= 30000),
  actor_id uuid not null references auth.users(id),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.article_review_drafts enable row level security;
revoke all on public.article_review_drafts from public, anon, authenticated, service_role;
grant select on public.article_review_drafts to authenticated;
create policy article_review_drafts_editor_read on public.article_review_drafts for select to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');

-- Uploads are for publication; drafts' text and claim reviews remain private.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('editorial-media', 'editorial-media', true, 5242880, array['image/jpeg','image/png','image/webp']);
create policy editorial_media_editor_insert on storage.objects for insert to authenticated
with check (bucket_id = 'editorial-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');
-- No overwrite or delete policy: published images must keep stable URLs.

create or replace function editorial_private.save_article(p_article jsonb, p_tag_ids uuid[], p_expected_version bigint,
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
  if p_review ? 'import_provenance' and (jsonb_typeof(p_review->'import_provenance') is distinct from 'object' or octet_length((p_review->'import_provenance')::text) > 2000) then
    raise exception 'Invalid import provenance' using errcode = '22023';
  end if;
  if p_review ? 'claim_draft' and not correction then
    if jsonb_typeof(p_review->'claim_draft') is distinct from 'array' or jsonb_array_length(p_review->'claim_draft') > 12 or octet_length((p_review->'claim_draft')::text) > 30000 then
      raise exception 'Invalid claim draft' using errcode = '22023';
    end if;
    insert into public.article_review_drafts(article_id, version, claims, actor_id)
    values(v_article_id, next_row.version, p_review->'claim_draft', actor)
    on conflict (article_id) do update set version=excluded.version, claims=excluded.claims, actor_id=excluded.actor_id, updated_at=stamp;
  elsif changed then
    delete from public.article_review_drafts where article_id=v_article_id;
  end if;
  if changed then
    delete from public.article_tags where article_tags.article_id = v_article_id;
    insert into public.article_tags(article_id,tag_id) select v_article_id,unnest(tag_ids);
    if not correction then
      insert into public.article_events(article_id,action,version,actor_id,actor_role,review)
      values(v_article_id,'saved',next_row.version,actor,'authenticated',case when p_review ? 'import_provenance' then jsonb_build_object('import_provenance', p_review->'import_provenance') else null end);
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


commit;
