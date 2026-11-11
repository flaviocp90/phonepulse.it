import { MEDIA_PATH } from '../src/lib/privateMedia.js'

const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const MAX_BYTES = 5 * 1024 * 1024

export async function handleMediaRequest(req, res, { fetcher = fetch, environment = process.env } = {}) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')
  const path = req.query?.path
  if (typeof path !== 'string' || !MEDIA_PATH.test(path)) return res.status(404).send('Photo not found')
  const base = environment.SUPABASE_URL || environment.VITE_SUPABASE_URL
  const key = environment.SUPABASE_ANON_KEY || environment.VITE_SUPABASE_ANON_KEY
  if (!base || !key) return res.status(503).send('Photos temporarily unavailable')
  try {
    // Anonymous RLS permits only objects referenced by a currently published article.
    const response = await fetcher(`${base.replace(/\/$/, '')}/storage/v1/object/authenticated/editorial-media/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000), redirect: 'error',
    })
    if ([400, 401, 403, 404].includes(response.status)) return res.status(404).send('Photo not found')
    if (!response.ok) return res.status(503).send('Photos temporarily unavailable')
    const type = TYPES[path.split('.').at(-1)]
    if (response.headers.get('content-type')?.split(';')[0] !== type || Number(response.headers.get('content-length')) > MAX_BYTES) return res.status(502).send('Invalid photo')
    const reader = response.body.getReader()
    const chunks = []
    let length = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > MAX_BYTES) { await reader.cancel(); return res.status(502).send('Invalid photo') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    res.setHeader('Content-Type', type)
    return res.status(200).send(Buffer.concat(chunks))
  } catch { return res.status(503).send('Photos temporarily unavailable') }
}

export default handleMediaRequest
