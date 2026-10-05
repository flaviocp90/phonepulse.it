import unittest
from datetime import datetime, timezone

from editorial_rules import is_fresh, normalize_source_url, validate_generated_article

URL = 'https://example.com/official'


def brief(**changes):
    return {'title': 'Aggiornamento Android', 'slug': 'aggiornamento-android',
            'excerpt': 'Una funzione documentata.',
            'content': f'La fonte descrive una funzione. I dettagli restano limitati. [Fonte]({URL})',
            'source_urls': [URL], **changes}


class EditorialRulesTests(unittest.TestCase):
    def test_short_sourced_brief_is_valid(self):
        self.assertEqual(validate_generated_article(brief(), {URL}), [])

    def test_rejects_bad_json_fields_slug_and_excerpt(self):
        for article in (None, [], brief(title=''), brief(content=2),
                        brief(slug='bad slug'), brief(excerpt='x' * 156)):
            with self.subTest(article=article):
                self.assertTrue(validate_generated_article(article, {URL}))

    def test_rejects_unknown_insecure_or_hidden_source(self):
        for changes in ({'source_urls': []}, {'source_urls': ['http://example.com/official']},
                        {'source_urls': ['https://invented.invalid/page']},
                        {'content': 'Vedi https://invented.invalid/page'},
                        {'content': '<a href="https://invented.invalid/page">Fonte</a>'},
                        {'content': '[Fonte](//invented.invalid/page)'},
                        {'content': '[Fonte](HTTPS://invented.invalid/page)'},
                        {'content': '[Fonte][id]\n\n[id]: //invented.invalid/page'},
                        {'content': 'Nessuna fonte linkata.'}):
            with self.subTest(changes=changes):
                self.assertTrue(validate_generated_article(brief(**changes), {URL}))

    def test_rejects_personal_testing_and_incomplete_lists(self):
        for changes in ({'content': 'Abbiamo testato questo smartphone.'},
                        {'content': 'Ho provato il telefono per due settimane.'},
                        {'title': '8 app Android indispensabili'}):
            self.assertTrue(validate_generated_article(brief(**changes), {URL}))

    def test_normalization_preserves_functional_query(self):
        self.assertEqual(normalize_source_url(
            'https://EXAMPLE.com/p?id=42&utm_source=rss&fbclid=abc#section'),
            'https://example.com/p?id=42')
        self.assertNotEqual(normalize_source_url('https://example.com/p?id=1'),
                            normalize_source_url('https://example.com/p?id=2'))
        with self.assertRaises(ValueError):
            normalize_source_url('javascript:alert(1)')

    def test_freshness_unknown_future_and_expired(self):
        now = datetime(2026, 10, 5, 12, tzinfo=timezone.utc)
        for value in (None, 'bad', '2026-10-05', '2026-10-05T12:01:00Z',
                      '2026-10-03T11:59:00Z'):
            self.assertFalse(is_fresh(value, now, 48), value)
        self.assertTrue(is_fresh('2026-10-03T12:00:00Z', now, 48))
        self.assertTrue(is_fresh('2026-10-05T14:00:00+02:00', now, 48))


if __name__ == '__main__':
    unittest.main()
