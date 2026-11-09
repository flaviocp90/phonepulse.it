"""Offline tests. No network requests, API keys or Supabase writes."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from editorial_evidence import (Claim, EvidenceError, Source,
                                assess_pack, canonical_public_url)


def source(number, fetched=True, kind="primary"):
    return Source(f"s{number}", canonical_public_url(f"https://example{number}.org/news"),
                  f"Publisher {number}", kind, fetched)


class CanonicalUrlTests(unittest.TestCase):
    def test_clean_tracking_params_and_fragment(self):
        self.assertEqual(
            canonical_public_url("https://Example.org/a?utm_source=x&id=3#top"),
            "https://example.org/a?id=3",
        )

    def test_reject_unsafe(self):
        urls = [
            "http://example.org", "https://localhost/test",
            "https://127.0.0.1/test", "https://[::1]/test",
            "https://user:pass@example.org", "https://example.org:8443/",
            "https://api.internal/data", "https://-bad.example.org/",
            "file:///etc/passwd", "https://oneword/",
        ]
        for url in urls:
            with self.subTest(url=url), self.assertRaises(EvidenceError):
                canonical_public_url(url)


class EditorialDecisionTests(unittest.TestCase):
    def test_supported_three_facts_allow_draft_candidate(self):
        sources = [source(1), source(2, kind="secondary")]
        claims = [
            Claim("c1", "La versione di sistema introduce una funzione.", ("s1",), editorially_verified=True),
            Claim("c2", "La distribuzione comincia nel mese indicato.", ("s1",), editorially_verified=True),
            Claim("c3", "L'opzione è riservata a modelli specifici.", ("s2",)),
        ]
        result = assess_pack(sources, claims)
        self.assertEqual(result["decision"], "draft")
        self.assertTrue(result["human_review_required"])
        self.assertTrue(all(c["status"] == "supported" for c in result["claims"]))

    def test_conflict_requires_research_even_with_three_claims(self):
        sources = [source(1), source(2)]
        claims = [
            Claim("c1", "Disponibilità annunciata per diversi mercati.", ("s1",), ("s2",)),
            Claim("c2", "Il produttore dichiara una nuova funzione.", ("s1",)),
            Claim("c3", "Il servizio interessa alcuni telefoni.", ("s2",)),
        ]
        result = assess_pack(sources, claims)
        self.assertEqual(result["decision"], "needs_research")
        self.assertEqual(result["claims"][0]["status"], "conflicted")

    def test_retrieval_alone_never_certifies_a_claim(self):
        result = assess_pack([source(1)], [
            Claim("c1", "Il documento parla di una nuova funzione.", ("s1",))
        ])
        self.assertEqual(result["decision"], "needs_research")
        self.assertEqual(result["claims"][0]["status"], "unknown")

    def test_unread_source_is_not_evidence(self):
        result = assess_pack([source(1, fetched=False)], [
            Claim("c1", "Il comunicato contiene un annuncio.", ("s1",))
        ])
        self.assertEqual(result["decision"], "needs_research")
        self.assertEqual(result["claims"][0]["status"], "unknown")

    def test_insufficient_evidence_skips(self):
        result = assess_pack([source(1)], [
            Claim("c1", "Il prodotto aggiunge una nuova funzione.", ("s1",), editorially_verified=True)
        ])
        self.assertEqual(result["decision"], "skip")

    def test_invalid_refs_and_duplicate_urls_fail(self):
        with self.assertRaises(EvidenceError):
            assess_pack([source(1)], [Claim("c1", "Un'affermazione non verificata.", ("s9",))])
        with self.assertRaises(EvidenceError):
            assess_pack([source(1), Source("s2", source(1).url, "Other", "secondary", True)], [])

    def test_conflicting_and_supporting_same_source_fails(self):
        with self.assertRaises(EvidenceError):
            assess_pack([source(1)], [Claim("c1", "Due documenti indicano un limite.", ("s1",), ("s1",))])


if __name__ == "__main__":
    unittest.main()
