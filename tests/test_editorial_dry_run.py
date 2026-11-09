"""No network access. Three editorial pilots plus failure cases."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from editorial_dry_run import build_manifest
from editorial_evidence import Source, Claim, assess_pack
from editorial_retrieval import RetrievedDocument, RetrievalError


URL1 = "https://developer.samsung.com/health/health-connect-faq.html"
URL2 = "https://developer.android.com/health-and-fitness/health-connect/features/steps"


def fake_fetcher(url):
    return RetrievedDocument(url, url, "Readable official source text " * 8,
                             "Official documentation", ())


class ThreePilots(unittest.TestCase):
    def test_real_topic_provenance_but_not_unreviewed_draft(self):
        data = {
            "topic": "Health Connect and Samsung Health",
            "sources": [
                {"source_id": "s1", "url": URL1, "publisher": "Samsung Developers", "kind": "primary"},
                {"source_id": "s2", "url": URL2, "publisher": "Android Developers", "kind": "primary"},
            ],
            "claims": [
                {"claim_id": "c1", "statement": "Samsung Health can share activity data through Health Connect.", "supporting_source_ids": ["s1"]},
                {"claim_id": "c2", "statement": "Apps need permissions to read step records.", "supporting_source_ids": ["s2"]},
                {"claim_id": "c3", "statement": "Watch data first enters Samsung Health.", "supporting_source_ids": ["s1"]},
            ],
        }
        result = build_manifest(data, live_fetch=True, fetcher=fake_fetcher)
        self.assertEqual(result["assessment"]["decision"], "needs_research")
        self.assertTrue(all(c["status"] == "unknown" for c in result["assessment"]["claims"]))
        self.assertFalse(result["publication_allowed"])
        self.assertEqual(result["sources"][0]["retrieval"], "ok")
        self.assertNotIn("Readable official source text " * 8, str(result))
        self.assertTrue(all(item["verification"] == "unverified"
                            for item in result["candidate_evidence"]))

    def test_conflict_scenario_requires_research(self):
        sources = [
            Source("s1", URL1, "Samsung Developers", "primary", True),
            Source("s2", URL2, "Android Developers", "primary", True),
        ]
        data = assess_pack(sources, [
            Claim("c1", "An explicitly disputed configuration detail.", ("s1",), ("s2",)),
            Claim("c2", "Another assertion supported in an original source.", ("s1",), editorially_verified=True),
            Claim("c3", "A third assertion supported in an original source.", ("s2",), editorially_verified=True),
        ])
        self.assertEqual(data["decision"], "needs_research")
        self.assertEqual(data["claims"][0]["status"], "conflicted")

    def test_insufficient_scenario_skips(self):
        data = assess_pack([Source("s1", URL1, "Samsung Developers", "primary", True)], [
            Claim("c1", "Only one substantiated fact is available.", ("s1",), editorially_verified=True)
        ])
        self.assertEqual(data["decision"], "skip")

    def test_fetch_failure_stays_unverified(self):
        def unavailable(url):
            raise RetrievalError("robots unavailable")
        result = build_manifest({
            "sources": [{"source_id": "s1", "url": URL1,
                         "publisher": "Samsung Developers", "kind": "primary"}],
            "claims": [{"claim_id": "c1", "statement": "This requires source verification.",
                        "supporting_source_ids": ["s1"]}],
        }, live_fetch=True, fetcher=unavailable)
        self.assertEqual(result["sources"][0]["retrieval"], "unavailable")
        self.assertEqual(result["assessment"]["decision"], "needs_research")

    def test_offline_never_attempts_fetch(self):
        def must_not_fetch(url):
            raise AssertionError("Unexpected network")
        result = build_manifest({"sources": [{"source_id": "s1", "url": URL1,
                                              "publisher": "Samsung", "kind": "primary"}],
                                 "claims": []}, fetcher=must_not_fetch)
        self.assertEqual(result["assessment"]["decision"], "skip")
        self.assertEqual(result["sources"][0]["retrieval"], "not_attempted")


if __name__ == "__main__":
    unittest.main()
