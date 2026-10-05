-- Synthetic records only. The first assertion is the Task 3 RED gate.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if to_regprocedure('public.save_article(jsonb,uuid[],bigint,boolean,jsonb)') is null then
    raise exception 'editorial RPCs absent';
  end if;
end $$;

create function pg_temp.check_true(ok boolean, label text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Assertion failed: %', label; end if;
end $$;
create function pg_temp.expect_error(stmt text, expected text) returns void
language plpgsql as $$ begin
  begin execute stmt;
  exception when others then
    if SQLSTATE = expected then return; end if;
    raise exception 'Expected SQLSTATE %, received %: %', expected, SQLSTATE, SQLERRM;
  end;
  raise exception 'Expected SQLSTATE %, statement succeeded', expected;
end $$;

insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.tags(id,name,slug) values
  ('22222222-2222-4222-8222-222222222222','Synthetic tag','synthetic-tag');

-- RPC and table ACLs; client grants cannot bypass the atomic operations.
do $$ declare r text; t text; f record; begin
  foreach r in array array['anon','authenticated'] loop
    foreach t in array array['articles','article_tags','article_events'] loop
      perform pg_temp.check_true(not has_table_privilege(r,'public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES'),r||' direct writes '||t);
      perform pg_temp.check_true(not has_any_column_privilege(r,'public.'||t,'INSERT,UPDATE,REFERENCES'),r||' column writes '||t);
    end loop;
  end loop;
  for f in select p.oid,p.proname,p.prosecdef,n.nspname,p.proconfig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','editorial_private') and p.proname in ('save_article','approve_article','publish_article','set_article_status') loop
    perform pg_temp.check_true(f.prosecdef=(f.nspname='editorial_private'),'invoker/public definer/private');
    perform pg_temp.check_true(not has_function_privilege('anon',f.oid,'EXECUTE'),'anon execute');
    perform pg_temp.check_true(not exists(select from aclexplode((select proacl from pg_proc where oid=f.oid)) where grantee=0 and privilege_type='EXECUTE'),'PUBLIC execute');
    perform pg_temp.check_true('search_path=""'=any(f.proconfig),'fixed search_path');
    perform pg_temp.check_true(has_function_privilege('service_role',f.oid,'EXECUTE')=(f.proname='publish_article'),'service_role publish only');
  end loop;
end $$;

set session authorization anon;
select pg_temp.expect_error($q$select public.publish_article(null,null)$q$,'42501');
select pg_temp.expect_error($q$select * from public.article_events$q$,'42501');
reset session authorization;
set session authorization authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","user_metadata":{"phonepulse_role":"editor"},"role":"service_role"}',true);
select pg_temp.expect_error($q$select public.save_article('{"slug":"fake","title":"fake"}','{}',null)$q$,'42501');
select pg_temp.expect_error($q$select editorial_private.publish_article(null,null)$q$,'42501');
select pg_temp.expect_error($q$select set_config('role','service_role',true)$q$,'42501');
select pg_temp.check_true((select count(*) from public.article_events)=0,'noneditor events hidden');
select set_config('request.jwt.claims','{"app_metadata":{"phonepulse_role":"editor"}}',true);
select pg_temp.expect_error($q$select public.publish_article(null,null)$q$,'42501');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"phonepulse_role":"editor"}}',true);
select pg_temp.expect_error($q$insert into public.articles(slug,title) values('bypass','bypass')$q$,'42501');
select pg_temp.expect_error($q$update public.articles set status='published'$q$,'42501');
select pg_temp.expect_error($q$delete from public.article_tags$q$,'42501');
select pg_temp.expect_error($q$insert into public.article_events(article_id,action,version) values(null,'approved',1)$q$,'42501');

