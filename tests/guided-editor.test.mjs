import test from 'node:test'
import assert from 'node:assert/strict'
import { templates, photoMarkdown, validatePhoto, readResearchImport } from '../src/lib/guidedEditor.js'
import { renderMarkdownSafe } from '../api/seo-preview.js'
import { readClaimDraft } from '../src/lib/claimReview.js'

test('four editable formats keep documentary work distinct from hardware tests', () => {
  assert.deepEqual(Object.keys(templates), ['news', 'guide', 'comparison', 'review'])
  assert.match(templates.guide, /documentale/)
  assert.match(templates.comparison, /non abbiamo provato/)
  assert.match(templates.review, /Metodo e durata/)
})

test('photos require a supported format and bounded size', () => {
  assert.equal(validatePhoto({ type: 'image/jpeg', size: 10 }), 'jpg')
  for (const file of [null, { type: 'image/svg+xml', size: 100 }, { type: 'image/png', size: 5242881 }, { type: 'image/png', size: 0 }]) assert.throws(() => validatePhoto(file))
})

test('photo metadata stays in article content and cannot inject HTML', () => {
  const photo = { url: 'https://images.example.org/test.png', alt: 'Foto "><script>', caption: 'Dettaglio <test>', credit: 'Autore', license: 'CC BY 4.0' }
  const markdown = photoMarkdown(photo)
  const html = renderMarkdownSafe(markdown)
  assert.match(html, /alt="Foto &quot;&gt;&lt;script&gt;"/)
  assert.match(html, /images.example.org/)
  assert.match(html, /Dettaglio &lt;test&gt; — Autore · CC BY 4.0/)
  assert.doesNotMatch(html, /<script>/)
  for (const key of ['alt', 'caption', 'credit', 'license']) assert.throws(() => photoMarkdown({ ...photo, [key]: '' }))
  assert.throws(() => photoMarkdown({ ...photo, url: 'javascript:alert(1)' }))
  assert.throws(() => photoMarkdown({ ...photo, url: 'https://user:secret@example.org/photo' }))
})

test('unfinished claim drafts accept unknown decisions but reject malformed database data', () => {
  const claim = { statement: '', source_url: '', evidence: '', rationale: '', decision: 'unknown' }
  assert.deepEqual(readClaimDraft([claim]), [claim])
  for (const value of [null, [null], [{}], Array(13).fill(claim), [{ ...claim, evidence: 'x'.repeat(241) }]]) assert.throws(() => readClaimDraft(value))
})


test('research imports are bounded draft content without approval authority', () => {
  const value = { schema: 'phonepulse_review_import_v1', publish_allowed: false, article: { title: 'Research title', excerpt: 'Summary', content: 'A sourced fact [c1](https://example.org).', content_format: 'guide', sources: [{ url: 'https://example.org/', title: 'Official source', publisher: 'Official publisher', retrieved_at: '2026-01-01T00:00:00Z' }] }, provenance: { manifest_sha256: 'a'.repeat(64), model: 'synthetic-model', authentication_verified: true } }
  assert.equal(readResearchImport(value).provenance.authentication_verified, false)
  assert.equal(readResearchImport(value).provenance.review_required, true)
  assert.throws(() => readResearchImport({ ...value, publish_allowed: true }))
  assert.throws(() => readResearchImport({ ...value, article: { ...value.article, content: '<script>malicious</script>' } }))
  assert.throws(() => readResearchImport({ ...value, article: { ...value.article, content: 'x'.repeat(18001) } }))
})
