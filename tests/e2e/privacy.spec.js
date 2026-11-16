import { test, expect } from '@playwright/test'

const optional = url => /googletagmanager\.com|analytics\.ahrefs\.com|va\.vercel-scripts\.com|\/_vercel\/insights\//.test(url)
async function fixtures(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (optional(url.href)) return route.fulfill({ contentType: 'text/javascript', body: '' })
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.searchParams.has('slug')) return route.fulfill({ json: {
      id: 'privacy-test', slug: 'privacy-test', title: 'Articolo privacy', content: 'Contenuto fittizio',
    } })
    return route.fulfill({ json: [] })
  })
}

for (const width of [390, 1400]) {
  test(`privacy da home e articolo, accesso diretto e refresh a ${width}px`, async ({ page }) => {
    await fixtures(page)
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/articoli/privacy-test']) {
      await page.goto(path)
      await page.locator('footer').getByRole('link', { name: 'Privacy Policy' }).click()
      await expect(page.getByRole('heading', { name: 'Informativa privacy', exact: true })).toBeVisible()
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.phonepulse.it/privacy')
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Titolare e contatti' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'I tuoi diritti' })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath(`privacy-${width}.png`), fullPage: true })
  })
}

test('nessuna statistica prima della scelta; rifiuto persistente, accettazione e revoca', async ({ page }) => {
  await fixtures(page)
  const requests = []
  page.on('request', request => { if (optional(request.url())) requests.push(request.url()) })
  await page.goto('/')
  await expect(page.getByRole('complementary', { name: 'Preferenze privacy' })).toBeVisible()
  await expect(page.locator('script[src*="googletagmanager"], script[src*="ahrefs"], script[src*="/_vercel/insights/"]')).toHaveCount(0)
  expect(requests).toEqual([])
  await page.getByRole('button', { name: 'Rifiuta statistiche' }).click()
  await page.reload()
  await expect(page.getByRole('complementary', { name: 'Preferenze privacy' })).toHaveCount(0)
  expect(requests).toEqual([])
  await page.locator('footer').getByRole('button', { name: 'Preferenze privacy', exact: true }).click()
  await page.getByRole('button', { name: 'Accetta statistiche' }).click()
  await expect.poll(() => requests.some(url => url.includes('googletagmanager'))).toBe(true)
  await expect.poll(() => requests.some(url => url.includes('ahrefs'))).toBe(true)
  await expect.poll(() => requests.some(url => url.includes('/_vercel/insights/') || url.includes('va.vercel-scripts.com'))).toBe(true)
  await page.evaluate(() => { document.cookie = '_ga=test; path=/' })
  await page.locator('footer').getByRole('button', { name: 'Preferenze privacy', exact: true }).click()
  await page.getByRole('button', { name: 'Rifiuta statistiche' }).click()
  await page.waitForLoadState('load')
  await expect(page.locator('script[src*="googletagmanager"], script[src*="ahrefs"], script[src*="/_vercel/insights/"]')).toHaveCount(0)
  expect((await page.context().cookies()).some(cookie => cookie.name === '_ga')).toBe(false)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('phonepulse:privacy:v1')).analytics)).toBe(false)
})

test('preferenza scaduta o corrotta lascia spente le statistiche', async ({ page }) => {
  await fixtures(page)
  await page.goto('/')
  for (const value of ['{broken', JSON.stringify({ analytics: true, at: 1 })]) {
    await page.evaluate(value => localStorage.setItem('phonepulse:privacy:v1', value), value)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Rifiuta statistiche' })).toBeVisible()
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0)
  }
})
