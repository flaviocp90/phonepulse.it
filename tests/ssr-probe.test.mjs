import { test } from 'node:test'
import assert from 'node:assert/strict'
import { default as handler } from '../api/ssr-check.js'

test('probe packages server rendering and client CSS, and stays off in production', async () => {
  const original = process.env.VERCEL_ENV
  try {
    const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, send(body) { this.body = body; return this } })
    process.env.VERCEL_ENV = 'preview'
    const ok = response()
    await handler({ method: 'GET' }, ok)
    assert.equal(ok.code, 200)
    assert.match(ok.headers['Content-Type'], /text\/html/)
    assert.match(ok.body, /<h1[^>]*>Prova SSR PhonePulse<\/h1>/)
    assert.match(ok.body, /href="\/assets\/[^" ]+\.css"/)
    assert.doesNotMatch(ok.body, /<script/)
    process.env.VERCEL_ENV = 'production'
    const hidden = response()
    await handler({ method: 'GET' }, hidden)
    assert.equal(hidden.code, 404)
    process.env.VERCEL_ENV = 'preview'
    const post = response()
    await handler({ method: 'POST' }, post)
    assert.equal(post.code, 405)
  } finally {
    if (original === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = original
  }
})
