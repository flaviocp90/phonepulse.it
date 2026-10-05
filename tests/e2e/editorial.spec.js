import { test, expect } from '@playwright/test'

const id = '10000000-0000-4000-8000-000000000001'
const tagId = '20000000-0000-4000-8000-000000000001'
const reviewKeys = ['title_matches_content', 'claims_sourced', 'dates_checked', 'experience_documented', 'reader_value', 'cover_checked', 'metadata_checked']
const fields = ['id', 'title', 'slug', 'excerpt', 'content', 'category_id', 'cover_image_url', 'author', 'seo_title', 'seo_description', 'affiliate_links', 'score', 'image_source', 'sources', 'content_format']
const source = () => ({ url: 'https://example.test/fonte', title: 'Documento ufficiale', publisher: 'Produttore', published_at: new Date(Date.now() - 3600000).toISOString(), retrieved_at: new Date(Date.now() - 1800000).toISOString() })
const article = (overrides = {}) => ({ id, title: 'Notizia verificabile', slug: 'notizia-verificabile', content: 'Fatti documentati. <script>window.bad = true</script>', author: 'Editor reale', content_format: 'news', sources: [source()], status: 'draft', origin: 'manual', version: 1, article_tags: [], excerpt: null, category_id: null, cover_image_url: null, score: null, seo_title: null, seo_description: null, affiliate_links: null, image_source: null, approved_version: null, approved_at: null, approved_by: null, last_verified_at: null, ...overrides })

async function fixture(page, options = {}) {
  const state = { row: article(options.article), calls: [], queries: [], violations: [], ...options }
  const user = { id, email: 'editor@example.test', app_metadata: { phonepulse_role: options.role === 'none' ? undefined : 'editor' } }
  const session = { access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh', expires_at: Math.floor(Date.now() / 1000) + 36000, expires_in: 36000, token_type: 'bearer', user }
  if (!options.anonymous) await page.addInitScript(session => localStorage.setItem('sb-supabase-auth-token', JSON.stringify(session)), session)
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.startsWith('/_vercel/')) return route.abort()
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'supabase.test') return route.abort()
    const fail = (message, code = '40001') => route.fulfill({ status: 400, json: { message, code } })
    if (url.pathname === '/auth/v1/user') return state.authError ? route.fulfill({ status: 503, json: { message: 'Auth unavailable' } }) : route.fulfill({ json: user })
    if (url.pathname === '/auth/v1/token') return route.fulfill({ json: session })
    if (url.pathname === '/auth/v1/logout') return state.logoutError ? fail('Logout unavailable') : route.fulfill({ json: {} })
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').at(-1)
      const args = request.postDataJSON()
      state.calls.push({ name, args })
      if (state.rpcGate) await state.rpcGate
      const expected = name === 'save_article' ? ['p_article', 'p_tag_ids', 'p_expected_version', 'p_publish_correction', 'p_review'] : name === 'approve_article' ? ['p_id', 'p_expected_version', 'p_review'] : name === 'set_article_status' ? ['p_id', 'p_expected_version', 'p_status'] : name === 'publish_article' ? ['p_id', 'p_expected_version'] : []
      if (!expected.length || Object.keys(args).some(key => !expected.includes(key)) || expected.some(key => !(key in args))) { state.violations.push('RPC contract'); return fail('Unexpected RPC payload') }
      if (args.p_article && Object.keys(args.p_article).some(key => !fields.includes(key))) { state.violations.push('Article whitelist'); return fail('Unexpected article field') }
      if (args.p_article && 'affiliate_links' in args.p_article && args.p_article.affiliate_links !== null && !Array.isArray(args.p_article.affiliate_links)) return fail('Invalid array field: affiliate_links', '22023')
      if (state.conflict) return fail('Article version conflict')
      if (args.p_expected_version !== (args.p_article && !args.p_article.id ? null : state.row.version)) return fail('Article version conflict')
      if (name === 'save_article') {
        if (state.tagError) return fail('Tag transaction failed', '23503')
        if (args.p_publish_correction && reviewKeys.some(key => args.p_review?.[key] !== true)) return fail('Checklist missing')
        const changed = Object.entries(args.p_article).some(([key, value]) => key !== 'id' && JSON.stringify(value) !== JSON.stringify(state.row[key])) || JSON.stringify([...args.p_tag_ids].sort()) !== JSON.stringify(state.row.article_tags.map(tag => tag.tag_id).sort())
        state.row = { ...state.row, ...args.p_article, id, version: state.row.version + (changed ? 1 : 0), status: changed && state.row.status === 'approved' ? 'draft' : state.row.status, article_tags: args.p_tag_ids.map(tag_id => ({ tag_id })) }
      }
      if (name === 'approve_article') {
        if (reviewKeys.some(key => args.p_review[key] !== true) || !state.row.sources.length) return fail('Checklist or sources missing')
        state.row.status = 'approved'; state.row.approved_version = state.row.version; state.row.approved_at = new Date().toISOString(); state.row.last_verified_at = state.row.approved_at; state.row.approved_by = id
      }
      if (name === 'publish_article') { if (state.row.status !== 'approved') return fail('Approval required'); state.row.status = 'published' }
      if (name === 'set_article_status') state.row.status = args.p_status
      return route.fulfill({ json: { id: args.p_id || id, version: state.row.version, status: state.row.status, ...(name === 'publish_article' ? { changed: true } : {}) } })
    }
    if (request.method() !== 'GET' && request.method() !== 'HEAD') { state.violations.push('REST mutation'); return fail('Direct writes forbidden') }
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/tags')) return route.fulfill({ json: [{ id: tagId, name: 'Android' }] })
    if (url.pathname.endsWith('/articles')) {
      state.queries.push(Object.fromEntries(url.searchParams))
      if (url.searchParams.has('id')) return route.fulfill({ json: state.row })
      if (state.listError) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      const legacy = url.searchParams.get('origin') === 'eq.legacy'
      const offset = Number(url.searchParams.get('offset') || 0)
      const count = legacy ? 4359 : 21
      const data = request.method() === 'HEAD' ? [] : Array.from({ length: Math.min(Number(url.searchParams.get('limit') || 10), count - offset) }, (_, i) => ({ ...state.row, id: `${id.slice(0, -3)}${String(offset + i).padStart(3, '0')}`, title: `${legacy ? 'Archivio' : 'Nuova bozza'} ${offset + i}` }))
      return route.fulfill({ json: data, headers: { 'content-range': `${offset}-${offset + data.length - 1}/${count}`, 'access-control-expose-headers': 'content-range' } })
    }
    state.violations.push(url.pathname)
    return fail('Unexpected endpoint')
  })
  return state
}

