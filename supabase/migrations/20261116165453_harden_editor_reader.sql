begin;

-- Only the private implementation bypasses column grants, after verifying the caller.
create function editorial_private.editor_articles() returns setof public.articles
language plpgsql stable security definer set search_path = '' as $$
begin
  perform editorial_private.require_editor();
  return query select a.* from public.articles a;
end $$;
revoke all on function editorial_private.editor_articles() from public, anon, authenticated, service_role;
grant execute on function editorial_private.editor_articles() to authenticated;

create or replace function public.editor_articles() returns setof public.articles
language sql stable security invoker set search_path = '' as $$
  select * from editorial_private.editor_articles()
$$;
revoke all on function public.editor_articles() from public, anon, authenticated, service_role;
grant execute on function public.editor_articles() to authenticated;
notify pgrst, 'reload schema';
commit;
