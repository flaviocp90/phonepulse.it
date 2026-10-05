begin;
create table public.social_deliveries (
  article_id uuid not null references public.articles(id),
  platform text not null check (platform in ('telegram','instagram')),
  article_version bigint not null check (article_version >= 1),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','unknown')),
  attempt_id uuid,
  provider_id text,
  attempted_at timestamptz,
  last_error text,
  primary key(article_id,platform),
  check (status <> 'sent' or nullif(provider_id,'') is not null)
);
alter table public.social_deliveries enable row level security;
revoke all on public.social_deliveries from public,anon,authenticated,service_role;
grant select on public.social_deliveries to authenticated;
grant select,insert,update on public.social_deliveries to service_role;
create policy social_editor_read on public.social_deliveries for select to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role')='editor');

create function editorial_private.list_social_deliveries(p_article_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
  -- A crashed sender may already have posted. Expiration never permits a blind retry.
  update public.social_deliveries set status='unknown',last_error='Sender expired; check channel manually'
  where article_id=p_article_id and status='sending' and attempted_at < clock_timestamp()-interval '5 minutes';
  return coalesce((select jsonb_agg(to_jsonb(d)-'attempt_id' order by platform)
    from public.social_deliveries d where article_id=p_article_id),'[]'::jsonb);
end $$;

create function editorial_private.claim_social_delivery(p_article_id uuid,p_platform text,p_expected_version bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.articles; d public.social_deliveries;
begin
  if p_platform not in ('telegram','instagram') or p_platform is null then
    raise exception 'Unsupported platform' using errcode='22023';
  end if;
  select * into a from public.articles where id=p_article_id for update;
  if not found or a.status <> 'published' or a.approved_version is distinct from a.version then
    raise exception 'Current published approval required' using errcode='23514';
  end if;
  if a.version is distinct from p_expected_version then
    raise exception 'Published version changed' using errcode='40001';
  end if;
  insert into public.social_deliveries(article_id,platform,article_version)
  values(p_article_id,p_platform,a.version) on conflict do nothing;
  perform editorial_private.list_social_deliveries(p_article_id);
  select * into d from public.social_deliveries where article_id=p_article_id and platform=p_platform for update;
  if d.status not in ('pending','failed') then
    return jsonb_build_object('claimed',false,'delivery',to_jsonb(d)-'attempt_id');
  end if;
  update public.social_deliveries set status='sending',article_version=a.version,
    attempt_id=gen_random_uuid(),attempted_at=clock_timestamp(),provider_id=null,last_error=null
  where article_id=p_article_id and platform=p_platform returning * into d;
  return jsonb_build_object('claimed',true,'delivery',to_jsonb(d),'article',
    jsonb_build_object('id',a.id,'title',a.title,'excerpt',a.excerpt,'slug',a.slug,
                      'cover_image_url',a.cover_image_url,'version',a.version,'status',a.status));
end $$;

create function editorial_private.finish_social_delivery(p_article_id uuid,p_platform text,p_attempt_id uuid,
  p_status text,p_provider_id text,p_last_error text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.social_deliveries;
begin
  if p_status is null or p_status not in ('sent','failed','unknown')
    or (p_status='sent' and nullif(p_provider_id,'') is null) then
    raise exception 'Invalid delivery outcome' using errcode='22023';
  end if;
  update public.social_deliveries set status=p_status,provider_id=p_provider_id,last_error=left(p_last_error,300)
  where article_id=p_article_id and platform=p_platform and status='sending' and attempt_id=p_attempt_id
  returning * into d;
  if not found then raise exception 'Delivery attempt changed' using errcode='40001'; end if;
  return to_jsonb(d)-'attempt_id';
end $$;

create function public.list_social_deliveries(p_article_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select editorial_private.list_social_deliveries(p_article_id) $$;
create function public.claim_social_delivery(p_article_id uuid,p_platform text,p_expected_version bigint) returns jsonb
language sql security invoker set search_path='' as $$ select editorial_private.claim_social_delivery(p_article_id,p_platform,p_expected_version) $$;
create function public.finish_social_delivery(p_article_id uuid,p_platform text,p_attempt_id uuid,p_status text,p_provider_id text,p_last_error text) returns jsonb
language sql security invoker set search_path='' as $$ select editorial_private.finish_social_delivery(p_article_id,p_platform,p_attempt_id,p_status,p_provider_id,p_last_error) $$;

revoke all on function editorial_private.list_social_deliveries(uuid),editorial_private.claim_social_delivery(uuid,text,bigint),
  editorial_private.finish_social_delivery(uuid,text,uuid,text,text,text),public.list_social_deliveries(uuid),
  public.claim_social_delivery(uuid,text,bigint),public.finish_social_delivery(uuid,text,uuid,text,text,text)
from public,anon,authenticated,service_role;
grant execute on function editorial_private.list_social_deliveries(uuid),editorial_private.claim_social_delivery(uuid,text,bigint),
  editorial_private.finish_social_delivery(uuid,text,uuid,text,text,text),public.list_social_deliveries(uuid),
  public.claim_social_delivery(uuid,text,bigint),public.finish_social_delivery(uuid,text,uuid,text,text,text) to service_role;
commit;