async function completeReview(page) {
  for (const box of await page.getByRole('checkbox').all()) await box.check()
}

test('refresh Auth conserva testo dirty e verifica di rete fallita resta recuperabile', async ({ page }) => {
  const state = await fixture(page)
  await page.goto(`/admin/articoli/${id}`)
  await page.getByLabel('Contenuto (Markdown)').fill('Testo durante refresh token')
  await page.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase.js')
    await supabase.auth.refreshSession()
  })
  await expect(page.getByLabel('Contenuto (Markdown)')).toHaveValue('Testo durante refresh token')
  state.authError = true
  await page.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase.js')
    await supabase.auth.refreshSession()
  })
  await expect(page.getByRole('alert')).toContainText('verificare')
  await expect(page.getByLabel('Contenuto (Markdown)')).toHaveValue('Testo durante refresh token')
  state.authError = false
  await page.getByRole('button', { name: 'Riprova verifica accesso' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Contenuto (Markdown)')).toHaveValue('Testo durante refresh token')
})

test('dashboard conteggi indisponibili mostra — e non zero', async ({ page }) => {
  await fixture(page, { listError: true })
  await page.goto('/admin/dashboard')
  await expect(page.getByRole('alert')).toContainText('conteggi sono indisponibili')
  await expect(page.getByText('0', { exact: true })).toHaveCount(0)
  await expect(page.getByText('—', { exact: true }).first()).toBeVisible()
})

test('accesso anonimo, login, ruolo verificato e logout fallito', async ({ page }) => {
  const state = await fixture(page, { anonymous: true, role: 'none', logoutError: true })
  await page.goto('/admin/review')
  await expect(page).toHaveURL('/admin/login')
  await page.getByLabel('Email', { exact: true }).fill('editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password')
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('ruolo editor')
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Logout')
  expect(state.violations).toEqual([])
})

