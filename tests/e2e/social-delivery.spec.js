import { test, expect } from '@playwright/test'
test.setTimeout(10000)
const id = '10000000-0000-4000-8000-000000000001'
async function fixture(page) {
  const state = { deliveries: [], channels: { telegram: true, instagram: false }, calls: [] }
  const user = { id, app_metadata: { phonepulse_role: 'editor' } }
  const session = { access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', expires_at: Math.floor(Date.now() / 1000) + 36000, expires_in: 36000, token_type: 'bearer', user }
  await page.addInitScript(session => localStorage.setItem('sb-supabase-auth-token', JSON.stringify(session)), session)
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user })
    if (url.pathname === '/auth/v1/token') return route.fulfill({ json: session })
    if (url.pathname === '/functions/v1/post-to-social') {
      const body = route.request().postDataJSON()
      state.calls.push(body)
      if (body.platforms.length) state.deliveries = [{ platform: 'telegram', status: 'sent', provider_id: '42', article_version: 1 }]
      return route.fulfill({ json: { channels: state.channels, deliveries: state.deliveries } })
    }
    if (url.pathname === '/rest/v1/articles') return route.fulfill({ headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' }, json: [{ id, title: 'Articolo pubblicato', status: 'published', origin: 'manual', version: 1, content_format: 'news' }] })
    return route.fulfill({ json: [] })
  })
  return state
}
test('social sends only ID and selected channel, reflects sent, disables unavailable channel', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/articoli')
  await expect(page.getByText('Articolo pubblicato', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Distribuzione social' }).click()
  await expect(page.getByRole('button', { name: 'Invia Instagram' })).toBeDisabled()
  await page.getByRole('button', { name: 'Invia Telegram' }).click()
  await expect(page.getByText('Telegram: Inviato', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Invia Telegram' })).toHaveCount(0)
  expect(state.calls).toEqual([{ article_id: id, platforms: [] }, { article_id: id, platforms: ['telegram'] }])
})
test('only failed can retry; unknown requires manual channel check', async ({ page }) => {
  const state = await fixture(page)
  state.deliveries = [{ platform: 'telegram', status: 'failed' }, { platform: 'instagram', status: 'unknown' }]
  await page.goto('/admin/articoli')
  await expect(page.getByText('Articolo pubblicato', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Distribuzione social' }).click()
  await expect(page.getByRole('button', { name: 'Riprova Telegram' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Riprova Instagram' })).toHaveCount(0)
  await expect(page.getByText('Controlla il canale prima di qualsiasi nuovo invio.')).toBeVisible()
})
