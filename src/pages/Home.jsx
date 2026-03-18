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
    <div className="bg-white border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded-full w-20" />
        <div className="h-5 bg-gray-200 rounded w-4/5" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-24 mt-2" />
      </div>
    </div>
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
        <section className="bg-dark relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 70% 50%, #FF5C1A 0%, transparent 60%)',
            }}
          />
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 relative">
            <div className="max-w-2xl">
              <span className="inline-block text-primary text-xs font-body font-semibold uppercase tracking-widest mb-4 border border-primary/30 px-3 py-1 rounded-full">
                Tech italiana
              </span>
              <h1 className="text-4xl md:text-6xl font-heading font-bold text-white leading-tight mb-5">
                Recensioni e guide smartphone<br />
                <span className="text-primary">per scegliere bene.</span>
              </h1>
              <p className="text-white/50 text-lg font-body leading-relaxed mb-8">
                Analisi approfondite, comparativi onesti e guide pratiche per trovare il telefono giusto senza perdere tempo.
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
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
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
            <h2 className="text-2xl font-heading font-bold text-dark">Ultimi articoli</h2>
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
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-white border-t border-border">
            <div className="max-w-6xl mx-auto px-4 py-14">
              <h2 className="text-2xl font-heading font-bold text-dark mb-8">Esplora per categoria</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="group flex flex-col items-center justify-center text-center px-4 py-6 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      borderColor: cat.color ? `${cat.color}40` : '#FF5C1A40',
                      backgroundColor: cat.color ? `${cat.color}08` : '#FF5C1A08',
                    }}
                  >
                    <div
                      className="mb-3 group-hover:scale-110 transition-transform"
                      style={{ color: cat.color || '#FF5C1A' }}
                    >
                      {CATEGORY_ICONS[cat.slug] || (
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.color || '#FF5C1A' }} />
                      )}
                    </div>
                    <span
                      className="text-sm font-heading font-bold uppercase tracking-wide"
                      style={{ color: cat.color || '#FF5C1A' }}
                    >
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="text-xs text-gray-400 font-body mt-1.5 leading-tight line-clamp-2">
                        {cat.description}
                      </span>
                    )}
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