test('errore Auth verificata non ammette dashboard', async ({ page }) => {
  await fixture(page, { authError: true })
  await page.goto('/admin/dashboard')
  await expect(page.getByRole('alert')).toContainText('verificare')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0)
})

test('coda nuova separata, paginazione server, ricerca letterale e indisponibilità', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/review')
  await expect(page.getByText('21 articoli', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Successiva', exact: true }).click()
  await expect(page.getByText('Nuova bozza 10', { exact: true })).toBeVisible()
  expect(state.queries.some(q => q.offset === '10' && q.limit === '10' && q.status === 'eq.draft' && q.origin === 'in.(rss,manual)')).toBeTruthy()
  await page.getByRole('button', { name: 'Archivio legacy', exact: true }).click()
  await expect(page.getByText('4359 articoli', { exact: true })).toBeVisible()
  await page.getByLabel('Cerca titolo').fill('100%_')
  await expect.poll(() => state.queries.at(-1).title).toBe('ilike.%100\\%\\_%')
  state.listError = true
  await page.getByRole('button', { name: 'Approvati', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('indisponibile')
  await expect(page.getByText('0 articoli', { exact: true })).toHaveCount(0)
  expect(state.queries.filter(q => q.limit).every(q => !q.select.split(',').includes('content'))).toBeTruthy()
})

test('salva tag atomicamente, approva versione salvata, pubblica separatamente', async ({ page }) => {
  const state = await fixture(page)
  await page.goto(`/admin/articoli/${id}`)
  await expect(page.getByRole('button', { name: 'Approva', exact: true })).toBeDisabled()
  await page.getByLabel('Titolo', { exact: true }).fill('Titolo corretto')
  await completeReview(page)
  await expect(page.getByRole('button', { name: 'Approva', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Android', exact: true }).click()
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Bozza salvata')
  expect(state.calls[0].args.p_tag_ids).toEqual([tagId])
  await completeReview(page)
  await page.getByRole('button', { name: 'Approva', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('approvata')
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('pubblicato')
  expect(state.calls.map(c => c.name)).toEqual(['save_article', 'approve_article', 'publish_article'])
  expect(state.violations).toEqual([])
})

test('fonte draft malformata resta correggibile senza crash o approvazione', async ({ page }) => {
  await fixture(page, { article: { sources: [null] } })
  await page.goto(`/admin/articoli/${id}`)
  await expect(page.getByLabel('Contenuto (Markdown)')).toHaveValue(/Fatti documentati/)
  await expect(page.getByText('Fonte incompleta o non valida: correggi i campi prima di approvare.')).toBeVisible()
  await completeReview(page)
  await expect(page.getByRole('button', { name: 'Approva', exact: true })).toBeDisabled()
  await page.getByLabel('URL 1', { exact: true }).fill('https://example.test/corretta')
  await expect(page.getByLabel('URL 1', { exact: true })).toHaveValue('https://example.test/corretta')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.locator('.article-content')).toContainText('Fatti documentati')
})

test('fonte mancante e checklist incompleta bloccano approvazione', async ({ page }) => {
  const state = await fixture(page, { article: { sources: [] } })
  await page.goto(`/admin/articoli/${id}`)
  await completeReview(page)
  await expect(page.getByRole('button', { name: 'Approva', exact: true })).toBeDisabled()
  expect(state.calls).toEqual([])
})

test('affiliate legacy object vuoto conserva draft e correzione published senza conversione', async ({ page }) => {
  const state = await fixture(page, { article: { affiliate_links: {} } })
  await page.goto(`/admin/articoli/${id}`)
  await expect(page.getByLabel('Affiliate links (JSON)')).toHaveValue('{}')
  await page.getByLabel('Titolo', { exact: true }).fill('Bozza legacy aggiornata')
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Bozza salvata')
  expect(state.calls[0].args.p_article).not.toHaveProperty('affiliate_links')
  expect(state.row.affiliate_links).toEqual({})
  await completeReview(page)
  await page.getByRole('button', { name: 'Approva', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('approvata')
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('pubblicato')
  const version = state.row.version
  await completeReview(page)
  await page.getByRole('button', { name: 'Salva correzione pubblicata', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Correzione')
  expect(state.calls.at(-1).args.p_article).not.toHaveProperty('affiliate_links')
  expect(state.row.affiliate_links).toEqual({})
  expect(state.row.version).toBe(version)
})

test('affiliate legacy non vuoto visibile e invariato non revoca approved; modifica richiede array', async ({ page }) => {
  const affiliate = { shop: 'Negozio storico', url: 'https://example.test/legacy-affiliate' }
  const state = await fixture(page, { article: { affiliate_links: affiliate, status: 'approved', approved_version: 1, approved_by: id, approved_at: new Date().toISOString() } })
  await page.goto(`/admin/articoli/${id}`)
  await expect(page.getByLabel('Affiliate links (JSON)')).toHaveValue(JSON.stringify(affiliate, null, 2))
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Versione approvata invariata')
  expect(state.calls[0].args.p_article).not.toHaveProperty('affiliate_links')
  expect(state.row.affiliate_links).toEqual(affiliate)
  expect(state.row.version).toBe(1)
  await expect(page.getByText('Stato: Approvato', { exact: true })).toBeVisible()
  await page.getByLabel('Affiliate links (JSON)').fill('{"changed":true}')
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('array JSON')
  expect(state.calls).toHaveLength(1)
  await page.getByLabel('Affiliate links (JSON)').fill('[{"label":"Negozio","url":"https://example.test/shop"}]')
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Bozza salvata')
  expect(state.row.affiliate_links).toEqual([{ label: 'Negozio', url: 'https://example.test/shop' }])
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect.poll(() => state.calls.length).toBe(3)
  expect(state.calls.at(-1).args.p_article).not.toHaveProperty('affiliate_links')
  expect(state.row.version).toBe(2)
})

test('salvataggio invariato conserva null e approvazione; verifica published no-op conserva versione', async ({ page }) => {
  const state = await fixture(page, { article: { status: 'approved', approved_version: 1, approved_by: id, approved_at: new Date().toISOString(), last_verified_at: new Date().toISOString() } })
  await page.goto(`/admin/articoli/${id}`)
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Versione approvata invariata')
  expect(state.calls[0].args.p_article.excerpt).toBe(null)
  expect(state.calls[0].args.p_article).not.toHaveProperty('affiliate_links')
  expect(state.row.affiliate_links).toBe(null)
  expect(state.row.version).toBe(1)
  await expect(page.getByText('Stato: Approvato', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('pubblicato')
  await completeReview(page)
  await page.getByRole('button', { name: 'Salva correzione pubblicata', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Correzione')
  expect(state.row.version).toBe(1)
})

test('modifica approved revoca approvazione e conflitto preserva testo', async ({ page }) => {
  const state = await fixture(page, { article: { status: 'approved' } })
  await page.goto(`/admin/articoli/${id}`)
  await page.getByLabel('Contenuto (Markdown)').fill('Nuovo testo locale')
  await expect(page.getByRole('button', { name: 'Pubblica', exact: true })).toBeDisabled()
  state.conflict = true
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(/conflitto/i)
  await expect(page.getByLabel('Contenuto (Markdown)')).toHaveValue('Nuovo testo locale')
  state.conflict = false
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Bozza salvata')
  await expect(page.getByText('Stato: Bozza', { exact: true })).toBeVisible()
})

test('correzione published storica, preview sanificata e ritiro separato', async ({ page }) => {
  const state = await fixture(page, { article: { status: 'published', sources: [{ ...source(), url: 'http://example.test/storica', published_at: '2020-01-01T10:00:00Z' }] } })
  await page.goto(`/admin/articoli/${id}`)
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.locator('.article-content script')).toHaveCount(0)
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByLabel('Titolo', { exact: true }).fill('Correzione storica')
  await completeReview(page)
  await page.getByRole('button', { name: 'Salva correzione pubblicata', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Correzione')
  expect(state.calls[0].args.p_publish_correction).toBe(true)
  expect(state.calls[0].args.p_article.sources[0].url).toMatch(/^http:/)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Ritira', exact: true }).click()
  await expect(page.getByText('Stato: Scartato', { exact: true })).toBeVisible()
  expect(state.calls.at(-1).name).toBe('set_article_status')
})

test('errore tag mantiene modifiche e nessun successo', async ({ page }) => {
  const state = await fixture(page, { tagError: true })
  await page.goto(`/admin/articoli/${id}`)
  await page.getByLabel('Titolo', { exact: true }).fill('Testo da non perdere')
  await page.getByRole('button', { name: 'Android', exact: true }).click()
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Tag transaction failed')
  await expect(page.getByLabel('Titolo', { exact: true })).toHaveValue('Testo da non perdere')
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(state.violations).toEqual([])
})

test('nuova bozza passa a URL reale e navigazione dirty richiede conferma', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/articoli/nuovo')
  await page.getByLabel('Titolo', { exact: true }).fill('Nuova notizia')
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect(page).toHaveURL(`/admin/articoli/${id}`)
  expect(state.calls[0].args.p_expected_version).toBe(null)
  await page.getByLabel('Titolo', { exact: true }).fill('Modifiche non salvate')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: 'Articoli', exact: true }).first().click()
  await expect(page).toHaveURL(`/admin/articoli/${id}`)
})

test('cambio route durante RPC non lascia nuovo editor bloccato e ignora risultato vecchio', async ({ page }) => {
  const state = await fixture(page)
  await page.goto(`/admin/articoli/${id}`)
  await page.getByLabel('Titolo', { exact: true }).fill('Salvataggio pendente')
  let release
  state.rpcGate = new Promise(resolve => { release = resolve })
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect.poll(() => state.calls.length).toBe(1)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('link', { name: 'Nuovo articolo', exact: true }).click()
  try {
    await expect(page).toHaveURL('/admin/articoli/nuovo')
    await expect(page.getByLabel('Titolo', { exact: true })).toBeEnabled()
    await page.getByLabel('Titolo', { exact: true }).fill('Nuovo testo locale')
  } finally { release() }
  await expect(page.getByLabel('Titolo', { exact: true })).toHaveValue('Nuovo testo locale')
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('RPC vecchia dopo A→B→A non aggiorna versione o baseline locale', async ({ page }) => {
  const state = await fixture(page)
  await page.goto(`/admin/articoli/${id}`)
  await page.getByLabel('Titolo', { exact: true }).fill('Vecchia operazione A')
  let release
  state.rpcGate = new Promise(resolve => { release = resolve })
  await page.getByRole('button', { name: 'Salva bozza', exact: true }).click()
  await expect.poll(() => state.calls.length).toBe(1)
  const navigate = path => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')) }, path)
  try {
    await navigate('/admin/articoli/30000000-0000-4000-8000-000000000001')
    await expect(page.getByLabel('Titolo', { exact: true })).toBeEnabled()
    await navigate(`/admin/articoli/${id}`)
    await expect(page.getByLabel('Titolo', { exact: true })).toBeEnabled()
    await page.getByLabel('Titolo', { exact: true }).fill('Nuovo testo A dopo ritorno')
  } finally { release() }
  await expect.poll(() => state.row.version).toBe(2)
  await expect(page.getByLabel('Titolo', { exact: true })).toHaveValue('Nuovo testo A dopo ritorno')
  await expect(page.getByText('Versione: 1', { exact: false })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('lista articoli pagina tutti lato server e ritira senza DELETE', async ({ page }) => {
  const state = await fixture(page, { article: { status: 'published' } })
  await page.goto('/admin/articoli')
  await page.getByRole('button', { name: 'Successiva', exact: true }).click()
  await expect(page.getByText('Nuova bozza 10', { exact: true })).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Ritira', exact: true }).first().click()
  await expect.poll(() => state.calls.length).toBe(1)
  expect(state.calls[0].args.p_expected_version).toBe(1)
  expect(state.violations).toEqual([])
})

for (const width of [375, 1280]) test(`editor sintetico senza overflow ${width}`, async ({ page }, testInfo) => {
  await fixture(page)
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`/admin/articoli/${id}`)
  await expect(page.getByLabel('Titolo', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true })
})
