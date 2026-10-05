export const formatLabels = { news: 'News', guide: 'Guida', comparison: 'Comparativo', review: 'Recensione' }

export function validDate(value) {
  return typeof value === 'string' && value.trim() && Number.isFinite(Date.parse(value)) ? value : undefined
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch {
    return undefined
  }
}

export function publicEditorial(article) {
  const publishedAt = validDate(article.published_at)
  const contentDate = validDate(article.content_updated_at)
  const verifiedLegacy = article.version != null && article.approved_version === article.version && validDate(article.last_verified_at)
  const updatedAt = publishedAt && contentDate && Date.parse(contentDate) > Date.parse(publishedAt)
    && (['manual', 'rss'].includes(article.origin) || verifiedLegacy) ? contentDate : undefined
  return {
    author: typeof article.author === 'string' ? article.author.trim() || undefined : undefined,
    format: Object.hasOwn(formatLabels, article.content_format) ? formatLabels[article.content_format] : undefined,
    publishedAt,
    updatedAt,
    sources: Array.isArray(article.sources) ? article.sources.filter(source => source && safeExternalUrl(source.url)).map(source => ({
      url: safeExternalUrl(source.url),
      title: typeof source.title === 'string' && source.title.trim() ? source.title : new URL(source.url).hostname,
      publisher: typeof source.publisher === 'string' ? source.publisher : undefined,
      retrievedAt: validDate(source.retrieved_at),
    })) : [],
  }
}
