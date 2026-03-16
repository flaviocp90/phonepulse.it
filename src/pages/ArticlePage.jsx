import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { marked } from 'marked'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

marked.setOptions({ breaks: true, gfm: true })

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ArticleSkeleton() {
  return (
    <div className="animate-pulse max-w-3xl mx-auto px-4 py-12">
      <div className="h-4 bg-gray-200 rounded w-24 mb-5" />
      <div className="h-10 bg-gray-200 rounded w-4/5 mb-3" />
      <div className="h-10 bg-gray-200 rounded w-2/3 mb-6" />
      <div className="h-4 bg-gray-100 rounded w-40 mb-8" />
      <div className="aspect-[16/9] bg-gray-200 rounded-xl mb-8" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`h-4 bg-gray-100 rounded ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}

export default function ArticlePage() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('articles')
          .select('*, categories(id, name, slug, color), article_tags(tags(id, name, slug))')
          .eq('slug', slug)
          .eq('is_published', true)
          .single()

        if (err) throw err
        setArticle(data)
      } catch (err) {
        setError('Articolo non trovato o non più disponibile.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug])

  return (
    <div className="min-h-screen flex flex-col">
      {article && (
        <SEO
          title={article.seo_title || article.title}
          description={article.seo_description || article.excerpt}
          image={article.cover_image_url}
          canonical={`/articoli/${article.slug}`}
          type="article"
        />
      )}
      <Header />

      <main className="flex-1">
        {loading && <ArticleSkeleton />}

        {error && (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center">
            <p className="text-gray-500 font-body mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary font-body font-medium hover:underline"
            >
              ← Torna alla home
            </Link>
          </div>
        )}

        {!loading && article && (
          <article className="max-w-3xl mx-auto px-4 py-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-gray-400 font-body mb-6">
              <Link to="/" className="hover:text-gray-600 transition-colors">Home</Link>
              <span>/</span>
              {article.categories && (
                <>
                  <Link
                    to={`/categoria/${article.categories.slug}`}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {article.categories.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-500 line-clamp-1">{article.title}</span>
            </nav>

            {/* Category + Score row */}
            <div className="flex items-center gap-3 mb-4">
              {article.categories && (
                <Link
                  to={`/categoria/${article.categories.slug}`}
                  className="inline-block text-xs font-body font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: article.categories.color ? `${article.categories.color}18` : '#FF5C1A18',
                    color: article.categories.color || '#FF5C1A',
                  }}
                >
                  {article.categories.name}
                </Link>
              )}
              {article.score != null && (
                <span className="inline-flex items-center gap-1 bg-primary text-white text-xs font-body font-bold px-3 py-1 rounded-full">
                  Voto: {article.score}/100
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-dark leading-tight mb-4">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-gray-500 font-body leading-relaxed mb-6 border-l-4 border-primary/30 pl-4">
                {article.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 font-body mb-8 pb-8 border-b border-border">
              {article.author && (
                <span>Di <strong className="text-gray-600">{article.author}</strong></span>
              )}
              {article.published_at && (
                <time>{formatDate(article.published_at)}</time>
              )}
            </div>

            {/* Cover image */}
            {article.cover_image_url && (
              <div className="mb-10 rounded-2xl overflow-hidden border border-border">
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full object-cover"
                />
              </div>
            )}

            {/* Score card (se presente) */}
            {article.score != null && (
              <div className="mb-10 bg-dark rounded-2xl p-6 flex items-center gap-6">
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-primary flex flex-col items-center justify-center shadow-lg">
                    <span className="text-white text-3xl font-heading font-bold leading-none">{article.score}</span>
                    <span className="text-white/60 text-xs font-body">/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-white font-heading font-bold text-xl mb-1">Il nostro voto</p>
                  <p className="text-white/50 text-sm font-body leading-relaxed">
                    {article.score >= 85
                      ? 'Eccellente. Uno dei migliori nel suo segmento.'
                      : article.score >= 70
                      ? 'Buono. Promosso con qualche riserva.'
                      : article.score >= 55
                      ? 'Sufficiente. Vale la pena ma con compromessi.'
                      : 'Insufficiente. Ci sono alternative migliori.'}
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            {article.content && (
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: marked.parse(article.content) }}
              />
            )}

            {/* Tags */}
            {article.article_tags && article.article_tags.length > 0 && (
              <div className="mt-10 pt-8 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {article.article_tags.map(({ tags: tag }) =>
                    tag ? (
                      <span
                        key={tag.id}
                        className="text-xs font-body font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full"
                      >
                        #{tag.name}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Affiliate links */}
            {article.affiliate_links && Array.isArray(article.affiliate_links) && article.affiliate_links.length > 0 && (
              <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                <h3 className="text-sm font-body font-semibold text-primary uppercase tracking-wide mb-4">
                  Dove acquistare
                </h3>
                <div className="flex flex-col gap-3">
                  {article.affiliate_links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url || link}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-flex items-center justify-between gap-3 bg-white border border-border px-4 py-3 rounded-xl hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
                    >
                      <span className="text-sm font-body font-medium text-dark group-hover:text-primary transition-colors">
                        {link.label || link.url || link}
                      </span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors shrink-0" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-400 font-body mt-3">
                  * I link sopra possono contenere codici di affiliazione. Non influenzano la valutazione.
                </p>
              </div>
            )}

            {/* Back link */}
            <div className="mt-12 pt-8 border-t border-border">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-gray-500 font-body hover:text-primary transition-colors"
              >
                ← Torna alla home
              </Link>
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  )
}
