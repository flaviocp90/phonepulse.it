begin;

alter table public.articles
  add column status text,
  add column origin text not null default 'legacy',
  add column version bigint not null default 1 check (version >= 1),
  add column approved_version bigint,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users(id),
  add column sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  add column source_key text,
  add column content_updated_at timestamptz,
  add column last_verified_at timestamptz,
  add column content_format text check (content_format in ('news', 'guide', 'comparison', 'review'));

-- Preserve public visibility; legacy publication is not retrospective approval.
update public.articles set status = case
  when is_published then 'published'
  when discarded then 'discarded'
  else 'draft' end;
alter table public.articles
  alter column origin set default 'manual',
  alter column status set default 'draft',
  alter column status set not null,
  add constraint articles_status_check check (status in ('draft', 'approved', 'published', 'discarded')),
  add constraint articles_origin_check check (origin in ('legacy', 'rss', 'manual'));

update public.articles set
  is_published = (status = 'published'),
  discarded = (status = 'discarded'),
  needs_review = (status = 'draft');

create function public.sync_article_status_flags() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Reject legacy flag-only changes instead of reporting a misleading success.
  if TG_OP = 'UPDATE' and NEW.status is not distinct from OLD.status
     and (NEW.is_published is distinct from OLD.is_published
       or NEW.discarded is distinct from OLD.discarded
       or NEW.needs_review is distinct from OLD.needs_review) then
    raise exception 'Change articles.status instead of legacy flags' using errcode = '23514';
  end if;
  if TG_OP = 'INSERT' and (NEW.is_published or NEW.discarded)
     and (NEW.is_published is distinct from (NEW.status = 'published')
       or NEW.discarded is distinct from (NEW.status = 'discarded')) then
    raise exception 'Legacy flags conflict with articles.status' using errcode = '23514';
  end if;
  NEW.is_published := (NEW.status = 'published');
  NEW.discarded := (NEW.status = 'discarded');
  NEW.needs_review := (NEW.status = 'draft');
  return NEW;
end $$;
revoke all on function public.sync_article_status_flags() from public, anon, authenticated;
create trigger articles_status_flags before insert or update on public.articles
for each row execute function public.sync_article_status_flags();

create unique index articles_source_key_unique on public.articles(source_key) where source_key is not null;
create index articles_status_created_at_idx on public.articles(status, created_at);

alter table public.articles enable row level security;
drop policy "Authenticated users can read all articles" on public.articles;
drop policy "Authenticated users can update articles" on public.articles;
drop policy "Public read published articles" on public.articles;
revoke all on public.articles from public, anon, authenticated;
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.articles to service_role;

create policy articles_public_read on public.articles for select to anon, authenticated
using (status = 'published');
-- Task 3 replaces direct critical writes with transactional editorial RPCs.
create policy articles_editor_read on public.articles for select to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');
create policy articles_editor_insert on public.articles for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');
create policy articles_editor_update on public.articles for update to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor')
with check ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');
create policy articles_editor_delete on public.articles for delete to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role') = 'editor');

alter table public.daily_counters enable row level security;
drop policy "Allow all for service role" on public.daily_counters;
revoke all on public.daily_counters from public, anon, authenticated;
grant select, insert, update, delete on public.daily_counters to service_role;
-- Supabase service_role has BYPASSRLS; no client policy reopens counters.
commit;
