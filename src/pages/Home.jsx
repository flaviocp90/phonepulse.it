import { useEffect, useState } from 'react'

const CATEGORY_ICONS = {
  recensioni: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  comparativi: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  news: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  offerte: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
}
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ArticleCard from '../components/ArticleCard'
import SEO from '../components/SEO'
import { OrganizationSchema } from '../components/SchemaMarkup'

function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse aspect-[3/4] bg-gray-200" />
  )
}

export default function Home() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [articlesRes, categoriesRes] = await Promise.all([
          supabase
            .from('articles')
            .select('id, slug, title, excerpt, cover_image_url, published_at, score, categories(id, name, slug, color)')
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .limit(9),
          supabase
            .from('categories')
            .select('id, name, slug, description, color')
            .order('name'),
        ])

        if (articlesRes.error) throw articlesRes.error
        if (categoriesRes.error) throw categoriesRes.error

        setArticles(articlesRes.data || [])
        setCategories(categoriesRes.data || [])
      } catch (err) {
        setError('Impossibile caricare i contenuti. Riprova più tardi.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <SEO />
      <OrganizationSchema />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="hero-section bg-dark">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="max-w-4xl">
              <h1 className="text-7xl md:text-[120px] font-heading text-white leading-none mb-4 uppercase">
                Recensioni e guide smartphone<br />
                <span className="text-primary">per scegliere bene.</span>
              </h1>
              <p className="text-white/50 text-base font-body leading-relaxed mb-8 max-w-md">
                Analisi approfondite, comparativi onesti e guide pratiche per trovare il telefono giusto.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/categoria/recensioni"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Esplora le recensioni
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <Link
                  to="/categoria/guide"
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Guide all'acquisto
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Articles grid */}
        <section className="max-w-6xl mx-auto px-4 py-14">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-3xl font-heading text-dark uppercase">Ultimi articoli</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-body">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : articles.length === 0 && !error ? (
            <p className="text-gray-400 font-body text-center py-16">Nessun articolo pubblicato ancora.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <div key={article.id} className={index === 0 ? 'lg:col-span-2' : ''}>
                  <ArticleCard article={article} featured={index === 0} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-dark">
            <div className="max-w-6xl mx-auto px-4 py-12">
              <h2 className="text-3xl font-heading text-white uppercase mb-6">Esplora per categoria</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <span style={{ color: cat.color || '#FF5C1A' }}>
                      {CATEGORY_ICONS[cat.slug] || (
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#FF5C1A' }} />
                      )}
                    </span>
                    <span className="text-sm font-body uppercase tracking-widest">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
