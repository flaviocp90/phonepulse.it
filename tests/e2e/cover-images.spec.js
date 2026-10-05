import { test, expect } from '@playwright/test'

test('copertine fallite conservano layout e link; una nuova URL recupera l’immagine', async ({ page }, testInfo) => {
  const category = { id: 'news', slug: 'news', name: 'News' }
  const article = slug => ({ id: slug, slug, title: `Articolo ${slug}`, content: 'Contenuto della verifica.',
    published_at: '2026-10-01', categories: category, cover_image_url: `https://covers.test/${slug}.svg` })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/_vercel/')) return route.abort()
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname === 'covers.test') {
      return url.pathname === '/good.svg' ? route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="black"/></svg>' }) : route.fulfill({ status: 404, body: 'Missing' })
    }
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: url.searchParams.has('slug') ? category : [category] })
    const slug = url.searchParams.get('slug')?.slice(3)
    return route.fulfill({ json: slug ? article(slug) : [article('broken')], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/', '/categoria/news', '/articoli/broken']) {
    await page.goto(path)
    const fallback = page.getByRole('img', { name: 'Copertina non disponibile: Articolo broken', exact: true })
    await expect(fallback).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (path !== '/articoli/broken') await expect(page.getByRole('link', { name: /Articolo broken/ }).first()).toHaveAttribute('href', '/articoli/broken')
  }
  const box = await page.getByRole('img', { name: 'Copertina non disponibile: Articolo broken', exact: true }).boundingBox()
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
  await page.screenshot({ path: testInfo.outputPath('article-cover-failed.png'), fullPage: true })
  await page.evaluate(() => { history.pushState({}, '', '/articoli/good'); dispatchEvent(new PopStateEvent('popstate')) })
  const image = page.locator('article img')
  await expect(image).toHaveAttribute('src', 'https://covers.test/good.svg')
  await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true)
  await expect(page.getByRole('img', { name: /Copertina non disponibile/ })).toHaveCount(0)
})
