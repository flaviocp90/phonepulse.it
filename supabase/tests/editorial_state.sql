\set ON_ERROR_STOP on
begin;
create function pg_temp.check_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', message; end if; end $$;
create function pg_temp.reject(statement text, expected_state text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if SQLSTATE = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected denial: %', statement;
end $$;

-- Clone assertions contain only aggregate counts, never article rows.
select pg_temp.check_true(count(*) = 4784, 'all legacy rows preserved') from public.articles;
select pg_temp.check_true(count(*) = 90, 'public legacy rows preserved') from public.articles where status = 'published';
select pg_temp.check_true(count(*) = 4360, 'legacy drafts preserved') from public.articles where status = 'draft' and origin = 'legacy';
select pg_temp.check_true(count(*) = 0, 'legacy not in RSS queue') from public.articles where status = 'draft' and origin = 'rss';
select pg_temp.check_true(count(*) = 0, 'no invented approval or format') from public.articles
where approved_by is not null or approved_at is not null or approved_version is not null or content_format is not null;
select pg_temp.check_true(bool_and(is_published = (status = 'published') and discarded = (status = 'discarded') and needs_review = (status = 'draft')), 'flags synchronized') from public.articles;

set local role anon;
select pg_temp.check_true(count(*) = 90, 'anon visibility') from public.articles;
select pg_temp.reject('insert into public.articles(slug,title) values (''test-anon'',''test'')', '42501');
select pg_temp.reject('update public.articles set title=title', '42501');
select pg_temp.reject('delete from public.articles', '42501');
select pg_temp.reject('select * from public.daily_counters', '42501');
select pg_temp.reject('insert into public.daily_counters(date) values (date ''2099-01-01'')', '42501');
select pg_temp.reject('update public.daily_counters set gemini_calls=0', '42501');
select pg_temp.reject('delete from public.daily_counters', '42501');
reset role;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
set local role authenticated;
select pg_temp.check_true(count(*) = 90, 'non-editor visibility') from public.articles;
select pg_temp.reject('insert into public.articles(slug,title) values (''test-no-editor'',''test'')', '42501');
do $$ declare n integer; begin
  update public.articles set title=title; get diagnostics n = row_count;
  assert n = 0, 'non-editor update allowed';
  delete from public.articles; get diagnostics n = row_count;
  assert n = 0, 'non-editor delete allowed';
end $$;
reset role;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","user_metadata":{"phonepulse_role":"editor"}}';
set local role authenticated;
select pg_temp.check_true(count(*) = 90, 'fake editor visibility') from public.articles;
select pg_temp.reject('insert into public.articles(slug,title) values (''test-fake'',''test'')', '42501');
do $$ declare n integer; begin
  update public.articles set title=title; get diagnostics n = row_count;
  assert n = 0, 'fake editor update allowed';
  delete from public.articles; get diagnostics n = row_count;
  assert n = 0, 'fake editor delete allowed';
end $$;
select pg_temp.reject('select * from public.daily_counters', '42501');
select pg_temp.reject('insert into public.daily_counters(date) values (date ''2099-01-01'')', '42501');
select pg_temp.reject('update public.daily_counters set gemini_calls=0', '42501');
select pg_temp.reject('delete from public.daily_counters', '42501');
reset role;

set local request.jwt.claims = '{"app_metadata":{"phonepulse_role":"editor"}}';
set local role authenticated;
select pg_temp.check_true(count(*) = 90, 'editor claim without uid denied') from public.articles;
select pg_temp.reject('insert into public.articles(slug,title) values (''test-no-uid'',''test'')', '42501');
reset role;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","app_metadata":{"phonepulse_role":"editor"}}';
set local role authenticated;
select pg_temp.check_true(count(*) = 4784, 'editor sees archive') from public.articles;
insert into public.articles(slug,title,origin,source_key) values ('test-editorial-rss','test','rss','test-source');
insert into public.articles(slug,title) values ('test-editorial-manual','test');
select pg_temp.check_true(origin = 'manual' and status = 'draft' and version = 1 and needs_review, 'new defaults') from public.articles where slug = 'test-editorial-manual';
select pg_temp.check_true(count(*) = 1, 'RSS insert independent of legacy') from public.articles where origin = 'rss' and status = 'draft';
update public.articles set status = 'approved' where slug = 'test-editorial-rss';
update public.articles set status = 'discarded' where slug = 'test-editorial-rss';
select pg_temp.check_true(discarded and not is_published and not needs_review, 'discarded flags') from public.articles where slug = 'test-editorial-rss';
update public.articles set status = 'published' where slug = 'test-editorial-rss';
select pg_temp.check_true(is_published and not discarded and not needs_review, 'status change flags') from public.articles where slug = 'test-editorial-rss';
select pg_temp.reject('update public.articles set is_published=false where slug=''test-editorial-rss''', '23514');
select pg_temp.reject('insert into public.articles(slug,title,is_published) values (''test-legacy-insert'',''test'',true)', '23514');
select pg_temp.reject('update public.articles set status=''invalid'' where slug=''test-editorial-rss''', '23514');
select pg_temp.reject('update public.articles set origin=''invalid'' where slug=''test-editorial-rss''', '23514');
select pg_temp.reject('update public.articles set version=0 where slug=''test-editorial-rss''', '23514');
select pg_temp.reject('update public.articles set sources=''{}''::jsonb where slug=''test-editorial-rss''', '23514');
select pg_temp.reject('update public.articles set content_format=''invalid'' where slug=''test-editorial-rss''', '23514');
select pg_temp.reject('insert into public.articles(slug,title,source_key) values (''test-duplicate'',''test'',''test-source'')', '23505');
delete from public.articles where slug in ('test-editorial-rss','test-editorial-manual');
select pg_temp.check_true(count(*) = 4784, 'editor delete allowed') from public.articles;
reset role;

set local role service_role;
select pg_temp.check_true(count(*) = 89, 'service counters access') from public.daily_counters;
insert into public.daily_counters(date) values (date '2099-01-01');
update public.daily_counters set gemini_calls = 1 where date = date '2099-01-01';
select pg_temp.check_true(gemini_calls = 1, 'service counters update') from public.daily_counters where date = date '2099-01-01';
delete from public.daily_counters where date = date '2099-01-01';
reset role;
select pg_temp.check_true(rolbypassrls, 'service BYPASSRLS simulated explicitly') from pg_roles where rolname='service_role';
select pg_temp.check_true(not has_table_privilege('anon','public.articles','TRUNCATE,TRIGGER,REFERENCES') and not has_table_privilege('authenticated','public.articles','TRUNCATE,TRIGGER,REFERENCES'), 'dangerous client grants revoked');
rollback;
\echo editorial_state: all assertions passed; test writes rolled back
