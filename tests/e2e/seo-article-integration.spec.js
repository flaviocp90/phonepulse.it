import { test, expect } from '@playwright/test'
import { composeArticleDocument } from '../../api/article.js'
import { renderPreview } from '../../api/seo-preview.js'

const article = {
  id: 'seo-test-id',
  slug: 'seo-integration-test',
  title: 'Guida di integrazione SEO',
  excerpt: 'Una guida verificabile',
  seo_title: 'Guida SEO completa',
  seo_description: 'Descrizione per i motori di ricerca',
  content: '## Un passo reale\n\nTesto con **enfasi** e [fonte](https://example.org/).',
  origin: 'manual',
  content_format: 'guide',
  author: 'PhonePulse',
  published_at: '2026-11-09T12:00:00Z',
  categories: { id: 'guide', name: 'Guide', slug: 'guide', color: '#f97316' },
  category_id: null,
  article_tags: [],
  sources: [{ title: 'Fonte verificata', url: 'https://example.org/', publisher: 'Esempio' }],
  is_published: true,
}
const path = '/articoli/seo-integration-test'
const canonical = 'https://www.phonepulse.it/articoli/seo-integration-test'

async function mockedInitialHtml(request) {
  const shell = await request.get('/')
  expect(shell.ok()).toBeTruthy()
  return composeArticleDocument(await shell.text(), renderPreview(article))
}

test.describe('server HTML without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('article HTML remains readable without JavaScript', async ({ page, request }) => {
    const html = await mockedInitialHtml(request)
    await page.route('**/articoli/seo-integration-test', route =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }))
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(response.status()).toBe(200)
    await expect(page.getByRole('heading', { name: article.title })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Un passo reale' })).toBeVisible()
    await expect(page.locator('.phonepulse-ssr .site-header')).toBeVisible()
    await expect(page.locator('.phonepulse-ssr article > h1')).toHaveCSS('text-transform', 'uppercase')
    const headingBounds = await page.locator('.phonepulse-ssr article > h1').boundingBox()
    expect(headingBounds.width).toBeGreaterThan(150)
    expect(headingBounds.width).toBeLessThanOrEqual(768)
    await expect(page.getByRole('link', { name: 'Fonte verificata' })).toHaveAttribute('href', 'https://example.org/')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
    await expect(page).toHaveTitle('Guida SEO completa — PhonePulse')
  })
})

test('React takes over article and keeps metadata and navigation correct', async ({ page, request }) => {
  const html = await mockedInitialHtml(request)
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname
    return ['127.0.0.1', 'supabase.test'].includes(host) ? route.continue() : route.abort()
  })
  await page.route('**/articoli/seo-integration-test', route =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }))
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.pathname.endsWith('/articles')) {
      await route.fulfill({ status: 200, contentType: 'application/json', json: article })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', json: [] })
  })

  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: article.title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Un passo reale' })).toBeVisible()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('title')).toHaveCount(1)
  await expect(page.locator('[data-phonepulse-ssr]')).toHaveCount(0)
  await page.getByRole('link', { name: 'PhonePulse home' }).click()
  await expect(page).toHaveURL('/')
})
