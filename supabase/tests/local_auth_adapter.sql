-- Local PostgreSQL only. Never deploy this Auth simulation to Supabase.
\set ON_ERROR_STOP on
create table auth.users (id uuid primary key, raw_app_meta_data jsonb not null default '{}');
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), factor_type text, status text);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
