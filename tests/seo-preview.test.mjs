import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderPreview, loadPublishedArticle } from '../api/seo-preview.js';

test('escapes untrusted article content and metadata', () => {
  const html = renderPreview({
    slug: 'safe-test', title: '<script>alert(1)</script>', excerpt: '" onmouseover="bad',
    content: 'Hello <img src=x onerror=alert(1)>\n\nSecond paragraph',
    cover_image_url: 'javascript:alert(1)',
  });
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x|og:image/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /<h1>/);
});

test('loads only published articles via public credentials', async () => {
  let called;
  const article = await loadPublishedArticle('sample', {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'public-anon-key',
  }, async (url, options) => {
    called = { url: String(url), options };
    return { ok: true, json: async () => [{ slug: 'sample', title: 'Sample' }] };
  });
  assert.equal(article.title, 'Sample');
  assert.match(called.url, /is_published=eq.true/);
  assert.match(called.url, /slug=eq.sample/);
  assert.equal(called.options.headers.apikey, 'public-anon-key');
  assert.doesNotMatch(called.url, /service_role/);
});

test('never treats API failure as missing article', async () => {
  await assert.rejects(loadPublishedArticle('sample', {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'public-anon-key',
  }, async () => ({ ok: false, status: 503 })), /query failed/);
});

test('escapes reserved characters', () => {
  assert.equal(escapeHtml("<&\"'"), '&lt;&amp;&quot;&#39;');
});

test('formats Markdown with safe links, headings and lists but escapes raw HTML', () => {
  const article = {
    slug: 'guide', title: 'Guida', content: '## Passaggi\n\n**Importante** e [documentazione](https://example.org/guida).\n\n- Primo\n- Secondo\n\n<script>alert(1)</script>\n\n[evil](javascript:alert(1))',
    published_at: '2026-11-01T12:00:00Z',
    author: 'Autore',
    content_format: 'guide',
    sources: [{ title: 'Fonte primaria', url: 'https://example.org/fonte', publisher: 'Editore' }],
    categories: { name: 'Guide', slug: 'guide' },
  };
  const html = renderPreview(article);
  assert.match(html, /<h2>Passaggi<\/h2>/);
  assert.match(html, /<strong>Importante<\/strong>/);
  assert.match(html, /href="https:\/\/example.org\/guida"/);
  assert.match(html, /<li>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /Fonti/);
  assert.match(html, /Fonte primaria/);
  assert.match(html, /Di Autore/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /noindex,nofollow/);
});

test('ignores unsafe source URLs and escapes JSON script payloads', () => {
  const html = renderPreview({
    slug: 'safe', title: '</script><script>alert(1)</script>',
    excerpt: 'descrizione',
    content: 'Test',
    sources: [{ title: 'Bad', url: 'javascript:alert(1)' }],
  });
  assert.doesNotMatch(html, /href="javascript:/);
  assert.doesNotMatch(html, /<\/script><script>alert\(1\)<\/script>/);
  assert.match(html, /\\u003c/);
});
