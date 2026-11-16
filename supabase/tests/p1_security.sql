\set ON_ERROR_STOP on
begin;
do $$ begin
  if to_regclass('public.published_articles') is null then raise exception 'public projection absent'; end if;
end $$;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
insert into public.articles(id,slug,title,content,status,origin,author,content_format,sources,published_at,content_updated_at)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','p1-public','Public fixture','Content','published','manual','Editor','guide',
  '[{"url":"https://example.com/source","title":"Source","publisher":"Source","retrieved_at":"2020-01-01T00:00:00Z"}]',
  '2020-01-01','2020-01-02'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','p1-private','Private fixture','Private content','draft','manual','Editor','guide','[]',null,null);

insert into public.article_review_drafts(article_id,version,claims,actor_id) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'[]','11111111-1111-4111-8111-111111111111');
insert into public.article_events(article_id,action,version,actor_id,actor_role) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','saved',1,'11111111-1111-4111-8111-111111111111','authenticated');
insert into public.article_media(article_id,storage_path) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg');
insert into storage.objects(bucket_id,name) select 'editorial-media',storage_path from public.article_media;

set local role anon;
do $$ begin
  if (select count(*) from public.published_articles where slug='p1-public') <> 1 then raise exception 'published missing'; end if;
  if (select count(*) from storage.objects) <> 1 then raise exception 'public media visibility'; end if;
  if exists(select from public.published_articles where slug='p1-private') then raise exception 'draft leaked'; end if;
  if (select public_updated_at from public.published_articles where slug='p1-public') <> '2020-01-02'::timestamptz then raise exception 'correction date lost'; end if;
  begin perform approved_by from public.articles; raise exception 'reviewer leaked'; exception when insufficient_privilege then null; end;
  begin perform llm_model from public.articles; raise exception 'model leaked'; exception when insufficient_privilege then null; end;
  begin perform public.editor_articles(); raise exception 'anon reader'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","aal":"aal2","app_metadata":{},"user_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  begin perform public.editor_articles(); raise exception 'non-editor reader'; exception when insufficient_privilege then null; end;
  begin perform approved_version from public.articles; raise exception 'operational columns leaked'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","aal":"aal1","app_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  begin perform public.editor_articles(); raise exception 'aal1 reader'; exception when insufficient_privilege then null; end;
  begin perform public.set_article_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'discarded'); raise exception 'aal1 write'; exception when insufficient_privilege then null; end;
  if (select count(*) from storage.objects) <> 1 then raise exception 'aal1 private media leaked'; end if;
  begin insert into storage.objects(bucket_id,name) values ('editorial-media','11111111-1111-4111-8111-111111111111/blocked.jpg'); raise exception 'aal1 upload'; exception when insufficient_privilege then null; end;
  if exists(select from public.articles where slug='p1-private') then raise exception 'aal1 draft leaked'; end if;
  if exists(select from public.article_review_drafts) or exists(select from public.article_events) then raise exception 'aal1 audit leaked'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","aal":"aal2","app_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  if (select count(*) from storage.objects) <> 2 then raise exception 'aal2 private media blocked'; end if;
  if not exists(select from public.article_review_drafts) then raise exception 'aal2 review blocked'; end if;
  if not exists(select from public.editor_articles() where slug='p1-private') then raise exception 'aal2 editor blocked'; end if;
  perform public.set_article_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'discarded');
  perform public.set_article_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'discarded');
end $$;
reset role;
set local role anon;
do $$ begin
  if exists(select from storage.objects) then raise exception 'withdrawn media stale'; end if;
  if exists(select from public.published_articles where slug='p1-public') then raise exception 'withdrawal stale'; end if;
end $$;
reset role;
-- Luna remains a dedicated service-role flow; it never depends on a human MFA claim.
set local role service_role;
do $$ begin
  if not has_function_privilege('service_role','public.list_drafts_for_ai_review()','EXECUTE') then raise exception 'Luna queue revoked'; end if;
  if has_function_privilege('anon','public.submit_luna_review(uuid,bigint,jsonb)','EXECUTE') then raise exception 'Luna public'; end if;
end $$;
reset role;
rollback;
