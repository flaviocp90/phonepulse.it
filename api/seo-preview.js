// Read-only HTML preview. Not wired to production routes; always noindex.
import { marked } from 'marked';
import { publicEditorial, safeExternalUrl, stockPhotoCredit } from '../src/lib/publicEditorial.js';

const SITE = 'https://www.phonepulse.it';
export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function validUrl(v) {
  return typeof v === 'string' ? safeExternalUrl(v) : undefined;
}
function href(v) {
  return typeof v === 'string' && /^\/(?!\/)[a-zA-Z0-9/?#=&._~%-]*$/.test(v) ? v : validUrl(v);
}
function inlineText(tokens = []) {
  return tokens.map(token => token.tokens ? inlineText(token.tokens) : token.text || '').join('');
}
// Allowlist renderer. Raw HTML, embedded scripts and unknown tokens are escaped.
function inline(tokens = []) {
  return tokens.map(t => {
    if (t.type === 'text' || t.type === 'escape') return t.tokens ? inline(t.tokens) : escapeHtml(t.text);
    if (t.type === 'strong' || t.type === 'em' || t.type === 'del')
      return '<' + (t.type === 'strong' ? 'strong' : t.type) + '>' + inline(t.tokens) +
        '</' + (t.type === 'strong' ? 'strong' : t.type) + '>';
    if (t.type === 'codespan') return '<code>' + escapeHtml(t.text) + '</code>';
    if (t.type === 'br') return '<br>';
    if (t.type === 'link') {
      const url = href(t.href);
      const text = inline(t.tokens || []) || escapeHtml(t.text);
      return url ? '<a href="' + escapeHtml(url) + '" rel="noopener noreferrer">' + text + '</a>' : text;
    }
    if (t.type === 'image') {
      const url = validUrl(t.href);
      return url ? '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(t.tokens ? inlineText(t.tokens) : t.text) + '" loading="lazy">' : escapeHtml(t.text);
    }
    return escapeHtml(t.raw || t.text || '');
  }).join('');
}
function blocks(tokens = [], level = 0) {
  if (level > 8) return '';
  return tokens.map(t => {
    if (t.type === 'space') return '';
    if (t.type === 'heading') {
      const d = Math.max(2, Math.min(6, t.depth || 2));
      return '<h' + d + '>' + inline(t.tokens) + '</h' + d + '>';
    }
    if (t.type === 'paragraph' || t.type === 'text')
      return '<p>' + (t.tokens ? inline(t.tokens) : escapeHtml(t.text)) + '</p>';
    if (t.type === 'code') return '<pre><code>' + escapeHtml(t.text) + '</code></pre>';
    if (t.type === 'hr') return '<hr>';
    if (t.type === 'blockquote') return '<blockquote>' + blocks(t.tokens, level + 1) + '</blockquote>';
    if (t.type === 'list') {
      const tag = t.ordered ? 'ol' : 'ul';
      const items = (t.items || []).slice(0, 200).map(i =>
        '<li>' + blocks(i.tokens || [], level + 1) + '</li>').join('');
      return '<' + tag + '>' + items + '</' + tag + '>';
    }
    if (t.type === 'table') {
      const row = (cells, tag) => '<tr>' + cells.map(c => '<' + tag + '>' +
        inline(c.tokens || marked.Lexer.lexInline(c.text || '')) + '</' + tag + '>').join('') + '</tr>';
      return '<table><thead>' + row(t.header || [], 'th') + '</thead><tbody>' +
        (t.rows || []).slice(0, 100).map(cells => row(cells, 'td')).join('') + '</tbody></table>';
    }
    return '<p>' + escapeHtml(t.raw || t.text || '') + '</p>';
  }).join('\n');
}
export function renderMarkdownSafe(text) {
  return blocks(marked.lexer(String(text ?? '').slice(0, 200000), { gfm: true, breaks: true }));
}
function jsonScript(v) {
  return JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
function formatDate(v) {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(v));
}
export function renderPreview(article) {
  const e = escapeHtml;
  const url = SITE + '/articoli/' + encodeURIComponent(article.slug);
  const title = String(article.seo_title || article.title || 'Articolo').slice(0, 250);
  const desc = String(article.seo_description || article.excerpt || '').slice(0, 500);
  const ed = publicEditorial(article);
  const cover = validUrl(article.cover_image_url);
  const credit = stockPhotoCredit(article.image_source);
  const category = article.categories && !Array.isArray(article.categories) ? article.categories : null;
  const catSlug = category && /^[a-z0-9-]+$/.test(category.slug || '') ? category.slug : null;
  const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }];
  if (catSlug) crumbs.push({ '@type': 'ListItem', position: 2, name: category.name, item: SITE + '/categoria/' + catSlug });
  crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: article.title, item: url });
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
    description: desc, url, image: cover, datePublished: ed.publishedAt,
    dateModified: ed.updatedAt, citation: ed.sources.map(s => s.url),
    author: ed.author ? { '@type': 'Person', name: ed.author } : undefined,
    publisher: { '@type': 'Organization', name: 'PhonePulse' } };
  const dates = [
    ed.format ? 'Formato: ' + e(ed.format) : '',
    ed.author ? 'Di ' + e(ed.author) : '',
    ed.publishedAt ? '<time datetime="' + e(ed.publishedAt) + '">Pubblicato: ' + e(formatDate(ed.publishedAt)) + '</time>' : '',
    ed.updatedAt ? '<time datetime="' + e(ed.updatedAt) + '">Aggiornato: ' + e(formatDate(ed.updatedAt)) + '</time>' : ''
  ].filter(Boolean).join(' · ');
  const sources = ed.sources.length ? '<section><h2>Fonti</h2><ul>' + ed.sources.map(s =>
    '<li><a href="' + e(s.url) + '" rel="noopener noreferrer">' + e(s.title) + '</a>' +
    (s.publisher ? ' — ' + e(s.publisher) : '') +
    (s.retrievedAt ? ' · Consultata: ' + e(formatDate(s.retrievedAt)) : '') +
    '</li>').join('') + '</ul></section>' : '';
  const archiveNote = article.origin === 'legacy'
    ? '<aside>Articolo d’archivio: le informazioni non documentate non attestano prove dirette.</aside>'
    : article.origin === 'rss'
      ? '<aside>Articolo preparato con assistenza AI e rivisto dalla redazione.</aside>' : '';
  return '<!doctype html><html lang="it"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + e(title) + ' — PhonePulse</title>' +
    '<meta name="description" content="' + e(desc) + '">' +
    '<meta property="og:type" content="article">' +
    '<meta property="og:title" content="' + e(title) + ' — PhonePulse">' +
    '<meta property="og:description" content="' + e(desc) + '">' +
    '<meta property="og:url" content="' + e(url) + '">' +
    '<link rel="canonical" href="' + e(url) + '">' +
    (cover ? '<meta property="og:image" content="' + e(cover) + '">' : '') +
    '<meta name="robots" content="noindex,nofollow">' +
    '<script type="application/ld+json">' + jsonScript(schema) + '</script>' +
    '<script type="application/ld+json">' + jsonScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs }) + '</script>' +
    '</head><body><header><a href="/">PhonePulse</a></header><main><article>' +
    '<nav><a href="/">Home</a>' + (catSlug ? ' / <a href="/categoria/' + e(catSlug) + '">' + e(category.name) + '</a>' : '') + '</nav>' +
    '<h1>' + e(article.title) + '</h1>' +
    (article.excerpt ? '<p>' + e(article.excerpt) + '</p>' : '') +
    (dates ? '<p>' + dates + '</p>' : '') + archiveNote +
    (cover ? '<img src="' + e(cover) + '" alt="' + e(article.title) + '">' : '') +
    (cover && credit ? '<p>Foto illustrativa di <a href="' + e(credit.url) + '">' + e(credit.name) +
      '</a> su <a href="' + e(credit.providerUrl) + '">' + e(credit.provider) + '</a></p>' : '') +
    '<div class="article-content">' + renderMarkdownSafe(article.content) + '</div>' + sources +
    '</article></main><footer>Anteprima tecnica non indicizzabile.</footer></body></html>';
}
export async function loadPublishedArticle(slug, env = process.env, request = fetch) {
  const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('Missing public Supabase credentials');
  const endpoint = new URL('/rest/v1/articles', base);
  endpoint.searchParams.set('select', 'slug,title,seo_title,seo_description,excerpt,content,cover_image_url,image_source,published_at,content_updated_at,last_verified_at,version,approved_version,author,content_format,origin,sources,categories(name,slug)');
  endpoint.searchParams.set('slug', 'eq.' + slug);
  endpoint.searchParams.set('is_published', 'eq.true');
  endpoint.searchParams.set('limit', '1');
  const response = await request(endpoint, {
    headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error('Public article query failed: ' + response.status);
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const slug = req.query?.slug;
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug))
    return res.status(400).send('Invalid slug');
  try {
    const article = await loadPublishedArticle(slug);
    if (!article) return res.status(404).send('Article not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderPreview(article));
  } catch (_) {
    return res.status(503).send('Preview temporarily unavailable');
  }
}
