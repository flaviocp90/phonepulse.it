import { validateRequest, type Platform } from './validation.ts'
import { articleUrl, channels, sendInstagram, sendTelegram, type Article, type Config } from './providers.ts'
const cors = { 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
async function boundedText(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) return ''
  const reader = body.getReader(), decoder = new TextDecoder()
  let text = '', bytes = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return text + decoder.decode()
      bytes += value.length
      if (bytes > limit) throw new Error('Response too large')
      text += decoder.decode(value, { stream: true })
    }
  } finally { await reader.cancel() }
}
function hasPublicVersion(html: string, article: Article) {
  const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
  const tags = html.match(/<(?:meta|link)\b[^>]*>/gi) || []
  return tags.some(tag => attribute(tag, 'name') === 'phonepulse:article-version' && attribute(tag, 'content') === String(article.version)) &&
    tags.some(tag => attribute(tag, 'rel') === 'canonical' && attribute(tag, 'href') === articleUrl(article))
}
export async function handleRequest(req: Request, config: Config, request: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  const authorization = req.headers.get('Authorization')
  if (!authorization || !/^Bearer \S+$/i.test(authorization)) return reply({ error: 'Unauthorized' }, 401)
  let body: { article_id: string; platforms: Platform[] }
  try {
    const parsed = JSON.parse(await boundedText(req.body, 8192))
    const errors = validateRequest(parsed)
    if (errors.length) return reply({ error: errors.join('; ') }, 400)
    body = parsed
  } catch { return reply({ error: 'Invalid JSON body' }, 400) }
  if (!config.supabaseUrl || !config.anonKey || !config.serviceKey) return reply({ error: 'Service unavailable' }, 503)
  const base = config.supabaseUrl.replace(/\/$/, '')
  try {
    const verified = await request(`${base}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: authorization }, signal: AbortSignal.timeout(10000) })
    if (verified.status === 401 || verified.status === 403) return reply({ error: 'Unauthorized' }, 401)
    if (!verified.ok) return reply({ error: 'Authentication unavailable' }, 503)
    const user = await verified.json()
    if (!user.id) return reply({ error: 'Unauthorized' }, 401)
    if (user.app_metadata?.phonepulse_role !== 'editor') return reply({ error: 'Editor role required' }, 403)
    const headers = { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, 'Content-Type': 'application/json' }
    const rpc = async (name: string, args: unknown) => {
      const response = await request(`${base}/rest/v1/rpc/${name}`, {
        method: 'POST', headers, body: JSON.stringify(args), signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error('Delivery persistence failed')
      return await response.json()
    }
    const response = await request(`${base}/rest/v1/articles?id=eq.${body.article_id}&select=id,title,excerpt,slug,cover_image_url,version,approved_version,status`, {
      headers, signal: AbortSignal.timeout(10000) })
    if (!response.ok) return reply({ error: 'Article unavailable' }, 503)
    const rows = await response.json(), article = rows[0]
    if (!article || article.status !== 'published' || article.approved_version !== article.version ||
      !Number.isSafeInteger(article.version) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug))
      return reply({ error: 'A current approved published version is required' }, 409)
    const available = channels(config)
    if (body.platforms.some(platform => !available[platform])) return reply({ error: 'Selected channel is not ready' }, 409)
    if (body.platforms.length) {
      const publicResponse = await request(articleUrl(article), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) })
      if (!publicResponse.ok || !hasPublicVersion(await boundedText(publicResponse.body, 1024 * 1024), article))
        return reply({ error: 'Public article is not yet verified for this version' }, 409)
    }
    for (const platform of body.platforms) {
      const claim = await rpc('claim_social_delivery', { p_article_id: body.article_id, p_platform: platform, p_expected_version: article.version })
      if (!claim.claimed) continue
      const outcome = await (platform === 'telegram' ? sendTelegram : sendInstagram)(claim.article, config, request)
      await rpc('finish_social_delivery', { p_article_id: body.article_id, p_platform: platform,
        p_attempt_id: claim.delivery.attempt_id, p_status: outcome.status,
        p_provider_id: outcome.provider_id, p_last_error: outcome.last_error })
    }
    const deliveries = await rpc('list_social_deliveries', { p_article_id: body.article_id })
    return reply({ channels: available, deliveries })
  } catch {
    // Never return provider URLs, tokens, or an ambiguous persistence error as retryable failure.
    return reply({ error: 'Result unavailable. Refresh delivery states before retrying.' }, 503)
  }
}
