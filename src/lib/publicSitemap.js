export const SITE_URL = 'https://www.phonepulse.it'
export const sitemapPages = [
  { label: 'Home', to: '/' },
  { label: 'Contatti', to: '/contatti' },
  { label: 'Privacy', to: '/privacy' },
]

export async function loadPublishedIndex(client) {
  const articles = new Map()
  let offset = 0
  for (;;) {
    const { data, error } = await client.from('published_articles')
      .select('id,slug,title,published_at,public_updated_at,categories(name,slug)')
      .eq('is_published', true).order('id').range(offset, offset + 99)
      .abortSignal(globalThis.AbortSignal.timeout(7000))
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('Published index unavailable')
    if (!data.length) return [...articles.values()]
    for (const article of data) {
      if (typeof article.slug === 'string' && /^[a-z0-9][a-z0-9-]{0,180}$/.test(article.slug)) {
        articles.set(article.slug, article)
      }
    }
    offset += data.length
  }
}
