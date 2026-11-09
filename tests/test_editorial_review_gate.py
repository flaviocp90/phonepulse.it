"""Editorial review gate is offline: no API keys, DB writes or LLM."""
import copy
from datetime import datetime, timezone
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from editorial_dry_run import build_manifest
from editorial_retrieval import RetrievedDocument
from editorial_review_gate import compile_reviewed_brief, manifest_fingerprint, ReviewError

URL = "https://developer.android.com/health-and-fitness/health-connect/features/steps"
TEXT = (
    "Health Connect provides a common store for selected fitness and health records in Android. "
    "Applications must request the corresponding read permission before accessing steps records. "
    "Applications can write new activity records only when the appropriate permission is available. "
)


def manifest():
    payload = {
        "topic": "Health Connect review pilot",
        "sources": [{"source_id": "s1", "url": URL,
                     "publisher": "Android Developers", "kind": "primary"}],
        "claims": [
            {"claim_id": "c1", "statement": "Applications must request permission to read step data.",
             "supporting_source_ids": ["s1"]},
            {"claim_id": "c2", "statement": "Health Connect stores health and fitness records.",
             "supporting_source_ids": ["s1"]},
            {"claim_id": "c3", "statement": "Writing records requires the appropriate permission.",
             "supporting_source_ids": ["s1"]},
        ],
    }
    return build_manifest(payload, live_fetch=True,
                          fetcher=lambda url: RetrievedDocument(url, url, TEXT, "Android Docs", ()))


def review(m):
    return {
        "manifest_sha256": manifest_fingerprint(m),
        "reviewer_id": "editor@example.org",
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "decisions": [
            {"claim_id": x["claim_id"], "decision": "approve",
             "candidate_ids": ["s1-e1"],
             "rationale": "I checked the relevant passage and its context in the original source."}
            for x in m["assessment"]["claims"]
        ],
    }


class LedgerTests(unittest.TestCase):
    def test_reviewed_claims_yield_non_publishable_brief(self):
        m = manifest()
        b = compile_reviewed_brief(m, review(m))
        self.assertEqual(len(b["claims"]), 3)
        self.assertFalse(b["publish_allowed"])
        self.assertFalse(b["review"]["authentication_verified"])
        self.assertEqual(b["review"]["manifest_sha256"], manifest_fingerprint(m))

    def test_stale_manifest_rejected(self):
        m = manifest()
        ledger = review(m)
        m["assessment"]["claims"][0]["statement"] = "A silently modified claim"
        with self.assertRaisesRegex(ReviewError, "different evidence"):
            compile_reviewed_brief(m, ledger)

    def test_unapproved_claim_rejected(self):
        m = manifest()
        ledger = review(m)
        ledger["decisions"][0]["decision"] = "needs_research"
        with self.assertRaises(ReviewError):
            compile_reviewed_brief(m, ledger)

    def test_nonexistent_or_wrong_source_evidence_rejected(self):
        m = manifest()
        ledger = review(m)
        ledger["decisions"][0]["candidate_ids"] = ["s99-e1"]
        with self.assertRaises(ReviewError):
            compile_reviewed_brief(m, ledger)

    def test_claims_need_explicit_review_and_rationale(self):
        m = manifest()
        ledger = review(m)
        ledger["decisions"][0]["rationale"] = "ok"
        with self.assertRaises(ReviewError):
            compile_reviewed_brief(m, ledger)
        ledger = review(m)
        ledger["decisions"] = ledger["decisions"][:-1]
        with self.assertRaises(ReviewError):
            compile_reviewed_brief(m, ledger)

    def test_offline_manifest_cannot_be_approved(self):
        m = manifest()
        m["mode"] = "offline"
        ledger = review(m)
        with self.assertRaisesRegex(ReviewError, "live-readonly"):
            compile_reviewed_brief(m, ledger)

    def test_conflicted_claim_cannot_be_approved(self):
        m = manifest()
        m["assessment"]["claims"][0]["conflicting_sources"] = ["s1"]
        ledger = review(m)
        with self.assertRaises(ReviewError):
            compile_reviewed_brief(m, ledger)


if __name__ == "__main__":
    unittest.main()
