import { test, expect } from '@playwright/test'

async function isolate(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/_vercel/')) return route.abort()
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    return route.fulfill({ json: [] })
  })
}

test('pagina pubblica non scarica admin; login differito mostra attesa e modulo', async ({ page }) => {
  await isolate(page)
  const adminRequests = []
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/src/pages/admin/')) adminRequests.push(request.url())
  })
  await page.goto('/contatti')
  await expect(page.getByRole('heading', { name: 'Contatti', exact: true })).toBeVisible()
  expect(adminRequests).toEqual([])

  let release
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/src/pages/admin/AdminLogin.jsx', async route => {
    await held
    await route.continue()
  })
  await page.evaluate(() => { history.pushState({}, '', '/admin/login'); dispatchEvent(new PopStateEvent('popstate')) })
  try {
    await expect(page.getByRole('status')).toHaveText('Caricamento...')
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0)
  } finally {
    release()
  }
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('route admin anonime rimandano al login senza caricare pagine protette', async ({ page }) => {
  await isolate(page)
  const protectedRequests = []
  page.on('request', request => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/src/pages/admin/') && !path.endsWith('/AdminLogin.jsx')) protectedRequests.push(path)
  })
  for (const path of ['/admin', '/admin/dashboard', '/admin/articoli', '/admin/articoli/nuovo', '/admin/articoli/fixture', '/admin/review']) {
    await page.goto(path)
    await expect(page).toHaveURL('/admin/login')
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  }
  expect(protectedRequests).toEqual([])
})
