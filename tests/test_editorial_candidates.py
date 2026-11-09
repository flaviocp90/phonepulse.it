"""Unverified provenance extraction, entirely offline."""
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from editorial_candidates import MAX_CANDIDATES_PER_SOURCE, extract_candidates
from editorial_dry_run import build_manifest
from editorial_retrieval import RetrievedDocument

URL = "https://developer.android.com/health-and-fitness/health-connect/features/steps"
TEXT = (
    "Health Connect provides a common store for selected fitness and health records in Android. "
    "Applications must request the corresponding read permission before accessing steps records. "
    "Applications can write new activity records only when the appropriate permission is available. "
    "The original publisher recommends that developers carefully handle permission changes over time. "
)


class CandidateTests(unittest.TestCase):
    def test_excerpts_are_bounded_and_unverified(self):
        result = extract_candidates(source_id="s1", url=URL, text=TEXT)
        self.assertEqual(len(result), MAX_CANDIDATES_PER_SOURCE)
        self.assertTrue(all(x["verification"] == "unverified" for x in result))
        self.assertTrue(all(len(x["excerpt"]) <= 110 for x in result))
        self.assertTrue(all(x["source_url"] == URL for x in result))
        self.assertEqual(result[0]["char_start"], 0)
        self.assertEqual(len({x["sentence_sha256"] for x in result}), 3)

    def test_short_or_duplicate_candidates_not_used(self):
        result = extract_candidates(
            source_id="s1", url=URL,
            text="Tiny note. " + TEXT.split(". ")[0] + ". " + TEXT.split(". ")[0] + "."
        )
        self.assertEqual(len(result), 1)

    def test_malformed_source_rejected(self):
        with self.assertRaises(ValueError):
            extract_candidates(source_id="../s1", url=URL, text=TEXT)

    def test_fetch_creates_evidence_but_never_validates_claim(self):
        def fake(url):
            return RetrievedDocument(url, url, TEXT, "Official reference", ())
        manifest = build_manifest({
            "topic": "Android permission reference",
            "sources": [{"source_id": "s1", "url": URL,
                         "kind": "primary", "publisher": "Android Developers"}],
            "claims": [{"claim_id": "c1", "statement": "A claim requiring human confirmation.",
                        "supporting_source_ids": ["s1"],
                        "editorially_verified": True}],
        }, live_fetch=True, fetcher=fake)
        self.assertEqual(manifest["sources"][0]["retrieval"], "ok")
        self.assertGreater(manifest["sources"][0]["candidate_count"], 0)
        self.assertEqual(manifest["assessment"]["decision"], "needs_research")
        self.assertEqual(manifest["assessment"]["claims"][0]["status"], "unknown")
        self.assertFalse(manifest["publication_allowed"])
        self.assertTrue(all(x["verification"] == "unverified"
                            for x in manifest["candidate_evidence"]))
        self.assertNotIn(TEXT, str(manifest))


if __name__ == "__main__":
    unittest.main()
