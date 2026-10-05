import { sendTelegram, sendInstagram, type Config } from './providers.ts'
const config: Config = { supabaseUrl: '', anonKey: '', serviceKey: '', publicReady: true,
  telegramToken: 'fake', telegramChat: 'fake', instagramToken: 'fake', instagramAccount: '123',
  instagramVersion: 'v99.0', instagramReady: true }
const article = { id: 'a', title: 'Titolo', excerpt: 'Descrizione', slug: 'titolo', version: 1, cover_image_url: 'https://images.test/image.jpg' }
function assert(value: unknown) { if (!value) throw new Error('Assertion failed') }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
Deno.test('Telegram preserves article URL within caption and distinguishes rejection from ambiguous response', async () => {
  const fetcher = (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    assert(body.caption.length <= 1024)
    assert(body.caption.endsWith('https://www.phonepulse.it/articoli/titolo'))
    return Promise.resolve(json({ ok: false, error_code: 400 }))
  }
  assert((await sendTelegram({ ...article, excerpt: 'x'.repeat(3000) }, config, fetcher as typeof fetch)).status === 'failed')
  assert((await sendTelegram(article, config, (() => Promise.resolve(json({ ok: true }))) as typeof fetch)).status === 'unknown')
})
Deno.test('Instagram checks readiness before publish and persists returned post ID', async () => {
  const calls: string[] = []
  const fetcher = async (input: unknown) => {
    const url = String(input); calls.push(url)
    if (url.endsWith('/media')) return json({ id: '11' })
    if (url.includes('status_code')) return json({ status_code: 'FINISHED' })
    return json({ id: '22' })
  }
  const result = await sendInstagram(article, config, fetcher as typeof fetch)
  assert(result.status === 'sent' && result.provider_id === '22')
  assert(calls.length === 3 && calls[1].includes('status_code') && calls[2].endsWith('/media_publish'))
})
Deno.test('Instagram unready container does not publish; timeout after publish is unknown', async () => {
  let publish = 0
  const fetcher = async (input: unknown) => {
    const url = String(input)
    if (url.endsWith('/media')) return json({ id: '11' })
    if (url.includes('status_code')) return json({ status_code: 'IN_PROGRESS' })
    publish++; throw new DOMException('timeout', 'TimeoutError')
  }
  assert((await sendInstagram(article, config, fetcher as typeof fetch)).status === 'failed')
  assert(publish === 0)
  const readyFetcher = async (input: unknown) => String(input).includes('status_code') ? json({ status_code: 'FINISHED' }) : fetcher(input)
  assert((await sendInstagram(article, config, readyFetcher as typeof fetch)).status === 'unknown')
  assert(publish === 1)
})
