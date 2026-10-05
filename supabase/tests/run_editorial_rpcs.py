#!/usr/bin/env python3
"""Fresh synthetic PostgreSQL cluster only; never accepts a remote database URL."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import select
import tempfile
import time

os.umask(0o077)
parser = argparse.ArgumentParser()
parser.add_argument('--pg-bin', default='/opt/homebrew/opt/postgresql@16/bin')
parser.add_argument('--red-only', action='store_true')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
base = Path(tempfile.mkdtemp(prefix='phonepulse-editorial-rpcs-', dir='/private/tmp'))
(base / 'socket').mkdir(mode=0o700)
entries = []
manifest = base / 'manifest.json'

def persist(label, argv, result, expected=0, sql=None):
    files = {}
    for suffix, data in [('stdout', result.stdout), ('stderr', result.stderr), ('exit', str(result.returncode) + '\n')]:
        path = base / f'{label}.{suffix}'
        path.write_text(data)
        path.chmod(0o600)
        files[suffix] = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if sql is not None:
        path = base / f'{label}.sql'
        path.write_text(sql)
        path.chmod(0o600)
        files['stdin'] = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    inputs = []
    for i, arg in enumerate(argv[:-1]):
        if arg == '-f':
            path = (repo / argv[i+1]).resolve()
            inputs.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    entries.append({'label': label, 'argv': argv, 'expected_exit': expected, 'exit': result.returncode, 'files': files, 'inputs': inputs})
    manifest.write_text(json.dumps({'evidence_dir': str(base), 'commands': entries}, indent=2) + '\n')
    manifest.chmod(0o600)
    print(f'{label}: exit {result.returncode}, expected {expected}', flush=True)
    assert result.returncode == expected, f'{label} failed; inspect {base}'
    return result.stdout

def run(label, argv, expected=0, sql=None):
    result = subprocess.run(argv, input=sql, text=True, capture_output=True, cwd=repo, timeout=60)
    return persist(label, argv, result, expected, sql)

pg = Path(args.pg_bin)
psql = [str(pg / 'psql'), '-X', '-h', str(base / 'socket'), '-p', '55441', '-U', 'restore_admin', '-d', 'editorialfixture', '-v', 'ON_ERROR_STOP=1']
env = os.environ.copy()
env['PGOPTIONS'] = '-c statement_timeout=15000 -c lock_timeout=10000'
os.environ.update({'PGOPTIONS': env['PGOPTIONS']})
def concurrency_probe():
    claims = '{"sub":"77777777-7777-4777-8777-777777777777","app_metadata":{"phonepulse_role":"editor"}}'
    review = '{"title_matches_content":true,"claims_sourced":true,"dates_checked":true,"experience_documented":true,"reader_value":true,"cover_checked":true,"metadata_checked":true}'
    setup = f"""insert into auth.users(id) values ('77777777-7777-4777-8777-777777777777');
