export type Platform = 'telegram' | 'instagram'
export function validateRequest(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Expected an object']
  const body = value as Record<string, unknown>
  const errors = []
  if (Object.keys(body).some(key => !['article_id', 'platforms'].includes(key))) errors.push('Unexpected fields')
  if (typeof body.article_id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.article_id)) errors.push('Invalid article ID')
  if (!Array.isArray(body.platforms) || body.platforms.length > 2 ||
    body.platforms.some(platform => !['telegram', 'instagram'].includes(platform)) ||
    new Set(body.platforms).size !== body.platforms.length) errors.push('Invalid platforms')
  return errors
}

export function publicImage(url: unknown): url is string {
  try {
    if (typeof url !== 'string') return false
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      parsed.hostname.includes('.') && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)
  } catch { return false }
}
