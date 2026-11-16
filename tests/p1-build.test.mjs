import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import retiredAdmin from '../api/retired-admin.js'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)))
const editorial = JSON.parse(readFileSync(new URL('../editorial/vercel.json', import.meta.url)))
test('public admin URLs return real 404 without a private destination', () => {
  assert.deepEqual(config.rewrites.find(rule => rule.source === '/admin/:path*'), { source: '/admin/:path*', destination: '/api/retired-admin' })
  assert.deepEqual(config.rewrites.find(rule => rule.source === '/chi-siamo'), { source: '/chi-siamo', destination: '/api/retired-admin' })
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, send(body) { this.body = body; return this } }
  retiredAdmin({}, res)
  assert.equal(res.code, 404)
  assert.equal(res.headers['Cache-Control'], 'no-store')
  assert.doesNotMatch(res.body, /https?:|editorial|vercel/i)
})
test('every editorial path includes anti-frame, nosniff, referrer and reporting CSP headers', () => {
  assert.equal(editorial.headers[0].source, '/(.*)')
  const headers = Object.fromEntries(editorial.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]))
  assert.equal(headers['x-frame-options'], 'DENY')
  assert.equal(headers['x-content-type-options'], 'nosniff')
  assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin')
  assert.match(headers['content-security-policy-report-only'], /connect-src.*supabase/)
  assert.match(headers['content-security-policy-report-only'], /script-src 'self'/)
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/)
})
