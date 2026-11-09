"""Deterministic, unverified text excerpts for editorial research.

Extraction is intentionally NOT semantic fact-checking: it finds review
candidates with stable provenance and refuses to certify assertions.
No models, external calls or third-party full-text persistence.
"""
from __future__ import annotations

import hashlib
import re
from urllib.parse import urlsplit

MAX_CANDIDATES_PER_SOURCE = 3
MAX_EXCERPT_CHARS = 110
MIN_WORDS = 9
MAX_DOC_CHARS = 16_000


def _sentence_spans(text: str):
    """Yield original offsets to allow editorial review against the source."""
    # Limit work even if a caller accidentally passes unbounded text.
    text = text[:MAX_DOC_CHARS]
    for match in re.finditer(r"[^.!?\n]+(?:[.!?]+|$)", text):
        start, end = match.span()
        sentence = match.group().strip()
        if sentence:
            start += len(match.group()) - len(match.group().lstrip())
            yield start, end, sentence


def extract_candidates(*, source_id: str, url: str, text: str) -> list[dict]:
    """Select non-duplicated, *unverified* exact excerpts, not generated facts.

    A candidate cannot be promoted to a verified claim by this function.
    No inferred support/conflict or publisher independence is asserted.
    """
    if not re.fullmatch(r"s[1-9][0-9]*", source_id):
        raise ValueError("Invalid source ID")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Source must be HTTPS")
    if not isinstance(text, str):
        raise ValueError("Text must be a string")
    candidates = []
    seen = set()
    for start, end, sentence in _sentence_spans(text):
        compact = re.sub(r"\s+", " ", sentence).strip()
        if len(compact.split()) < MIN_WORDS or len(compact) < 65:
            continue
        folded = re.sub(r"\W+", " ", compact.casefold()).strip()
        if folded in seen:
            continue
        seen.add(folded)
        excerpt = compact[:MAX_EXCERPT_CHARS].rstrip()
        candidates.append({
            "candidate_id": f"{source_id}-e{len(candidates) + 1}",
            "source_id": source_id,
            "source_url": url,
            "excerpt": excerpt,
            "char_start": start,
            "char_end": min(end, MAX_DOC_CHARS),
            "sentence_sha256": hashlib.sha256(compact.encode("utf-8")).hexdigest(),
            "verification": "unverified",
            "editorial_note": "Exact source excerpt; verify meaning, context and currency",
        })
        if len(candidates) >= MAX_CANDIDATES_PER_SOURCE:
            break
    return candidates
