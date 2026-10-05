import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/sitemap.js'

test('sitemap pages published records, escapes XML, omits unreliable dates and fails explicitly', async () => {
  const originalFetch = globalThis.fetch
  const previous = { url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY, environment: process.env.VERCEL_ENV }
  process.env.VERCEL_ENV = 'preview'
  process.env.VITE_SUPABASE_URL = 'https://supabase.test'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-only-anon'
  const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, send(body) { this.body = body; return this } })
  let calls = 0
  try {
    globalThis.fetch = async (url, options) => {
      if (url.pathname.endsWith('/categories')) return Response.json([{ slug: 'news' }])
      calls++
      assert.equal(url.searchParams.get('is_published'), 'eq.true')
      assert.equal(url.searchParams.get('order'), 'id.asc')
      assert.equal(options.headers.apikey, 'test-only-anon')
      if (calls === 1) return Response.json(Array.from({ length: 1000 }, (_, index) => ({
        id: String(index).padStart(4, '0'), slug: `news-${index}`, origin: 'manual', published_at: '2026-10-01T08:00:00Z', content_updated_at: '2026-10-02T08:00:00Z',
      })))
      assert.equal(url.searchParams.get('id'), 'gt.0999')
      return Response.json([
        { id: '1000', slug: 'guida&app', origin: 'legacy', published_at: 'invalid', content_updated_at: '2026-10-04' },
        { id: '1001', slug: 'archivio', origin: 'legacy', published_at: '2026-09-01', content_updated_at: '2026-10-04' },
      ])
    }
    const ok = response()
    await handler({ method: 'GET' }, ok)
    assert.equal(ok.code, 200)
    assert.equal(calls, 2)
    assert.match(ok.headers['Content-Type'], /application\/xml/)
    assert.equal((ok.body.match(/<url>/g) || []).length, 1007)
    assert.match(ok.body, /www\.phonepulse\.it\/articoli\/guida%26app/)
    assert.match(ok.body, /<lastmod>2026-10-02T08:00:00Z<\/lastmod>/)
    assert.match(ok.body, /<loc>https:\/\/www.phonepulse.it\/articoli\/archivio<\/loc><lastmod>2026-09-01<\/lastmod>/)
    assert.doesNotMatch(ok.body, /invalid|\/admin|draft|2026-10-04/)
    globalThis.fetch = async () => new Response('down', { status: 503 })
    const failed = response()
    await handler({ method: 'GET' }, failed)
    assert.equal(failed.code, 503)
    assert.equal(failed.headers['Cache-Control'], 'no-store')
    assert.doesNotMatch(failed.body, /<urlset/)
  } finally {
    globalThis.fetch = originalFetch
    for (const [name, value] of Object.entries({ VITE_SUPABASE_URL: previous.url, VITE_SUPABASE_ANON_KEY: previous.key, VERCEL_ENV: previous.environment })) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})
