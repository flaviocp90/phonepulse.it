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
insert into storage.objects(bucket_id, name) values ('editorial-media', '88888888-8888-4888-8888-888888888888/99999999-9999-4999-8999-999999999999.jpg');
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values ('editorial-media','other-editor/test.jpg')$q$, '42501');
select pg_temp.check_true((select claims_required from public.articles where id=:'article_id'), 'new drafts require claims');
select pg_temp.expect_error(format('select public.save_article(%L, %L, 2)', jsonb_build_object('id', :'article_id', 'claims_required', false), '{}'), '22023');
select public.save_article(jsonb_build_object('id', :'article_id', 'author','Synthetic editor','content_format','guide','sources',
  '[{"url":"https://example.com/synthetic","title":"Synthetic source","publisher":"Synthetic publisher","retrieved_at":"2020-01-01T00:00:00Z","published_at":null}]'::jsonb), '{}', 2);
select set_config('test.guided_id', :'article_id', true);
do $$ declare
  target_id uuid := current_setting('test.guided_id')::uuid;
  review jsonb := '{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}';
  evidence jsonb := '{"schema_version":1,"mode":"manual_editor_review","claims":[{"statement":"Synthetic claim requiring source review.","source_url":"https://example.com/synthetic","evidence":"Synthetic evidence from the consulted source.","rationale":"Synthetic reviewer checked the source and its context.","decision":"supported"}]}';
begin
  perform pg_temp.expect_error(format('select public.approve_article(%L,3,%L)',target_id,review),'22023');
  perform pg_temp.expect_error(format('select public.approve_article(%L,3,%L)',target_id,review||jsonb_build_object('claim_evidence',jsonb_set(evidence,'{claims,0,decision}','"unknown"'))),'22023');
  perform pg_temp.expect_error(format('select public.approve_article(%L,3,%L)',target_id,review||jsonb_build_object('claim_evidence',jsonb_set(evidence,'{claims,0,source_url}','"https://other.example.com"'))),'22023');
  perform public.approve_article(target_id,3,review||jsonb_build_object('claim_evidence',evidence));
  perform public.save_article(jsonb_build_object('id',target_id,'content','![Synthetic photo](https://www.phonepulse.it/api/media?path=88888888-8888-4888-8888-888888888888/99999999-9999-4999-8999-999999999999.jpg)'), '{}',3);
  perform pg_temp.check_true((select status='draft' and version=4 from public.articles where id=target_id),'editing approved content revokes approval');
  perform pg_temp.check_true((select count(*)=1 from public.article_media where article_media.article_id=target_id),'photo visibility registration');
  perform public.approve_article(target_id,4,review||jsonb_build_object('claim_evidence',evidence));
  perform set_config('test.guided_review', (review||jsonb_build_object('claim_evidence',evidence))::text,true);
end $$;
set session authorization anon;
select pg_temp.check_true((select count(*)=0 from storage.objects), 'draft photo not anonymously readable');
select pg_temp.check_true((select count(*)=0 from public.article_media), 'draft photo links not public');
set session authorization authenticated;
select public.publish_article(:'article_id',4);
set session authorization anon;
select pg_temp.check_true((select count(*)=1 from storage.objects), 'published photo anonymously readable');
set session authorization authenticated;
select pg_temp.expect_error(format('select public.save_article(%L, %L, 4, true, %L)',jsonb_build_object('id', :'article_id','content','Correction without claims'), '{}', '{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}'),'22023');
select public.set_article_status(:'article_id',4,'discarded');
set session authorization anon;
select pg_temp.check_true((select count(*)=0 from storage.objects), 'withdrawal removes public photo access');
set session authorization authenticated;
select public.set_article_status(:'article_id',4,'draft');
select public.save_article(jsonb_build_object('id', :'article_id', 'sources', '[{"url":"https://user:secret@example.com/source","title":"Synthetic source","publisher":"Synthetic publisher","retrieved_at":"2020-01-01T00:00:00Z","published_at":null}]'::jsonb), '{}',4);
select pg_temp.expect_error(format('select public.approve_article(%L,5,%L)', :'article_id', jsonb_set(current_setting('test.guided_review')::jsonb, '{claim_evidence,claims,0,source_url}', '"https://user:secret@example.com/source"')), '22023');
select set_config('request.jwt.claims', '{"sub":"88888888-8888-4888-8888-888888888888","app_metadata":{},"user_metadata":{"phonepulse_role":"editor"}}', true);
select pg_temp.check_true((select count(*)=0 from public.article_review_drafts), 'non-editor cannot read reviews');
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values ('editorial-media','88888888-8888-4888-8888-888888888888/fake-editor.jpg')$q$, '42501');
reset session authorization;
select pg_temp.check_true((select not public and file_size_limit=5242880 and not ('image/svg+xml'=any(allowed_mime_types)) from storage.buckets where id='editorial-media'), 'bounded raster-only bucket');
rollback;
