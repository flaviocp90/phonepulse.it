import { test, expect } from '@playwright/test'

async function fixtures(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/_vercel/')) return route.abort()
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    if (url.pathname.includes('/auth/')) return route.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } })
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: url.searchParams.has('slug') ? { id: '1', slug: 'news', name: 'News' } : [] })
    if (url.pathname.endsWith('/articles') && url.searchParams.has('slug')) return route.fulfill({ json: { id: 'fixture', slug: 'fixture', title: 'Articolo dimostrativo', content: '<p>Contenuto simulato per la verifica del layout.</p>', published_at: '2026-10-01' } })
    return route.fulfill({ json: [], headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } })
  })
}

test('header conserva spazio e nessun overflow a 390, 768, 1200 e testo 200%', async ({ page }) => {
  await fixtures(page)
  await page.goto('/categoria/news')
  for (const width of [768, 390, 1200, 1400]) {
    await page.setViewportSize({ width, height: 900 })
    for (const scale of [1, 2]) {
      await page.evaluate(scale => { document.documentElement.style.fontSize = `${16 * scale}px` }, scale)
      const layout = await page.locator('header').evaluate(header => {
        const logo = header.querySelector('a').getBoundingClientRect()
        const nav = [...header.querySelectorAll('nav')].find(nav => getComputedStyle(nav).display !== 'none')
        const control = nav || header.querySelector('button')
        return { gap: control.getBoundingClientRect().left - logo.right, overflow: document.documentElement.scrollWidth > innerWidth, offenders: [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => el.tagName + '.' + el.className).slice(-8) }
      })
      expect(layout.gap, `width=${width} scale=${scale}`).toBeGreaterThanOrEqual(16)
      expect(layout.overflow, `width=${width} scale=${scale} ${JSON.stringify(layout.offenders)}`).toBe(false)
    }
  }
})

test('menu mobile tastiera Escape, route e resize', async ({ page }) => {
  await fixtures(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/chi-siamo')
  const button = page.locator('header button')
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  const id = await button.getAttribute('aria-controls')
  const menu = page.locator(`#${id}`)
  await page.keyboard.press('Tab')
  await expect(menu.getByRole('link', { name: 'Home', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Enter')
  await menu.getByRole('link', { name: 'News', exact: true }).click()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()
  await page.evaluate(() => { history.pushState({}, '', '/categoria/guide'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()
  await page.setViewportSize({ width: 1400, height: 900 })
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(button).toHaveAttribute('aria-expanded', 'false')
})

test('login ha label associate e annuncia errore simulato', async ({ page }) => {
  await fixtures(page)
  await page.goto('/admin/login')
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Accedi' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email o password non corretti.')
})

test('footer rende reperibili Chi siamo e Contatti', async ({ page }) => {
  await fixtures(page)
  await page.goto('/chi-siamo')
  await page.locator('footer').getByRole('link', { name: 'Contatti', exact: true }).click()
  await expect(page).toHaveURL('/contatti')
  await page.locator('footer').getByRole('link', { name: 'Chi siamo', exact: true }).click()
  await expect(page).toHaveURL('/chi-siamo')
})


test('schermate home articolo categoria vuota senza overflow', async ({ page }, testInfo) => {
  await fixtures(page)
  for (const width of [390, 768, 1200]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [name, path] of [['home', '/'], ['articolo', '/articoli/fixture'], ['categoria-vuota', '/categoria/news']]) {
      await page.goto(path)
      if (name === 'articolo') await expect(page.getByRole('heading', { name: 'Articolo dimostrativo', exact: true })).toBeVisible()
      if (name === 'categoria-vuota') await expect(page.getByText('0 articoli trovati')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true })
    }
  }
})
