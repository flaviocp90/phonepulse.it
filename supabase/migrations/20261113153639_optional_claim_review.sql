begin;

alter table public.articles alter column claims_required set default false;
update public.articles set claims_required = false where claims_required;

create or replace function editorial_private.validate_claims(p_article public.articles, p_review jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare claim jsonb; evidence jsonb := p_review->'claim_evidence';
begin
  if not coalesce(p_review ? 'claim_evidence', false) then return; end if;
  if evidence->>'schema_version' is distinct from '1' or evidence->>'mode' is distinct from 'manual_editor_review'
    or jsonb_typeof(evidence->'claims') is distinct from 'array' then
    raise exception 'Structured claim evidence required' using errcode='22023';
  end if;
  if jsonb_array_length(evidence->'claims') not between 1 and 12 or octet_length(evidence::text)>30000 then
    raise exception 'Invalid claim evidence size' using errcode='22023';
  end if;
  for claim in select value from jsonb_array_elements(evidence->'claims') loop
    if jsonb_typeof(claim) is distinct from 'object' or claim->>'decision' is distinct from 'supported'
      or jsonb_typeof(claim->'statement') is distinct from 'string' or length(btrim(claim->>'statement')) not between 15 and 700
      or jsonb_typeof(claim->'evidence') is distinct from 'string' or length(btrim(claim->>'evidence')) not between 15 and 240
      or jsonb_typeof(claim->'rationale') is distinct from 'string' or length(btrim(claim->>'rationale')) not between 20 and 500
      or jsonb_typeof(claim->'source_url') is distinct from 'string'
      or claim->>'source_url' !~ '^https://[^[:space:]@/?#]+([/?#][^[:space:]]*)?$'
      or not exists(select from jsonb_array_elements(p_article.sources) src
        where src->>'url'=claim->>'source_url' and src->>'retrieved_at' is not null) then
      raise exception 'Every claim requires a supported decision, consulted source, excerpt and rationale' using errcode='22023';
    end if;
  end loop;
end $$;
revoke all on function editorial_private.validate_claims(public.articles,jsonb) from public,anon,authenticated,service_role;

commit;
