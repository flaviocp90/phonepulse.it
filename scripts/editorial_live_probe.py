"""Read-only source manifest probe using a fixed primary-source fixture.

No arbitrary URL input, LLM, database writes, or publication.
Results are status-only: never print or persist third-party page text.
"""
from __future__ import annotations

import json
from pathlib import Path

from editorial_dry_run import build_manifest

FIXTURE = Path(__file__).resolve().parents[1] / "docs/editorial/pilots/health-connect-sources.json"


def main():
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    manifest = build_manifest(payload, live_fetch=True)
    summary = {
        "probe": "official_documentation_read_only",
        "claims_verified": False,
        "decision": manifest["assessment"]["decision"],
        "publication_allowed": manifest["publication_allowed"],
        "outcomes": [
            {
                "source_id": source["source_id"],
                "url": source["url"],
                "status": source["retrieval"],
                "extracted_characters": source.get("extracted_characters", 0),
                "error_type": source.get("error"),
                "reason": source.get("reason"),
            }
            for source in manifest["sources"]
        ],
        "claim_statuses": [
            {"claim_id": claim["claim_id"], "status": claim["status"]}
            for claim in manifest["assessment"]["claims"]
        ],
    }
    print(json.dumps(summary, ensure_ascii=False))
    # Unavailable sources are not a reason to bypass robots, paywalls or ToS.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
