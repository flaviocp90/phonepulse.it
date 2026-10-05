"""Read-only monitor: JSON on stdout, exit 1 for attention; no notifications."""
import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from supabase import create_client


def check_operations(db, public_db, now):
    alerts = []
    try:
        result = (db.table('automation_runs').select('finished_at').eq('job', 'generation')
                  .in_('status', ['completed', 'skipped_queue_full', 'no_candidates'])
                  .lte('finished_at', now.isoformat()).order('finished_at', desc=True).limit(1).execute())
        finished = (datetime.fromisoformat(result.data[0]['finished_at'].replace('Z', '+00:00'))
                    if result.data else None)
        if finished is None or now - finished > timedelta(hours=36):
            alerts.append('generation_stale')
    except Exception:
        alerts.append('generation_unavailable')
    try:
        rows = public_db.table('articles').select('id,slug,title').eq('is_published', True).limit(1).execute().data
        if not rows or not all(rows[0].get(key) for key in ('id', 'slug', 'title')):
            alerts.append('public_unreadable')
    except Exception:
        alerts.append('public_unreadable')
    try:
        cutoff = (now - timedelta(minutes=5)).isoformat()
        pending = (db.table('social_deliveries').select('article_id', count='exact', head=True)
                   .or_(f'status.in.(failed,unknown),and(status.eq.sending,attempted_at.lt.{cutoff})').execute())
        if pending.count is None:
            raise RuntimeError('Delivery count unavailable')
        if pending.count:
            alerts.append('social_attention')
    except Exception:
        alerts.append('social_unavailable')
    return alerts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--now', help='ISO timestamp with timezone (controlled verification)')
    args = parser.parse_args()
    try:
        now = datetime.fromisoformat(args.now.replace('Z', '+00:00')) if args.now else datetime.now(timezone.utc)
        if now.tzinfo is None:
            raise ValueError('Timestamp requires timezone')
        url = os.environ['SUPABASE_URL']
        # Separate anon client proves public RLS/API readability; service bypass cannot prove it.
        alerts = check_operations(create_client(url, os.environ['SUPABASE_SERVICE_KEY']),
                                  create_client(url, os.environ['SUPABASE_ANON_KEY']), now)
    except Exception:
        alerts = ['monitor_unavailable']
    print(json.dumps({'alerts': alerts}))
    return int(bool(alerts))


if __name__ == '__main__':
    raise SystemExit(main())
