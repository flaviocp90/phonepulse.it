import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ArticleCard from '../components/ArticleCard'
import SEO from '../components/SEO'

const PAGE_SIZE = 12

function CardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded-full w-20" />
        <div className="h-5 bg-gray-200 rounded w-4/5" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-24 mt-2" />
      </div>
    </div>
  )
}

export default function CategoryPage() {
  const { slug } = useParams()
  const [category, setCategory] = useState(null)
  const [articles, setArticles] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Reset page when slug changes
  useEffect(() => {
    setPage(0)
    setArticles([])
    setCategory(null)
  }, [slug])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Fetch category
        const { data: cat, error: catErr } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .single()

        if (catErr) throw catErr
        setCategory(cat)

        // Fetch articles with count
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error: artErr, count } = await supabase
          .from('articles')
          .select('id, slug, title, excerpt, cover_image_url, published_at, score, categories(id, name, slug, color)', { count: 'exact' })
          .eq('category_id', cat.id)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .range(from, to)

        if (artErr) throw artErr
        setArticles(data || [])
        setTotal(count || 0)
      } catch (err) {
        setError('Categoria non trovata o errore nel caricamento.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen flex flex-col">
      {category && (
        <SEO
          title={category.name}
          description={category.description || `Articoli su ${category.name}`}
          canonical={`/categoria/${category.slug}`}
        />
      )}
      <Header />

      <main className="flex-1">
        {/* Category header */}
        <section className="bg-dark border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-12">
            {loading && !category ? (
              <div className="animate-pulse">
                <div className="h-3 bg-white/10 rounded w-24 mb-3" />
                <div className="h-9 bg-white/20 rounded w-56" />
              </div>
            ) : category ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color || '#FF5C1A' }}
                  />
                  <span className="text-xs font-body text-white/40 uppercase tracking-widest">Categoria</span>
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">{category.name}</h1>
                {category.description && (
                  <p className="text-white/50 font-body mt-2 text-base">{category.description}</p>
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* Articles */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-body mb-8">
              {error}
            </div>
          )}

          {!loading && !error && (
            <p className="text-sm text-gray-400 font-body mb-8">
              {total} {total === 1 ? 'articolo' : 'articoli'} trovati
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : articles.length === 0 && !error ? (
            <div className="text-center py-20">
              <p className="text-gray-400 font-body">Nessun articolo in questa categoria ancora.</p>
              <Link to="/" className="inline-block mt-6 text-sm text-primary font-body hover:underline">
                ← Torna alla home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-body font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← Precedente
              </button>
              <span className="text-sm font-body text-gray-500 px-3">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm font-body font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Successivo →
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