set session authorization authenticated;
select set_config('request.jwt.claims','{claims}',false);
select public.save_article('{{"title":"Concurrent publication","slug":"concurrency-probe","content":"Synthetic body","author":"Synthetic editor","content_format":"guide","sources":[{{"url":"https://example.com","title":"Synthetic source","publisher":"Synthetic publisher","published_at":null,"retrieved_at":"2020-01-01T00:00:00Z"}}]}}','{{}}',null)->>'id' as article_id \\gset
select public.approve_article(:'article_id',1,'{review}');
"""
    run('concurrency-setup', psql + ['-qAt'], sql=setup)
    article_id = run('concurrency-id', psql + ['-qAt'], sql="select id from public.articles where slug='concurrency-probe';").strip()
    query = f"select public.publish_article('{article_id}',1);\nselect published_at::text from public.articles where id='{article_id}';\n"
    first_sql = "begin;\nset session authorization service_role;\nset application_name='editorial-rpc-first';\n" + query + "\\echo LOCKED\n"
    second_sql = "set session authorization service_role;\nset application_name='editorial-rpc-second';\n" + query
    first_err = (base / 'concurrency-first.stderr').open('w')
    first = subprocess.Popen(psql + ['-qAt'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=first_err, text=True, bufsize=1)
    second = None
    first_output = ''
    try:
        first.stdin.write(first_sql)
        first.stdin.flush()
        deadline = time.monotonic() + 5
        # psql outputs one JSON line then its barrier marker, with no elapsed-time guess.
        while 'LOCKED' not in first_output:
            assert time.monotonic() < deadline, 'first publish barrier timeout'
            assert select.select([first.stdout], [], [], 5)[0], 'first publish output timeout'
            first_output += os.read(first.stdout.fileno(), 65536).decode()
        second = subprocess.Popen(psql + ['-qAt'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        second.stdin.write(second_sql)
        second.stdin.close()
        deadline = time.monotonic() + 5
        blocked = False
        lock_query = "select count(*) from pg_stat_activity where application_name='editorial-rpc-second' and wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))=1;"
        while time.monotonic() < deadline:
            result = subprocess.run(psql + ['-qAt', '-c', lock_query], text=True, capture_output=True, timeout=10)
            assert result.returncode == 0, result.stderr
            if result.stdout.strip() == '1':
                blocked = True
                persist('concurrency-blocked', psql + ['-qAt', '-c', lock_query], result)
                break
            time.sleep(0.05)
        assert blocked, 'second publish was not observed blocked on first row lock'
        first.stdin.write('commit;\n\\q\n')
        first.stdin.flush()
        first.stdin.close()
        first_output += first.stdout.read()
        first.wait(timeout=10)
        first_err.close()
        persist('concurrency-first', psql + ['-qAt'], subprocess.CompletedProcess([], first.returncode, first_output, (base / 'concurrency-first.stderr').read_text()), sql=first_sql+'commit;\n\\q\n')
        second_output, second_errors = second.stdout.read(), second.stderr.read()
        second.wait(timeout=10)
        persist('concurrency-second', psql + ['-qAt'], subprocess.CompletedProcess([], second.returncode, second_output, second_errors), sql=second_sql)
        first_result = json.loads(first_output.splitlines()[0])
        second_result = json.loads(second_output.splitlines()[0])
        assert first_result['changed'] is True and second_result['changed'] is False, 'publish concurrency outcome'
        assert first_result['id'] == second_result['id'] == article_id
        assert first_output.splitlines()[1] == second_output.splitlines()[1], 'concurrent retry changed publication timestamp'
        check = f"""do $$ begin
if (select count(*) from public.article_events where article_id='{article_id}' and action='published') <> 1 then raise exception 'duplicate publication event'; end if;
if not exists(select from public.articles a join public.article_events e on e.article_id=a.id and e.action='published' where a.id='{article_id}' and a.published_at <= e.created_at and e.actor_id is null and e.actor_role='service_role') then raise exception 'timestamp or service actor changed'; end if;
end $$;
"""
        run('concurrency-check', psql, sql=check)
    finally:
        for process in [first, second]:
            if process is not None and process.poll() is None:
                process.kill()
                process.wait()
        first_err.close()

started = False
try:
    run('initdb', [str(pg / 'initdb'), '-D', str(base / 'cluster'), '-A', 'trust', '-U', 'restore_admin'])
    run('start', [str(pg / 'pg_ctl'), '-D', str(base / 'cluster'), '-l', str(base / 'server.log'), '-o', f"-k {base / 'socket'} -p 55441 -h ''", 'start'])
    started = True
    run('create', [str(pg / 'createdb'), '-h', str(base / 'socket'), '-p', '55441', '-U', 'restore_admin', 'editorialfixture'])
    run('fixture', psql + ['-f', 'supabase/tests/fixture_baseline.sql', '-f', 'supabase/tests/local_auth_adapter.sql'])
    run('task2-migration', psql + ['-f', 'supabase/migrations/20261005091140_editorial_state.sql'])
    run('task2-green', psql + ['-f', 'supabase/tests/editorial_security.sql', '-f', 'supabase/tests/editorial_state.sql'])
    run('red', psql + ['-f', 'supabase/tests/editorial_rpcs.sql'], expected=3)
    assert 'editorial RPCs absent' in (base / 'red.stderr').read_text(), 'wrong RED failure'
    if not args.red_only:
        migrations = list((repo / 'supabase/migrations').glob('*_editorial_rpcs.sql'))
        assert len(migrations) == 1, 'exactly one Task3 migration required'
        run('task3-migration', psql + ['-f', str(migrations[0])])
        run('green', psql + ['-f', 'supabase/tests/editorial_rpcs.sql'])
        concurrency_probe()
finally:
    if started:
        run('stop', [str(pg / 'pg_ctl'), '-D', str(base / 'cluster'), 'stop', '-m', 'fast'])
    print(f'Evidence: {manifest}', flush=True)
    print(f'Manifest SHA256: {hashlib.sha256(manifest.read_bytes()).hexdigest()}', flush=True)
