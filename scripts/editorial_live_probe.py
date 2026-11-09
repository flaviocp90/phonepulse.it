"""One-shot live probe of public *official documentation*.

No arbitrary URL input, no stored page content, no LLM, no Supabase and no writes.
A retrieval failure is reported as an outcome, not treated as verification.
"""
from __future__ import annotations

import json
from editorial_retrieval import RetrievalError, fetch_document

TARGETS = (
    "https://developer.android.com/health-and-fitness/health-connect/features/steps",
    "https://developer.samsung.com/health/health-connect-faq.html",
)


def main():
    outcomes = []
    for url in TARGETS:
        try:
            doc = fetch_document(url)
            outcomes.append({
                "url": url,
                "status": "retrieved",
                "final_url": doc.final_url,
                "title_present": bool(doc.title),
                "extracted_characters": len(doc.text),
                "redirect_count": len(doc.redirects),
            })
        except (RetrievalError, ValueError, OSError) as error:
            outcomes.append({
                "url": url,
                "status": "unavailable",
                "reason": type(error).__name__,
                # No full response body, stack trace or secrets in CI output.
            })
    print(json.dumps({"probe": "official_documentation_read_only",
                      "claims_verified": False,
                      "outcomes": outcomes}, ensure_ascii=False))
    # Failure is a documented conservative outcome, not a reason to bypass robots.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
