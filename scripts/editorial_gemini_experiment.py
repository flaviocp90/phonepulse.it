"""One-shot Gemini writing experiment; no Supabase, job, or publisher access.

Only accepts an externally reviewed brief. Disabled unless --execute is given,
with GEMINI_API_KEY present. Exactly one bounded request; no retry or fallback.
Nothing is posted to PhonePulse or stored remotely by this script.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

from editorial_writer import draft_from_reviewed_brief, DraftingError

MODEL = "gemini-3.5-flash-lite"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
MAX_OUTPUT_TOKENS = 2048
MAX_INPUT_CHARS = 16000
MAX_HTTP_BYTES = 65536

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "decision": {"type": "STRING", "enum": ["skip", "review_draft"]},
        "title": {"type": "STRING"},
        "excerpt": {"type": "STRING"},
        "content": {"type": "STRING"},
    },
    "required": ["decision"],
}


class ProviderError(ValueError):
    pass


def gemini_once(payload: dict, *, api_key: str, opener=None) -> str:
    """Send one JSON-constrained request; do not print key, prompt or response."""
    if not isinstance(api_key, str) or not api_key.strip():
        raise ProviderError("GEMINI_API_KEY is required")
    system = payload.get("system")
    user = payload.get("user_data_json")
    if not isinstance(system, str) or not isinstance(user, str):
        raise ProviderError("Malformed model payload")
    if len(system) + len(user) > MAX_INPUT_CHARS:
        raise ProviderError("Input too large")
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
        },
    }
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    open_request = opener or urllib.request.urlopen
    try:
        with open_request(request, timeout=30) as response:
            raw = response.read(MAX_HTTP_BYTES + 1)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ProviderError("Gemini request failed (no retry)") from exc
    if len(raw) > MAX_HTTP_BYTES:
        raise ProviderError("Provider response exceeded size limit")
    try:
        result = json.loads(raw)
        parts = result["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise ProviderError("Unexpected provider response") from exc
    if not text:
        raise ProviderError("Empty model output")
    return text


def make_experiment(brief: dict, *, api_key: str, opener=None) -> dict:
    """No publishing capability. Structural checks are NOT a fact-check."""
    draft = draft_from_reviewed_brief(
        brief, lambda payload: gemini_once(payload, api_key=api_key, opener=opener)
    )
    return {"model": MODEL, "experiment": True, "publish_allowed": False,
            "draft": draft, "editorial_fact_check_required": True}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="PhonePulse one-shot Gemini experiment")
    parser.add_argument("--brief", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--execute", action="store_true", help="Explicitly permit one provider request")
    args = parser.parse_args(argv)
    brief = json.loads(args.brief.read_text(encoding="utf-8"))
    if not args.execute:
        # No model calls, no output artifact suggesting a draft was generated.
        raise SystemExit("Provider invocation disabled. Explicit --execute required.")
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        raise SystemExit("GEMINI_API_KEY missing; no provider request sent.")
    if args.output.exists():
        raise SystemExit("Output file exists; refusing overwrite.")
    result = make_experiment(brief, api_key=key)
    # Only after validation has passed.
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    print("One review-only experiment saved; no publication or database access.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
