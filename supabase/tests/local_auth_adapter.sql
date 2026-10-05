-- Local PostgreSQL only. Never deploy this Auth simulation to Supabase.
\set ON_ERROR_STOP on
create table auth.users (id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
