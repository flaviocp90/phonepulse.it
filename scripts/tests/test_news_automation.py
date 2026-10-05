import json
import os
import subprocess
import sys
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

# Synthetic config only; no tests create a live client.
os.environ.setdefault('SUPABASE_URL', 'https://example.invalid')
os.environ.setdefault('SUPABASE_SERVICE_KEY', 'test-only')
import news_automation as news
import fix_cover_images as covers
from test_editorial_rules import brief, URL


def item(**changes):
    return {'title': 'Aggiornamento Android', 'link': URL,
            'excerpt': 'Nuova funzione Android.', 'publisher': 'Example',
            'published_at': datetime.now(timezone.utc).isoformat(),
            'retrieved_at': '2026-10-05T12:00:00+00:00', **changes}


def database(data=None, count=0):
    db = Mock()
    query = db.table.return_value
    for method in ('select', 'eq', 'insert', 'update', 'is_', 'limit', 'order'):
        getattr(query, method).return_value = query
    query.execute.return_value = SimpleNamespace(data=data or [], count=count)
    return db


class AutomationTests(unittest.TestCase):
    def setUp(self):
        sleeper = patch.object(news.time, 'sleep')
        sleeper.start()
        self.addCleanup(sleeper.stop)

    def test_feed_transport_is_bounded_and_preserves_source_metadata(self):
        xml = b'<rss version="2.0"><channel><title>Example</title><item><title>Android update</title><link>https://example.com/official</link><description>&lt;b&gt;New&lt;/b&gt; function &amp;amp; fixes</description><pubDate>Mon, 05 Oct 2026 10:00:00 GMT</pubDate></item><item><title>Android unknown date</title><link>https://example.com/unknown</link></item></channel></rss>'
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [xml]
        with patch.object(news.requests, 'get', return_value=response) as request:
            result = news.leggi_feed('https://example.com/feed')
            self.assertEqual(result[0]['publisher'], 'Example')
            self.assertEqual(result[0]['published_at'], '2026-10-05T10:00:00+00:00')
            self.assertEqual(result[0]['excerpt'], 'New function & fixes')
            self.assertIsNone(result[1]['published_at'])
            self.assertEqual(request.call_args.kwargs['timeout'], (10, 20))
            response.iter_content.return_value = [b'x' * (news.MAX_FEED_BYTES + 1)]
            with self.assertRaises(ValueError):
                news.leggi_feed('https://example.com/feed')

    def test_no_available_feed_fails_but_empty_feed_is_valid(self):
        with patch.object(news, 'leggi_feed', side_effect=RuntimeError('offline')):
            with self.assertRaises(RuntimeError):
                news.raccogli_tutti_i_feed()
        with patch.object(news, 'leggi_feed', return_value=[]):
            self.assertEqual(news.raccogli_tutti_i_feed(), [])

    def test_counter_failure_or_empty_update_propagates(self):
        db = database([{'gemini_calls': 4}])
        db.table.return_value.execute.side_effect = [SimpleNamespace(data=[{'gemini_calls': 4}]),
                                                     SimpleNamespace(data=[])]
        with self.assertRaises(RuntimeError):
            news.incrementa_gemini_calls(db)

    def test_import_requires_no_env_or_network(self):
        env = {key: value for key, value in os.environ.items()
               if not key.startswith(('SUPABASE_', 'GEMINI_', 'OPENROUTER_'))}
        result = subprocess.run([sys.executable, '-c',
                                 'import news_automation, fix_cover_images'],
                                env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_invalid_or_unfresh_input_never_reaches_cover(self):
        with patch.object(news, 'genera_bozza', return_value=(None, None)) as llm, \
             patch.object(news, 'cerca_cover_image') as cover:
            for source in (item(published_at=None), item(published_at='2099-01-01T00:00:00Z'),
                           item(published_at='2020-01-01T00:00:00Z'),
                           item(title='Politica nazionale', excerpt='Elezioni'),
                           item(title='8 app Android', excerpt='Una lista senza dettagli')):
                self.assertEqual(news.processa_articolo(source, database(), 'news', 'Editor'), 'skipped')
            llm.assert_not_called()
            cover.assert_not_called()

    def test_gate_precedes_cover_and_short_draft_is_whitelisted(self):
        db = database()
        db.table.return_value.execute.side_effect = [SimpleNamespace(data=[]), SimpleNamespace(data=[]),
                                                     SimpleNamespace(data=[{'id': 'new'}])]
        with patch.object(news, 'genera_bozza', return_value=(brief(
                author='Invented', status='published', approved_version=1), 'model')), \
             patch.object(news, 'cerca_cover_image', return_value=(None, None)), \
             patch.object(news, 'invia_telegram') as notification:
            self.assertEqual(news.processa_articolo(item(), db, 'news', 'Editor'), 'created')
        record = db.table.return_value.insert.call_args.args[0]
        self.assertEqual(record['author'], 'Editor')
        self.assertEqual(record['status'], 'draft')
        self.assertEqual(record['origin'], 'rss')
        self.assertEqual(record['sources'][0]['url'], URL)
        self.assertEqual(record['source_key'], URL)
        self.assertEqual(record['content_format'], 'news')
        self.assertNotIn('approved_version', record)
        notification.assert_not_called()
        with patch.object(news, 'genera_bozza', return_value=([], 'model')), \
             patch.object(news, 'cerca_cover_image') as cover:
            self.assertEqual(news.processa_articolo(item(), database(), 'news', 'Editor'), 'failed')
            cover.assert_not_called()

    def test_duplicate_is_skipped_before_llm(self):
        with patch.object(news, 'genera_bozza') as llm:
            self.assertEqual(news.processa_articolo(item(), database([{'id': 'existing'}]),
                                                   'news', 'Editor'), 'skipped')
            llm.assert_not_called()

    def test_database_failure_is_not_silenced(self):
        db = database()
        db.table.return_value.execute.side_effect = RuntimeError('DB unavailable')
        with self.assertRaises(RuntimeError):
            news.processa_articolo(item(), db, 'news', 'Editor')

    def test_full_rss_queue_does_not_fetch_or_generate(self):
        db = database(count=20)
        with patch.dict(os.environ, {'PHONEPULSE_EDITOR_AUTHOR': 'Editor'}), \
             patch.object(news, 'get_supabase', return_value=db), \
             patch.object(news, 'raccogli_tutti_i_feed') as feeds:
            news.run_generation(db, {}, 'Editor')
            feeds.assert_not_called()
        filters = db.table.return_value.eq.call_args_list
        self.assertTrue(any(call.args == ('origin', 'rss') for call in filters))
        self.assertTrue(any(call.args == ('status', 'draft') for call in filters))

    def test_run_cap_duplicates_and_all_failed(self):
        db = database([{'id': 'news'}], count=0)
        sources = [item(link=f'https://example.com/{i}') for i in range(9)]
        sources.insert(1, item(link='https://example.com/0?utm_source=rss'))
        with patch.dict(os.environ, {'PHONEPULSE_EDITOR_AUTHOR': 'Editor'}), \
             patch.object(news, 'get_supabase', return_value=db), \
             patch.object(news, 'raccogli_tutti_i_feed', return_value=sources), \
             patch.object(news, 'processa_articolo', return_value='created') as process:
            news.run_generation(db, {}, 'Editor')
            self.assertEqual(process.call_count, 5)
        with patch.dict(os.environ, {'PHONEPULSE_EDITOR_AUTHOR': 'Editor'}), \
             patch.object(news, 'get_supabase', return_value=db), \
             patch.object(news, 'raccogli_tutti_i_feed', return_value=[item()]), \
             patch.object(news, 'processa_articolo', return_value='failed'):
            with self.assertRaises(RuntimeError):
                news.run_generation(db, {}, 'Editor')

    def test_gemini_counts_retry_before_each_request(self):
        first = Mock(status_code=429)
        second = Mock(status_code=200)
        second.json.return_value = {'candidates': [{'content': {'parts': [{'text': '{}'}]}}]}
        with patch.object(news, 'GEMINI_API_KEY', 'fake'), \
             patch.object(news, 'get_gemini_calls_oggi', return_value=0), \
             patch.object(news, 'incrementa_gemini_calls') as count, \
             patch.object(news.requests, 'post', side_effect=[first, second]) as request, \
             patch.object(news.time, 'sleep'):
            self.assertEqual(news.chiama_gemini(database(), 'prompt'), ('{}', 'gemini-3.1-flash-lite'))
            self.assertEqual(count.call_count, 2)
            self.assertIn('/gemini-3.1-flash-lite:generateContent?', request.call_args.args[0])

    def test_empty_cse_result_counts_and_counter_failure_blocks_request(self):
        response = Mock()
        response.json.return_value = {'items': []}
        with patch.object(news, 'GOOGLE_CSE_API_KEY', 'fake'), \
             patch.object(news, 'GOOGLE_CSE_CX', 'fake'), \
             patch.object(news, 'get_google_cse_calls_oggi', return_value=0), \
             patch.object(news, 'incrementa_google_cse_calls') as count, \
             patch.object(news.requests, 'get', return_value=response) as request:
            self.assertIsNone(news._cerca_cover_google_cse('phone', database()))
            self.assertEqual(count.call_count, 1)
            count.side_effect = RuntimeError('DB counter failed')
            request.reset_mock()
            with self.assertRaises(RuntimeError):
                news._cerca_cover_google_cse('phone', database())
            request.assert_not_called()

    def test_cover_update_checks_returned_row_and_keeps_draft_guard(self):
        for data, expected in (([], False), ([{'id': 'a'}], True)):
            db = database(data)
            self.assertEqual(covers.aggiorna_cover(db, 'a', URL), expected)
            self.assertTrue(any(call.args == ('status', 'draft')
                                for call in db.table.return_value.eq.call_args_list))
        db = database()
        db.table.return_value.execute.side_effect = RuntimeError('DB failed')
        with self.assertRaises(RuntimeError):
            covers.aggiorna_cover(db, 'a', URL)


if __name__ == '__main__':
    unittest.main()
