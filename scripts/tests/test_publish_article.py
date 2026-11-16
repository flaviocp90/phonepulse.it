import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

import publish_article as publishing


def article(**changes):
    return {'id': 'fresh', 'title': 'Android update', 'slug': 'android-update',
            'status': 'approved', 'origin': 'rss', 'version': 2, 'approved_version': 2,
            'content_format': 'news', 'sources': [{'published_at': datetime.now(timezone.utc).isoformat()}],
            **changes}


def database(rows):
    db = Mock()
    query = db.table.return_value
    for method in ('select', 'eq', 'order', 'range'):
        getattr(query, method).return_value = query
    query.execute.return_value = SimpleNamespace(data=rows)
    db.rpc.return_value.execute.return_value = SimpleNamespace(data={
        'id': 'fresh', 'version': 2, 'status': 'published', 'changed': True})
    return db


class PublishArticleTests(unittest.TestCase):
    def test_dry_run_selects_only_current_approved_and_has_no_effects(self):
        db = database([article(status='draft'), article(), article(id='old', sources=[{
            'published_at': (datetime.now(timezone.utc) - timedelta(hours=73)).isoformat()}]),
            article(id='legacy', origin='legacy'), article(id='modified', approved_version=1)])
        with patch.object(publishing, 'invia_telegram') as telegram:
            result = publishing.run_publication(db, dry_run=True, publish_count=3)
            self.assertEqual(result['candidates'], ['fresh'])
            self.assertEqual(result['expired'], 1)
            db.rpc.assert_not_called()
            db.table.return_value.update.assert_not_called()
            telegram.assert_not_called()

    def test_evidence_required_mode_excludes_older_approvals(self):
        db = database([article(id='older', claims_required=False),
                       article(id='missing'), article(claims_required=True)])
        result = publishing.run_publication(db, dry_run=True, require_evidence=True)
        self.assertEqual(result['candidates'], ['fresh'])
        self.assertEqual(result['ineligible'], 2)
        query = db.table.return_value
        query.eq.assert_any_call('claims_required', True)
        db.rpc.assert_not_called()

    def test_evidence_required_mode_fails_before_writes_if_migration_missing(self):
        db = database([])
        db.table.return_value.execute.side_effect = RuntimeError('claims_required unavailable')
        with self.assertRaisesRegex(RuntimeError, 'claims_required'):
            publishing.run_publication(db, require_evidence=True)
        db.rpc.assert_not_called()

    def test_publishes_via_rpc_with_expected_version(self):
        db = database([article()])
        with patch.object(publishing, 'invia_telegram'):
            result = publishing.run_publication(db, publish_count=1)
        self.assertEqual(result['published'], 1)
        db.rpc.assert_called_once_with('publish_article', {'p_id': 'fresh', 'p_expected_version': 2})
        db.table.return_value.update.assert_not_called()

    def test_conflict_is_recorded_and_unchanged_retry_does_not_notify(self):
        error = RuntimeError('changed since SELECT')
        error.code = '40001'
        db = database([article()])
        db.rpc.return_value.execute.side_effect = error
        with patch.object(publishing, 'invia_telegram') as telegram:
            result = publishing.run_publication(db)
            self.assertEqual(result['conflicts'], 1)
            telegram.assert_not_called()
        db.rpc.return_value.execute.side_effect = None
        db.rpc.return_value.execute.return_value.data['changed'] = False
        with patch.object(publishing, 'invia_telegram') as telegram:
            self.assertEqual(publishing.run_publication(db)['unchanged'], 1)
            telegram.assert_not_called()

    def test_unknown_source_is_excluded_but_guide_has_no_news_ttl(self):
        db = database([article(sources=[{'published_at': None}]),
                       article(id='guide', content_format='guide', sources=[{'published_at': None}])])
        self.assertEqual(publishing.run_publication(db, dry_run=True)['candidates'], ['guide'])

    def test_empty_queue_has_no_publication_or_distribution_effects(self):
        db = database([])
        with patch.object(publishing, 'invia_telegram') as telegram:
            self.assertEqual(publishing.run_publication(db)['published'], 0)
            db.rpc.assert_not_called()
            telegram.assert_not_called()

    def test_rpc_failure_cannot_report_success(self):
        db = database([article()])
        db.rpc.return_value.execute.side_effect = RuntimeError('DB down')
        with patch.object(publishing, 'invia_telegram') as telegram:
            with self.assertRaises(RuntimeError):
                publishing.run_publication(db)
            telegram.assert_not_called()


if __name__ == '__main__':
    unittest.main()
