"""Gemini transport tests: all requests mocked, zero external traffic."""
import json
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from editorial_gemini_experiment import (
    gemini_once, make_experiment, ProviderError, MODEL, MAX_OUTPUT_TOKENS
)


def reviewed_brief():
    return {
        "output_status": "review_only", "publish_allowed": False,
        "review": {"manifest_sha256": "a" * 64, "authentication_verified": False},
        "claims": [
            {"claim_id": f"c{i}", "statement": f"Approved and sourced fact number {i}.",
             "references": [{"source_id": "s1", "url": "https://example.org/",
                             "publisher": "Example"}]}
            for i in (1, 2, 3)
        ],
    }


class FakeResponse:
    def __init__(self, content):
        self.content = content

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self, size):
        return self.content[:size]


class GeminiExperimentTests(unittest.TestCase):
    def test_one_request_is_bounded_and_json_configured(self):
        calls = []
        def opener(request, timeout):
            calls.append(request)
            self.assertEqual(timeout, 30)
            self.assertEqual(request.get_method(), "POST")
            self.assertEqual(request.headers.get("X-goog-api-key"), "fake_test_key")
            data = json.loads(request.data)
            self.assertEqual(data["generationConfig"]["maxOutputTokens"], MAX_OUTPUT_TOKENS)
            self.assertEqual(data["generationConfig"]["responseMimeType"], "application/json")
            self.assertEqual(data["generationConfig"]["responseSchema"]["type"], "OBJECT")
            text = json.dumps({"decision": "review_draft", "title": "Titolo",
                               "excerpt": "Sommario",
                               "content": "Fatto [c1]. Fatto [c2]. Fatto [c3]."})
            return FakeResponse(json.dumps({"candidates": [
                {"content": {"parts": [{"text": text}]}}
            ]}).encode())
        result = make_experiment(reviewed_brief(), api_key="fake_test_key", opener=opener)
        self.assertEqual(len(calls), 1)
        self.assertEqual(result["model"], MODEL)
        self.assertEqual(result["draft"]["decision"], "review_draft")
        self.assertFalse(result["publish_allowed"])
        self.assertFalse(result["draft"]["publish_allowed"])
        self.assertTrue(result["editorial_fact_check_required"])

    def test_no_api_key_means_no_traffic(self):
        def must_not_call(*_args, **_kwargs):
            raise AssertionError("Network request not permitted")
        with self.assertRaisesRegex(ProviderError, "required"):
            gemini_once({"system": "safe", "user_data_json": "{}"},
                        api_key="", opener=must_not_call)

    def test_invalid_reference_rejected_after_single_response(self):
        count = [0]
        def opener(request, timeout):
            count[0] += 1
            return FakeResponse(json.dumps({"candidates": [{"content": {"parts": [
                {"text": json.dumps({"decision": "review_draft", "title": "T",
                                     "excerpt": "E", "content": "Unsupported [c99]."})}
            ]}}]}).encode())
        with self.assertRaisesRegex(ValueError, "Unknown claim"):
            make_experiment(reviewed_brief(), api_key="fake_test_key", opener=opener)
        self.assertEqual(count[0], 1)

    def test_provider_failure_has_no_fallback(self):
        def opener(*_, **__):
            raise OSError("mocked failure")
        with self.assertRaisesRegex(ProviderError, "no retry"):
            make_experiment(reviewed_brief(), api_key="fake_test_key", opener=opener)

    def test_skip_requires_no_article(self):
        def opener(*_, **__):
            return FakeResponse(json.dumps({"candidates": [{"content": {"parts": [
                {"text": '{"decision":"skip"}'}
            ]}}]}).encode())
        result = make_experiment(reviewed_brief(), api_key="fake_test_key", opener=opener)
        self.assertEqual(result["draft"]["decision"], "skip")
        self.assertFalse(result["publish_allowed"])


if __name__ == "__main__":
    unittest.main()
