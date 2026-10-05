import { test, expect } from '@playwright/test'

const categories = ['news', 'guide', 'recensioni'].map((slug, id) => ({ id: String(id), slug, name: slug === 'news' ? 'News' : slug === 'guide' ? 'Guide' : 'Recensioni' }))
const article = (slug, category = categories[0]) => ({ id: slug, slug, title: `Articolo ${slug}`, content: 'Contenuto fittizio', categories: category, published_at: '2026-10-01' })

async function navigate(page, path) {
  await page.evaluate(path => {
    history.pushState({}, '', path)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

async function fixtures(page, handler = () => null) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/_vercel/')) return route.abort()
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    const custom = await handler(url, route)
    if (custom === true) return
    const slug = url.searchParams.get('slug')?.replace('eq.', '')
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ json: slug ? categories.find(cat => cat.slug === slug) : categories })
    }
    if (slug) return route.fulfill({ json: article(slug) })
    const cat = categories.find(cat => cat.id === url.searchParams.get('category_id')?.replace('eq.', '')) || categories[0]
    const offset = Number(url.searchParams.get('offset') || 0)
    const count = cat.slug === 'recensioni' ? 0 : 25
    const limit = Number(url.searchParams.get('limit') || 12)
    const data = Array.from({ length: Math.min(limit, Math.max(0, count - offset)) }, (_, i) => article(`${cat.slug}-${offset + i}`, cat))
    return route.fulfill({ json: data, headers: { 'access-control-expose-headers': 'content-range', 'content-range': `${offset}-${offset + data.length - 1}/${count}` } })
  })
}

test('articolo valido → non trovato/errore → recupero e indietro/avanti', async ({ page }) => {
  await fixtures(page, async (url, route) => {
    const slug = url.searchParams.get('slug')
    if (url.pathname.endsWith('/articles') && ['eq.missing', 'eq.error'].includes(slug)) {
      await route.fulfill({ status: slug === 'eq.missing' ? 406 : 503, json: { code: slug === 'eq.missing' ? 'PGRST116' : 'unavailable', details: slug === 'eq.missing' ? 'The result contains 0 rows' : 'Temporary outage' } })
      return true
    }
  })
  await page.goto('/articoli/valido')
  await expect(page.getByRole('heading', { name: 'Articolo valido', exact: true })).toBeVisible()
  await navigate(page, '/articoli/missing')
  await expect(page.getByText('Articolo non trovato o non più disponibile.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Articolo valido', exact: true })).toHaveCount(0)
  await expect(page).not.toHaveTitle(/Articolo valido/)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await navigate(page, '/articoli/error')
  await expect(page.getByText('Impossibile caricare l’articolo. Riprova più tardi.')).toBeVisible()
  await expect(page).not.toHaveTitle(/Articolo valido/)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await page.goBack()
  await expect(page.getByText('Articolo non trovato o non più disponibile.')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Articolo valido', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Articolo valido', exact: true })).toHaveCount(0)
})

test('risposta categoria lenta non sovrascrive categoria veloce', async ({ page }) => {
  let release
  let started
  const requested = new Promise(resolve => { started = resolve })
  const delayed = new Promise(resolve => { release = resolve })
  await fixtures(page, async (url, route) => {
    if (url.pathname.endsWith('/categories') && url.searchParams.get('slug') === 'eq.news') {
      started()
      await delayed
      await route.fulfill({ json: categories[0] })
      return true
    }
  })
  await page.goto('/categoria/news')
  await requested
  await page.locator('header').getByRole('link', { name: 'Guide', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Articolo guide-0', exact: true })).toBeVisible()
  release()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Articolo news-0', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Guide', exact: true })).toBeVisible()
})

