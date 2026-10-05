begin;
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('generation','cover_repair')),
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  status text not null check (status in ('running','completed','failed','skipped_queue_full','no_candidates')),
  counts jsonb not null default '{}' check (jsonb_typeof(counts)='object'),
  check ((status='running' and finished_at is null) or (status<>'running' and finished_at is not null and finished_at >= started_at))
);
create index automation_runs_latest on public.automation_runs(job,finished_at desc)
where status in ('completed','skipped_queue_full','no_candidates');
alter table public.automation_runs enable row level security;
revoke all on public.automation_runs from public,anon,authenticated,service_role;
grant select on public.automation_runs to authenticated;
grant select,insert,update on public.automation_runs to service_role;
create policy automation_editor_read on public.automation_runs for select to authenticated
using ((select auth.uid()) is not null and (select auth.jwt()->'app_metadata'->>'phonepulse_role')='editor');
commit;
