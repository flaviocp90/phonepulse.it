\set ON_ERROR_STOP on
begin;
set local role anon;
do $$ begin
  begin
    perform 1 from public.daily_counters;
    raise exception 'anon can read daily_counters';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
do $$ declare changed integer; begin
  update public.articles set title = title;
  get diagnostics changed = row_count;
  assert changed = 0, 'non-editor can update articles';
end $$;
rollback;
