import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ArticleCard from '../components/ArticleCard'
import SEO from '../components/SEO'

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
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-dark relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 70% 50%, #FF5C1A 0%, transparent 60%)',
            }}
          />
          <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 relative">
            <div className="max-w-2xl">
              <span className="inline-block text-primary text-xs font-body font-semibold uppercase tracking-widest mb-4 border border-primary/30 px-3 py-1 rounded-full">
                Tech italiana
              </span>
              <h1 className="text-5xl md:text-6xl font-heading font-bold text-white leading-tight mb-5">
                Recensioni e guide smartphone<br />
                <span className="text-primary">per scegliere bene.</span>
              </h1>
              <p className="text-white/50 text-lg font-body leading-relaxed">
                Analisi approfondite, comparativi onesti e guide pratiche per trovare il telefono giusto senza perdere tempo.
              </p>
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
                      className="w-2.5 h-2.5 rounded-full mb-3 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: cat.color || '#FF5C1A' }}
                    />
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
