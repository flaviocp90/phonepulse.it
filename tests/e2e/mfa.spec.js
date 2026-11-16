import { test, expect } from '@playwright/test'

const id = '10000000-0000-4000-8000-000000000001'
const factor = { id: '20000000-0000-4000-8000-000000000001', factor_type: 'totp', status: 'verified', friendly_name: 'App di prova' }
async function fixture(page, enrolled) {
  const state = { factors: enrolled ? [factor] : [], reads: 0, verifies: 0 }
  const user = () => ({ id, app_metadata: { phonepulse_role: 'editor' }, factors: state.factors })
  const session = aal => ({ access_token: `e30.${Buffer.from(JSON.stringify({ sub: id, aal, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.c2lnbmF0dXJl`, refresh_token: 'synthetic-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: user() })
  await page.addInitScript(session => localStorage.setItem('sb-supabase-auth-token', JSON.stringify(session)), session('aal1'))
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user() })
    if (url.pathname === '/auth/v1/factors' && request.method() === 'POST') return route.fulfill({ json: { id: factor.id, type: 'totp', totp: { qr_code: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>', secret: 'SYNTHETICBACKUP', uri: 'otpauth://totp/test' } } })
    if (url.pathname.endsWith('/challenge')) return route.fulfill({ json: { id: 'challenge', type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 60 } })
    if (url.pathname.endsWith('/verify')) {
      state.verifies++
      if (request.postDataJSON().code !== '123456') return route.fulfill({ status: 422, json: { msg: 'Invalid code' } })
      state.factors = [factor]
      return route.fulfill({ json: session('aal2') })
    }
    if (url.pathname.endsWith('/editor_articles')) {
      state.reads++
      expect(JSON.parse(Buffer.from(request.headers().authorization.split('.')[1], 'base64url').toString()).aal).toBe('aal2')
      return route.fulfill({ json: [], headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } })
    }
    return route.fulfill({ json: [] })
  })
  return state
}

for (const enrolled of [false, true]) {
  test(`editor AAL1 ${enrolled ? 'challenge' : 'registra TOTP'} prima di leggere la coda`, async ({ page }) => {
    const state = await fixture(page, enrolled)
    await page.goto('/admin/review')
    await expect(page.getByRole('heading', { name: 'Verifica in due passaggi' })).toBeVisible()
    expect(state.reads).toBe(0)
    if (!enrolled) {
      await page.getByRole('button', { name: 'Configura app di autenticazione' }).click()
      await expect(page.getByRole('img', { name: 'Codice QR da scansionare nell’app di autenticazione' })).toBeVisible()
      await page.getByText('Chiave per inserimento manuale e backup', { exact: true }).click()
      await expect(page.getByText('SYNTHETICBACKUP')).toBeVisible()
    }
    await page.getByLabel('Codice di autenticazione', { exact: true }).fill('000000')
    await page.getByRole('button', { name: 'Verifica codice', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Codice non valido o scaduto')
    expect(state.reads).toBe(0)
    await page.getByLabel('Codice di autenticazione', { exact: true }).fill('123456')
    await page.getByRole('button', { name: 'Verifica codice', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Articoli', exact: true })).toBeVisible()
    expect(state.verifies).toBe(2)
    expect(state.reads).toBeGreaterThan(0)
  })
}
