import test from 'node:test'
import assert from 'node:assert/strict'
import { cutoffIso, eligibleStaleRssDraft, STALE_RSS_MAX_BATCH } from '../src/lib/staleRssCleanup.js'

const cutoff = '2026-10-26T00:00:00.000Z'
const eligible = { id: 'x', created_at: '2026-10-10T08:00:00.000Z',
  status: 'draft', origin: 'rss', content_format: 'news', version: 1 }

test('archives only old, untouched RSS news drafts', () => {
  assert.equal(eligibleStaleRssDraft(eligible, cutoff), true)
  for (const update of [
    { origin: 'legacy' }, { status: 'published' }, { status: 'approved' },
    { status: 'discarded' }, { content_format: 'guide' }, { version: 2 },
    { created_at: '2026-11-01T00:00:00.000Z' }, { created_at: null },
  ]) assert.equal(eligibleStaleRssDraft({ ...eligible, ...update }, cutoff), false)
})

test('cutoff and bounded selection remain stable', () => {
  assert.equal(cutoffIso(new Date('2026-11-09T00:00:00Z')), '2026-10-26T00:00:00.000Z')
  assert.equal(STALE_RSS_MAX_BATCH, 30)
})