-- Input failures leave no records. Trusted editorial fields use a strict whitelist.
do $$ declare bad jsonb; begin
  foreach bad in array array[null::jsonb,'[]','{}','{"title":"t","slug":" "}',
    '{"title":"t","slug":"has space"}','{"title":"t","slug":"bad","score":101}',
    '{"title":"t","slug":"bad","score":1.5}','{"title":"t","slug":"bad","score":"5"}',
    '{"title":true,"slug":"bad"}','{"title":"","slug":"empty-title"}','{"title":"   ","slug":"blank-title"}','{"title":"t","slug":"bad","sources":{}}',
    '{"title":"t","slug":"bad","affiliate_links":{}}',
    '{"title":"t","slug":"bad","status":"published"}',
    '{"title":"t","slug":"bad","approved_by":"11111111-1111-4111-8111-111111111111"}',
    '{"title":"t","slug":"bad","is_published":true}',
    '{"title":"t","slug":"bad","version":99}',
    '{"title":"t","slug":"bad","last_verified_at":"2099-01-01"}']::jsonb[] loop
    perform pg_temp.expect_error(format('select public.save_article(%L::jsonb,''{}'',null)',bad::text),'22023');
  end loop;
  perform pg_temp.expect_error($q$select public.save_article('{"title":"t","slug":"bad"}',null,null)$q$,'22023');
  perform pg_temp.expect_error($q$select public.save_article('{"title":"t","slug":"bad"}',array[null::uuid],null)$q$,'22023');
end $$;

-- A complete lifecycle checks versioned content, atomic tags, approval, correction and withdrawal.
do $$
declare a jsonb; b jsonb; payload jsonb; v_id uuid; stamp timestamptz; content_stamp timestamptz;
  n bigint; snapshot jsonb;
  checklist jsonb := '{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}';
  sources jsonb := jsonb_build_array(jsonb_build_object('url','https://example.com/synthetic','title','Synthetic source','publisher','Synthetic publisher','published_at',to_char(clock_timestamp()-interval '1 hour','YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'),'retrieved_at',to_char(clock_timestamp(),'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM')));
