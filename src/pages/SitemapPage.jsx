import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function SitemapPage() {
  const [byCategory, setByCategory] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('slug, title, published_at, categories(name, slug)')
          .eq('is_published', true)
          .order('published_at', { ascending: false })

        if (error) throw error

        const grouped = {}
        for (const article of data || []) {
          const catName = article.categories?.name || 'Altro'
          if (!grouped[catName]) grouped[catName] = []
          grouped[catName].push(article)
        }
        setByCategory(grouped)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  const staticLinks = [
    { label: 'Home', to: '/' },
    { label: 'Chi siamo', to: '/chi-siamo' },
    { label: 'Contatti', to: '/contatti' },
    { label: 'Recensioni', to: '/categoria/recensioni' },
    { label: 'Comparativi', to: '/categoria/comparativi' },
    { label: 'Guide', to: '/categoria/guide' },
    { label: 'News', to: '/categoria/news' },
    { label: 'Offerte', to: '/categoria/offerte' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Mappa del sito — PhonePulse"
        description="Tutti gli articoli di PhonePulse organizzati per categoria."
        canonical="/sitemap"
      />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <h1 className="text-3xl font-heading font-bold text-dark mb-2">Mappa del sito</h1>
        <p className="text-gray-400 font-body text-sm mb-10">Tutti i contenuti di PhonePulse, organizzati per categoria.</p>

        {/* Static pages */}
        <section className="mb-10">
          <h2 className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-4">Pagine principali</h2>
          <ul className="flex flex-wrap gap-3">
            {staticLinks.map(({ label, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="inline-block text-sm font-body text-dark border border-border rounded-lg px-4 py-2 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Articles by category */}
        {loading ? (
          <p className="text-gray-400 font-body text-sm">Caricamento articoli…</p>
        ) : (
          Object.entries(byCategory).map(([catName, articles]) => (
            <section key={catName} className="mb-10">
              <h2 className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-4">{catName}</h2>
              <ul className="space-y-2">
                {articles.map(article => (
                  <li key={article.slug}>
                    <Link
                      to={`/articoli/${article.slug}`}
                      className="flex items-start gap-2 text-sm font-body text-dark hover:text-primary transition-colors group"
                    >
                      <span className="mt-0.5 text-gray-300 group-hover:text-primary transition-colors">→</span>
                      <span>{article.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <Footer />
    </div>
  )
}
