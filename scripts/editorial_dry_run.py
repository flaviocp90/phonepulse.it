"""Explicit dry-run CLI for editorial source retrieval.

It does not run LLMs, send messages, use Supabase or publish content.
Never store complete third-party article text in the manifest.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

from editorial_evidence import Claim, Source, assess_pack, canonical_public_url
from editorial_candidates import extract_candidates
from editorial_retrieval import RetrievalError, fetch_document


def build_manifest(payload: dict, *, live_fetch: bool = False,
                   fetcher=fetch_document) -> dict:
    """Prepare machine-auditable provenance. Editorial verification is separate."""
    if not isinstance(payload, dict) or not isinstance(payload.get("sources"), list):
        raise ValueError("Input requires a sources array")
    if not isinstance(payload.get("claims"), list):
        raise ValueError("Input requires a claims array")

    source_objects = []
    source_records = []
    candidate_evidence = []
    for item in payload["sources"]:
        if not isinstance(item, dict):
            raise ValueError("Invalid source")
        url = canonical_public_url(item["url"])
        record = {"source_id": item["source_id"], "url": url,
                  "publisher": item["publisher"], "kind": item["kind"],
                  "retrieval": "not_attempted"}
        retrieved = False
        if live_fetch:
            try:
                document = fetcher(url)
                if document.requested_url != url:
                    raise RetrievalError("Requested URL mismatch")
                record.update({
                    "retrieval": "ok", "final_url": document.final_url,
                    "redirects": list(document.redirects),
                    "title": document.title,
                    "text_sha256": hashlib.sha256(document.text.encode("utf-8")).hexdigest(),
                    "extracted_characters": len(document.text),
                })
                candidate_evidence.extend(extract_candidates(
                    source_id=record["source_id"], url=document.final_url,
                    text=document.text))
                record["candidate_count"] = len([x for x in candidate_evidence
                                                 if x["source_id"] == record["source_id"]])
                retrieved = True
            except (RetrievalError, OSError, ValueError) as exc:
                record.update({"retrieval": "unavailable",
                               "error": type(exc).__name__,
                               "reason": str(exc)[:120] if isinstance(exc, RetrievalError)
                                         else "Input or connection unavailable"})
        source_records.append(record)
        source_objects.append(Source(record["source_id"], url,
                                     record["publisher"], record["kind"], retrieved))

    claims = []
    for item in payload["claims"]:
        if not isinstance(item, dict):
            raise ValueError("Invalid claim")
        # Do NOT accept a submitted 'verified' flag: this CLI can only collect
        # sources, not independently attest factual support.
        claims.append(Claim(
            claim_id=item["claim_id"],
            statement=item["statement"],
            supporting_source_ids=tuple(item.get("supporting_source_ids", [])),
            conflicting_source_ids=tuple(item.get("conflicting_source_ids", [])),
            editorially_verified=False,
        ))
    assessment = assess_pack(source_objects, claims)
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "topic": str(payload.get("topic", ""))[:240],
        "mode": "live_readonly" if live_fetch else "offline",
        "sources": source_records,
        "candidate_evidence": candidate_evidence,
        "assessment": assessment,
        "publication_allowed": False,
        "note": "Excerpts are unverified review candidates, not validated claims; editorial review required.",
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="PhonePulse source provenance dry-run")
    parser.add_argument("--input", required=True, type=Path, help="JSON input")
    parser.add_argument("--output", type=Path, help="Optional JSON manifest path")
    parser.add_argument("--fetch", action="store_true",
                        help="Explicitly enable bounded public HTTPS source retrieval")
    args = parser.parse_args(argv)
    data = json.loads(args.input.read_text(encoding="utf-8"))
    result = build_manifest(data, live_fetch=args.fetch)
    output = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    else:
        sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
