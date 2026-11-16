begin;

-- Generated presentation fields avoid exposing approval versions and reviewer identities.
alter table public.articles
  add column public_revision bigint generated always as (case when status = 'published' and approved_version = version then version end) stored,
  add column is_legacy boolean generated always as (origin = 'legacy') stored,
  add column public_updated_at timestamptz generated always as (
    case when content_updated_at > published_at and
      (origin in ('manual','rss') or (approved_version = version and last_verified_at is not null))
    then content_updated_at end
  ) stored;

create view public.published_articles with (security_invoker = true, security_barrier = true) as
select id,slug,title,excerpt,content,category_id,cover_image_url,author,published_at,
  is_published,seo_title,seo_description,affiliate_links,image_source,sources,content_format,
  is_legacy,public_updated_at,public_revision
from public.articles where is_published;
revoke all on public.published_articles from public;
grant select on public.published_articles to anon, authenticated, service_role;

-- A table-valued RPC preserves PostgREST filters/embeds without giving non-editors column access.
create function public.editor_articles() returns setof public.articles
language plpgsql stable security definer set search_path = '' as $$
begin
  perform editorial_private.require_editor();
  return query select a.* from public.articles a;
end $$;
revoke all on function public.editor_articles() from public, anon, authenticated, service_role;
grant execute on function public.editor_articles() to authenticated;
notify pgrst, 'reload schema';
commit;
