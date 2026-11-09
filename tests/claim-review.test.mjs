import test from 'node:test'
import assert from 'node:assert/strict'
import { claimReviewErrors, claimReviewSummary, claimReviewAudit } from '../src/lib/claimReview.js'

const sources = [{
  url: 'https://developer.android.com/health-and-fitness/health-connect/get-started',
  title: 'Health Connect', publisher: 'Android Developers',
  retrieved_at: '2026-11-09T20:00:00Z'
}]
const claim = {
  statement: 'Health Connect is available within Android system settings.',
  source_url: sources[0].url,
  evidence: 'On Android 14 and higher, Health Connect is part of the Android system.',
  rationale: 'I checked the relevant official developer documentation and version details.',
  decision: 'supported',
}

test('complete manual evidence becomes a bounded audit payload', () => {
  assert.equal(claimReviewSummary([claim], sources).complete, true)
  const result = claimReviewAudit([claim], sources)
  assert.equal(result.mode, 'manual_editor_review')
  assert.equal(result.claims[0].decision, 'supported')
  assert.equal(result.claims[0].source_url, sources[0].url)
})

test('missing a source consultation prevents a positive review', () => {
  assert.equal(claimReviewSummary([claim], [{ ...sources[0], retrieved_at: null }]).complete, false)
  assert.match(claimReviewErrors([claim], [{ ...sources[0], retrieved_at: null }])[0], /fonte HTTPS/i)
})

test('a claim with no evidence or explanation cannot be approved', () => {
  assert.equal(claimReviewSummary([{ ...claim, evidence: '', rationale: '' }], sources).complete, false)
  assert.throws(() => claimReviewAudit([{ ...claim, evidence: '', rationale: '' }], sources))
})

test('conflicting and unknown claims block the approval evidence', () => {
  for (const decision of ['unknown', 'conflicted']) {
    assert.equal(claimReviewSummary([{ ...claim, decision }], sources).complete, false)
    assert.throws(() => claimReviewAudit([{ ...claim, decision }], sources))
  }
})

test('no claim review is optional for legacy editorial workflow', () => {
  assert.deepEqual(claimReviewErrors([], sources), [])
  assert.equal(claimReviewSummary([], sources).complete, false)
})
