import { test, expect } from '@playwright/test'

const title = 'Galaxy Claw, Samsung sperimenta un assistente che potrebbe usare più app con permessi e limiti ancora da confermare in Italia'
const rows = Array.from({ length: 36 }, (_, id) => ({ id, slug: `news-${id}`, title: id === 1 ? title : `Android aggiornamento ${id}`, excerpt: 'Informazioni e limiti della funzione.', published_at: '2026-11-16', cover_image_url: 'https://images.pexels.com/photos/15802450/pexels-photo-15802450.jpeg?w=940' }))

async function fixtures(page) {
  await page.addInitScript(() => localStorage.setItem('phonepulse:privacy:v1', JSON.stringify({ analytics: false, at: Date.now() })))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/_vercel/')) return route.continue()
    if (url.hostname === 'images.pexels.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#ddd"/></svg>' })
    if (url.hostname !== 'supabase.test') return route.abort()
    const slug = url.searchParams.get('slug')?.slice(3)
    if (slug) return route.fulfill({ json: { ...rows.find(row => row.slug === slug), content: '## Novità\n\nUn contenuto leggibile.', sources: [{ url: 'https://example.org/fonte', title: 'Fonte interna' }] } })
    const filtered = url.searchParams.has('title') ? url.searchParams.get('title') === 'ilike.%Android%' ? rows.filter(row => row.title.includes('Android')) : [] : rows
    const offset = Number(url.searchParams.get('offset') || 0)
    const data = filtered.slice(offset, offset + 18)
    return route.fulfill({ json: data, headers: { 'content-range': `${offset}-${offset + data.length - 1}/${filtered.length}`, 'access-control-expose-headers': 'content-range' } })
  })
}

test('paginazione porta in alto e Indietro ripristina lo scroll dopo il caricamento', async ({ page }) => {
  await fixtures(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByRole('link', { name: 'Successiva', exact: true }).scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => window.scrollY)
  expect(before).toBeGreaterThan(500)
  await page.getByRole('link', { name: 'Successiva', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Android aggiornamento 18', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('main')).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Android aggiornamento 0', exact: true })).toBeAttached()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(before, -1)
  await page.locator('footer').getByRole('link', { name: 'Contatti', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contatti', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('ricerca preserva query in paginazione, refresh e reset', async ({ page }) => {
  await fixtures(page)
  const queries = []
  page.on('request', req => { const url = new URL(req.url()); if (url.searchParams.has('title')) queries.push(url.searchParams.get('title')) })
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Cerca nell’archivio' }).fill('Android')
  await page.getByRole('button', { name: 'Cerca', exact: true }).click()
  await expect(page).toHaveURL('/?q=Android')
  await expect(page.getByRole('status').filter({ hasText: 'Risultati per' })).toContainText('35')
  await page.getByRole('link', { name: 'Successiva', exact: true }).click()
  await expect(page).toHaveURL('/?q=Android&page=2')
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('Android')
  await expect(page.getByText('Pagina 2 di 2')).toBeVisible()
  expect(queries.every(query => query === 'ilike.%Android%')).toBe(true)
  await page.getByRole('link', { name: 'Azzera ricerca' }).click()
  await expect(page).toHaveURL('/')
})

test('titoli completi, immagini responsive, zoom testo e movimento ridotto', async ({ page }, testInfo) => {
  await fixtures(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const heading = page.getByRole('heading', { name: title, exact: true })
    await expect(heading).toBeVisible()
    expect(await heading.evaluate(node => node.scrollHeight <= node.clientHeight + 1)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const image = page.locator('a[href="/articoli/news-1"] img')
    await expect(image).toHaveAttribute('srcset', /w=160.*160w/)
    await expect(image).toHaveAttribute('sizes', '80px')
    await expect(image).toHaveCSS('transition-duration', '0s')
    await page.screenshot({ path: testInfo.outputPath(`archive-${width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('preferenze richiamate sono visibili e ripristinano il focus al comando', async ({ page }) => {
  await fixtures(page)
  await page.setViewportSize({ width: 320, height: 812 })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Preferenze privacy', exact: true })
  await trigger.click()
  const panel = page.getByRole('complementary', { name: 'Preferenze privacy' })
  await expect(panel).toBeFocused()
  expect((await panel.boundingBox()).y).toBeGreaterThanOrEqual(0)
  expect((await panel.boundingBox()).y).toBeLessThan(400)
  const reject = page.getByRole('button', { name: 'Rifiuta statistiche' })
  expect((await reject.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await reject.click()
  await expect(trigger).toBeFocused()
})

test('errore articolo offre Riprova e recupera senza esporre la sezione fonti', async ({ page }) => {
  await fixtures(page)
  await page.route('**/rest/v1/published_articles*', route => route.fulfill({ status: 503, json: { message: 'offline' } }))
  await page.goto('/articoli/news-1')
  await expect(page.getByRole('alert')).toContainText('Impossibile caricare')
  await page.unroute('**/rest/v1/published_articles*')
  await page.getByRole('button', { name: 'Riprova', exact: true }).click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fonti', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Fonte interna' })).toHaveCount(0)
})

test('ricerca senza risultati e caratteri jolly restano una query letterale', async ({ page }) => {
  await fixtures(page)
  const queries = []
  page.on('request', request => { const url = new URL(request.url()); if (url.searchParams.has('title')) queries.push(url.searchParams.get('title')) })
  await page.goto('/')
  await page.getByRole('searchbox').fill('50%_off')
  await page.getByRole('button', { name: 'Cerca', exact: true }).click()
  await expect(page.getByText('Nessun articolo trovato.', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Successiva', exact: true })).toHaveCount(0)
  expect(queries.at(-1)).toBe(String.raw`ilike.%50\%\_off%`)
})

test('il primo Tab offre il salto al contenuto senza rubare il focus al caricamento', async ({ page }) => {
  await fixtures(page)
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Salta al contenuto', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('testo dei link e dei pulsanti mantiene contrasto su fondo chiaro', async ({ page }) => {
  await fixtures(page)
  await page.goto('/')
  const colors = await page.getByRole('button', { name: 'Cerca', exact: true }).evaluate(node => ({ fg: getComputedStyle(node).color, bg: getComputedStyle(node).backgroundColor }))
  const luminance = rgb => rgb.match(/\d+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
  expect(contrast(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5)
  await page.goto('/privacy')
  const link = page.getByRole('link', { name: 'phonepulse.it@gmail.com', exact: true })
  const text = await link.evaluate(node => ({ fg: getComputedStyle(node).color, bg: getComputedStyle(document.body).backgroundColor }))
  expect(contrast(text.fg, text.bg)).toBeGreaterThanOrEqual(4.5)
})
