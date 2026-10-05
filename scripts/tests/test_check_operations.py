import unittest
import io
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from urllib.parse import urlparse

from check_operations import check_operations, push_heartbeat, main

NOW = datetime(2026, 10, 5, 12, tzinfo=timezone.utc)


def database(run=None, deliveries=0, public=None):
    db = Mock()
    for table in ('automation_runs', 'social_deliveries', 'articles'):
        query = Mock()
        for method in ('select', 'eq', 'in_', 'lte', 'order', 'limit', 'or_'):
            getattr(query, method).return_value = query
        query.execute.return_value = SimpleNamespace(
            data=[run] if table == 'automation_runs' and run else public or [],
            count=deliveries)
        db.table.side_effect = None
        setattr(db, table, query)
    db.table.side_effect = lambda name: getattr(db, name)
    return db


class OperationsTests(unittest.TestCase):
    def test_kuma_push_reports_health_and_rejects_unconfirmed_delivery(self):
        url = 'https://kuma.example/api/push/private-token?status=up&msg=OK&ping='
        with patch('check_operations.requests.get') as request:
            request.return_value.status_code = 200
            request.return_value.json.return_value = {'ok': True}
            for alerts, status in (([], 'up'), (['generation_stale'], 'down')):
                push_heartbeat(url, alerts)
                args, kwargs = request.call_args
                self.assertEqual(urlparse(args[0]).query, '')
                self.assertEqual(kwargs['params']['status'], status)
                self.assertEqual(kwargs['timeout'], 10)
                self.assertFalse(kwargs['allow_redirects'])
            for code, payload in ((302, {'ok': True}), (503, {}), (200, {'ok': False}), (200, {})):
                request.return_value.status_code = code
                request.return_value.json.return_value = payload
                with self.assertRaisesRegex(RuntimeError, '^Monitor push failed$'):
                    push_heartbeat(url, [])
            request.reset_mock()
            for invalid in ('http://kuma.example/api/push/token', 'https://user:secret@kuma.example/api/push/token', 'https://kuma.example/', ''):
                with self.assertRaises(ValueError):
                    push_heartbeat(invalid, [])
            request.assert_not_called()

    def test_cli_push_is_explicit_and_failure_never_exposes_secrets(self):
        with patch('check_operations.create_client'), patch('check_operations.check_operations', return_value=[]), \
                patch.dict('os.environ', {'SUPABASE_URL': 'https://supabase.test', 'SUPABASE_SERVICE_KEY': 'fake',
                                         'SUPABASE_ANON_KEY': 'fake', 'KUMA_PUSH_URL': 'https://kuma.example/api/push/private-token'}), \
                patch('check_operations.push_heartbeat') as push:
            for arguments, expected in ((['monitor'], 0), (['monitor', '--push'], 0)):
                with patch('sys.argv', arguments), patch('sys.stdout', new_callable=io.StringIO) as output:
                    self.assertEqual(main(), expected)
                    self.assertEqual(json.loads(output.getvalue()), {'alerts': []})
                if len(arguments) == 1:
                    push.assert_not_called()
            push.assert_called_once()
            push.side_effect = RuntimeError('private-token must not escape')
            with patch('sys.argv', ['monitor', '--push']), patch('sys.stdout', new_callable=io.StringIO) as output:
                self.assertEqual(main(), 1)
                self.assertEqual(json.loads(output.getvalue()), {'alerts': ['monitor_delivery_failed']})
                self.assertNotIn('private-token', output.getvalue())

    def test_absent_or_old_a_alerts_even_when_b_is_disabled(self):
        for run in (None, {'finished_at': '2026-10-03T23:00:00Z'}):
            alerts = check_operations(database(run), database(public=[{'id': 'a', 'slug': 'a', 'title': 'A'}]), NOW)
            self.assertEqual(alerts, ['generation_stale'])

    def test_healthy_empty_generation_and_public_api_are_success(self):
        db = database({'finished_at': '2026-10-04T00:00:00Z'})
        self.assertEqual(check_operations(db, database(public=[{'id': 'a', 'slug': 'a', 'title': 'A'}]), NOW), [])
        db.automation_runs.in_.assert_called_once_with('status', ['completed', 'skipped_queue_full', 'no_candidates'])
        db.table.assert_any_call('automation_runs')

    def test_public_empty_or_failure_and_pending_delivery_alert(self):
        db = database({'finished_at': '2026-10-05T11:00:00Z'}, deliveries=2)
        public = database()
        self.assertEqual(check_operations(db, public, NOW), ['public_unreadable', 'social_attention'])
        public.articles.execute.side_effect = RuntimeError('secret must not escape')
        self.assertEqual(check_operations(db, public, NOW), ['public_unreadable', 'social_attention'])

    def test_database_failure_never_reports_healthy(self):
        db = database()
        db.automation_runs.execute.side_effect = RuntimeError('private details')
        db.social_deliveries.execute.side_effect = RuntimeError('private details')
        self.assertEqual(check_operations(db, database(public=[{'id': 'a', 'slug': 'a', 'title': 'A'}]), NOW),
                         ['generation_unavailable', 'social_unavailable'])


if __name__ == '__main__':
    unittest.main()
