import test from 'node:test';
import assert from 'node:assert/strict';
import { composeArticleDocument, handleArticleRequest } from '../api/article.js';
import { renderPreview } from '../api/seo-preview.js';

const shell = '<!doctype html><html lang="it"><head><meta charset="UTF-8"><title>PhonePulse</title>' +
  '<script type="module" src="/assets/index-test.js"></script><link href="/assets/index-test.css" rel="stylesheet">' +
  '</head><body><div id="root"></div></body></html>';

const article = { slug: 'guide-test', title: 'Titolo specifico', content: '## Guida\n\nContenuto **utile**.',
  published_at: '2026-11-09T12:00:00Z', author: 'Autore', sources: [{ url: 'https://example.org/fonte', title: 'Fonte' }] };

test('HTML initial document exposes editorial content and Vite client assets', () => {
  const html = composeArticleDocument(shell, renderPreview(article));
  assert.match(html, /<h1>Titolo specifico<\/h1>/);
  assert.match(html, /<h2>Guida<\/h2>/);
  assert.match(html, /Fonte/);
  assert.match(html, /assets\/index-test.js/);
  assert.match(html, /assets\/index-test.css/);
  assert.match(html, /rel="canonical"/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /data-phonepulse-ssr="true"/);
  assert.equal((html.match(/<title/g) || []).length, 1);
  assert.equal((html.match(/id="root"/g) || []).length, 1);
});

test('fails rather than returning empty HTML when Vite build shell is missing', () => {
  assert.throws(() => composeArticleDocument('<html></html>', renderPreview(article)), /Missing Vite root/);
});

test('raw article HTML is escaped before insertion into client shell', () => {
  const html = composeArticleDocument(shell, renderPreview({
    slug: 'hostile', title: '<script>alert(1)</script>',
    content: '<img src=x onerror=alert(1)>',
  }));
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x/);
});


function mockResponse() {
  return {
    code: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this; },
    status(value) { this.code = value; return this; },
    send(value) { this.body = value; return this; },
  };
}
function deps(fetchArticle, environment = { VERCEL_ENV: 'preview' }) {
  return { fetchArticle, environment, readShell: () => shell, render: renderPreview };
}

test('returns real HTTP 404 for missing or unpublished article', async () => {
  const res = mockResponse();
  await handleArticleRequest({ method: 'GET', query: { slug: 'withdrawn' } }, res, deps(async () => null));
  assert.equal(res.code, 404);
  assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
  assert.doesNotMatch(res.body, /<article>/);
});

test('returns 503 rather than missing article on transient Supabase failure', async () => {
  const res = mockResponse();
  await handleArticleRequest({ method: 'GET', query: { slug: 'valid-article' } }, res,
    deps(async () => { throw new Error('Supabase unreachable'); }));
  assert.equal(res.code, 503);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.doesNotMatch(res.body, /Article not found/);
});

test('serves HTTP 200 with published article metadata in preview only', async () => {
  const res = mockResponse();
  await handleArticleRequest({ method: 'GET', query: { slug: 'guide-test' } }, res,
    deps(async () => article));
  assert.equal(res.code, 200);
  assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
  assert.match(res.body, /<h1>Titolo specifico<\/h1>/);
  assert.match(res.body, /rel="canonical"/);
});

test('production response does not accidentally include preview noindex header', async () => {
  const res = mockResponse();
  await handleArticleRequest({ method: 'GET', query: { slug: 'guide-test' } }, res,
    deps(async () => article, { VERCEL_ENV: 'production' }));
  assert.equal(res.code, 200);
  assert.equal(res.headers['x-robots-tag'], undefined);
  assert.doesNotMatch(res.body, /meta name="robots" content="noindex,nofollow"/);
});

test('rejects invalid slugs and non-GET without contacting Supabase', async () => {
  for (const req of [{ method: 'GET', query: { slug: '<bad>' } }, { method: 'POST', query: { slug: 'ok' } }]) {
    const res = mockResponse();
    await handleArticleRequest(req, res, deps(() => { throw new Error('Must not query'); }));
    assert.equal(res.code, req.method === 'POST' ? 405 : 404);
  }
});
