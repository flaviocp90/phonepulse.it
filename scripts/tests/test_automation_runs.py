import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
from automation_runs import run_tracked
import news_automation as news
from test_news_automation import database


class RunTests(unittest.TestCase):
    def test_outcome_and_counts_persist_and_exception_is_failed(self):
        for failed in (False, True):
            db = database([{'id': 'run-1'}])

            def pipeline(client, counts):
                counts['created'] = 2
                if failed:
                    raise RuntimeError('secret detail')
                return 'completed'

            with patch('builtins.print'):
                if failed:
                    with self.assertRaises(RuntimeError):
                        run_tracked(db, 'generation', pipeline)
                else:
                    self.assertEqual(run_tracked(db, 'generation', pipeline)['status'], 'completed')
            saved = db.table.return_value.update.call_args.args[0]
            self.assertEqual(saved['status'], 'failed' if failed else 'completed')
            self.assertEqual(saved['counts'], {'created': 2})
            self.assertIsNotNone(saved['finished_at'])
            self.assertNotIn('secret detail', str(saved))

    def test_tracking_failure_prevents_provider_work(self):
        work = Mock()
        with self.assertRaises(RuntimeError):
            run_tracked(database(), 'generation', work)
        work.assert_not_called()

    def test_finish_missing_row_cannot_report_success(self):
        db = database()
        db.table.return_value.execute.side_effect = [SimpleNamespace(data=[{'id': 'run'}]), SimpleNamespace(data=[])]
        with self.assertRaises(RuntimeError), patch('builtins.print'):
            run_tracked(db, 'generation', lambda client, counts: 'no_candidates')

    def test_generation_queue_full_and_no_candidates_are_distinct(self):
        for queued, sources, expected in ((20, [], 'skipped_queue_full'), (0, [], 'no_candidates')):
            with patch.object(news, 'raccogli_tutti_i_feed', return_value=sources), \
                 patch.object(news, 'get_category_id_news', return_value='news'):
                self.assertEqual(news.run_generation(database(count=queued), {}, 'Editor'), expected)

    def test_generation_summary_replaces_per_article_notification(self):
        db = database([{'id': 'run'}])
        with patch.object(news, 'get_supabase', return_value=db), \
             patch.object(news, 'run_generation', return_value='completed'), \
             patch.object(news, 'invia_telegram') as notify, \
             patch.dict(news.os.environ, {'PHONEPULSE_EDITOR_AUTHOR': 'Editor'}), patch('builtins.print'):
            news.main()
        self.assertEqual(notify.call_count, 1)


if __name__ == '__main__':
    unittest.main()
