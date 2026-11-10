\set ON_ERROR_STOP on
begin;
create function pg_temp.check_true(ok boolean, label text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception 'Assertion failed: %', label; end if; end $$;
create function pg_temp.expect_error(stmt text, expected text) returns void
language plpgsql as $$ begin
  begin execute stmt;
  exception when others then
    if SQLSTATE = expected then return; end if;
    raise exception 'Expected %, got %: %', expected, SQLSTATE, SQLERRM;
  end;
  raise exception 'Statement unexpectedly succeeded: %', stmt;
end $$;
insert into auth.users(id) values ('88888888-8888-4888-8888-888888888888');
select pg_temp.check_true(not has_table_privilege('anon', 'public.article_review_drafts', 'SELECT'), 'private draft reviews');
select pg_temp.check_true(not has_table_privilege('authenticated', 'public.article_review_drafts', 'INSERT,UPDATE,DELETE'), 'RPC-only draft writes');
set session authorization authenticated;
select set_config('request.jwt.claims', '{"sub":"88888888-8888-4888-8888-888888888888","app_metadata":{"phonepulse_role":"editor"}}', true);
select public.save_article('{"title":"Synthetic guided draft","slug":"guided-draft-fixture","content":"Local test only"}', '{}', null, false, '{"claim_draft":[{"statement":"Unfinished claim","source_url":"","evidence":"","rationale":"","decision":"unknown"}],"import_provenance":{"manifest_sha256":"synthetic-test-only","review_required":true}}')->>'id' as article_id \gset
select pg_temp.check_true((select review->'import_provenance'->>'manifest_sha256'='synthetic-test-only' and actor_id=auth.uid() from public.article_events where article_id=:'article_id' and action='saved'), 'import provenance in private authenticated audit');
select pg_temp.check_true((select jsonb_array_length(claims)=1 and version=1 and actor_id=auth.uid() from public.article_review_drafts where article_id=:'article_id'), 'claim draft persisted with authenticated actor');
select public.save_article(jsonb_build_object('id', :'article_id'), '{}', 1, false, '{"claim_draft":[]}');
select pg_temp.check_true((select claims='[]'::jsonb from public.article_review_drafts where article_id=:'article_id'), 'unchanged content can update review draft');
select pg_temp.expect_error(format('select public.save_article(%L, %L, 1, false, %L)', jsonb_build_object('id', :'article_id'), '{}', '{"claim_draft":{}}'), '22023');
select public.save_article(jsonb_build_object('id', :'article_id', 'content','Changed content'), '{}', 1);
select pg_temp.check_true(not exists(select from public.article_review_drafts where article_id=:'article_id'), 'changing content invalidates stored review unless explicitly resaved');
select pg_temp.expect_error(format('select public.save_article(%L, %L, 1, false, %L)', jsonb_build_object('id', :'article_id'), '{}', '{"claim_draft":[]}'), '40001');
insert into storage.objects(bucket_id, name) values ('editorial-media', '88888888-8888-4888-8888-888888888888/test.jpg');
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values ('editorial-media','other-editor/test.jpg')$q$, '42501');
select set_config('request.jwt.claims', '{"sub":"88888888-8888-4888-8888-888888888888","app_metadata":{},"user_metadata":{"phonepulse_role":"editor"}}', true);
select pg_temp.check_true((select count(*)=0 from public.article_review_drafts), 'non-editor cannot read reviews');
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values ('editorial-media','88888888-8888-4888-8888-888888888888/fake-editor.jpg')$q$, '42501');
reset session authorization;
select pg_temp.check_true((select public and file_size_limit=5242880 and not ('image/svg+xml'=any(allowed_mime_types)) from storage.buckets where id='editorial-media'), 'bounded raster-only bucket');
rollback;
