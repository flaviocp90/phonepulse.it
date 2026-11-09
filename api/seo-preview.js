// Isolated read-only SEO experiment. NOT wired to public article routes.
// The endpoint provides a conservative, escaped plaintext preview.
// It deliberately does not render the original Markdown as HTML.
const SITE = 'https://www.phonepulse.it';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function markdownAsText(value) {
  return String(value ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/[*_`~]/g, '')
    .trim();
}

export function renderPreview(article) {
  const slug = encodeURIComponent(article.slug);
  const url = `${SITE}/articoli/${slug}`;
  const title = String(article.seo_title || article.title || 'Articolo').slice(0, 250);
  const description = String(article.seo_description || article.excerpt || '').slice(0, 500);
  const content = markdownAsText(article.content);
  const sections = content.split(/\n\s*\n/).filter(Boolean).slice(0, 150);
  const body = sections.map(section =>
    `<p>${escapeHtml(section).replace(/\n/g, '<br>')}</p>`
  ).join('\n');
  const image = typeof article.cover_image_url === 'string' && /^https:\/\//.test(article.cover_image_url)
    ? `<meta property="og:image" content="${escapeHtml(article.cover_image_url)}">`
    : '';
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — PhonePulse</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)} — PhonePulse">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<link rel="canonical" href="${escapeHtml(url)}">${image}
<meta name="robots" content="noindex,nofollow">
</head><body><header><a href="/">PhonePulse</a></header>
<main><article><h1>${escapeHtml(article.title)}</h1>
<p>${escapeHtml(article.excerpt || '')}</p>
${body}</article></main>
<footer><p>Anteprima tecnica non indicizzabile: non è la pagina pubblica.</p></footer>
</body></html>`;
}

export async function loadPublishedArticle(slug, env = process.env, request = fetch) {
  const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('Missing public Supabase credentials');
  const endpoint = new URL('/rest/v1/articles', base);
  endpoint.searchParams.set('select', 'slug,title,seo_title,seo_description,excerpt,content,cover_image_url');
  endpoint.searchParams.set('slug', 'eq.' + slug);
  endpoint.searchParams.set('is_published', 'eq.true');
  endpoint.searchParams.set('limit', '1');
  const response = await request(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
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
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug)) {
    return res.status(400).send('Invalid slug');
  }
  try {
    const article = await loadPublishedArticle(slug);
    if (!article) return res.status(404).send('Article not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderPreview(article));
  } catch (_) {
    return res.status(503).send('Preview temporarily unavailable');
  }
}
