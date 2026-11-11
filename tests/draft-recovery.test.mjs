import test from 'node:test'
import assert from 'node:assert/strict'
import { readRecovery, recoveryKey } from '../src/lib/draftRecovery.js'
import { articlePhotos, movePhoto, photoMarkdown } from '../src/lib/guidedEditor.js'

const form = Object.fromEntries(['title', 'slug', 'category_id', 'excerpt', 'content', 'cover_image_url', 'score', 'seo_title', 'seo_description', 'affiliate_links', 'author', 'image_source', 'content_format'].map(key => [key, '']))
form.sources = []
const raw = JSON.stringify({ schema: 1, userId: 'editor-a', articleId: 'article-a', version: 2, value: { form: { ...form, content: 'Testo non salvato' }, tags: [], claims: [], provenance: null } })

test('recovery binds content and article version to the correct editor', () => {
  assert.equal(readRecovery(raw, 'editor-a', 'article-a').value.form.content, 'Testo non salvato')
  assert.equal(readRecovery(raw, 'editor-a', 'article-a').version, 2)
  assert.throws(() => readRecovery(raw, 'editor-b', 'article-a'))
  assert.throws(() => readRecovery(raw, 'editor-a', 'article-b'))
  assert.notEqual(recoveryKey('editor-a', 'article-a'), recoveryKey('editor-b', 'article-a'))
  assert.throws(() => readRecovery(raw.replace('"claims":[]', '"claims":[null]'), 'editor-a', 'article-a'))
})

test('moving a photo preserves its caption and all surrounding article text', () => {
  const photo = label => photoMarkdown({ url: `https://example.com/${label}.jpg`, alt: label, caption: `Didascalia ${label}`, credit: 'Autore', license: 'CC BY' })
  const content = 'Introduzione' + photo('prima') + 'Testo intermedio' + photo('seconda') + 'Conclusione'
  assert.equal(articlePhotos(content).length, 2)
  const moved = movePhoto(content, 1, -1)
  assert.deepEqual(articlePhotos(moved).map(row => row.alt), ['seconda', 'prima'])
  assert.match(moved, /Introduzione/); assert.match(moved, /Testo intermedio/); assert.match(moved, /Conclusione/)
  assert.equal(movePhoto(moved, 0, 1), content)
  assert.equal(movePhoto(content, 0, -1), content)
})
