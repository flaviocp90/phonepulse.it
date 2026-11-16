\set ON_ERROR_STOP on
begin;

create function pg_temp.check_true(ok boolean, label text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception 'Assertion failed: %', label; end if; end $$;

select jsonb_build_object('model','gpt-6-luna', 'checks',
  (select jsonb_object_agg(key, '{"status":"pass","reason":"Synthetic evidence"}'::jsonb)
   from unnest(array['title_matches_content','claims_sourced','dates_checked','experience_documented',
     'reader_value','cover_checked','metadata_checked']) as key),
  'filters', '{"us_only":{"status":"no","reason":"Available in Italy"},"discount":{"status":"no","reason":"List price"}}'::jsonb)
  as approved_review \gset

insert into public.articles(slug,title,content,author,content_format,origin,status,sources)
select 'luna-'||name, 'Synthetic publication', 'Test editorial body', 'Editor', 'news', 'rss', 'draft',
  jsonb_build_array(jsonb_build_object('url','https://example.com/news','title','Source','publisher','Example',
    'published_at',to_jsonb(clock_timestamp()-age), 'retrieved_at',to_jsonb(clock_timestamp()-interval '1 minute')))
from (values ('pass',interval '1 hour'), ('uncertain',interval '1 hour'), ('us',interval '1 hour'),
  ('discount',interval '1 hour'), ('stale',interval '73 hours')) as fixtures(name,age);
select id as pass_id from public.articles where slug='luna-pass' \gset
select id as uncertain_id from public.articles where slug='luna-uncertain' \gset
select id as us_id from public.articles where slug='luna-us' \gset
select id as discount_id from public.articles where slug='luna-discount' \gset
select id as stale_id from public.articles where slug='luna-stale' \gset
select set_config('test.luna_stale_id', :'stale_id', true), set_config('test.luna_review', :'approved_review', true);

select pg_temp.check_true(not has_function_privilege('anon', 'public.submit_luna_review(uuid,bigint,jsonb)', 'execute'), 'anonymous write forbidden');
select pg_temp.check_true(not has_function_privilege('authenticated', 'public.submit_luna_review(uuid,bigint,jsonb)', 'execute'), 'editor cannot impersonate Luna');
set session authorization service_role;
select pg_temp.check_true(public.submit_luna_review(:'pass_id', 2, :'approved_review')='changed_since_read', 'stale version cannot publish');
select pg_temp.check_true(public.submit_luna_review(:'pass_id', 1, :'approved_review')='published', 'all checkpoints publish immediately');
select pg_temp.check_true(public.submit_luna_review(:'pass_id', 1, :'approved_review')='changed_since_read', 'retry leaves a single publication');
select pg_temp.check_true(public.submit_luna_review(:'uncertain_id', 1,
  jsonb_set(:'approved_review','{checks,claims_sourced,status}','"uncertain"'))='needs_attention','uncertainty leaves a draft');
select pg_temp.check_true(public.submit_luna_review(:'us_id', 1,
  jsonb_set(:'approved_review','{filters,us_only,status}','"yes"'))='discarded','US-only draft is archived');
select pg_temp.check_true(public.submit_luna_review(:'discount_id', 1,
  jsonb_set(:'approved_review','{filters,discount,status}','"yes"'))='discarded','discount draft is archived');
do $$ begin
  perform public.submit_luna_review(current_setting('test.luna_stale_id')::uuid, 1, current_setting('test.luna_review')::jsonb);
  raise exception 'Stale news should not publish';
exception when sqlstate '22023' then null;
end $$;
select pg_temp.check_true(not exists(select from public.article_events where article_id=:'stale_id'), 'invalid publication rolls back audit atomically');
select pg_temp.check_true((select count(*)=2 and bool_and(actor_id is null and actor_role='service_role')
  from public.article_events where article_id=:'pass_id'), 'AI review and publication recorded without human identity');
set session authorization anon;
select pg_temp.check_true((select count(*)=1 from public.articles where slug like 'luna-%' and is_published), 'only successful Luna result is publicly visible');
reset session authorization;
rollback;