begin
  a := public.save_article('{"slug":"rpc-synthetic","title":"Short draft","content":"Two supported sentences."}','{}',null);
  v_id := (a->>'id')::uuid;
  perform pg_temp.check_true(a->>'status'='draft' and (a->>'version')::bigint=1,'incomplete short draft saved');
  perform pg_temp.expect_error(format('select public.approve_article(%L,1,%L)',v_id,checklist),'22023');
  perform pg_temp.expect_error(format('select public.publish_article(%L,1)',v_id),'23514');
  perform pg_temp.expect_error(format('select public.set_article_status(%L,1,''published'')',v_id),'22023');
  perform pg_temp.expect_error(format('select public.save_article(%L,''{}'',9)',jsonb_build_object('id',v_id,'title','stale')),'40001');
  payload := jsonb_build_object('id',v_id,'author','Synthetic editor','content_format','news','sources',sources);
  a := public.save_article(payload,array['22222222-2222-4222-8222-222222222222'::uuid],1);
  perform pg_temp.check_true((a->>'version')::bigint=2,'content/tags bump one version');
  select to_jsonb(x) into snapshot from public.articles x where x.id=v_id;
  select count(*) into n from public.article_events where article_id=v_id;
  perform pg_temp.expect_error(format('select public.save_article(%L,array[''99999999-9999-4999-8999-999999999999''::uuid],2)',jsonb_build_object('id',v_id,'title','must rollback')),'23503');
  perform pg_temp.check_true((select to_jsonb(x)=snapshot from public.articles x where x.id=v_id),'FK restores article');
  perform pg_temp.check_true((select count(*)=n from public.article_events where article_id=v_id),'FK restores events');
  perform pg_temp.check_true((select count(*)=1 from public.article_tags where article_id=v_id),'FK restores tags');
  a := public.save_article(payload,array['22222222-2222-4222-8222-222222222222'::uuid,'22222222-2222-4222-8222-222222222222'::uuid],2);
  perform pg_temp.check_true((a->>'version')::bigint=2 and (select count(*)=n from public.article_events where article_id=v_id),'unchanged save/tag set preserves version/history');
  perform pg_temp.expect_error(format('select public.approve_article(%L,2,null)',v_id),'22023');
  perform pg_temp.expect_error(format('select public.approve_article(%L,2,%L)',v_id,checklist-'metadata_checked'),'22023');
  perform pg_temp.expect_error(format('select public.approve_article(%L,2,%L)',v_id,checklist||'{"dates_checked":"true"}'),'22023');
  perform pg_temp.expect_error(format('select public.approve_article(%L,2,%L)',v_id,checklist||'{"dates_checked":false}'),'22023');
  a := public.approve_article(v_id,2,checklist);
  perform pg_temp.check_true(a->>'status'='approved' and (select approved_version=version and approved_by=auth.uid() and last_verified_at is not null from public.articles where articles.id=v_id),'approval linked to actor/version');
  a := public.save_article(jsonb_build_object('id',v_id,'title','Reviewed new title'),array['22222222-2222-4222-8222-222222222222'::uuid],2);
  perform pg_temp.check_true(a->>'status'='draft' and (a->>'version')::bigint=3 and (select approved_version is null and approved_by is null and approved_at is null from public.articles where articles.id=v_id),'approved content change revokes approval');
  perform pg_temp.expect_error(format('select public.approve_article(%L,2,%L)',v_id,checklist),'40001');
  perform public.approve_article(v_id,3,checklist);
  select content_updated_at into content_stamp from public.articles where articles.id=v_id;
  a := public.publish_article(v_id,3);
  select published_at into stamp from public.articles where articles.id=v_id;
  b := public.publish_article(v_id,3);
  perform pg_temp.check_true((a->>'changed')::boolean and not (b->>'changed')::boolean,'publish retry idempotent');
  perform pg_temp.check_true((select published_at=stamp and content_updated_at=content_stamp from public.articles where articles.id=v_id),'publish retry preserves timestamps');
  perform pg_temp.check_true((select count(*)=1 from public.article_events where article_id=v_id and action='published'),'one publication event');
  perform pg_temp.expect_error(format('select public.save_article(%L,''{}'',3)',jsonb_build_object('id',v_id,'title','unsafe normal save')),'23514');
  perform pg_temp.expect_error(format('select public.save_article(%L,''{}'',3,true,null)',jsonb_build_object('id',v_id,'title','unsafe correction')),'22023');
  a := public.save_article(jsonb_build_object('id',v_id,'title','Published correction'),array['22222222-2222-4222-8222-222222222222'::uuid],3,true,checklist);
  perform pg_temp.check_true(a->>'status'='published' and (a->>'version')::bigint=4,'correction remains visible/new version');
  perform pg_temp.check_true((select published_at=stamp and approved_version=4 and approved_by=auth.uid() from public.articles where articles.id=v_id),'correction approved and publication timestamp preserved');
  perform pg_temp.check_true((select count(*)=1 from public.article_events where article_id=v_id and action='corrected' and review=checklist),'correction history');
  perform pg_temp.expect_error(format('select public.publish_article(%L,3)',v_id),'40001');
  a := public.set_article_status(v_id,4,'draft');
  perform pg_temp.check_true(a->>'status'='draft' and (a->>'version')::bigint=4 and (select approved_version is null and not is_published and needs_review from public.articles where articles.id=v_id),'withdraw clears approval/no content bump');
  a := public.set_article_status(v_id,4,'discarded');
  perform pg_temp.check_true(a->>'status'='discarded' and (select discarded and not needs_review from public.articles where articles.id=v_id),'discard sync flags');
  perform public.set_article_status(v_id,4,'draft');
  perform public.approve_article(v_id,4,checklist);
  perform public.publish_article(v_id,4);
  perform pg_temp.check_true((select published_at=stamp from public.articles where articles.id=v_id),'restore preserves original publication date');
  select content_updated_at into content_stamp from public.articles where articles.id=v_id;
  a:=public.save_article(jsonb_build_object('id',v_id),array['22222222-2222-4222-8222-222222222222'::uuid],4,true,checklist);
  perform pg_temp.check_true((a->>'version')::bigint=4 and (select content_updated_at=content_stamp from public.articles where articles.id=v_id),'verification-only correction no new version');
