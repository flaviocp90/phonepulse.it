"""Offline retrieval tests: no requests leave the test runner."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import editorial_retrieval as retrieval

HTML = b"<html><head><title>Documented update</title></head><body><main><h1>Release note</h1><p>" + b"Documented features and supported devices. " * 8 + b"</p></main></body></html>"


class RetrievalTests(unittest.TestCase):
    def test_valid_html_document(self):
        with patch.object(retrieval, "_robots_allowed", return_value=True), patch.object(
            retrieval, "_request_once", return_value=(200, {"content-type": "text/html"}, HTML)
        ):
            doc = retrieval.fetch_document("https://example.org/update?utm_source=x")
        self.assertEqual(doc.final_url, "https://example.org/update")
        self.assertIn("supported devices", doc.text)
        self.assertEqual(doc.title, "Documented update")

    def test_redirect_rechecks_policy(self):
        calls = []
        def robots(url):
            calls.append(url)
            return True
        def request(url, *, max_bytes):
            if url == "https://example.org/update":
                return 302, {"location": "https://news.example.net/release"}, b""
            return 200, {"content-type": "text/html"}, HTML
        with patch.object(retrieval, "_robots_allowed", side_effect=robots), patch.object(
            retrieval, "_request_once", side_effect=request
        ):
            doc = retrieval.fetch_document("https://example.org/update")
        self.assertEqual(calls, ["https://example.org/update", "https://news.example.net/release"])
        self.assertEqual(doc.redirects, ("https://news.example.net/release",))

    def test_disallowed_robots_blocks_fetch(self):
        with patch.object(retrieval, "_robots_allowed", return_value=False), patch.object(
            retrieval, "_request_once"
        ) as request:
            with self.assertRaises(retrieval.RetrievalError):
                retrieval.fetch_document("https://example.org/private")
        request.assert_not_called()

    def test_private_redirect_rejected_before_following(self):
        with patch.object(retrieval, "_robots_allowed", return_value=True), patch.object(
            retrieval, "_request_once", return_value=(302, {"location": "https://127.0.0.1/admin"}, b"")
        ) as request:
            with self.assertRaises(retrieval.EvidenceError):
                retrieval.fetch_document("https://example.org/news")
        self.assertEqual(request.call_count, 1)

    def test_redirect_loop_is_blocked(self):
        with patch.object(retrieval, "_robots_allowed", return_value=True), patch.object(
            retrieval, "_request_once", return_value=(301, {"location": "/news"}, b"")
        ):
            with self.assertRaisesRegex(retrieval.RetrievalError, "loop"):
                retrieval.fetch_document("https://example.org/news")

    def test_non_html_and_short_content_rejected(self):
        for payload in [(200, {"content-type": "application/pdf"}, HTML),
                        (200, {"content-type": "text/html"}, b"<p>too short</p>")]:
            with self.subTest(payload=payload[1]), patch.object(
                retrieval, "_robots_allowed", return_value=True
            ), patch.object(retrieval, "_request_once", return_value=payload):
                with self.assertRaises(retrieval.RetrievalError):
                    retrieval.fetch_document("https://example.org/news")

    def test_dns_non_public_ip_fails_closed(self):
        with patch.object(retrieval.socket, "getaddrinfo",
                          return_value=[(2, 1, 6, "", ("10.0.0.4", 443))]):
            with self.assertRaisesRegex(retrieval.RetrievalError, "non-public"):
                retrieval._resolve_public_ips("example.org")

    def test_dns_mixed_public_private_fails_closed(self):
        with patch.object(retrieval.socket, "getaddrinfo",
                          return_value=[(2, 1, 6, "", ("1.1.1.1", 443)),
                                        (2, 1, 6, "", ("192.168.1.2", 443))]):
            with self.assertRaisesRegex(retrieval.RetrievalError, "non-public"):
                retrieval._resolve_public_ips("example.org")

    def test_robots_rules_and_failure_closed(self):
        text = b"User-agent: *\nDisallow: /private\nAllow: /\n"
        with patch.object(retrieval, "_request_once",
                          return_value=(200, {"content-type": "text/plain"}, text)):
            self.assertFalse(retrieval._robots_allowed("https://example.org/private/one"))
            self.assertTrue(retrieval._robots_allowed("https://example.org/public"))
        with patch.object(retrieval, "_request_once",
                          return_value=(403, {"content-type": "text/plain"}, b"")):
            self.assertFalse(retrieval._robots_allowed("https://example.org/public"))

    def test_html_extraction_drops_scripts_and_navigation(self):
        sample = b"<html><head><title>Hello</title><script>secret</script></head><body><nav>menu</nav><article><p>" + b"Good text " * 30 + b"</p></article></body></html>"
        parser = retrieval._DocumentParser()
        parser.feed(sample.decode("utf-8"))
        self.assertNotIn("secret", " ".join(parser.parts))
        self.assertNotIn("menu", " ".join(parser.parts))
        self.assertIn("Good text", " ".join(parser.parts))


if __name__ == "__main__":
    unittest.main()
