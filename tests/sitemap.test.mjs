import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { loadPublishedIndex } from '../src/lib/publicSitemap.js'
import { handleSitemapRequest, renderSitemap } from '../api/sitemap.js'

const article = (i, extra = {}) => ({ id: String(i), slug: `articolo-${i}`, title: `Articolo ${i}`,
  published_at: '2026-11-16T10:00:00Z', is_published: true, categories: { name: 'News', slug: 'news' }, ...extra })

function database(rows, failOffset = Infinity) {
  return createClient('https://supabase.test', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      const url = new URL(input)
      assert.equal(url.searchParams.get('is_published'), 'eq.true')
      assert.equal(url.searchParams.get('order'), 'id.asc')
      assert.equal(options.headers.get('apikey'), 'public-test-key')
      const offset = Number(url.searchParams.get('offset') || 0)
      if (offset >= failOffset) return new Response('{}', { status: 503 })
      // A cap below the requested page size must not silently truncate the map.
      return new Response(JSON.stringify(rows.filter(row => row.is_published).slice(offset, offset + 37)),
        { headers: { 'Content-Type': 'application/json' } })
    } },
  })
}
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value },
    status(value) { this.code = value; return this }, send(value) { this.body = value; return this } }
}

test('paginates all published articles, deduplicates canonical slugs and rejects unusable routes', async () => {
  const rows = Array.from({ length: 205 }, (_, i) => article(i))
  rows.push(article(999, { is_published: false }), article(0), article(400, { slug: '../admin' }))
  const index = await loadPublishedIndex(database(rows))
  assert.equal(index.length, 205)
  const xml = renderSitemap(index)
  assert.equal((xml.match(/<loc>https:\/\/www.phonepulse.it\/articoli\//g) || []).length, 205)
  assert.doesNotMatch(xml, /articolo-999|admin|categoria\/(guide|recensioni|comparativi|offerte)/)
  assert.match(xml, /categoria\/news/)
  assert.doesNotMatch(renderSitemap([]), /categoria\//)
})

test('manual publication and withdrawal appear on the next request without a git update', async () => {
  const rows = [article(1), article(2, { is_published: false })]
  const client = database(rows)
  const before = response()
  await handleSitemapRequest({ method: 'GET' }, before, { client })
  assert.equal(before.code, 200)
  assert.match(before.body, /articolo-1/)
  assert.doesNotMatch(before.body, /articolo-2/)
  rows[0].is_published = false
  rows[1].is_published = true
  const after = response()
  await handleSitemapRequest({ method: 'GET' }, after, { client })
  assert.match(after.body, /articolo-2/)
  assert.doesNotMatch(after.body, /articolo-1/)
  assert.equal(after.headers['Cache-Control'], 'no-store')
  assert.equal(after.headers['Content-Type'], 'application/xml; charset=utf-8')
})

test('failure on a later page returns 503 instead of a successful partial or empty sitemap', async () => {
  const res = response()
  await handleSitemapRequest({ method: 'GET' }, res, {
    client: database(Array.from({ length: 80 }, (_, i) => article(i)), 37),
  })
  assert.equal(res.code, 503)
  assert.doesNotMatch(res.body, /<urlset/)
})

test('lastmod uses a verified editorial correction and configuration routes XML before the SPA', () => {
  const xml = renderSitemap([article(1, { origin: 'manual', content_updated_at: '2026-11-16T12:00:00Z' })])
  assert.match(xml, /<lastmod>2026-11-16T12:00:00.000Z<\/lastmod>/)
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)))
  assert.deepEqual(config.rewrites[0], { source: '/sitemap.xml', destination: '/api/sitemap' })
  assert.match(readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'), /Sitemap: https:\/\/www.phonepulse.it\/sitemap.xml/)
})
