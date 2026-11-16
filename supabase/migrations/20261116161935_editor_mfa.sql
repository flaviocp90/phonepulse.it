begin;

-- Enrollment and recovery must be verified before rollout; never lock out an unenrolled editor.
do $$ begin
  if exists(select from auth.users u where u.raw_app_meta_data->>'phonepulse_role'='editor'
    and not exists(select from auth.mfa_factors f where f.user_id=u.id and f.factor_type='totp' and f.status='verified')) then
    raise exception 'Enroll and verify TOTP for every editor before enabling mandatory MFA';
  end if;
end $$;

create or replace function editorial_private.require_editor() returns uuid
language plpgsql security invoker set search_path = '' as $$
begin
  if editorial_private.caller_role() <> 'authenticated' or auth.uid() is null
    or (auth.jwt()->'app_metadata'->>'phonepulse_role') is distinct from 'editor'
    or (auth.jwt()->>'aal') is distinct from 'aal2' then
    raise exception 'Editor permission and MFA required' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

-- Tighten existing editor policies, including private media. Public published reads remain available.
do $$
declare p record; predicate text;
begin
  for p in select schemaname,tablename,policyname,qual,with_check from pg_policies
    where schemaname in ('public','storage') and policyname in (
      'articles_editor_read','article_events_editor_read','article_review_drafts_editor_read',
      'article_media_editor_read','automation_editor_read','social_editor_read',
      'editorial_media_editor_insert','editorial_media_editor_read')
  loop
    predicate := ' and (select auth.jwt()->>''aal'') = ''aal2''';
    if p.qual is not null then
      execute format('alter policy %I on %I.%I using ((%s)%s)',p.policyname,p.schemaname,p.tablename,p.qual,predicate);
    end if;
    if p.with_check is not null then
      execute format('alter policy %I on %I.%I with check ((%s)%s)',p.policyname,p.schemaname,p.tablename,p.with_check,predicate);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
