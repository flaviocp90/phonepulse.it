import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HASHTAGS: Record<string, string> = {
  recensioni: '#recensione #smartphone #tech #tecnologia #phonepulse #android #iphone',
  news: '#news #tecnologia #smartphone #android #iphone #phonepulse',
  guide: '#guide #howto #tech #smartphone #tecnologia #phonepulse',
  comparativi: '#confronto #versus #smartphone #tech #tecnologia #phonepulse',
  offerte: '#offerta #deal #smartphone #tech #amazon #phonepulse',
}
const FALLBACK_HASHTAGS = '#smartphone #tech #tecnologia #phonepulse'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // Presence-only auth gate — token validity is enforced by the Supabase client session upstream
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: {
    title: string
    excerpt: string
    cover_image_url: string
    slug: string
    platforms: string[]
    category_slug: string
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { title, excerpt, cover_image_url, slug, platforms, category_slug } = body

  if (!Array.isArray(platforms)) {
    return new Response(JSON.stringify({ error: '`platforms` must be an array' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!cover_image_url || !cover_image_url.startsWith('https://')) {
    return new Response(JSON.stringify({ error: '`cover_image_url` must be a public https:// URL' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const results: Record<string, string> = {}

  if (platforms.includes('telegram')) {
    results.telegram = await postToTelegram({ title, excerpt, cover_image_url, slug })
  }

  if (platforms.includes('instagram')) {
    results.instagram = await postToInstagram({ excerpt, cover_image_url, category_slug })
  }

  return new Response(JSON.stringify(results), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})

async function postToTelegram({
  title,
  excerpt,
  cover_image_url,
  slug,
}: {
  title: string
  excerpt: string
  cover_image_url: string
  slug: string
}): Promise<string> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!token || !chatId) return 'error: missing secrets (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)'

  let caption = `📱 ${title}\n\n${excerpt}\n\n👉 https://phonepulse.it/articoli/${slug}`
  if (caption.length > 1000) caption = caption.slice(0, 997) + '…'

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: cover_image_url, caption }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.description)
    return 'ok'
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}

async function postToInstagram({
  excerpt,
  cover_image_url,
  category_slug,
}: {
  excerpt: string
  cover_image_url: string
  category_slug: string
}): Promise<string> {
  const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')
  const accountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID')
  if (!accessToken || !accountId) return 'error: missing secrets (INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID)'

  const hashtags = HASHTAGS[category_slug] ?? FALLBACK_HASHTAGS
  const truncated = excerpt.length > 400 ? excerpt.slice(0, 400) + '…' : excerpt
  const caption = `${truncated} 👇\n\n🔗 Link in bio\n\n${hashtags}`

  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: cover_image_url, caption }),
      }
    )
    const containerData = await containerRes.json()
    if (containerData.error) throw new Error(containerData.error.message)
    if (!containerData.id) throw new Error('No container ID returned from Instagram')

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id }),
      }
    )
    const publishData = await publishRes.json()
    if (publishData.error) throw new Error(publishData.error.message)

    return 'ok'
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}
