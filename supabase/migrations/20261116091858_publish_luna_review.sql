begin;

-- Accept a version-specific review from a trusted worker and publish atomically on a pass.
create function editorial_private.submit_luna_review(p_id uuid, p_expected_version bigint, p_review jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  checkpoint text;
  finding jsonb;
  all_passed boolean := true;
  both_filters_clear boolean;
  outcome text;
  a public.articles;
  stamp timestamptz;
begin
  if editorial_private.caller_role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  foreach checkpoint in array array['title_matches_content', 'claims_sourced', 'dates_checked',
      'experience_documented', 'reader_value', 'cover_checked', 'metadata_checked'] loop
    finding := p_review->'checks'->checkpoint;
    if coalesce(finding->>'status', '') not in ('pass', 'fail', 'uncertain')
       or jsonb_typeof(finding->'reason') is distinct from 'string'
       or coalesce(length(btrim(finding->>'reason')), 0) not between 1 and 500 then
      raise exception 'Invalid Luna checkpoint' using errcode = '22023';
    end if;
    all_passed := all_passed and finding->>'status' = 'pass';
  end loop;

  foreach checkpoint in array array['us_only', 'discount'] loop
    finding := p_review->'filters'->checkpoint;
    if coalesce(finding->>'status', '') not in ('yes', 'no', 'uncertain')
       or jsonb_typeof(finding->'reason') is distinct from 'string'
       or coalesce(length(btrim(finding->>'reason')), 0) not between 1 and 500 then
      raise exception 'Invalid Luna filter' using errcode = '22023';
    end if;
  end loop;

  both_filters_clear := p_review #>> '{filters,us_only,status}' = 'no'
                    and p_review #>> '{filters,discount,status}' = 'no';
  outcome := case
    when p_review #>> '{filters,us_only,status}' = 'yes'
      or p_review #>> '{filters,discount,status}' = 'yes' then 'discarded'
    when all_passed and both_filters_clear then 'passed'
    else 'needs_attention'
  end;

  if not editorial_private.record_ai_draft_review(
    p_id, p_expected_version, p_review || jsonb_build_object('outcome', outcome)
  ) then
    return 'changed_since_read';
  end if;
  if outcome <> 'passed' then
    return outcome;
  end if;

  select * into strict a from public.articles where id = p_id;
  perform editorial_private.validate_content(a, true);
  if a.claims_required then
    raise exception 'This version also requires editor claim evidence' using errcode = '22023';
  end if;
  stamp := clock_timestamp();
  update public.articles set status = 'published', published_at = coalesce(published_at, stamp),
    last_verified_at = stamp, updated_at = stamp where id = p_id;
  insert into public.article_events(article_id, action, version, actor_role)
    values (p_id, 'published', a.version, 'service_role');
  return 'published';
end $$;

create function public.submit_luna_review(p_id uuid, p_expected_version bigint, p_review jsonb)
returns text language sql security invoker set search_path = '' as $$
  select editorial_private.submit_luna_review(p_id, p_expected_version, p_review)
$$;
revoke all on function public.submit_luna_review(uuid,bigint,jsonb),
  editorial_private.submit_luna_review(uuid,bigint,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_luna_review(uuid,bigint,jsonb),
  editorial_private.submit_luna_review(uuid,bigint,jsonb) to service_role;

commit;
