import copy
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_editorial_review_gate import manifest, review
from editorial_export import export_for_admin
from editorial_review_gate import manifest_fingerprint


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.manifest = manifest()
        self.ledger = review(self.manifest)
        self.experiment = {'publish_allowed': False, 'model': 'synthetic-model', 'draft': {
            'decision': 'review_draft', 'publish_allowed': False,
            'title': 'Synthetic title', 'excerpt': 'Synthetic excerpt',
            'content': 'Synthetic content referencing [c1], [c2] and [c3].',
            'review_manifest_sha256': manifest_fingerprint(self.manifest)}}

    def test_export_keeps_provenance_but_requires_new_admin_review(self):
        result = export_for_admin(self.manifest, self.ledger, self.experiment)
        self.assertFalse(result['publish_allowed'])
        self.assertFalse(result['provenance']['authentication_verified'])
        self.assertEqual(result['claims'][0]['decision'], 'unknown')
        self.assertIn('[c1](https://', result['article']['content'])
        self.assertNotIn('cover_image_url', result['article'])
        self.assertEqual(len(result['article']['sources']), 1)

    def test_modified_evidence_unapproved_claim_skip_and_unknown_refs_are_rejected(self):
        for change in ('digest', 'unapproved', 'skip', 'references'):
            ledger = copy.deepcopy(self.ledger)
            experiment = copy.deepcopy(self.experiment)
            if change == 'digest': experiment['draft']['review_manifest_sha256'] = '0' * 64
            if change == 'unapproved': ledger['decisions'][0]['decision'] = 'needs_research'
            if change == 'skip': experiment['draft']['decision'] = 'skip'
            if change == 'references': experiment['draft']['content'] = 'Unknown [c99].'
            with self.assertRaises(ValueError): export_for_admin(self.manifest, ledger, experiment)


if __name__ == '__main__':
    unittest.main()

class ResearchOnlyTests(unittest.TestCase):
    def test_manifest_exports_research_without_a_writer_or_approval(self):
        from editorial_export import export_research
        result = export_research(manifest())
        self.assertEqual(result['provenance']['model'], 'none-research-only')
        self.assertFalse(result['publish_allowed'])
        self.assertEqual(result['claims'][0]['decision'], 'unknown')
        self.assertEqual(result['claims'][0]['evidence'], '')
        self.assertTrue(result['claims'][0]['candidates'])
        self.assertEqual(result['claims'][0]['candidates'][0]['verification'], 'unverified')

    def test_unretrieved_sources_never_become_research_imports(self):
        from editorial_export import export_research
        data = manifest()
        data['sources'][0]['retrieval'] = 'unavailable'
        with self.assertRaisesRegex(ValueError, 'No retrieved sources'):
            export_research(data)
