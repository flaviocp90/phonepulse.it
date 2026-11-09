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
