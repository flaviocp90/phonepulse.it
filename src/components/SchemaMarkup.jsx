import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://phonepulse.it'
const SITE_NAME = 'PhonePulse'
const LOGO_URL = `${SITE_URL}/logo.png`

export function ArticleSchema({ title, description, publishedAt, updatedAt, slug, coverImage }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: coverImage || LOGO_URL,
    datePublished: publishedAt,
    dateModified: updatedAt || publishedAt,
    url: `${SITE_URL}/articoli/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
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
