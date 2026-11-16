import { createClient } from '@supabase/supabase-js'
import { publicEditorial } from '../src/lib/publicEditorial.js'
import { loadPublishedIndex, sitemapPages, SITE_URL } from '../src/lib/publicSitemap.js'

export function renderSitemap(articles) {
  const entries = sitemapPages.map(page => ({ path: page.to }))
  if (articles.some(article => article.categories?.slug === 'news')) entries.push({ path: '/categoria/news' })
  for (const article of articles) {
    const dates = publicEditorial(article)
    entries.push({ path: '/articoli/' + article.slug, date: dates.updatedAt || dates.publishedAt })
  }
  const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(({ path, date }) => '  <url><loc>' + escape(SITE_URL + path) + '</loc>' +
      (date ? '<lastmod>' + new Date(date).toISOString() + '</lastmod>' : '') + '</url>').join('\n') + '\n</urlset>\n'
}

export async function handleSitemapRequest(req, res, { client, environment = process.env } = {}) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).send('Method not allowed')
  try {
    const db = client || createClient(environment.SUPABASE_URL || environment.VITE_SUPABASE_URL,
      environment.SUPABASE_ANON_KEY || environment.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } })
    const xml = renderSitemap(await loadPublishedIndex(db))
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    return res.status(200).send(req.method === 'HEAD' ? '' : xml)
  } catch {
    console.error('Public sitemap unavailable')
    return res.status(503).send('Sitemap temporarily unavailable')
  }
}

export default function handler(req, res) {
  return handleSitemapRequest(req, res)
}