end $$;

-- Validate all sources and the principal news date at approval and publication.
do $$ declare v_id uuid; a jsonb; src jsonb; checklist jsonb := '{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}'; stamp text; v bigint:=1; begin
  a:=public.save_article('{"slug":"rpc-source-tests","title":"Source testing","content":"Short body","author":"Synthetic editor","content_format":"news"}','{}',null); v_id:=(a->>'id')::uuid;
  foreach stamp in array array[null, to_char(clock_timestamp()-interval '73 hours','YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'),to_char(clock_timestamp()+interval '1 hour','YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'),'2026-10-05T10:00:00','2026-02-30T10:00:00Z'] loop
    src:=jsonb_build_array(jsonb_build_object('url','https://example.com/synthetic','title','Source','publisher','Publisher','published_at',stamp,'retrieved_at','2020-01-01T10:00:00Z'));
    a:=public.save_article(jsonb_build_object('id',v_id,'sources',src),'{}',v); v:=(a->>'version')::bigint;
    perform pg_temp.expect_error(format('select public.approve_article(%L,%s,%L)',v_id,v,checklist),'22023');
  end loop;
  a:=public.save_article(jsonb_build_object('id',v_id,'content_format','guide'),'{}',v); v:=(a->>'version')::bigint;
  -- Guide allows unknown publication date but still requires source metadata and collection date.
  src:=jsonb_build_array(jsonb_build_object('url','https://example.com/synthetic','title','Source','publisher','Publisher','published_at',null,'retrieved_at','2020-01-01T10:00:00Z'));
  a:=public.save_article(jsonb_build_object('id',v_id,'sources',src),'{}',v); v:=(a->>'version')::bigint;
  perform public.approve_article(v_id,v,checklist); perform public.publish_article(v_id,v);
  perform public.set_article_status(v_id,v,'draft');
  a:=public.save_article(jsonb_build_object('id',v_id,'sources',jsonb_build_array(jsonb_build_object('url','javascript:bad','title','Source','publisher','Publisher','retrieved_at','2020-01-01T10:00:00Z'))),'{}',v); v:=(a->>'version')::bigint;
  perform pg_temp.expect_error(format('select public.approve_article(%L,%s,%L)',v_id,v,checklist),'22023');
end $$;
reset session authorization;
-- Privileged synthetic fixture for revalidation and legacy retry denial, no direct client writes.
insert into public.articles(id,slug,title,content,author,content_format,status,approved_version,approved_by,approved_at,last_verified_at,sources)
values ('33333333-3333-4333-8333-333333333333','expired-approved','Expired news','Body','Synthetic editor','news','approved',1,'11111111-1111-4111-8111-111111111111',clock_timestamp(),clock_timestamp(),jsonb_build_array(jsonb_build_object('url','https://example.com','title','source','publisher','publisher','published_at','2020-01-01T00:00:00Z','retrieved_at','2020-01-01T00:00:00Z')));
insert into public.articles(id,slug,title,content,author,content_format,status,origin,approved_version,approved_by,approved_at,last_verified_at,sources)
select id,slug,'Synthetic approved guide','Body','Synthetic editor','guide','approved',origin,1,'11111111-1111-4111-8111-111111111111',clock_timestamp(),clock_timestamp(),
  '[{"url":"https://example.com/synthetic","title":"Synthetic source","publisher":"Synthetic publisher","published_at":null,"retrieved_at":"2020-01-01T00:00:00Z"}]'::jsonb
from (values ('44444444-4444-4444-8444-444444444444'::uuid,'service-manual','manual'),
  ('55555555-5555-4555-8555-555555555555'::uuid,'human-legacy','legacy')) as f(id,slug,origin);
insert into public.articles(id,slug,title,content,author,content_format,status,published_at,sources)
values ('66666666-6666-4666-8666-666666666666','historical-news','Historical news','Body','Synthetic editor','news','published','2020-01-02T00:00:00Z',
  '[{"url":"https://example.com/synthetic","title":"Synthetic source","publisher":"Synthetic publisher","published_at":"2020-01-01T00:00:00Z","retrieved_at":"2020-01-01T00:00:00Z"}]');
