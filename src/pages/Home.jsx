import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import NewsCard from '../components/NewsCard'
import CoverImage from '../components/CoverImage'
import SEO from '../components/SEO'
import { OrganizationSchema } from '../components/SchemaMarkup'

const PAGE_SIZE = 18

export default function Home() {
  const [params, setParams] = useSearchParams()
  const search = (params.get('q') || '').trim().slice(0, 200)
  const rawPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const loading = result?.page !== page || result?.search !== search
  const articles = loading ? [] : result.articles
  const total = loading ? null : result.total

  useEffect(() => {
    let active = true
    setResult(null); setError('')
    let query = supabase.from('published_articles')
      .select('id, slug, title, excerpt, cover_image_url, published_at, categories(id, name, slug, color)', { count: 'exact' })
      .eq('is_published', true)
    if (search) query = query.ilike('title', `%${search.replace(/[\\%_]/g, value => `\\${value}`)}%`)
    query.order('published_at', { ascending: false }).order('id', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      .then(({ data, error, count }) => {
        if (!active) return
        if (error) throw error
        setResult({ page, search, articles: data || [], total: count })
      }).catch(() => { if (active) setError('Impossibile caricare i contenuti. Riprova.') })
    return () => { active = false }
  }, [page, search, retry])

  function pageUrl(value) {
    const next = new URLSearchParams()
    if (search) next.set('q', search)
    if (value > 1) next.set('page', value)
    return next.size ? `/?${next}` : '/'
  }

  const featured = page === 1 ? articles[0] : null
  return <div className="min-h-screen flex flex-col">
    <SEO title={search ? `Ricerca: ${search}` : undefined} canonical={pageUrl(page)} />
    <OrganizationSchema />
    <Header />
    <main id="main-content" tabIndex={-1} aria-busy={loading && !error} className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 md:py-12">
      <h1 className="font-body font-bold text-3xl md:text-4xl text-dark mb-3">Ultimi articoli</h1>
      <p className="font-body text-gray-600 mb-8">Notizie e guide su smartphone e app.</p>
      <form role="search" className="mb-8 max-w-xl" onSubmit={event => {
        event.preventDefault()
        const value = new window.FormData(event.currentTarget).get('q').trim()
        setParams(value ? { q: value } : {})
      }}>
        <label htmlFor="archive-search" className="block font-semibold mb-2">Cerca nell’archivio</label>
        <div className="flex flex-wrap gap-2">
          <input key={search} id="archive-search" type="search" name="q" defaultValue={search} maxLength={200} placeholder="Titolo o parola chiave" className="min-w-0 flex-1 basis-40 border border-border rounded-lg px-3 py-3 bg-white" />
          <button className="bg-action text-white rounded-lg px-5 py-3 hover:bg-action-hover">Cerca</button>
          {search && <Link to="/" className="inline-flex items-center underline px-3 py-3">Azzera ricerca</Link>}
        </div>
      </form>
      {search && <p role="status" className="mb-5 text-gray-700">Risultati per “{search}”{total !== null ? `: ${total}` : ''}</p>}
      {error ? <div role="alert" className="text-red-700 mb-6">{error} <button className="underline" onClick={() => setRetry(value => value + 1)}>Riprova</button></div> : loading ? <p role="status">Caricamento articoli…</p> : <>
        {featured && <Link to={`/articoli/${featured.slug}`} className="grid md:grid-cols-2 gap-5 md:gap-8 mb-10 group">
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-100"><CoverImage src={featured.cover_image_url} alt={featured.title} className="w-full h-full object-cover" loading="eager" sizes="(min-width: 1152px) 544px, (min-width: 768px) calc(50vw - 32px), calc(100vw - 32px)" /></div>
          <div className="self-center min-w-0">
            <p className="text-sm text-gray-600 mb-2">Articolo più recente</p>
            <h2 className="font-body font-bold text-2xl md:text-3xl leading-tight text-dark break-words group-hover:underline">{featured.title}</h2>
            {featured.excerpt && <p className="text-base text-gray-700 leading-relaxed mt-3">{featured.excerpt}</p>}
            <time dateTime={featured.published_at} className="block text-sm text-gray-600 mt-3">{new Date(featured.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
          </div>
        </Link>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{articles.slice(featured ? 1 : 0).map(article => <NewsCard key={article.id} article={article} />)}</div>
        {!articles.length && <p className="text-gray-600 py-8">{search ? 'Nessun articolo trovato. Prova un’altra parola chiave.' : 'Nessun articolo in questa pagina.'} <Link to="/" className="underline">Torna agli ultimi articoli</Link></p>}
        <nav aria-label="Paginazione archivio" className="flex flex-wrap items-center justify-center gap-5 mt-10 text-sm font-body">
          {page > 1 && <Link to={pageUrl(page - 1)} className="border border-border rounded-lg px-4 py-3">Precedente</Link>}
          <span>Pagina {page}{total !== null ? ` di ${Math.max(1, Math.ceil(total / PAGE_SIZE))}` : ''}</span>
          {(total !== null ? page * PAGE_SIZE < total : articles.length === PAGE_SIZE) && <Link to={pageUrl(page + 1)} className="border border-border rounded-lg px-4 py-3">Successiva</Link>}
        </nav>
      </>}
    </main>
    <Footer />
  </div>
}
