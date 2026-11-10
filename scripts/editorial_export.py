"""Export reviewed local artifacts for manual CMS import; never accesses the DB."""
from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path
import re

from editorial_evidence import canonical_public_url
from editorial_review_gate import compile_reviewed_brief, manifest_fingerprint
from editorial_review_brief import validate_review_draft


def export_for_admin(manifest: dict, ledger: dict, experiment: dict) -> dict:
    brief = compile_reviewed_brief(manifest, ledger)
    draft = experiment.get('draft')
    if experiment.get('publish_allowed') is not False or not isinstance(draft, dict) or draft.get('publish_allowed') is not False:
        raise ValueError('Non-publishable experiment required')
    if draft.get('decision') != 'review_draft' or validate_review_draft(draft, brief):
        raise ValueError('A structurally valid review draft is required; skip cannot be imported')
    digest = manifest_fingerprint(manifest)
    if draft.get('review_manifest_sha256') != digest:
        raise ValueError('Draft and evidence manifest differ')
    stamp = manifest.get('generated_at')
    if not isinstance(stamp, str) or datetime.fromisoformat(stamp.replace('Z', '+00:00')).tzinfo is None:
        raise ValueError('Source retrieval timestamp required')
    records = {row['source_id']: row for row in manifest['sources']}
    sources = {}
    claims = []
    links = {}
    for claim in brief['claims']:
        ref = claim['references'][0]
        row = records[ref['source_id']]
        if row['retrieval'] != 'ok':
            raise ValueError('Claim source was not retrieved')
        url = canonical_public_url(row['final_url'])
        sources[url] = {'url': url, 'title': row.get('title') or row['publisher'],
                        'publisher': row['publisher'], 'retrieved_at': stamp,
                        'published_at': None}
        links[claim['claim_id']] = url
        # Imported research is not authenticated editorial approval in the CMS.
        claims.append({'statement': claim['statement'], 'source_url': url,
                       'evidence': '', 'rationale': '', 'decision': 'unknown'})
    if len(claims) > 12:
        raise ValueError('Admin supports at most 12 claims')
    content = re.sub(r'\[(c[0-9]+)\]', lambda match: f'[{match[1]}]({links[match[1]]})', draft['content'])
    return {
        'schema': 'phonepulse_review_import_v1', 'publish_allowed': False,
        'article': {'title': draft['title'], 'excerpt': draft['excerpt'],
                    'content': content, 'content_format': 'guide',
                    'sources': list(sources.values())},
        'claims': claims,
        'provenance': {'manifest_sha256': digest, 'model': experiment.get('model', 'unknown'),
                       'brief_version': brief['brief_version'], 'retrieved_at': stamp,
                       'authentication_verified': False, 'review_required': True},
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description='Export a review-only draft for manual admin import')
    for name in ('manifest', 'review', 'experiment', 'output'):
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args(argv)
    result = export_for_admin(*(json.loads(path.read_text(encoding='utf-8'))
                                for path in (args.manifest, args.review, args.experiment)))
    with args.output.open('x', encoding='utf-8') as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write('\n')
    print('Review-only import saved. No database or publication access.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
