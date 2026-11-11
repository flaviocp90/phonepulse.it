import test from 'node:test'
import assert from 'node:assert/strict'
import { handleMediaRequest } from '../api/media.js'
import { mediaPath, mediaPaths, mediaUrl } from '../src/lib/privateMedia.js'

const path = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png'
const environment = { VITE_SUPABASE_URL: 'https://supabase.test', VITE_SUPABASE_ANON_KEY: 'public-anon-key' }
function response() { return { headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, send(body) { this.body = body; return this } } }

test('media URLs have a fixed public endpoint and reject traversal or a foreign host', () => {
  assert.equal(mediaPath(mediaUrl(path)), path)
  assert.equal(mediaPath('https://attacker.test/api/media?path=' + path), null)
  assert.throws(() => mediaUrl('../secret'))
  assert.deepEqual(mediaPaths(`![foto](${mediaUrl(path)})`, mediaUrl(path)), [path])
})

test('public proxy uses only the anonymous key and is never cached', async () => {
  const res = response()
  let call
  await handleMediaRequest({ method: 'GET', query: { path } }, res, { environment, fetcher: async (url, options) => { call = { url, options }; return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }) } })
  assert.equal(res.code, 200)
  assert.equal(res.headers['Cache-Control'], 'private, no-store')
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(call.options.headers.Authorization, 'Bearer public-anon-key')
  assert.equal(call.options.redirect, 'error')
  assert.match(call.url, /object\/authenticated\/editorial-media\//)
})

test('draft, withdrawn and nonexistent objects return 404 without leaking the backend error', async () => {
  for (const status of [400, 401, 403, 404]) {
    const res = response()
    await handleMediaRequest({ method: 'GET', query: { path } }, res, { environment, fetcher: async () => new Response('private error', { status }) })
    assert.equal(res.code, 404)
    assert.equal(res.body, 'Photo not found')
  }
})

test('bad paths never reach storage; wrong types and oversized bodies are rejected', async () => {
  const res = response()
  await handleMediaRequest({ method: 'GET', query: { path: '../secret' } }, res, { environment, fetcher: () => { throw new Error('must not fetch') } })
  assert.equal(res.code, 404)
  for (const headers of [{ 'content-type': 'text/html' }, { 'content-type': 'image/png', 'content-length': '5242881' }]) {
    const result = response()
    await handleMediaRequest({ method: 'GET', query: { path } }, result, { environment, fetcher: async () => new Response('x', { headers }) })
    assert.equal(result.code, 502)
  }
})
