import { test, expect } from '@playwright/test'

const record = {
  id: 'pilot', slug: 'pilot', title: 'Guida pilota', content: 'Una guida con limiti e fonti verificabili.',
  author: 'Flavio Coppola', content_format: 'guide', origin: 'manual', score: 95,
  published_at: '2026-10-01T08:00:00Z', content_updated_at: '2026-10-03T09:00:00Z', updated_at: '2026-10-05T09:00:00Z',
  category_id: 'guide', categories: { id: 'guide', slug: 'guide', name: 'Guide' },
  sources: [{ url: 'https://example.org/manuale', title: 'Manuale ufficiale', publisher: 'Produttore', retrieved_at: '2026-10-02T08:00:00Z' }, null, { url: 'javascript:alert(1)', title: 'Fonte pericolosa' }],
}

async function fixtures(page, article) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/_vercel/')) return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.searchParams.has('category_id')) {
      expect(url.searchParams.get('is_published')).toBe('eq.true')
      expect(url.searchParams.get('id')).toBe('neq.pilot')
    }
    const data = url.pathname.endsWith('/categories') ? [] : url.searchParams.has('slug') ? article
      : url.searchParams.has('category_id') ? [{ id: 'related', slug: 'related', title: 'Guida correlata' }] : []
    return route.fulfill({ json: data })
  })
}

test('pilota espone autore formato fonti e aggiornamento editoriale, senza voto automatico', async ({ page }) => {
  await fixtures(page, record)
  await page.goto('/articoli/pilot')
  const article = page.locator('article')
  await expect(article.getByText('Di Flavio Coppola')).toBeVisible()
  await expect(article.getByText('Formato: Guida')).toBeVisible()
  await expect(article.locator('time[datetime="2026-10-03T09:00:00Z"]')).toBeVisible()
  await expect(article.getByRole('link', { name: 'Manuale ufficiale' })).toHaveAttribute('href', 'https://example.org/manuale')
  const contrast = await article.getByRole('link', { name: 'Manuale ufficiale' }).evaluate(link => {
    const luminance = color => {
      const channels = color.match(/\d+/g).slice(0, 3).map(value => Number(value) / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
    }
    const foreground = luminance(getComputedStyle(link).color)
    const background = luminance(getComputedStyle(document.body).backgroundColor)
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05)
  })
  expect(contrast).toBeGreaterThanOrEqual(4.5)
  await expect(article.getByText('Fonte pericolosa')).toHaveCount(0)
  await expect(article.getByText(/Il nostro voto|Voto:/)).toHaveCount(0)
  await expect(article.getByRole('link', { name: 'Torna a Guide' })).toHaveAttribute('href', '/categoria/guide')
  await expect(article.getByRole('link', { name: 'Guida correlata' })).toHaveAttribute('href', '/articoli/related')
  await expect.poll(async () => page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(data => data['@type'] === 'Article'))).toMatchObject({ author: { '@type': 'Person', name: 'Flavio Coppola' }, dateModified: record.content_updated_at, genre: 'Guida', citation: ['https://example.org/manuale'] })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/editorial-pilot-mobile.png', fullPage: true })
})

test('archivio non inventa autore formato date o prove', async ({ page }) => {
  await fixtures(page, { ...record, author: null, content_format: null, origin: 'legacy', published_at: 'invalid', sources: {}, content_updated_at: record.content_updated_at })
  await page.goto('/articoli/pilot')
  const article = page.locator('article')
  await expect(article.getByText('Articolo d’archivio')).toBeVisible()
  await expect(article.getByText(/Flavio Coppola|Invalid Date|Formato:|Aggiornato:|Voto:/)).toHaveCount(0)
  const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(data => data['@type'] === 'Article'))
  expect(schema.author).toBeUndefined()
  expect(schema.dateModified).toBeUndefined()
  expect(schema.datePublished).toBeUndefined()
})

test('presentazione dichiara responsabilità e metodo senza promettere prove inesistenti', async ({ page }) => {
  await fixtures(page, record)
  await page.goto('/chi-siamo')
  await expect(page.getByText('Flavio Coppola', { exact: true })).toBeVisible()
  await expect(page.getByText('Usiamo i dispositivi per settimane, non per ore.')).toHaveCount(0)
  await expect(page.getByText(/Ogni recensione è il risultato di un utilizzo reale/)).toHaveCount(0)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Smartphone e app/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Leggi le news', exact: true })).toHaveAttribute('href', '/categoria/news')
})

test('firma del sito è un’organizzazione e la bozza AI è dichiarata', async ({ page }) => {
  await fixtures(page, { ...record, author: 'PhonePulse', origin: 'rss' })
  await page.goto('/articoli/pilot')
  await expect(page.locator('article').getByText(/Bozza preparata con assistenza AI/)).toBeVisible()
  await expect.poll(async () => page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(data => data['@type'] === 'Article')?.author)).toEqual({ '@type': 'Organization', name: 'PhonePulse' })
})
