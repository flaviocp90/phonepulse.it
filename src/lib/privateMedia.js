const SITE = 'https://www.phonepulse.it'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export const MEDIA_PATH = new RegExp(`^${UUID}/${UUID}\\.(jpg|png|webp)$`)

export function mediaUrl(path) {
  if (!MEDIA_PATH.test(path)) throw new Error('Percorso foto non valido.')
  return `${SITE}/api/media?path=${path}`
}

export function mediaPath(value) {
  try {
    const url = new URL(value, SITE)
    const path = url.searchParams.get('path')
    return url.origin === SITE && url.pathname === '/api/media' && MEDIA_PATH.test(path || '') ? path : null
  } catch { return null }
}

export function mediaPaths(content, cover = '') {
  const values = [cover, ...(content.match(/https:\/\/www\.phonepulse\.it\/api\/media\?path=[a-f0-9/-]+\.(?:jpg|png|webp)/g) || [])]
  return [...new Set(values.map(mediaPath).filter(Boolean))].sort()
}
