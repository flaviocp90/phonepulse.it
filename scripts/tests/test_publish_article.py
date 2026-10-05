import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch, mock_open

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
        with patch.object(publishing, 'update_sitemap') as sitemap, \
             patch.object(publishing, 'invia_telegram') as telegram:
            result = publishing.run_publication(db, dry_run=True, publish_count=3)
            self.assertEqual(result['candidates'], ['fresh'])
            self.assertEqual(result['expired'], 1)
            db.rpc.assert_not_called()
            db.table.return_value.update.assert_not_called()
            sitemap.assert_not_called()
            telegram.assert_not_called()

    def test_publishes_via_rpc_with_expected_version(self):
        db = database([article()])
        with patch.object(publishing, 'update_sitemap', return_value=True), \
             patch.object(publishing, 'invia_telegram'):
            result = publishing.run_publication(db, publish_count=1)
        self.assertEqual(result['published'], 1)
        db.rpc.assert_called_once_with('publish_article', {'p_id': 'fresh', 'p_expected_version': 2})
        db.table.return_value.update.assert_not_called()

    def test_conflict_is_recorded_and_unchanged_retry_does_not_notify(self):
        error = RuntimeError('changed since SELECT')
        error.code = '40001'
        db = database([article()])
        db.rpc.return_value.execute.side_effect = error
        with patch.object(publishing, 'update_sitemap', return_value=True), \
             patch.object(publishing, 'invia_telegram') as telegram:
            result = publishing.run_publication(db)
            self.assertEqual(result['conflicts'], 1)
            telegram.assert_not_called()
        db.rpc.return_value.execute.side_effect = None
        db.rpc.return_value.execute.return_value.data['changed'] = False
        with patch.object(publishing, 'update_sitemap', return_value=True), \
             patch.object(publishing, 'invia_telegram') as telegram:
            self.assertEqual(publishing.run_publication(db)['unchanged'], 1)
            telegram.assert_not_called()

    def test_unknown_source_is_excluded_but_guide_has_no_news_ttl(self):
        db = database([article(sources=[{'published_at': None}]),
                       article(id='guide', content_format='guide', sources=[{'published_at': None}])])
        self.assertEqual(publishing.run_publication(db, dry_run=True)['candidates'], ['guide'])

    def test_distribution_recovery_runs_without_new_candidates(self):
        db = database([])
        with patch.object(publishing, 'update_sitemap', return_value=True) as sitemap:
            self.assertEqual(publishing.run_publication(db)['published'], 0)
            sitemap.assert_called_once_with(db)
        with patch.object(publishing, 'update_sitemap', return_value=False):
            with self.assertRaisesRegex(RuntimeError, 'distribution'):
                publishing.run_publication(db)

    def test_retry_pushes_existing_sitemap_commit(self):
        db = database([])
        def failed_push(command, **kwargs):
            if command == ['git', 'commit', '-m', 'chore: aggiorna sitemap.xml con articoli pubblicati [skip ci]']:
                return SimpleNamespace(returncode=1, stdout='nothing to commit', stderr='')
            if command == ['git', 'push']:
                raise RuntimeError('push unavailable')
            return SimpleNamespace(returncode=0, stdout='', stderr='')
        with patch('builtins.open', mock_open()), \
             patch.object(publishing.subprocess, 'run', side_effect=failed_push) as run:
            self.assertFalse(publishing.update_sitemap(db))
            self.assertEqual(run.call_args.args[0], ['git', 'push'])

    def test_rpc_failure_cannot_report_success(self):
        db = database([article()])
        db.rpc.return_value.execute.side_effect = RuntimeError('DB down')
        with patch.object(publishing, 'update_sitemap', return_value=True), \
             patch.object(publishing, 'invia_telegram') as telegram:
            with self.assertRaises(RuntimeError):
                publishing.run_publication(db)
            telegram.assert_not_called()


if __name__ == '__main__':
    unittest.main()
