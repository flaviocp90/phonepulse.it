-- Synthetic local fixture only. Never deploy this file to Supabase.
create schema storage;
create table storage.buckets(id text primary key, name text not null, public boolean not null, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, anon;
grant select on storage.objects to anon;
grant insert, select, update, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
