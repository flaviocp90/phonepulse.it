import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { title, excerpt, cover_image_url, slug, platforms, category_slug } = await req.json()

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
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')!
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')!

  const caption = `📱 ${title}\n\n${excerpt}\n\n👉 https://phonepulse.it/articoli/${slug}`

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
  const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')!
  const accountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID')!

  const hashtags = HASHTAGS[category_slug] ?? FALLBACK_HASHTAGS
  const truncated = excerpt.length > 400 ? excerpt.slice(0, 400) + '…' : excerpt
  const caption = `${truncated} 👇\n\n🔗 Link in bio\n\n${hashtags}`

  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: cover_image_url, caption, access_token: accessToken }),
      }
    )
    const containerData = await containerRes.json()
    if (containerData.error) throw new Error(containerData.error.message)

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
      }
    )
    const publishData = await publishRes.json()
    if (publishData.error) throw new Error(publishData.error.message)

    return 'ok'
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}
