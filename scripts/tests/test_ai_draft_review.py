import json
import unittest
from unittest.mock import Mock, patch

import ai_draft_review as worker


def response_for(*, us_only='no', discount='no', claims='pass'):
    checks = {key: {'status': 'pass', 'reason': 'Controllo sintetico'} for key in worker.CHECKPOINTS}
    checks['claims_sourced']['status'] = claims
    result = {'checks': checks, 'filters': {
        'us_only': {'status': us_only, 'reason': 'Mercato indicato'},
        'discount': {'status': discount, 'reason': 'Scopo della notizia'},
    }}
    response = Mock(status_code=200)
    response.json.return_value = {'status': 'completed', 'output': [
        {'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps(result)}]},
    ]}
    return response


class DraftReviewTests(unittest.TestCase):
    def test_seven_checkpoints_and_independent_archive_filters(self):
        for sample, outcome in (
            ({}, 'passed'), ({'us_only': 'yes'}, 'discarded'),
            ({'discount': 'yes'}, 'discarded'), ({'discount': 'uncertain'}, 'needs_attention'),
            ({'claims': 'uncertain'}, 'needs_attention'), ({'claims': 'fail'}, 'needs_attention'),
        ):
            with self.subTest(sample=sample), patch.object(worker.requests, 'post', return_value=response_for(**sample)) as post:
                result = worker.review_draft({'title': 'Bozza', 'id': 'private-id'}, 'test-key')
                self.assertEqual(result['outcome'], outcome)
                self.assertEqual(len(result['checks']), 7)
                request = post.call_args.kwargs['json']
                self.assertEqual(request['model'], 'gpt-6-luna')
                self.assertTrue(request['text']['format']['strict'])
                self.assertNotIn('private-id', request['input'])

    def test_incomplete_or_refused_response_is_never_saved(self):
        for output in (
            [],
            [{'type': 'message', 'content': [{'type': 'refusal'}]}],
            [{'type': 'message', 'content': [{'type': 'output_text', 'text': '{}'}]}],
        ):
            response = Mock(status_code=200)
            response.json.return_value = {'status': 'completed', 'output': output}
            db = Mock()
            db.rpc.return_value.execute.return_value.data = [{'id': 'draft', 'version': 3}]
            with self.subTest(output=output), patch.object(worker.requests, 'post', return_value=response):
                with self.assertRaisesRegex(RuntimeError, 'Invalid Luna review'):
                    worker.run_review(db, 'test-key', dry_run=False)
                db.rpc.assert_called_once_with('list_drafts_for_ai_review')

    def test_dry_run_never_writes_and_live_write_uses_saved_version(self):
        for dry_run in (True, False):
            db = Mock()
            db.rpc.return_value.execute.return_value.data = [{'id': 'draft', 'version': 7}]
            with self.subTest(dry_run=dry_run), patch.object(worker.requests, 'post', return_value=response_for(discount='yes')):
                worker.run_review(db, 'test-key', dry_run)
                if dry_run:
                    db.rpc.assert_called_once_with('list_drafts_for_ai_review')
                else:
                    name, args = db.rpc.call_args.args
                    self.assertEqual(name, 'record_ai_draft_review')
                    self.assertEqual(args['p_expected_version'], 7)
                    self.assertEqual(args['p_review']['outcome'], 'discarded')
