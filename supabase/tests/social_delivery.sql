\set ON_ERROR_STOP on
begin;
do $$ begin
  if to_regprocedure('public.claim_social_delivery(uuid,text,bigint)') is null then
    raise exception 'social delivery RPCs absent';
  end if;
end $$;
insert into public.articles(id,title,slug,content,author,status,version,approved_version,origin)
values ('88888888-8888-4888-8888-888888888888','Synthetic social','synthetic-social','Body','Synthetic editor','published',1,1,'manual');
set local role anon;
do $$ begin
  begin perform * from public.social_deliveries; raise exception 'anon read allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_social_delivery('88888888-8888-4888-8888-888888888888','telegram',1); raise exception 'anon claim allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","user_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  begin perform public.claim_social_delivery('88888888-8888-4888-8888-888888888888','telegram',1); raise exception 'authenticated claim allowed';
  exception when insufficient_privilege then null; end;
  if exists(select from public.social_deliveries) then raise exception 'fake editor reads deliveries'; end if;
end $$;
reset role;
set local role service_role;
do $$ declare first_claim jsonb; retry jsonb; begin
  first_claim := public.claim_social_delivery('88888888-8888-4888-8888-888888888888','telegram',1);
  if (first_claim->>'claimed')::boolean is not true then raise exception 'first claim failed'; end if;
  retry := public.claim_social_delivery('88888888-8888-4888-8888-888888888888','telegram',1);
  if (retry->>'claimed')::boolean is not false then raise exception 'sending claimed twice'; end if;
  perform public.finish_social_delivery('88888888-8888-4888-8888-888888888888','telegram',
    (first_claim->'delivery'->>'attempt_id')::uuid,'sent','42',null);
  update public.articles set version=2,approved_version=2 where id='88888888-8888-4888-8888-888888888888';
  retry := public.claim_social_delivery('88888888-8888-4888-8888-888888888888','telegram',2);
  if (retry->>'claimed')::boolean is not false or retry->'delivery'->>'provider_id' <> '42' then raise exception 'correction reposted'; end if;
  first_claim := public.claim_social_delivery('88888888-8888-4888-8888-888888888888','instagram',2);
  perform public.finish_social_delivery('88888888-8888-4888-8888-888888888888','instagram',
    (first_claim->'delivery'->>'attempt_id')::uuid,'failed',null,'Explicit rejection');
  retry := public.claim_social_delivery('88888888-8888-4888-8888-888888888888','instagram',2);
  if (retry->>'claimed')::boolean is not true then raise exception 'failed not retryable'; end if;
  begin
    perform public.finish_social_delivery('88888888-8888-4888-8888-888888888888','instagram',
      (first_claim->'delivery'->>'attempt_id')::uuid,'sent','stale',null);
    raise exception 'stale attempt finished';
  exception when serialization_failure then null; end;
  update public.social_deliveries set attempted_at=clock_timestamp()-interval '6 minutes'
    where platform='instagram' and article_id='88888888-8888-4888-8888-888888888888';
  perform public.list_social_deliveries('88888888-8888-4888-8888-888888888888');
  retry := public.claim_social_delivery('88888888-8888-4888-8888-888888888888','instagram',2);
  if (retry->>'claimed')::boolean is not false or retry->'delivery'->>'status' <> 'unknown' then raise exception 'stale sending retried'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","app_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  if (select count(*) from public.social_deliveries where article_id='88888888-8888-4888-8888-888888888888') <> 2 then raise exception 'editor cannot see states'; end if;
  begin update public.social_deliveries set status='failed'; raise exception 'editor direct update allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