test('paginazione conta tutti i risultati e resetta al cambio categoria', async ({ page }) => {
  let release
  const delayed = new Promise(resolve => { release = resolve })
  await fixtures(page, async (url, route) => {
    if (url.pathname.endsWith('/articles') && url.searchParams.get('category_id') === 'eq.1') {
      if (url.searchParams.get('offset') === '12') {
        await route.fulfill({ json: [article('guide-12', categories[1])], headers: { 'content-range': '12-12/25', 'access-control-expose-headers': 'content-range' } })
      } else {
        await delayed
        await route.fulfill({ json: [article('guide-0', categories[1])], headers: { 'content-range': '0-0/25', 'access-control-expose-headers': 'content-range' } })
      }
      return true
    }
  })
  await page.goto('/categoria/news')
  await expect(page.getByText('25 articoli trovati')).toBeVisible()
  await page.getByRole('button', { name: 'Successivo' }).click()
  await expect(page.getByRole('heading', { name: 'Articolo news-12', exact: true })).toBeVisible()
  await page.locator('header').getByRole('link', { name: 'Guide', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Guide', exact: true })).toBeVisible()
  await page.waitForTimeout(250) // Allow an incorrectly issued page-2 response to render while page 1 is held.
  await expect(page.getByRole('heading', { name: 'Articolo guide-12', exact: true })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { name: 'Articolo guide-0', exact: true })).toBeVisible()
  await expect(page.getByText('1 / 3')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Articolo news-0', exact: true })).toBeVisible()
  await expect(page.getByText('1 / 3')).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Articolo guide-0', exact: true })).toBeVisible()
})

test('errore categoria non mostra risultati vecchi o zero e recupera', async ({ page }) => {
  let fail = false
  await fixtures(page, async (url, route) => {
    if (fail && url.pathname.endsWith('/articles')) {
      await route.fulfill({ status: 503, json: { code: 'unavailable' } })
      return true
    }
  })
  await page.goto('/categoria/news')
  await expect(page.getByText('25 articoli trovati')).toBeVisible()
  fail = true
  await page.getByRole('button', { name: 'Successivo' }).click()
  await expect(page.getByText('Categoria non trovata o errore nel caricamento.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Articolo news-0', exact: true })).toHaveCount(0)
  await expect(page.getByText(/articoli trovati/)).toHaveCount(0)
  fail = false
  await page.locator('header').getByRole('link', { name: 'Guide', exact: true }).click()
  await expect(page.getByText('25 articoli trovati')).toBeVisible()
})

test('Recensioni vuota spiega le prove e suggerisce contenuti pubblicati', async ({ page }) => {
  await fixtures(page)
  await page.goto('/categoria/recensioni')
  await expect(page.getByText('Non sono ancora disponibili prove pubblicate.')).toBeVisible()
  await page.getByRole('link', { name: 'Leggi gli ultimi articoli' }).click()
  await expect(page.getByRole('heading', { name: 'Articolo news-0', exact: true })).toBeVisible()
})


test('articolo lento non sostituisce URL veloce né metadati', async ({ page }) => {
  let release
  let started
  const requested = new Promise(resolve => { started = resolve })
  const delayed = new Promise(resolve => { release = resolve })
  await fixtures(page, async (url, route) => {
    if (url.pathname.endsWith('/articles') && url.searchParams.get('slug') === 'eq.lento') {
      started()
      await delayed
      await route.fulfill({ json: article('lento') })
      return true
    }
  })
  await page.goto('/articoli/lento')
  await requested
  await navigate(page, '/articoli/veloce')
  await expect(page.getByRole('heading', { name: 'Articolo veloce', exact: true })).toBeVisible()
  release()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Articolo lento', exact: true })).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://phonepulse.it/articoli/veloce')
})


test('count non disponibile non diventa zero né inventa pagine', async ({ page }) => {
  await fixtures(page, async (url, route) => {
    if (url.pathname.endsWith('/articles')) {
      await route.fulfill({ json: [article('senza-count')] })
      return true
    }
  })
  await page.goto('/categoria/news')
  await expect(page.getByRole('heading', { name: 'Articolo senza-count', exact: true })).toBeVisible()
  await expect(page.getByText(/articoli trovati/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Successivo' })).toHaveCount(0)
})

test('cambio slug rimuove titolo e dati strutturati precedenti durante loading', async ({ page }) => {
  let release
  let started
  const requested = new Promise(resolve => { started = resolve })
  const delayed = new Promise(resolve => { release = resolve })
  await fixtures(page, async (url, route) => {
    if (url.pathname.endsWith('/articles') && url.searchParams.get('slug') === 'eq.nuovo') {
      started()
      await delayed
      await route.fulfill({ json: article('nuovo') })
      return true
    }
  })
  await page.goto('/articoli/precedente')
  await expect(page).toHaveTitle(/Articolo precedente/)
  await navigate(page, '/articoli/nuovo')
  await requested
  await expect(page.getByRole('heading', { name: 'Articolo precedente', exact: true })).toHaveCount(0)
  await expect(page).not.toHaveTitle(/Articolo precedente/)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
  release()
  await expect(page).toHaveTitle(/Articolo nuovo/)
})
