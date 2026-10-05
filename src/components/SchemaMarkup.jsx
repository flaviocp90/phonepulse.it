import { Helmet } from 'react-helmet-async'
import { publicEditorial } from '../lib/publicEditorial'

const SITE_URL = 'https://phonepulse.it'
const SITE_NAME = 'PhonePulse'
const LOGO_URL = `${SITE_URL}/logo.png`

export function ArticleSchema({ article }) {
  const { author, format, publishedAt, updatedAt, sources } = publicEditorial(article)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.cover_image_url || LOGO_URL,
    datePublished: publishedAt,
    dateModified: updatedAt,
    genre: format,
    citation: sources.length ? sources.map(source => source.url) : undefined,
    url: `${SITE_URL}/articoli/${article.slug}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    author: author ? { '@type': author === SITE_NAME ? 'Organization' : 'Person', name: author } : undefined,
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function BreadcrumbSchema({ items }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    sameAs: [
      'https://www.instagram.com/phonepulse.it',
      'https://t.me/PhonePulseIT',
    ],
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}
