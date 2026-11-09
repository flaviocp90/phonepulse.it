import test from 'node:test';
import assert from 'node:assert/strict';
import { composeArticleDocument } from '../api/article.js';
import { renderPreview } from '../api/seo-preview.js';

const shell = '<!doctype html><html lang="it"><head><meta charset="UTF-8"><title>PhonePulse</title>' +
  '<script type="module" src="/assets/index-test.js"></script><link href="/assets/index-test.css" rel="stylesheet">' +
  '</head><body><div id="root"></div></body></html>';

const article = { slug: 'guide-test', title: 'Titolo specifico', content: '## Guida\\n\\nContenuto **utile**.',
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
