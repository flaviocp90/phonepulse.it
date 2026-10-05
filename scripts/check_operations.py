"""Read-only checks; optional Kuma push with --push, JSON stdout and exit 1 for attention."""
import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit
import requests
from supabase import create_client


def push_heartbeat(url, alerts):
    parts = urlsplit(url)
    _, separator, token = parts.path.rpartition('/api/push/')
    if (parts.scheme != 'https' or not parts.hostname or parts.username or parts.password
            or parts.fragment or not separator or not token or '/' in token):
        raise ValueError('Kuma URL must be an HTTPS push endpoint without credentials')
    # Generated Kuma URLs include default status=up; replace it with the actual result.
    endpoint = urlunsplit((parts.scheme, parts.netloc, parts.path, '', ''))
    try:
        result = requests.get(endpoint, params={'status': 'down' if alerts else 'up',
                                              'msg': 'PhonePulse needs attention' if alerts else 'PhonePulse OK'},
                              timeout=10, allow_redirects=False)
        if result.status_code != 200 or result.json().get('ok') is not True:
            raise RuntimeError('Push not acknowledged')
    except Exception:
        # Never propagate URLs/tokens or provider response details into logs.
        raise RuntimeError('Monitor push failed') from None


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
    parser.add_argument('--push', action='store_true', help='Send result to KUMA_PUSH_URL (may trigger configured alerts)')
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
    if args.push:
        try:
            push_heartbeat(os.environ.get('KUMA_PUSH_URL', ''), alerts)
        except Exception:
            alerts.append('monitor_delivery_failed')
    print(json.dumps({'alerts': alerts}))
    return int(bool(alerts))


if __name__ == '__main__':
    raise SystemExit(main())
