\set ON_ERROR_STOP on
begin;

create function pg_temp.check_true(ok boolean, label text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception 'Assertion failed: %', label; end if; end $$;

insert into public.articles(slug, title, origin, status, created_at, version)
values ('ai-us', 'Synthetic US release', 'rss', 'draft', '2001-01-01', 1),
       ('ai-discount', 'Synthetic discount', 'rss', 'draft', '2001-01-01', 2),
       ('ai-local', 'Synthetic Italian guide', 'manual', 'draft', '2001-01-01', 1),
       ('ai-legacy', 'Synthetic archive', 'legacy', 'draft', '2001-01-01', 1),
       ('ai-live', 'Synthetic publication', 'rss', 'published', '2001-01-01', 1);
select id as us_id from public.articles where slug='ai-us' \gset
select id as discount_id from public.articles where slug='ai-discount' \gset
select id as local_id from public.articles where slug='ai-local' \gset
select id as legacy_id from public.articles where slug='ai-legacy' \gset
select id as published_id from public.articles where slug='ai-live' \gset
select '{"model":"gpt-6-luna","outcome":"discarded","filters":{"us_only":{"status":"yes"}}}' as us_review,
       '{"model":"gpt-6-luna","outcome":"discarded","filters":{"discount":{"status":"yes"}}}' as discount_review,
       '{"model":"gpt-6-luna","outcome":"passed"}' as local_review \gset

select pg_temp.check_true(not has_function_privilege('authenticated', 'public.record_ai_draft_review(uuid,bigint,jsonb)', 'execute'), 'only service can record');
select pg_temp.check_true(not has_function_privilege('anon', 'public.list_drafts_for_ai_review()', 'execute'), 'anonymous callers cannot fetch drafts');
set session authorization service_role;
select pg_temp.check_true((select count(*)=3 from public.list_drafts_for_ai_review() where slug like 'ai-%'), 'queue includes RSS and manual drafts only');
select pg_temp.check_true(not public.record_ai_draft_review(:'discount_id', 1, :'discount_review'), 'stale version has no effect');
select pg_temp.check_true(not public.record_ai_draft_review(:'legacy_id', 1, :'us_review'), 'legacy archive has no effect');
select pg_temp.check_true(not public.record_ai_draft_review(:'published_id', 1, :'us_review'), 'published article has no effect');
select pg_temp.check_true(public.record_ai_draft_review(:'us_id', 1, :'us_review'), 'US-only draft archived');
select pg_temp.check_true(public.record_ai_draft_review(:'discount_id', 2, :'discount_review'), 'discount-only draft archived');
select pg_temp.check_true(public.record_ai_draft_review(:'local_id', 1, :'local_review'), 'positive review recorded');
select pg_temp.check_true(not public.record_ai_draft_review(:'local_id', 1, :'local_review'), 'same version processed once');
select pg_temp.check_true((select not exists(select from public.list_drafts_for_ai_review() where slug like 'ai-%')), 'reviewed versions leave AI queue');
select pg_temp.check_true((select status='discarded' and not is_published from public.articles where id=:'us_id'), 'archived draft is private and retained');
select pg_temp.check_true((select status='draft' and approved_by is null from public.articles where id=:'local_id'), 'no human approval created');
select pg_temp.check_true((select count(*)=2 and bool_and(actor_role='service_role' and actor_id is null) from public.article_events where article_id=:'us_id'), 'review and archive audited without human identity');
reset session authorization;
rollback;
