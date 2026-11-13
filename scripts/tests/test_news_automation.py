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
    def test_drafting_uses_only_zero_price_router_even_with_gemini_configured(self):
        response = Mock(status_code=200)
        response.json.return_value = {'choices': [{'message': {'content': '{"decision":"skip"}'}}]}
        with patch.object(news, 'OPENROUTER_API_KEY', 'fake'), \
             patch.object(news, 'GEMINI_API_KEY', 'configured-but-never-used'), \
             patch.object(news, 'get_gemini_calls_oggi', return_value=0), \
             patch.object(news, 'chiama_gemini', return_value=(None, None)) as gemini, \
             patch.object(news.requests, 'post', return_value=response) as request:
            article, model = news.genera_bozza(database(), item())
        self.assertEqual(article, {'decision': 'skip'})
        self.assertEqual(model, news.OPENROUTER_MODELS[0])
        gemini.assert_not_called()
        self.assertEqual(request.call_count, 1)
        payload = request.call_args.kwargs['json']
        self.assertEqual(payload['model'], news.OPENROUTER_MODELS[0])
        self.assertEqual(payload['response_format'], {'type': 'json_object'})
        self.assertEqual(payload['provider']['max_price'], {'prompt': 0, 'completion': 0})

    def test_empty_or_invalid_completion_falls_back_to_another_free_model(self):
        good = Mock(status_code=200)
        good.json.return_value = {
            'model': 'test-model:free',
            'choices': [{'finish_reason': 'stop', 'message': {'content': '{"decision":"skip"}'}}],
        }
        for content in (None, 'not JSON', '{"unexpected":true}'):
            with self.subTest(content=content):
                bad = Mock(status_code=200)
                bad.json.return_value = {'choices': [{'message': {'content': content}}]}
                with patch.object(news, 'OPENROUTER_API_KEY', 'fake'), \
                     patch.object(news.requests, 'post', side_effect=[bad, good]) as request:
                    self.assertEqual(news.chiama_openrouter('test'), ({'decision': 'skip'}, 'test-model:free'))
                self.assertEqual([call.kwargs['json']['model'] for call in request.call_args_list],
                                 list(news.OPENROUTER_MODELS))
                for call in request.call_args_list:
                    self.assertEqual(call.kwargs['json']['provider']['max_price'], {'prompt': 0, 'completion': 0})

    def test_atom_entry_uses_feed_content_and_updated_date_when_publish_date_is_absent(self):
        xml = b"""<feed xmlns="http://www.w3.org/2005/Atom"><title>Example</title><entry>
          <title>Android update</title><link href="https://example.com/news" />
          <updated>2026-11-13T12:00:00Z</updated><summary>A short summary</summary>
          <content type="html">&lt;p&gt;Extra details supplied by the feed.&lt;/p&gt;</content>
        </entry></feed>"""
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [xml]
        with patch.object(news.requests, 'get', return_value=response):
            source, = news.leggi_feed('https://example.com/feed')
        self.assertEqual(source['published_at'], '2026-11-13T12:00:00+00:00')
        self.assertEqual(source['excerpt'], 'A short summary')
        self.assertEqual(source['feed_text'], 'Extra details supplied by the feed.')
        self.assertIn(source['feed_text'], news.build_prompt(source))

    def test_missing_free_provider_key_fails_before_database_access(self):
        with patch.object(news, 'OPENROUTER_API_KEY', ''), \
             patch.object(news, 'get_supabase') as db:
            with self.assertRaisesRegex(RuntimeError, 'OPENROUTER_API_KEY'):
                news.main()
            db.assert_not_called()

    def test_free_provider_failure_never_falls_back_to_gemini(self):
        with patch.object(news, 'chiama_openrouter', return_value=(None, None)), \
             patch.object(news, 'chiama_gemini') as gemini:
            self.assertEqual(news.genera_bozza(database(), item()), (None, None))
            gemini.assert_not_called()

    def test_candidate_scan_is_bounded_even_when_every_item_is_skipped(self):
        sources = [item(link=f'https://example.com/{i}') for i in range(30)]
        with patch.object(news, 'raccogli_tutti_i_feed', return_value=sources), \
             patch.object(news, 'processa_articolo', return_value='skipped') as process:
            self.assertEqual(news.run_generation(database([{'id': 'news'}]), {}, 'Editor'), 'no_candidates')
            self.assertEqual(process.call_count, 10)

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

    def test_gate_precedes_cover_and_substantive_draft_is_accepted(self):
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
        self.assertEqual(record['cover_image_url'], news.EDITORIAL_COVER_URL)
        self.assertEqual(record['image_source'], news.EDITORIAL_COVER_CREDIT)
        self.assertNotIn('approved_version', record)
        notification.assert_not_called()
        with patch.object(news, 'genera_bozza', return_value=([], 'model')), \
             patch.object(news, 'cerca_cover_image') as cover:
            self.assertEqual(news.processa_articolo(item(), database(), 'news', 'Editor'), 'failed')
            cover.assert_not_called()

    def test_insufficient_rss_evidence_does_not_create_draft_or_fetch_cover(self):
        with patch.object(news, 'genera_bozza', return_value=({
                'decision': 'skip', 'reason': 'Not enough verified facts'}, 'model')) as llm, \
             patch.object(news, 'cerca_cover_image') as cover:
            db = database()
            self.assertEqual(news.processa_articolo(item(), db, 'news', 'Editor'), 'skipped')
            llm.assert_called_once()
            cover.assert_not_called()
            db.table.return_value.insert.assert_not_called()

    def test_short_generated_draft_fails_without_writing_to_database(self):
        with patch.object(news, 'genera_bozza', return_value=(brief(
                content='Fonte: [notizia](' + URL + ')'), 'model')), \
             patch.object(news, 'cerca_cover_image') as cover:
            db = database()
            self.assertEqual(news.processa_articolo(item(), db, 'news', 'Editor'), 'failed')
            cover.assert_not_called()
            db.table.return_value.insert.assert_not_called()

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
            self.assertEqual(news.chiama_gemini(database(), 'prompt'), ('{}', 'gemini-3.5-flash-lite'))
            self.assertEqual(count.call_count, 2)
            self.assertIn('/gemini-3.5-flash-lite:generateContent?', request.call_args.args[0])

    def test_gemini_daily_budget_stops_before_request(self):
        self.assertEqual(news.GEMINI_DAILY_LIMIT, 50)
        with patch.object(news, 'GEMINI_API_KEY', 'fake'), \
             patch.object(news, 'get_gemini_calls_oggi', return_value=50), \
             patch.object(news, 'incrementa_gemini_calls') as count, \
             patch.object(news.requests, 'post') as request:
            self.assertEqual(news.chiama_gemini(database(), 'prompt'), (None, None))
            count.assert_not_called()
            request.assert_not_called()

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
