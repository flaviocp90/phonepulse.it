"""Grounded review brief contract tests, no LLM or external service."""
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from editorial_evidence import Claim, Source
from editorial_review_brief import build_reviewed_brief, validate_review_draft


URL = "https://developer.android.com/health-and-fitness/health-connect/features/steps"


class ReviewedBriefTests(unittest.TestCase):
    def source(self):
        return Source("s1", URL, "Android Developers", "primary", True)

    def claims(self, verified=True):
        return [
            Claim("c1", "First explicitly checked fact on permission usage.", ("s1",),
                  editorially_verified=verified),
            Claim("c2", "Second explicitly checked fact about health records.", ("s1",),
                  editorially_verified=verified),
            Claim("c3", "Third explicitly checked fact about application access.", ("s1",),
                  editorially_verified=verified),
        ]

    def test_unverified_not_eligible_for_draft(self):
        with self.assertRaises(ValueError):
            build_reviewed_brief([self.source()], self.claims(False))

    def test_reviewed_brief_never_allows_publishing(self):
        brief = build_reviewed_brief([self.source()], self.claims())
        self.assertFalse(brief["publish_allowed"])
        self.assertEqual(brief["output_status"], "review_only")
        self.assertEqual(brief["claims"][0]["references"][0]["url"], URL)

    def test_valid_citations_and_reject_unknown(self):
        brief = build_reviewed_brief([self.source()], self.claims())
        draft = {"decision": "review_draft", "title": "A title", "excerpt": "Summary",
                 "content": "An assertion [c1]. Another [c2]. Third [c3]."}
        self.assertEqual(validate_review_draft(draft, brief), [])
        draft["content"] = "Invented reference [c999]."
        self.assertIn("Unknown claim references", validate_review_draft(draft, brief))

    def test_invalid_review_state_rejected(self):
        brief = build_reviewed_brief([self.source()], self.claims())
        self.assertIn("Review-only decision required",
                      validate_review_draft({"decision": "published"}, brief))


if __name__ == "__main__":
    unittest.main()
