import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

from check_operations import check_operations

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
