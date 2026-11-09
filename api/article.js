// Trial only: serve real article paths with SEO HTML and the existing Vite app shell.
// Do not merge before SSR/client equivalence and integration checks pass.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadPublishedArticle, renderPreview } from './seo-preview.js';

const indexPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));

export function composeArticleDocument(viteShell, articleMarkup) {
  const headMatch = articleMarkup.match(/<head>([\s\S]*?)<\/head>/i);
  const mainMatch = articleMarkup.match(/<main>([\s\S]*?)<\/main>/i);
  if (!headMatch || !mainMatch) throw new Error('Incomplete server document');
  if (!viteShell.includes('<div id="root"></div>')) throw new Error('Missing Vite root');

  // The preview renderer is noindex. This integration is noindex only on preview
  // through HTTP response headers; production semantics must be reviewed separately.
  const extraHead = headMatch[1]
    .replace(/<meta charset="utf-8">/i, '')
    .replace(/<meta name="viewport"[^>]*>/i, '')
    .replace(/<meta name="robots" content="noindex,nofollow">/i, '')
    .replace(/<(title|meta|link|script)(?=[\s>])/gi, '<$1 data-phonepulse-ssr="true"');

  const content = '<div class="min-h-screen flex flex-col">' +
    '<header class="bg-dark text-white p-4"><a href="/" class="text-primary font-heading">PHONEPULSE</a></header>' +
    '<main class="flex-1 max-w-3xl mx-auto px-4 py-12">' + mainMatch[1] + '</main>' +
    '</div>';

  // The existing React bundle mounts on #root and takes control after JavaScript
  // loads. The server HTML is independently readable with JavaScript disabled.
  return viteShell
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace('</head>', extraHead + '</head>')
    .replace('<div id="root"></div>', '<div id="root">' + content + '</div>');
}

// Dependencies can be substituted in tests without touching real Supabase.
export async function handleArticleRequest(req, res, {
  fetchArticle = loadPublishedArticle,
  readShell = () => readFileSync(indexPath, 'utf8'),
  render = renderPreview,
  environment = process.env,
} = {}) {
  res.setHeader('Cache-Control', 'no-store');
  if (environment.VERCEL_ENV !== 'production')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const slug = req.query?.slug;
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug))
    return res.status(404).send('Article not found');
  try {
    const article = await fetchArticle(slug);
    if (!article) return res.status(404).send('Article not found');
    const shell = readShell();
    const html = composeArticleDocument(shell, render(article));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Article HTML rendering failed:', error?.message || 'Unknown error');
    return res.status(503).send('Article temporarily unavailable');
  }
}

export default async function handler(req, res) {
  return handleArticleRequest(req, res);
}
