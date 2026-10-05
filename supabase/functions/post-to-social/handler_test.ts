import { handleRequest } from './handler.ts'
const id = '10000000-0000-4000-8000-000000000001'
const config = { supabaseUrl: 'https://supabase.test', anonKey: 'anon', serviceKey: 'service',
  telegramToken: 'fake', telegramChat: 'fake', publicReady: true,
  instagramToken: 'fake', instagramAccount: '123', instagramVersion: 'v99.0', instagramReady: true }
function assert(value: unknown, message = 'Assertion failed') { if (!value) throw new Error(message) }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
function fixture(options: Record<string, unknown> = {}) {
  const article = { id, title: 'Titolo server', excerpt: 'Testo server', slug: 'titolo-server',
    cover_image_url: null, version: 1, approved_version: 1, status: 'published', ...options.article as object }
  const deliveries = new Map<string, Record<string, unknown>>()
  const calls: string[] = []
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); calls.push(url)
    if (url.includes('/auth/v1/user')) return options.invalidToken ? json({}, 401) : json({ id,
      app_metadata: options.fakeRole ? {} : { phonepulse_role: 'editor' }, user_metadata: { phonepulse_role: 'editor' } })
    if (url.includes('/rest/v1/articles')) return json([article])
    if (url.includes('/rest/v1/rpc/list_social_deliveries')) return json([...deliveries.values()])
    if (url.includes('/rest/v1/rpc/claim_social_delivery')) {
      const body = JSON.parse(String(init?.body))
      if (deliveries.has(body.p_platform) && deliveries.get(body.p_platform)?.status !== 'failed') {
        return json({ claimed: false, delivery: deliveries.get(body.p_platform) })
      }
      const delivery = { article_id: id, platform: body.p_platform, article_version: 1,
        status: 'sending', attempt_id: '20000000-0000-4000-8000-000000000001' }
      deliveries.set(body.p_platform, delivery)
      return json({ claimed: true, delivery, article })
    }
    if (url.includes('/rest/v1/rpc/finish_social_delivery')) {
      const body = JSON.parse(String(init?.body))
      const delivery = deliveries.get(body.p_platform)!
      Object.assign(delivery, { status: body.p_status, provider_id: body.p_provider_id, last_error: body.p_last_error })
      return json(delivery)
    }
    if (url.startsWith('https://www.phonepulse.it/')) return new Response(options.staleHtml ? '<html></html>' :
      '<meta name="phonepulse:article-version" content="1"><link rel="canonical" href="https://www.phonepulse.it/articoli/titolo-server">')
    if (url.includes('api.telegram.org')) {
      if (options.timeout) throw new DOMException('ambiguous', 'TimeoutError')
      const body = JSON.parse(String(init?.body))
      assert((body.text || body.caption).includes('Titolo server'))
      assert((body.text || body.caption).endsWith('https://www.phonepulse.it/articoli/titolo-server'))
      return json({ ok: true, result: { message_id: 42 } })
    }
    if (url.includes('graph.facebook.com')) return json({ error: { code: 100 } }, 400)
    throw new Error('Unexpected request: ' + url)
  }
  return { fetcher: fetcher as typeof fetch, calls, deliveries }
}
const request = (platforms = ['telegram']) => new Request('https://edge.test', {
  method: 'POST', headers: { Authorization: 'Bearer fake' }, body: JSON.stringify({ article_id: id, platforms }) })
Deno.test('methods, bad body, invalid token and fake user_metadata cannot send', async () => {
  const f = fixture()
  assert((await handleRequest(new Request('https://edge.test'), config, f.fetcher)).status === 405)
  assert((await handleRequest(new Request('https://edge.test', { method: 'POST', body: 'null' }), config, f.fetcher)).status === 401)
  assert((await handleRequest(new Request('https://edge.test', { method: 'POST', headers: { Authorization: 'Bearer fake' }, body: 'null' }), config, f.fetcher)).status === 400)
  assert((await handleRequest(request(), config, fixture({ invalidToken: true }).fetcher)).status === 401)
  const fake = fixture({ fakeRole: true })
  assert((await handleRequest(request(), config, fake.fetcher)).status === 403)
  assert(!fake.calls.some(url => url.includes('rpc/') || url.includes('api.telegram')))
})
Deno.test('nonpublished and stale public HTML stop before delivery claim', async () => {
  for (const options of [{ article: { status: 'draft' } }, { staleHtml: true }]) {
    const f = fixture(options)
    assert((await handleRequest(request(), config, f.fetcher)).status === 409)
    assert(f.deliveries.size === 0)
  }
})
Deno.test('concurrent requests send once, persist ID, correction does not repost', async () => {
  const f = fixture()
  const results = await Promise.all([handleRequest(request(), config, f.fetcher), handleRequest(request(), config, f.fetcher)])
  assert(results.every(response => response.status === 200))
  assert(f.calls.filter(url => url.includes('api.telegram')).length === 1)
  assert(f.deliveries.get('telegram')?.provider_id === '42')
  await handleRequest(request(), config, f.fetcher)
  assert(f.calls.filter(url => url.includes('api.telegram')).length === 1)
})
Deno.test('Telegram success and Instagram failure stay independent; timeout unknown not retried', async () => {
  const f = fixture({ article: { cover_image_url: 'https://images.test/cover.jpg' } })
  assert((await handleRequest(request(['telegram', 'instagram']), config, f.fetcher)).status === 200)
  assert(f.deliveries.get('telegram')?.status === 'sent')
  assert(f.deliveries.get('instagram')?.status === 'failed')
  const ambiguous = fixture({ timeout: true })
  await handleRequest(request(), config, ambiguous.fetcher)
  await handleRequest(request(), config, ambiguous.fetcher)
  assert(ambiguous.deliveries.get('telegram')?.status === 'unknown')
  assert(ambiguous.calls.filter(url => url.includes('api.telegram')).length === 1)
})
Deno.test('empty selection only returns durable status and channel readiness', async () => {
  const f = fixture()
  const response = await handleRequest(request([]), { ...config, instagramToken: '' }, f.fetcher)
  const data = await response.json()
  assert(response.status === 200 && data.channels.instagram === false)
  assert(!f.calls.some(url => url.includes('api.telegram') || url.includes('graph.facebook') || url.includes('claim_social')))
})
