import { publicEditorial } from '../src/lib/publicEditorial.js'

const SITE_URL = 'https://www.phonepulse.it'
const escapeXml = value => value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character])

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (process.env.VERCEL_ENV !== 'preview') return response.status(404).send('Non trovato')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).send('Metodo non consentito')
  }
  try {
    const base = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY
    if (!base || !key) throw new Error('Public API configuration missing')
    async function* read(table, parameters) {
      let cursor
      while (true) {
        const url = new URL(`/rest/v1/${table}`, base)
        url.search = new URLSearchParams({ ...parameters, order: 'id.asc', limit: '1000', ...(cursor ? { id: `gt.${cursor}` } : {}) }).toString()
        const result = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
        if (!result.ok) throw new Error('Public API unavailable')
        const rows = await result.json()
        if (!Array.isArray(rows)) throw new Error('Invalid public API response')
        if (!rows.length) return
        for (const row of rows) {
          if (typeof row?.id !== 'string' || !row.id || (cursor && row.id <= cursor)) throw new Error('Invalid page cursor')
          cursor = row.id
          yield row
        }
      }
    }
    const entries = ['/', '/chi-siamo', '/contatti', '/sitemap'].map(path => `<url><loc>${SITE_URL}${path}</loc></url>`)
    for await (const category of read('categories', { select: 'id,slug' })) {
      if (typeof category.slug !== 'string' || !category.slug || ['.', '..'].includes(category.slug)) throw new Error('Invalid category slug')
      entries.push(`<url><loc>${escapeXml(`${SITE_URL}/categoria/${encodeURIComponent(category.slug)}`)}</loc></url>`)
      if (entries.length > 50000) throw new Error('Sitemap index required')
    }
    for await (const article of read('articles', {
      select: 'id,slug,published_at,content_updated_at,origin,version,approved_version,last_verified_at', is_published: 'eq.true',
    })) {
      if (typeof article.slug !== 'string' || !article.slug || ['.', '..'].includes(article.slug)) throw new Error('Invalid article slug')
      const editorial = publicEditorial(article)
      const lastmod = editorial.updatedAt || editorial.publishedAt
      entries.push(`<url><loc>${escapeXml(`${SITE_URL}/articoli/${encodeURIComponent(article.slug)}`)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`)
      // ponytail: single sitemap up to 50,000 URLs; add a sitemap index when the archive approaches this ceiling.
      if (entries.length > 50000) throw new Error('Sitemap index required')
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`
    // ponytail: byte limit checked after assembly; use an incremental budget if imported slugs become large.
    if (Buffer.byteLength(xml) > 50 * 1024 * 1024) throw new Error('Sitemap index required')
    response.setHeader('Content-Type', 'application/xml; charset=utf-8')
    return response.status(200).send(xml)
  } catch {
    return response.status(503).send('Sitemap temporaneamente non disponibile')
  }
}
