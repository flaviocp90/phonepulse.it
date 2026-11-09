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

  // Matches the React site's typography and spacing as closely as possible
  // without requiring JavaScript. This CSS is removed when React takes over.
  const ssrStyles = '<style data-phonepulse-ssr="true">' +
    '.phonepulse-ssr{min-height:100vh;background:#F5F4F1;color:#0D0D0D;font-family:Figtree,sans-serif}' +
    '.phonepulse-ssr *{box-sizing:border-box}' +
    '.phonepulse-ssr .site-header{background:#0D0D0D;color:#fff;padding:12px max(16px,calc((100vw - 1152px)/2));min-height:64px;display:flex;align-items:center}' +
    '.phonepulse-ssr .brand{display:flex;align-items:center;gap:8px;color:#FF5C1A;text-decoration:none;font-family:"Bebas Neue",sans-serif;font-size:25px}' +
    '.phonepulse-ssr .brand img{height:40px;width:40px;border-radius:50%}' +
    '.phonepulse-ssr main{max-width:768px;margin:0 auto;padding:48px 16px}' +
    '.phonepulse-ssr nav{font-size:12px;color:#6B6560;margin-bottom:24px}' +
    '.phonepulse-ssr a{color:#E04A0F}' +
    '.phonepulse-ssr article>h1{font-family:"Bebas Neue",sans-serif;font-size:clamp(42px,6vw,72px);line-height:1.05;text-transform:uppercase;margin:0 0 16px}' +
    '.phonepulse-ssr article>p{font-size:16px;line-height:1.8;color:#6B6560;margin:0 0 24px}' +
    '.phonepulse-ssr article>img{max-width:100%;height:auto;border-radius:16px;margin:8px 0 32px}' +
    '.phonepulse-ssr .article-content{font-size:16px;line-height:1.8;color:#374151}' +
    '.phonepulse-ssr .article-content h2{font-family:"Bebas Neue",sans-serif;font-size:27px;margin:40px 0 16px}' +
    '.phonepulse-ssr .article-content p{margin:0 0 20px}' +
    '.phonepulse-ssr .article-content img{max-width:100%}' +
    '.phonepulse-ssr section{border-top:1px solid #E2DFD8;margin-top:40px;padding-top:24px}' +
    '.phonepulse-ssr footer{padding:32px 16px;text-align:center;font-size:12px;color:#6B6560}' +
    '</style>';

  const content = '<div class="phonepulse-ssr">' +
    '<header class="site-header"><a class="brand" href="/" aria-label="PhonePulse home">' +
    '<img src="/logo.png" alt="">PHONEPULSE</a></header>' +
    '<main>' + mainMatch[1] + '</main></div>';

  // The existing React bundle mounts on #root and takes control after JavaScript
  // loads. The server HTML is independently readable with JavaScript disabled.
  return viteShell
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace('</head>', extraHead + ssrStyles + '</head>')
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
