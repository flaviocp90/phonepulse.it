import { publicImage } from './validation.ts'
export type Article = { id: string; title: string; excerpt: string | null; slug: string; version: number; cover_image_url: string | null }
export type Config = {
  supabaseUrl: string; anonKey: string; serviceKey: string; publicReady: boolean;
  telegramToken: string; telegramChat: string;
  instagramToken: string; instagramAccount: string; instagramVersion: string; instagramReady: boolean
}
export type Outcome = { status: 'sent' | 'failed' | 'unknown'; provider_id: string | null; last_error: string | null }
export const articleUrl = (article: Article) => `https://www.phonepulse.it/articoli/${article.slug}`
const failure = (status: 'failed' | 'unknown', message: string): Outcome => ({ status, provider_id: null, last_error: message })
export function channels(config: Config) {
  return { telegram: !!(config.publicReady && config.telegramToken && config.telegramChat),
    instagram: !!(config.publicReady && config.instagramReady && config.instagramToken &&
      /^\d+$/.test(config.instagramAccount) && /^v\d+\.0$/.test(config.instagramVersion)) }
}
export async function sendTelegram(article: Article, config: Config, request: typeof fetch): Promise<Outcome> {
  const link = articleUrl(article)
  const photo = publicImage(article.cover_image_url)
  const budget = (photo ? 1024 : 4096) - link.length - 2
  if (budget < 20) return failure('failed', 'Article URL exceeds caption budget')
  const text = `${article.title}\n\n${article.excerpt || ''}`.slice(0, budget).replace(/[\uD800-\uDBFF]$/, '') + '\n\n' + link
  try {
    const response = await request(`https://api.telegram.org/bot${config.telegramToken}/${photo ? 'sendPhoto' : 'sendMessage'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify(photo ? { chat_id: config.telegramChat, photo: article.cover_image_url, caption: text } : { chat_id: config.telegramChat, text })
    })
    const data = await response.json()
    if (response.ok && data.ok === true && Number.isSafeInteger(data.result?.message_id))
      return { status: 'sent', provider_id: String(data.result.message_id), last_error: null }
    if (data.ok === false && data.error_code >= 400 && data.error_code < 500)
      return failure('failed', `Telegram rejected request (${data.error_code})`)
    return failure('unknown', 'Telegram response cannot confirm delivery')
  } catch { return failure('unknown', 'Telegram timeout or unreadable response; check channel') }
}
export async function sendInstagram(article: Article, config: Config, request: typeof fetch): Promise<Outcome> {
  if (!publicImage(article.cover_image_url)) return failure('failed', 'Instagram requires a public HTTPS image')
  const base = `https://graph.facebook.com/${config.instagramVersion}`
  const headers = { Authorization: `Bearer ${config.instagramToken}`, 'Content-Type': 'application/json' }
  let publishing = false
  try {
    const container = await request(`${base}/${config.instagramAccount}/media`, {
      method: 'POST', headers, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ image_url: article.cover_image_url, caption: `${article.title}\n\n${(article.excerpt || '').slice(0, 400)}\n\nLink in bio #phonepulse #smartphone` })
    })
    const created = await container.json()
    if (!container.ok || created.error || typeof created.id !== 'string' || !/^\d+$/.test(created.id))
      return failure('failed', 'Instagram container rejected')
    const ready = await request(`${base}/${created.id}?fields=status_code`, { headers, signal: AbortSignal.timeout(10000) })
    const readiness = await ready.json()
    if (readiness.status_code === 'PUBLISHED') return failure('unknown', 'Container already published; check channel')
    if (!ready.ok || readiness.status_code !== 'FINISHED') return failure('failed', 'Instagram container not ready; no publish attempted')
    publishing = true
    const response = await request(`${base}/${config.instagramAccount}/media_publish`, {
      method: 'POST', headers, signal: AbortSignal.timeout(15000), body: JSON.stringify({ creation_id: created.id })
    })
    const data = await response.json()
    if (response.ok && typeof data.id === 'string' && /^\d+$/.test(data.id))
      return { status: 'sent', provider_id: data.id, last_error: null }
    if (response.status >= 400 && response.status < 500 && data.error)
      return failure('failed', 'Instagram explicitly rejected publication')
    return failure('unknown', 'Instagram response cannot confirm publication')
  } catch { return failure(publishing ? 'unknown' : 'failed', publishing ? 'Instagram publish timeout; check channel' : 'Instagram preparation failed; no publish attempted') }
}