-- Production legacy records use objects, although new explicit inputs require arrays.
update public.articles set affiliate_links='{}' where id='55555555-5555-4555-8555-555555555555';
update public.articles set affiliate_links='{"retailer":"https://example.com/synthetic-offer"}' where id='66666666-6666-4666-8666-666666666666';
set session authorization service_role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"phonepulse_role":"editor"}}',true);
select pg_temp.expect_error($q$select public.approve_article(null,null,'{}')$q$,'42501');
select pg_temp.expect_error($q$select editorial_private.save_article('{}','{}',null,false,null)$q$,'42501');
select pg_temp.expect_error($q$select public.publish_article('33333333-3333-4333-8333-333333333333',1)$q$,'22023');
select pg_temp.expect_error($q$select public.publish_article((select id from public.articles where slug='synthetic-1'),1)$q$,'42501');
select pg_temp.check_true((public.publish_article('44444444-4444-4444-8444-444444444444',1)->>'changed')::boolean,'service publishes approved manual');
select pg_temp.expect_error($q$select public.publish_article('55555555-5555-4555-8555-555555555555',1)$q$,'42501');
reset session authorization;
select pg_temp.check_true((select actor_id is null and actor_role='service_role' from public.article_events where article_id='44444444-4444-4444-8444-444444444444' and action='published'),'service actor is explicit, not invented');
set session authorization authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"phonepulse_role":"editor"}}',true);
select pg_temp.check_true(
  (public.save_article('{"id":"55555555-5555-4555-8555-555555555555"}','{}',1)->>'status')='approved'
  and (select version=1 and approved_version=1 and affiliate_links='{}'::jsonb from public.articles where id='55555555-5555-4555-8555-555555555555'),
  'sparse unchanged save preserves legacy object, version and approval');
select pg_temp.check_true((public.publish_article('55555555-5555-4555-8555-555555555555',1)->>'changed')::boolean,'human explicitly publishes approved legacy');
do $$ declare a jsonb; before_row jsonb; v_id uuid:='66666666-6666-4666-8666-666666666666'; checklist jsonb:='{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}'; begin
  a:=public.save_article(jsonb_build_object('id',v_id,'content','Corrected historical news'),'{}',1,true,checklist);
  perform pg_temp.check_true((select affiliate_links='{"retailer":"https://example.com/synthetic-offer"}'::jsonb from public.articles where id=v_id),'sparse published correction preserves populated legacy affiliate object');
  perform pg_temp.check_true(a->>'status'='published' and (a->>'version')::bigint=2 and (select published_at='2020-01-02T00:00:00Z'::timestamptz and sources->0->>'published_at'='2020-01-01T00:00:00Z' and last_verified_at>='2026-01-01' from public.articles where id=v_id),'historical correction preserves both dates and records current verification');
  select to_jsonb(x) into before_row from public.articles x where id=v_id;
  perform pg_temp.expect_error(format('select public.save_article(%L,''{}'',2,true,%L)',jsonb_build_object('id',v_id,'sources',jsonb_build_array(jsonb_build_object('url','https://example.com','title','Source','publisher','Publisher','published_at','2099-01-01T00:00:00Z','retrieved_at','2020-01-01T00:00:00Z'))),checklist),'22023');
  perform pg_temp.expect_error(format('select public.save_article(%L,''{}'',2,true,%L)',jsonb_build_object('id',v_id,'sources',jsonb_build_array(jsonb_build_object('url','https://example.com','title','Source','publisher','Publisher','published_at','bad-date','retrieved_at','2020-01-01T00:00:00Z'))),checklist),'22023');
  perform pg_temp.check_true((select to_jsonb(x)=before_row from public.articles x where id=v_id),'invalid historical correction atomic');
  perform public.set_article_status(v_id,2,'draft');
  perform pg_temp.expect_error(format('select public.approve_article(%L,2,%L)',v_id,checklist),'22023');
end $$;
reset session authorization;
rollback;
