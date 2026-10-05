\set ON_ERROR_STOP on
begin;
do $$ begin
  if to_regclass('public.automation_runs') is null then
    raise exception 'automation runs absent';
  end if;
end $$;
set local role service_role;
insert into public.automation_runs(job,status) values ('generation','running');
update public.automation_runs set status='no_candidates',finished_at=clock_timestamp(),counts='{"created":0}';
do $$ begin
  begin
    insert into public.automation_runs(job,status) values ('generation','completed');
    raise exception 'unfinished completion allowed';
  exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform * from public.automation_runs; raise exception 'anon reads runs';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","user_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  if exists(select from public.automation_runs) then raise exception 'fake editor reads runs'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","app_metadata":{"phonepulse_role":"editor"}}',true);
do $$ begin
  if (select count(*) from public.automation_runs) <> 1 then raise exception 'editor cannot read runs'; end if;
  begin insert into public.automation_runs(job,status) values ('generation','running'); raise exception 'editor writes runs';
  exception when insufficient_privilege then null; end;
  begin update public.automation_runs set status='running'; raise exception 'editor updates runs';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
