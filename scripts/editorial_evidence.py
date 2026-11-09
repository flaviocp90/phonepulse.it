"""Offline evidence-pack contracts for editorial research.

This module NEVER fetches URLs, runs a model or writes to the database.
Network retrieval requires a separate SSRF-safe implementation and review.
"""
from __future__ import annotations

from dataclasses import dataclass
from ipaddress import ip_address
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import re


class EvidenceError(ValueError):
    """Invalid or insufficient evidence input."""


def canonical_public_url(raw: str) -> str:
    """Normalize an HTTPS public *hostname* URL before further network checks.

    Reject literals and obvious local names. Not sufficient to authorize a
    network request: a fetcher MUST resolve, pin, and revalidate public IPs
    for every redirect and connection.
    """
    if not isinstance(raw, str) or not raw or len(raw) > 2048:
        raise EvidenceError("Invalid URL")
    try:
        p = urlsplit(raw.strip())
        host = (p.hostname or "").lower().rstrip(".")
        if p.scheme != "https" or not host or p.username or p.password:
            raise EvidenceError("HTTPS public host required")
        if p.port not in (None, 443):
            raise EvidenceError("Unexpected port")
    except ValueError as exc:
        raise EvidenceError("Malformed URL") from exc

    if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".localhost", ".internal")):
        raise EvidenceError("Local host forbidden")
    try:
        ip_address(host.strip("[]"))
    except ValueError:
        pass
    else:
        raise EvidenceError("IP literals forbidden")
    if not re.fullmatch(r"[a-z0-9-]+(?:\.[a-z0-9-]+)+", host):
        raise EvidenceError("Invalid hostname")
    labels = host.split(".")
    if any(x.startswith("-") or x.endswith("-") for x in labels):
        raise EvidenceError("Invalid hostname")
    query = [(key, value) for key, value in parse_qsl(p.query, keep_blank_values=True)
             if not key.lower().startswith("utm_") and key.lower() not in {"fbclid", "gclid"}]
    return urlunsplit(("https", host, p.path or "/", urlencode(query), ""))


@dataclass(frozen=True)
class Source:
    source_id: str
    url: str
    publisher: str
    kind: str
    fetched: bool

    def __post_init__(self):
        if not re.fullmatch(r"s[1-9][0-9]*", self.source_id):
            raise EvidenceError("Invalid source ID")
        if self.kind not in ("primary", "secondary"):
            raise EvidenceError("Invalid source kind")
        if not self.publisher.strip():
            raise EvidenceError("Missing publisher")
        if self.url != canonical_public_url(self.url):
            raise EvidenceError("Source URL must be canonical")


@dataclass(frozen=True)
class Claim:
    claim_id: str
    statement: str
    supporting_source_ids: tuple[str, ...]
    conflicting_source_ids: tuple[str, ...] = ()

    def __post_init__(self):
        if not re.fullmatch(r"c[1-9][0-9]*", self.claim_id):
            raise EvidenceError("Invalid claim ID")
        if len(self.statement.strip()) < 12:
            raise EvidenceError("Claim has no useful statement")
        if len(self.statement) > 1000:
            raise EvidenceError("Claim too long")


def assess_pack(sources: list[Source], claims: list[Claim]) -> dict:
    """Fail closed: only a pack of sourced, non-conflicted facts is draftable.

    Automated structural checks do not establish factual correctness or
    independent corroboration: human review always remains mandatory.
    """
    source_map = {source.source_id: source for source in sources}
    if len(source_map) != len(sources):
        raise EvidenceError("Duplicate source IDs")
    if len({source.url for source in sources}) != len(sources):
        raise EvidenceError("Duplicate source URLs")
    if len({claim.claim_id for claim in claims}) != len(claims):
        raise EvidenceError("Duplicate claim IDs")

    reviewed = []
    for claim in claims:
        supporting = set(claim.supporting_source_ids)
        conflicting = set(claim.conflicting_source_ids)
        if supporting & conflicting:
            raise EvidenceError("Same source supports and conflicts with a claim")
        if (supporting | conflicting) - source_map.keys():
            raise EvidenceError("Claim refers to unknown source")
        read_support = sorted(s for s in supporting if source_map[s].fetched)
        read_conflict = sorted(s for s in conflicting if source_map[s].fetched)
        status = ("conflicted" if read_conflict else
                  "supported" if read_support else "unknown")
        reviewed.append({"claim_id": claim.claim_id, "statement": claim.statement,
                         "status": status, "supporting_sources": read_support,
                         "conflicting_sources": read_conflict})

    if not reviewed:
        decision, reason = "skip", "No evidenced claims"
    elif any(c["status"] == "conflicted" for c in reviewed):
        decision, reason = "needs_research", "Conflicting claims require human investigation"
    elif any(c["status"] == "unknown" for c in reviewed):
        decision, reason = "needs_research", "Unretrieved or missing supporting sources"
    elif len(reviewed) < 3:
        decision, reason = "skip", "Fewer than three substantiated editorial facts"
    else:
        decision, reason = "draft", "Eligible for drafting; human fact-check required"

    return {"decision": decision, "reason": reason, "claims": reviewed,
            "source_count": len(sources), "claim_count": len(reviewed),
            "human_review_required": True}
