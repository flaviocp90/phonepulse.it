"""Offline writer contract tests: fake model, no provider or database."""
import json
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from editorial_writer import DraftingError, draft_from_reviewed_brief, make_model_payload


def brief():
    return {
        "output_status": "review_only",
        "publish_allowed": False,
        "review": {"manifest_sha256": "a" * 64, "authentication_verified": False},
        "claims": [
            {"claim_id": f"c{i}", "statement": f"Verified factual statement number {i}.",
             "references": [{"source_id": "s1", "url": "https://example.org/a",
                             "publisher": "Example"}]}
            for i in (1, 2, 3)
        ],
    }


class WriterTests(unittest.TestCase):
    def test_reviewer_brief_only(self):
        data = make_model_payload(brief())
        self.assertIn("claim", data["user_data_json"])
        self.assertIn("review_only", data["user_data_json"])
        self.assertIn("NON devono", data["system"])

    def test_unreviewed_or_publishable_refused(self):
        b = brief()
        del b["review"]
        with self.assertRaises(DraftingError):
            make_model_payload(b)
        b = brief()
        b["publish_allowed"] = True
        with self.assertRaises(DraftingError):
            make_model_payload(b)

    def test_mock_model_produces_only_review_draft(self):
        def model(payload):
            return json.dumps({
                "decision": "review_draft",
                "title": "Titolo informativo",
                "excerpt": "Sommario con fonti",
                "content": "Primo fatto [c1]. Secondo fatto [c2]. Terzo fatto [c3].",
                "publish_allowed": True,
            })
        result = draft_from_reviewed_brief(brief(), model)
        self.assertFalse(result["publish_allowed"])
        self.assertTrue(result["review_required"])
        self.assertEqual(result["decision"], "review_draft")
        self.assertNotIn("publish_allowed", result["content"])

    def test_bad_reference_refused(self):
        def model(_):
            return json.dumps({
                "decision": "review_draft", "title": "Test", "excerpt": "Test",
                "content": "Fatto falso [c900].",
            })
        with self.assertRaisesRegex(DraftingError, "Unknown claim"):
            draft_from_reviewed_brief(brief(), model)

    def test_provider_can_choose_skip(self):
        result = draft_from_reviewed_brief(brief(), lambda _: '{"decision":"skip"}')
        self.assertEqual(result["decision"], "skip")
        self.assertFalse(result["publish_allowed"])

    def test_no_raw_html_and_non_json(self):
        with self.assertRaises(DraftingError):
            draft_from_reviewed_brief(brief(), lambda _: "This is not JSON")
        with self.assertRaises(DraftingError):
            draft_from_reviewed_brief(brief(), lambda _: json.dumps({
                "decision": "review_draft", "title": "A", "excerpt": "B",
                "content": "<script>bad</script> [c1]"
            }))


if __name__ == "__main__":
    unittest.main()
