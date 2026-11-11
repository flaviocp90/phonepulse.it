import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from editorial_dry_run import build_manifest
from editorial_retrieval import RetrievedDocument
from editorial_evidence import assess_pack, Claim, EvidenceError
from editorial_review_gate import compile_reviewed_brief, ReviewError
from test_editorial_review_gate import manifest, review


class SourceChecksTests(unittest.TestCase):
    def test_duplicate_pages_are_flagged_without_claiming_source_independence(self):
        text = 'This synthetic official document contains sufficiently detailed technical evidence for a human editor to inspect.'
        payload = {'topic': 'Synthetic duplicate sources', 'sources': [
            {'source_id': 's1', 'url': 'https://example.com/first', 'publisher': 'One', 'kind': 'primary'},
            {'source_id': 's2', 'url': 'https://example.org/second', 'publisher': 'Two', 'kind': 'secondary'},
        ], 'claims': [{'claim_id': 'c1', 'statement': 'A synthetic fact requires editorial verification.', 'supporting_source_ids': ['s1', 's2']}]}
        result = build_manifest(payload, live_fetch=True, fetcher=lambda url: RetrievedDocument(url, url, text, 'Synthetic document', ()))
        self.assertEqual(result['source_checks']['duplicate_content'], [['s1', 's2']])
        self.assertEqual(result['source_checks']['independence'], 'not_assessed')
        self.assertEqual(result['assessment']['claims'][0]['review_reason'], 'unreviewed')
        self.assertIn('editorial review', result['assessment']['reason'])
        self.assertFalse(result['publication_allowed'])

    def test_duplicate_statements_cannot_count_as_different_facts(self):
        with self.assertRaisesRegex(EvidenceError, 'Duplicate claim statements'):
            assess_pack([], [Claim('c1', 'The same synthetic statement.', ()), Claim('c2', '  THE SAME SYNTHETIC STATEMENT. ', ())])

    def test_source_checks_are_part_of_the_review_fingerprint(self):
        data = manifest()
        ledger = review(data)
        data['source_checks']['independence'] = 'forged'
        with self.assertRaises(ReviewError):
            compile_reviewed_brief(data, ledger)
